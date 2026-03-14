import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Prisma } from "@prisma/client";
import { startOfDay, endOfDay } from "date-fns";
import { buildAlertSpeechText, createChargeSchema, socketEvents, type OverlayBootstrap } from "@streampix/shared";
import { AppError } from "../../lib/errors.js";
import { env } from "../../config/env.js";
import { zodToAppError } from "../../lib/http.js";
import { moderateMessage } from "../../lib/moderation.js";
import { decimalToNumber, serializeCharge, serializeOverlayBootstrap } from "../../lib/serializers.js";
import { chargeRoom, overlayRoom } from "../../lib/socket.js";
import { createIdempotencyKey, createPublicToken } from "../../lib/security.js";
import { getMercadoPagoProviderConfig } from "../payment-providers/mercado-pago-shared.js";
import { getPixProvider } from "../payment-providers/registry.js";
import { creditStreamerBalanceFromCharge } from "../payouts/service.js";
import { deliverAlert } from "../alerts/service.js";
import { createStreamerNotification } from "../notifications/service.js";

async function getCurrentSubscriptionPlan(fastify: FastifyInstance, streamerId: string) {
  return fastify.prisma.subscription.findFirst({
    where: {
      streamerId,
      status: {
        in: ["ACTIVE", "TRIALING"],
      },
    },
    include: {
      plan: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function getDefaultPaymentProvider(fastify: FastifyInstance) {
  const provider = await fastify.prisma.paymentProvider.findFirst({
    where: {
      isActive: true,
      isDefault: true,
    },
  });

  if (!provider) {
    throw new AppError("Nenhum provider PIX ativo foi configurado.", 500, "PIX_PROVIDER_MISSING");
  }

  return provider;
}

function calculateFees(input: {
  amount: number;
  planFeePercentage: number;
  planFixedFee: number;
  gatewayFeePercentage: number;
  gatewayFixedFee: number;
}) {
  const platformFee = input.amount * (input.planFeePercentage / 100) + input.planFixedFee;
  const gatewayFee = input.amount * (input.gatewayFeePercentage / 100) + input.gatewayFixedFee;
  const netAmount = Math.max(0, input.amount - platformFee - gatewayFee);

  return {
    platformFee: Number(platformFee.toFixed(2)),
    gatewayFee: Number(gatewayFee.toFixed(2)),
    netAmount: Number(netAmount.toFixed(2)),
  };
}

function normalizeSupporterName(input: {
  supporterName?: string;
  isAnonymous: boolean;
}) {
  const trimmed = input.supporterName?.trim() ?? "";

  if (trimmed) {
    return trimmed;
  }

  return input.isAnonymous ? "Desconhecido" : "Desconhecido";
}

function normalizePayerDocument(value?: string) {
  const normalized = value?.replace(/\D+/g, "") ?? "";

  return normalized || null;
}

export async function createPublicCharge(
  fastify: FastifyInstance,
  streamerSlug: string,
  payload: unknown,
  request: FastifyRequest,
) {
  const parsed = createChargeSchema.safeParse(payload);

  if (!parsed.success) {
    throw zodToAppError(parsed.error);
  }

  const streamer = await fastify.prisma.streamerProfile.findUnique({
    where: { slug: streamerSlug },
    include: {
      publicPageSettings: true,
      streamerSettings: true,
    },
  });

  if (!streamer || !streamer.publicPageSettings || !streamer.streamerSettings || !streamer.publicPageEnabled) {
    throw new AppError("Página pública não encontrada.", 404, "STREAMER_NOT_FOUND");
  }

  if (streamer.status !== "ACTIVE") {
    throw new AppError("Esta conta não está aceitando PIX no momento.", 403, "STREAMER_BLOCKED");
  }

  const amount = Number(parsed.data.amount);

  if (amount < decimalToNumber(streamer.publicPageSettings.minimumAmount)) {
    throw new AppError("Valor abaixo do mínimo permitido.", 400, "MINIMUM_AMOUNT");
  }

  if (amount > decimalToNumber(streamer.publicPageSettings.maximumAmount)) {
    throw new AppError("Valor acima do máximo permitido.", 400, "MAXIMUM_AMOUNT");
  }

  const moderated = moderateMessage({
    message: parsed.data.message,
    allowLinks: streamer.publicPageSettings.allowLinks,
    blockedWords: Array.isArray(streamer.publicPageSettings.blockedWords)
      ? streamer.publicPageSettings.blockedWords.filter((item): item is string => typeof item === "string")
      : [],
    maxLength: Math.min(streamer.publicPageSettings.messageCharLimit, streamer.streamerSettings.maxMessageLength),
  });

  const provider = await getDefaultPaymentProvider(fastify);
  const providerConfig = provider.code === "MERCADO_PAGO" ? getMercadoPagoProviderConfig(provider.config) : null;
  const supporterName = normalizeSupporterName({
    supporterName: parsed.data.supporterName,
    isAnonymous: parsed.data.isAnonymous,
  });
  const payerEmail = parsed.data.payerEmail?.trim() || null;
  const payerDocument = normalizePayerDocument(parsed.data.payerDocument);

  if (providerConfig?.requirePayerEmail && !payerEmail) {
    throw new AppError(
      "O Mercado Pago exige o e-mail do apoiador para gerar o PIX.",
      400,
      "PAYER_EMAIL_REQUIRED",
    );
  }

  if (providerConfig?.requirePayerDocument && !payerDocument) {
    throw new AppError(
      "O Mercado Pago exige CPF ou CNPJ do apoiador para gerar o PIX.",
      400,
      "PAYER_DOCUMENT_REQUIRED",
    );
  }

  const providerDriver = getPixProvider(provider.code);
  const chargeId = createPublicToken("charge");
  const providerCharge = await providerDriver.createCharge({
    streamer,
    amount,
    viewerName: supporterName,
    viewerEmail: payerEmail,
    payerDocument,
      message: moderated.sanitizedMessage,
      chargeId,
      context: {
        config: provider.config as Record<string, unknown>,
        notificationUrl: `${env.SERVER_URL}/v1/webhooks/payment/${provider.code}?source_news=webhooks`,
      },
    });

  const charge = await fastify.prisma.pixCharge.create({
    data: {
      id: chargeId,
      streamerId: streamer.id,
      paymentProviderId: provider.id,
      viewerName: supporterName,
      viewerEmail: payerEmail,
      payerDocument,
      viewerMessage: parsed.data.message,
      sanitizedMessage: moderated.sanitizedMessage,
      amount,
      pixCopyPaste: providerCharge.pixCopyPaste,
      qrCodeDataUrl: providerCharge.qrCodeDataUrl,
      txid: providerCharge.txid,
      externalId: providerCharge.externalId,
      isAnonymous: parsed.data.isAnonymous,
      shouldReadMessage: streamer.publicPageSettings.allowVoiceMessages,
      status: "PENDING",
      expiresAt: providerCharge.expiresAt,
      idempotencyKey: request.headers["x-idempotency-key"]
        ? String(request.headers["x-idempotency-key"])
        : createIdempotencyKey(),
      metadata: {
        moderationPreview: moderated.reasons,
        providerCode: provider.code,
      } as Prisma.InputJsonValue,
      transactions: {
        create: {
          streamerId: streamer.id,
          paymentProviderId: provider.id,
          externalId: providerCharge.externalId,
          status: "PENDING",
          grossAmount: amount,
          netAmount: 0,
          platformFee: 0,
          gatewayFee: 0,
        },
      },
    },
  });

  fastify.io.to(chargeRoom(charge.id)).emit(socketEvents.chargeStatus, {
    chargeId: charge.id,
    status: charge.status,
  });

  return serializeCharge(charge);
}

export async function getChargeSummary(fastify: FastifyInstance, chargeId: string) {
  const charge = await fastify.prisma.pixCharge.findUnique({
    where: { id: chargeId },
  });

  if (!charge) {
    throw new AppError("Cobrança não encontrada.", 404, "CHARGE_NOT_FOUND");
  }

  return serializeCharge(charge);
}

export async function confirmPixCharge(
  fastify: FastifyInstance,
  params: {
    txid?: string;
    chargeId?: string;
    externalId?: string;
    idempotencyKey: string;
    paidAt?: Date;
    rawPayload?: Record<string, unknown>;
  },
) {
  const selectors: Array<{ id: string } | { txid: string } | { externalId: string }> = [];

  if (params.chargeId) {
    selectors.push({ id: params.chargeId });
  }

  if (params.txid) {
    selectors.push({ txid: params.txid });
  }

  if (params.externalId) {
    selectors.push({ externalId: params.externalId });
  }

  const charge = await fastify.prisma.pixCharge.findFirst({
    where: {
      OR: selectors,
    },
    include: {
      streamer: {
        include: {
          publicPageSettings: true,
          streamerSettings: true,
          overlaySettings: true,
        },
      },
      paymentProvider: true,
      transactions: true,
    },
  });

  if (!charge || !charge.streamer.publicPageSettings || !charge.streamer.streamerSettings) {
    throw new AppError("Cobrança PIX não encontrada.", 404, "CHARGE_NOT_FOUND");
  }

  const existingWebhook = await fastify.prisma.webhookEvent.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });

  if (existingWebhook?.status === "PROCESSED") {
    return {
      charge,
      alreadyProcessed: true,
    };
  }

  if (charge.status === "PAID") {
    await fastify.prisma.webhookEvent.upsert({
      where: { idempotencyKey: params.idempotencyKey },
      create: {
        streamerId: charge.streamerId,
        paymentProviderId: charge.paymentProviderId,
        chargeId: charge.id,
        source: charge.paymentProvider.code,
        eventType: "pix.charge.already_paid",
        idempotencyKey: params.idempotencyKey,
        status: "PROCESSED",
        payload: (params.rawPayload ?? {}) as Prisma.InputJsonValue,
        processedAt: new Date(),
      },
      update: {
        status: "PROCESSED",
        processedAt: new Date(),
        payload: (params.rawPayload ?? {}) as Prisma.InputJsonValue,
      },
    });

    return {
      charge,
      alreadyProcessed: true,
    };
  }

  const subscription = await getCurrentSubscriptionPlan(fastify, charge.streamerId);

  const feeSnapshot = calculateFees({
    amount: decimalToNumber(charge.amount),
    planFeePercentage: decimalToNumber(subscription?.plan.feePercentage ?? 4.99),
    planFixedFee: decimalToNumber(subscription?.plan.fixedFee ?? 0.39),
    gatewayFeePercentage: decimalToNumber(charge.paymentProvider.feePercentage),
    gatewayFixedFee: decimalToNumber(charge.paymentProvider.fixedFee),
  });

  const moderated = moderateMessage({
    message: charge.viewerMessage,
    allowLinks: charge.streamer.publicPageSettings.allowLinks,
    blockedWords: Array.isArray(charge.streamer.publicPageSettings.blockedWords)
      ? charge.streamer.publicPageSettings.blockedWords.filter((item): item is string => typeof item === "string")
      : [],
    maxLength: charge.streamer.streamerSettings.maxMessageLength,
  });

  const needsManualModeration = charge.streamer.publicPageSettings.manualModeration;
  const blocked = charge.streamer.publicPageSettings.autoModeration && moderated.blocked;
  const alertStatus = blocked ? "BLOCKED" : needsManualModeration ? "PROCESSING" : "QUEUED";
  const themeSnapshot = {
    themePreset: charge.streamer.overlaySettings?.themePreset ?? "NEON",
    primaryColor: charge.streamer.overlaySettings?.primaryColor ?? "#7c3aed",
    secondaryColor: charge.streamer.overlaySettings?.secondaryColor ?? "#22d3ee",
  };
  const paidAt = params.paidAt ?? new Date();

  const transactionResult = await fastify.prisma.$transaction(async (tx) => {
    const updatedCharge = await tx.pixCharge.update({
      where: { id: charge.id },
      data: {
        status: blocked ? "BLOCKED" : "PAID",
        statusReason: blocked ? moderated.reasons.join(", ") : null,
        confirmedAt: paidAt,
        netAmount: feeSnapshot.netAmount,
        platformFee: feeSnapshot.platformFee,
        gatewayFee: feeSnapshot.gatewayFee,
      },
    });

    await tx.pixTransaction.updateMany({
      where: {
        chargeId: charge.id,
      },
      data: {
        status: "PAID",
        grossAmount: decimalToNumber(charge.amount),
        netAmount: feeSnapshot.netAmount,
        platformFee: feeSnapshot.platformFee,
        gatewayFee: feeSnapshot.gatewayFee,
        paidAt,
        settlementAt: paidAt,
        rawPayload: params.rawPayload as Prisma.InputJsonValue | undefined,
      },
    });

    await creditStreamerBalanceFromCharge(tx, {
      streamerId: charge.streamerId,
      chargeId: charge.id,
      txid: charge.txid,
      grossAmount: decimalToNumber(charge.amount),
      netAmount: feeSnapshot.netAmount,
      platformFee: feeSnapshot.platformFee,
      gatewayFee: feeSnapshot.gatewayFee,
      confirmedAt: paidAt,
      isTest: charge.isTest,
    });

    const alert = await tx.alert.create({
      data: {
        streamerId: charge.streamerId,
        chargeId: charge.id,
        status: alertStatus,
        title: charge.isAnonymous ? "Apoio anônimo" : `${charge.viewerName} apoiou a live`,
        supporterName: charge.viewerName,
        message: charge.viewerMessage,
        sanitizedMessage: moderated.sanitizedMessage,
        amount: decimalToNumber(charge.amount),
        showAmount: true,
        showName: !charge.isAnonymous,
        ttsRequested: charge.shouldReadMessage,
        durationMs: charge.streamer.overlaySettings?.durationMs ?? 6500,
        themeSnapshot: themeSnapshot as Prisma.InputJsonValue,
      },
    });

    await tx.subscription.updateMany({
      where: {
        streamerId: charge.streamerId,
        status: {
          in: ["ACTIVE", "TRIALING"],
        },
      },
      data: {
        monthlyMessageCount: {
          increment: 1,
        },
      },
    });

    const dayStart = startOfDay(paidAt);
    const dayEnd = endOfDay(paidAt);

    await tx.usageMetric.upsert({
      where: {
        streamerId_periodStart_periodEnd: {
          streamerId: charge.streamerId,
          periodStart: dayStart,
          periodEnd: dayEnd,
        },
      },
      create: {
        streamerId: charge.streamerId,
        periodStart: dayStart,
        periodEnd: dayEnd,
        messagesCount: 1,
        ttsCount: charge.shouldReadMessage ? 1 : 0,
        chargesCount: 1,
        grossAmount: decimalToNumber(charge.amount),
        netAmount: feeSnapshot.netAmount,
        platformRevenue: feeSnapshot.platformFee,
      },
      update: {
        messagesCount: {
          increment: 1,
        },
        ttsCount: {
          increment: charge.shouldReadMessage ? 1 : 0,
        },
        chargesCount: {
          increment: 1,
        },
        grossAmount: {
          increment: decimalToNumber(charge.amount),
        },
        netAmount: {
          increment: feeSnapshot.netAmount,
        },
        platformRevenue: {
          increment: feeSnapshot.platformFee,
        },
      },
    });

    await tx.webhookEvent.upsert({
      where: { idempotencyKey: params.idempotencyKey },
      create: {
        streamerId: charge.streamerId,
        paymentProviderId: charge.paymentProviderId,
        chargeId: charge.id,
        source: charge.paymentProvider.code,
        eventType: "pix.charge.paid",
        idempotencyKey: params.idempotencyKey,
        status: "PROCESSED",
        payload: (params.rawPayload ?? {}) as Prisma.InputJsonValue,
        processedAt: new Date(),
      },
      update: {
        status: "PROCESSED",
        payload: (params.rawPayload ?? {}) as Prisma.InputJsonValue,
        processedAt: new Date(),
      },
    });

    return {
      updatedCharge,
      alert,
    };
  });

  fastify.io.to(chargeRoom(charge.id)).emit(socketEvents.chargeStatus, {
    chargeId: charge.id,
    status: transactionResult.updatedCharge.status,
    confirmedAt: transactionResult.updatedCharge.confirmedAt?.toISOString(),
  });

  if (transactionResult.alert.status === "QUEUED") {
    await deliverAlert(fastify, transactionResult.alert.id);
  } else if (transactionResult.alert.status === "PROCESSING") {
    await createStreamerNotification(fastify, {
      streamerId: charge.streamerId,
      type: "PAYMENT_CONFIRMED",
      title: "PIX aguardando moderação",
      message: "Uma nova mensagem foi paga e está aguardando sua aprovação manual.",
      metadata: {
        alertId: transactionResult.alert.id,
      },
    });
  } else if (transactionResult.alert.status === "BLOCKED") {
    await createStreamerNotification(fastify, {
      streamerId: charge.streamerId,
      type: "ALERT_BLOCKED",
      title: "Mensagem bloqueada pela moderação",
      message: "O pagamento foi confirmado, mas a mensagem foi retida pelas regras do canal.",
      metadata: {
        alertId: transactionResult.alert.id,
        reasons: moderated.reasons,
      },
    });
  }

  return {
    charge: transactionResult.updatedCharge,
    alertStatus: transactionResult.alert.status,
    alreadyProcessed: false,
  };
}

export async function simulateChargeConfirmation(fastify: FastifyInstance, chargeId: string) {
  const charge = await fastify.prisma.pixCharge.findUnique({
    where: { id: chargeId },
    include: {
      paymentProvider: true,
    },
  });

  if (!charge) {
    throw new AppError("Cobrança não encontrada.", 404, "CHARGE_NOT_FOUND");
  }

  const providerDriver = getPixProvider(charge.paymentProvider.code);
  const confirmation = await providerDriver.simulateConfirmation(charge.txid, {
    config: charge.paymentProvider.config as Record<string, unknown>,
  });

  return confirmPixCharge(fastify, {
    chargeId,
    txid: confirmation.txid,
    externalId: confirmation.externalId,
    idempotencyKey: confirmation.idempotencyKey,
    paidAt: confirmation.paidAt,
    rawPayload: confirmation.rawPayload,
  });
}

export async function createTestAlert(fastify: FastifyInstance, streamerId: string) {
  const provider = await getDefaultPaymentProvider(fastify);
  const streamer = await fastify.prisma.streamerProfile.findUnique({
    where: { id: streamerId },
    include: {
      overlaySettings: true,
      streamerSettings: true,
    },
  });

  if (!streamer || !streamer.overlaySettings || !streamer.streamerSettings) {
    throw new AppError("Streamer não encontrado.", 404, "STREAMER_NOT_FOUND");
  }

  const testMessage = "Esse e um teste do StreamPix.";

  const charge = await fastify.prisma.pixCharge.create({
    data: {
      id: createPublicToken("charge"),
      streamerId,
      paymentProviderId: provider.id,
      viewerName: "Demo",
      viewerMessage: "Esse alerta confirma que seu overlay está vivo e pronto para a live.",
      sanitizedMessage: "Esse alerta confirma que seu overlay está vivo e pronto para a live.",
      amount: 5,
      netAmount: 0,
      platformFee: 0,
      gatewayFee: 0,
      pixCopyPaste: "mock-demo",
      txid: createPublicToken("txid"),
      externalId: createPublicToken("ext"),
      isAnonymous: false,
      shouldReadMessage: true,
      isTest: true,
      status: "PAID",
      confirmedAt: new Date(),
      expiresAt: new Date(),
    },
  });

  const alert = await fastify.prisma.alert.create({
    data: {
      streamerId,
      chargeId: charge.id,
      status: "QUEUED",
      title: "Teste de alerta",
      supporterName: "Demo",
      message: testMessage,
      sanitizedMessage: testMessage,
      amount: 5,
      showAmount: true,
      showName: true,
      ttsRequested: true,
      durationMs: streamer.overlaySettings?.durationMs ?? 6500,
      themeSnapshot: {
        preset: streamer.overlaySettings?.themePreset ?? "NEON",
      } as Prisma.InputJsonValue,
    },
  });

  await deliverAlert(fastify, alert.id, {
    testMode: true,
  });

  const bootstrap = serializeOverlayBootstrap({
    streamer,
    overlaySettings: streamer.overlaySettings,
    streamerSettings: streamer.streamerSettings,
  });
  const overlayListeners = fastify.io.sockets.adapter.rooms.get(overlayRoom(streamerId))?.size ?? 0;
  const speechText = buildAlertSpeechText({
    supporterName: alert.supporterName,
    amount: decimalToNumber(alert.amount),
    message: alert.sanitizedMessage,
    isAnonymous: false,
  });

  return {
    alertId: alert.id,
    overlayListeners,
    speechText,
    voice: bootstrap.voice satisfies OverlayBootstrap["voice"],
  };
}
