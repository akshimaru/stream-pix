import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import { createIdempotencyKey, hashPassword, verifyPassword } from "../../lib/security.js";
import { decimalToNumber } from "../../lib/serializers.js";
import { getOffset, parsePagination } from "../../lib/http.js";
import { writeAuditLog } from "../../lib/audit.js";
import { getMercadoPagoProviderConfig } from "../payment-providers/mercado-pago-shared.js";
import { createStreamerNotification } from "../notifications/service.js";
import { getPayoutProvider } from "../payout-providers/registry.js";

const MINIMUM_PAYOUT_AMOUNT = 10;

const payoutAccountSchema = z
  .object({
    legalName: z.string().trim().max(160).optional().default(""),
    document: z.string().trim().max(32).optional().default(""),
    pixKeyType: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"]).nullable().optional(),
    pixKeyValue: z.string().trim().max(191).optional().default(""),
    payoutsEnabled: z.boolean(),
    instantPayoutEnabled: z.boolean().default(true),
    securityCode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Use um numero de seguranca com 6 digitos.")
      .optional()
      .or(z.literal("")),
    confirmSecurityCode: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((value, context) => {
    if (value.payoutsEnabled) {
      if (!value.legalName || value.legalName.length < 3) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["legalName"],
          message: "Informe o nome legal para receber os repasses.",
        });
      }

      if (!value.document || value.document.length < 11) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["document"],
          message: "Informe o documento do recebedor.",
        });
      }

      if (!value.pixKeyType) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pixKeyType"],
          message: "Selecione o tipo de chave PIX.",
        });
      }

      if (!value.pixKeyValue || value.pixKeyValue.length < 3) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pixKeyValue"],
          message: "Informe a chave PIX que recebera o repasse.",
        });
      }
    }

    if (value.pixKeyType === "EMAIL" && value.pixKeyValue && !z.string().email().safeParse(value.pixKeyValue).success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pixKeyValue"],
        message: "Informe um e-mail valido para a chave PIX.",
      });
    }

    if (value.securityCode || value.confirmSecurityCode) {
      if (!value.securityCode || !value.confirmSecurityCode || value.securityCode !== value.confirmSecurityCode) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmSecurityCode"],
          message: "Confirme o mesmo numero de seguranca de 6 digitos.",
        });
      }
    }
  });

const payoutRequestSchema = z.object({
  amount: z.coerce.number().min(MINIMUM_PAYOUT_AMOUNT).max(100000),
  securityCode: z.string().trim().regex(/^\d{6}$/, "Digite seu numero de seguranca com 6 digitos."),
});

const payoutRejectSchema = z.object({
  reason: z.string().trim().min(3).max(255),
});

function getStreamerIdFromAuth(request: FastifyRequest) {
  if (!request.authUser?.streamerId) {
    throw new AppError("Workspace do streamer nao encontrado.", 403, "STREAMER_CONTEXT_REQUIRED");
  }

  return request.authUser.streamerId;
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function normalizeDocument(value: string) {
  return value.replace(/\s+/g, "").trim();
}

function maskPixKeyValue(value: string | null) {
  if (!value) {
    return null;
  }

  if (value.length <= 6) {
    return `${value.slice(0, 2)}***`;
  }

  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

async function resolveDefaultPayoutProviderCode(fastify: FastifyInstance) {
  const paymentProvider = await fastify.prisma.paymentProvider.findFirst({
    where: {
      isActive: true,
      isDefault: true,
    },
  });

  if (!paymentProvider) {
    return "MOCK_PAYOUT";
  }

  if (paymentProvider.code === "MERCADO_PAGO") {
    const config = getMercadoPagoProviderConfig(paymentProvider.config);

    if (config.supportsPayouts && (config.payoutAccessToken || config.accessToken)) {
      return "MERCADO_PAGO";
    }
  }

  return "MOCK_PAYOUT";
}

async function getPayoutExecutionContext(fastify: FastifyInstance, providerCode: string) {
  if (providerCode !== "MERCADO_PAGO") {
    return undefined;
  }

  const paymentProvider = await fastify.prisma.paymentProvider.findUnique({
    where: {
      code: providerCode,
    },
  });

  if (!paymentProvider || !paymentProvider.isActive) {
    throw new AppError("O Mercado Pago nao esta ativo para executar saques.", 400, "PAYOUT_PROVIDER_INACTIVE");
  }

  const config = getMercadoPagoProviderConfig(paymentProvider.config);

  return {
    config: paymentProvider.config as Record<string, unknown>,
    notificationUrl: config.payoutNotificationUrl || undefined,
  };
}

type PayoutAccountRecord = {
  id: string;
  legalName: string | null;
  document: string | null;
  pixKeyType: string | null;
  pixKeyValue: string | null;
  payoutsEnabled: boolean;
  instantPayoutEnabled?: boolean | null;
  withdrawalPinHash?: string | null;
  withdrawalPinUpdatedAt?: Date | null;
  availableBalance: unknown;
  pendingBalance: unknown;
  lockedBalance: unknown;
  totalPaidOut: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function serializePayoutAccount(account: PayoutAccountRecord) {
  return {
    id: account.id,
    legalName: account.legalName,
    document: account.document,
    pixKeyType: account.pixKeyType,
    pixKeyValue: account.pixKeyValue,
    payoutsEnabled: account.payoutsEnabled,
    instantPayoutEnabled: account.instantPayoutEnabled ?? true,
    hasSecurityCode: Boolean(account.withdrawalPinHash),
    securityCodeUpdatedAt: account.withdrawalPinUpdatedAt?.toISOString() ?? null,
    availableBalance: decimalToNumber(account.availableBalance),
    pendingBalance: decimalToNumber(account.pendingBalance),
    lockedBalance: decimalToNumber(account.lockedBalance),
    totalPaidOut: decimalToNumber(account.totalPaidOut),
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

function serializePayoutRequest(
  payout: Prisma.PayoutRequestGetPayload<{
    include: {
      streamer: true;
      payoutAccount: true;
      reviewedBy: true;
    };
  }>,
) {
  return {
    id: payout.id,
    streamerId: payout.streamerId,
    streamerName: payout.streamer.displayName,
    streamerSlug: payout.streamer.slug,
    legalName: payout.payoutAccount.legalName,
    pixKeyType: payout.payoutAccount.pixKeyType,
    pixKeyValue: payout.payoutAccount.pixKeyValue,
    pixKeyMasked: maskPixKeyValue(payout.payoutAccount.pixKeyValue),
    providerCode: payout.providerCode,
    amount: decimalToNumber(payout.amount),
    feeAmount: decimalToNumber(payout.feeAmount),
    netAmount: decimalToNumber(payout.netAmount),
    status: payout.status,
    failureReason: payout.failureReason,
    requestedAt: payout.requestedAt.toISOString(),
    reviewedAt: payout.reviewedAt?.toISOString() ?? null,
    paidAt: payout.paidAt?.toISOString() ?? null,
    reviewerName: payout.reviewedBy?.name ?? null,
    createdAt: payout.createdAt.toISOString(),
    updatedAt: payout.updatedAt.toISOString(),
  };
}

function serializeLedgerEntry(
  entry: Prisma.BalanceLedgerEntryGetPayload<{
    include: {
      charge: true;
      payoutRequest: true;
    };
  }>,
) {
  return {
    id: entry.id,
    entryType: entry.entryType,
    direction: entry.direction,
    amount: decimalToNumber(entry.amount),
    grossAmount: decimalToNumber(entry.grossAmount),
    feeAmount: decimalToNumber(entry.feeAmount),
    balanceAfter: decimalToNumber(entry.balanceAfter),
    description: entry.description,
    chargeId: entry.chargeId,
    payoutRequestId: entry.payoutRequestId,
    createdAt: entry.createdAt.toISOString(),
  };
}

async function ensurePayoutAccount(tx: Prisma.TransactionClient, streamerId: string) {
  return tx.streamerPayoutAccount.upsert({
    where: {
      streamerId,
    },
    update: {},
    create: {
      streamerId,
    },
  });
}

export async function creditStreamerBalanceFromCharge(
  tx: Prisma.TransactionClient,
  input: {
    streamerId: string;
    chargeId: string;
    txid: string;
    grossAmount: number;
    netAmount: number;
    platformFee: number;
    gatewayFee: number;
    confirmedAt: Date;
    isTest: boolean;
  },
) {
  if (input.isTest || input.netAmount <= 0) {
    return null;
  }

  const existingEntry = await tx.balanceLedgerEntry.findFirst({
    where: {
      chargeId: input.chargeId,
      entryType: "PIX_CREDIT",
    },
  });

  if (existingEntry) {
    return existingEntry;
  }

  const account = await ensurePayoutAccount(tx, input.streamerId);
  const nextAvailableBalance = roundCurrency(decimalToNumber(account.availableBalance) + input.netAmount);

  await tx.streamerPayoutAccount.update({
    where: {
      id: account.id,
    },
    data: {
      availableBalance: nextAvailableBalance,
    },
  });

  return tx.balanceLedgerEntry.create({
    data: {
      streamerId: input.streamerId,
      payoutAccountId: account.id,
      chargeId: input.chargeId,
      entryType: "PIX_CREDIT",
      direction: "CREDIT",
      grossAmount: input.grossAmount,
      feeAmount: roundCurrency(input.platformFee + input.gatewayFee),
      amount: input.netAmount,
      balanceAfter: nextAvailableBalance,
      description: `Credito liquido do PIX ${input.txid}`,
      metadata: {
        confirmedAt: input.confirmedAt.toISOString(),
        platformFee: input.platformFee,
        gatewayFee: input.gatewayFee,
      } satisfies Prisma.InputJsonValue,
    },
  });
}

async function executeProcessingPayout(
  fastify: FastifyInstance,
  request: FastifyRequest,
  payoutRequestId: string,
  options: {
    reviewedByUserId?: string;
    successAuditAction: string;
    successTitle: string;
    successMessage: string;
  },
) {
  const payout = await fastify.prisma.payoutRequest.findUnique({
    where: {
      id: payoutRequestId,
    },
    include: {
      streamer: true,
      payoutAccount: true,
      reviewedBy: true,
    },
  });

  if (
    !payout ||
    payout.status !== "PROCESSING" ||
    !payout.payoutAccount.legalName ||
    !payout.payoutAccount.document ||
    !payout.payoutAccount.pixKeyType ||
    !payout.payoutAccount.pixKeyValue
  ) {
    throw new AppError("Conta de payout incompleta para executar o repasse.", 400, "PAYOUT_ACCOUNT_INCOMPLETE");
  }

  const provider = getPayoutProvider(payout.providerCode);
  const providerContext = await getPayoutExecutionContext(fastify, payout.providerCode);

  try {
    const execution = await provider.execute({
      payoutId: payout.id,
      amount: decimalToNumber(payout.netAmount),
      legalName: payout.payoutAccount.legalName,
      document: payout.payoutAccount.document,
      pixKeyType: payout.payoutAccount.pixKeyType,
      pixKeyValue: payout.payoutAccount.pixKeyValue,
      context: providerContext,
    });

    const result = await fastify.prisma.$transaction(async (tx) => {
      const currentPayout = await tx.payoutRequest.findUnique({
        where: {
          id: payout.id,
        },
        include: {
          streamer: true,
          payoutAccount: true,
          reviewedBy: true,
        },
      });

      if (!currentPayout || currentPayout.status !== "PROCESSING") {
        throw new AppError("Este saque nao esta em processamento.", 409, "PAYOUT_NOT_PROCESSING");
      }

      const nextLockedBalance = roundCurrency(
        Math.max(0, decimalToNumber(currentPayout.payoutAccount.lockedBalance) - decimalToNumber(currentPayout.amount)),
      );
      const nextTotalPaidOut = roundCurrency(
        decimalToNumber(currentPayout.payoutAccount.totalPaidOut) + decimalToNumber(currentPayout.netAmount),
      );
      const availableBalance = decimalToNumber(currentPayout.payoutAccount.availableBalance);

      const updatedPayout = await tx.payoutRequest.update({
        where: {
          id: currentPayout.id,
        },
        data: {
          status: "PAID",
          externalId: execution.externalId,
          metadata: execution.rawPayload as Prisma.InputJsonValue,
          paidAt: execution.paidAt,
          reviewedAt: new Date(),
          reviewedByUserId: options.reviewedByUserId,
          failureReason: null,
        },
        include: {
          streamer: true,
          payoutAccount: true,
          reviewedBy: true,
        },
      });

      const updatedAccount = await tx.streamerPayoutAccount.update({
        where: {
          id: currentPayout.payoutAccountId,
        },
        data: {
          lockedBalance: nextLockedBalance,
          totalPaidOut: nextTotalPaidOut,
        },
      });

      await tx.balanceLedgerEntry.create({
        data: {
          streamerId: currentPayout.streamerId,
          payoutAccountId: currentPayout.payoutAccountId,
          payoutRequestId: currentPayout.id,
          entryType: "PAYOUT_COMPLETED",
          direction: "DEBIT",
          amount: decimalToNumber(currentPayout.netAmount),
          feeAmount: decimalToNumber(currentPayout.feeAmount),
          balanceAfter: availableBalance,
          description: "Repasse PIX concluido para o streamer.",
          metadata: execution.rawPayload as Prisma.InputJsonValue,
        },
      });

      await writeAuditLog({
        prisma: tx,
        actorUserId: options.reviewedByUserId,
        streamerId: currentPayout.streamerId,
        entityType: "payout_request",
        entityId: currentPayout.id,
        action: options.successAuditAction,
        metadata: {
          externalId: execution.externalId,
          amount: decimalToNumber(currentPayout.amount),
        },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return {
        updatedPayout,
        updatedAccount,
      };
    });

    await createStreamerNotification(fastify, {
      streamerId: payout.streamerId,
      type: "PAYMENT_CONFIRMED",
      title: options.successTitle,
      message: options.successMessage,
      metadata: {
        payoutRequestId: payout.id,
        externalId: execution.externalId,
      },
    });

    return {
      payoutRequest: serializePayoutRequest(result.updatedPayout),
      account: serializePayoutAccount(result.updatedAccount),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Falha ao executar payout no provider.";

    await fastify.prisma.$transaction(async (tx) => {
      const currentPayout = await tx.payoutRequest.findUnique({
        where: {
          id: payout.id,
        },
        include: {
          payoutAccount: true,
        },
      });

      if (!currentPayout) {
        return;
      }

      const nextAvailableBalance = roundCurrency(
        decimalToNumber(currentPayout.payoutAccount.availableBalance) + decimalToNumber(currentPayout.amount),
      );
      const nextLockedBalance = roundCurrency(
        Math.max(0, decimalToNumber(currentPayout.payoutAccount.lockedBalance) - decimalToNumber(currentPayout.amount)),
      );

      await tx.payoutRequest.update({
        where: {
          id: currentPayout.id,
        },
        data: {
          status: "FAILED",
          failureReason: reason,
          reviewedAt: new Date(),
          reviewedByUserId: options.reviewedByUserId,
        },
      });

      await tx.streamerPayoutAccount.update({
        where: {
          id: currentPayout.payoutAccountId,
        },
        data: {
          availableBalance: nextAvailableBalance,
          lockedBalance: nextLockedBalance,
        },
      });

      await tx.balanceLedgerEntry.create({
        data: {
          streamerId: currentPayout.streamerId,
          payoutAccountId: currentPayout.payoutAccountId,
          payoutRequestId: currentPayout.id,
          entryType: "PAYOUT_REJECTED",
          direction: "CREDIT",
          amount: decimalToNumber(currentPayout.amount),
          feeAmount: 0,
          balanceAfter: nextAvailableBalance,
          description: "Saque devolvido ao saldo apos falha do provider.",
          metadata: {
            reason,
          } satisfies Prisma.InputJsonValue,
        },
      });
    });

    await createStreamerNotification(fastify, {
      streamerId: payout.streamerId,
      type: "ALERT_BLOCKED",
      title: "Saque falhou",
      message: "O provider recusou o repasse. O valor voltou para seu saldo disponivel.",
      metadata: {
        payoutRequestId: payout.id,
        reason,
      },
    });

    throw new AppError(reason, 502, "PAYOUT_PROVIDER_FAILED");
  }
}

export async function getStreamerPayoutOverview(fastify: FastifyInstance, request: FastifyRequest) {
  const streamerId = getStreamerIdFromAuth(request);
  const providerCode = await resolveDefaultPayoutProviderCode(fastify);

  const account = (await fastify.prisma.streamerPayoutAccount.upsert({
    where: {
      streamerId,
    },
    update: {},
    create: {
      streamerId,
    },
  })) as PayoutAccountRecord;

  const [recentRequests, recentLedger] = await Promise.all([
    fastify.prisma.payoutRequest.findMany({
      where: {
        streamerId,
      },
      include: {
        streamer: true,
        payoutAccount: true,
        reviewedBy: true,
      },
      orderBy: {
        requestedAt: "desc",
      },
      take: 8,
    }),
    fastify.prisma.balanceLedgerEntry.findMany({
      where: {
        streamerId,
      },
      include: {
        charge: true,
        payoutRequest: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),
  ]);

  return {
    minimumPayoutAmount: MINIMUM_PAYOUT_AMOUNT,
    providerCode,
    account: serializePayoutAccount(account),
    recentRequests: recentRequests.map(serializePayoutRequest),
    recentLedger: recentLedger.map(serializeLedgerEntry),
  };
}

export async function listStreamerPayoutRequests(fastify: FastifyInstance, request: FastifyRequest) {
  const streamerId = getStreamerIdFromAuth(request);
  const { page, pageSize } = parsePagination(request.query as Record<string, unknown>);
  const status = String((request.query as Record<string, unknown>).status ?? "").trim();

  const where = {
    streamerId,
    ...(status ? { status: status as never } : {}),
  };

  const [items, total] = await Promise.all([
    fastify.prisma.payoutRequest.findMany({
      where,
      include: {
        streamer: true,
        payoutAccount: true,
        reviewedBy: true,
      },
      orderBy: {
        requestedAt: "desc",
      },
      skip: getOffset(page, pageSize),
      take: pageSize,
    }),
    fastify.prisma.payoutRequest.count({ where }),
  ]);

  return {
    items: items.map(serializePayoutRequest),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
  };
}

export async function updateStreamerPayoutAccount(
  fastify: FastifyInstance,
  request: FastifyRequest,
  payload: unknown,
) {
  const streamerId = getStreamerIdFromAuth(request);
  const parsed = payoutAccountSchema.parse(payload);
  const existingAccount = (await fastify.prisma.streamerPayoutAccount.findUnique({
    where: {
      streamerId,
    },
  })) as PayoutAccountRecord | null;
  const nextSecurityCode = parsed.securityCode?.trim() || "";

  if (parsed.payoutsEnabled && !existingAccount?.withdrawalPinHash && !nextSecurityCode) {
    throw new AppError("Defina um numero de seguranca de 6 digitos para liberar os saques.", 400, "PAYOUT_SECURITY_CODE_REQUIRED");
  }

  const withdrawalPinHash = nextSecurityCode
    ? await hashPassword(nextSecurityCode)
    : existingAccount?.withdrawalPinHash ?? null;
  const withdrawalPinUpdatedAt = nextSecurityCode ? new Date() : existingAccount?.withdrawalPinUpdatedAt ?? null;

  const account = (await fastify.prisma.streamerPayoutAccount.upsert({
    where: {
      streamerId,
    },
    update: {
      legalName: parsed.legalName || null,
      document: parsed.document ? normalizeDocument(parsed.document) : null,
      pixKeyType: parsed.pixKeyType ?? null,
      pixKeyValue: parsed.pixKeyValue ? parsed.pixKeyValue.trim() : null,
      payoutsEnabled: parsed.payoutsEnabled,
      instantPayoutEnabled: parsed.instantPayoutEnabled,
      withdrawalPinHash,
      withdrawalPinUpdatedAt,
    } as Prisma.StreamerPayoutAccountUncheckedUpdateInput,
    create: {
      streamerId,
      legalName: parsed.legalName || null,
      document: parsed.document ? normalizeDocument(parsed.document) : null,
      pixKeyType: parsed.pixKeyType ?? null,
      pixKeyValue: parsed.pixKeyValue ? parsed.pixKeyValue.trim() : null,
      payoutsEnabled: parsed.payoutsEnabled,
      instantPayoutEnabled: parsed.instantPayoutEnabled,
      withdrawalPinHash,
      withdrawalPinUpdatedAt,
    } as Prisma.StreamerPayoutAccountUncheckedCreateInput,
  })) as PayoutAccountRecord;

  await writeAuditLog({
    prisma: fastify.prisma,
    actorUserId: request.authUser?.id,
    streamerId,
    entityType: "streamer_payout_account",
    entityId: account.id,
    action: "payout.account.updated",
    metadata: {
      pixKeyType: account.pixKeyType,
      payoutsEnabled: account.payoutsEnabled,
      instantPayoutEnabled: account.instantPayoutEnabled,
      securityCodeUpdated: Boolean(nextSecurityCode),
    },
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
  });

  return {
    account: serializePayoutAccount(account),
  };
}

export async function createStreamerPayoutRequest(
  fastify: FastifyInstance,
  request: FastifyRequest,
  payload: unknown,
) {
  const streamerId = getStreamerIdFromAuth(request);
  const parsed = payoutRequestSchema.parse(payload);
  const providerCode = await resolveDefaultPayoutProviderCode(fastify);

  const result = await fastify.prisma.$transaction(async (tx) => {
    const account = await ensurePayoutAccount(tx, streamerId);

    if (
      !account.payoutsEnabled ||
      !account.legalName ||
      !account.document ||
      !account.pixKeyType ||
      !account.pixKeyValue ||
      !account.withdrawalPinHash
    ) {
      throw new AppError("Configure sua conta PIX antes de solicitar um repasse.", 400, "PAYOUT_ACCOUNT_INCOMPLETE");
    }

    const isSecurityCodeValid = await verifyPassword(parsed.securityCode, account.withdrawalPinHash);

    if (!isSecurityCodeValid) {
      throw new AppError("Numero de seguranca invalido para concluir o saque.", 401, "INVALID_PAYOUT_SECURITY_CODE");
    }

    const availableBalance = decimalToNumber(account.availableBalance);
    const amount = roundCurrency(parsed.amount);

    if (amount > availableBalance) {
      throw new AppError("Saldo disponivel insuficiente para este saque.", 400, "INSUFFICIENT_PAYOUT_BALANCE");
    }

    const nextAvailableBalance = roundCurrency(availableBalance - amount);
    const nextLockedBalance = roundCurrency(decimalToNumber(account.lockedBalance) + amount);
    const payoutStatus = account.instantPayoutEnabled ? "PROCESSING" : "PENDING_APPROVAL";

    const payoutRequest = await tx.payoutRequest.create({
      data: {
        streamerId,
        payoutAccountId: account.id,
        providerCode,
        amount,
        feeAmount: 0,
        netAmount: amount,
        status: payoutStatus,
        idempotencyKey: createIdempotencyKey(),
      },
      include: {
        streamer: true,
        payoutAccount: true,
        reviewedBy: true,
      },
    });

    const updatedAccount = await tx.streamerPayoutAccount.update({
      where: {
        id: account.id,
      },
      data: {
        availableBalance: nextAvailableBalance,
        lockedBalance: nextLockedBalance,
      },
    });

    await tx.balanceLedgerEntry.create({
      data: {
        streamerId,
        payoutAccountId: account.id,
        payoutRequestId: payoutRequest.id,
        entryType: "PAYOUT_REQUEST",
        direction: "DEBIT",
        amount,
        feeAmount: 0,
        balanceAfter: nextAvailableBalance,
        description: account.instantPayoutEnabled
          ? "Saque iniciado pelo streamer com PIN de seguranca."
          : "Pedido de saque enviado para aprovacao manual.",
        metadata: {
          requestedAt: payoutRequest.requestedAt.toISOString(),
          instantPayout: account.instantPayoutEnabled,
        } satisfies Prisma.InputJsonValue,
      },
    });

    await writeAuditLog({
      prisma: tx,
      actorUserId: request.authUser?.id,
      streamerId,
      entityType: "payout_request",
      entityId: payoutRequest.id,
      action: "payout.request.created",
      metadata: {
        amount,
        instantPayout: account.instantPayoutEnabled,
      },
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return {
      account: updatedAccount,
      payoutRequest,
    };
  });

  await createStreamerNotification(fastify, {
    streamerId,
    type: "PAYMENT_CONFIRMED",
    title: result.account.instantPayoutEnabled ? "Saque iniciado" : "Pedido de saque enviado",
    message: result.account.instantPayoutEnabled
      ? "Seu saque foi enviado para processamento instantaneo."
      : "Seu pedido entrou na fila de aprovacao administrativa.",
    metadata: {
      payoutRequestId: result.payoutRequest.id,
      amount: decimalToNumber(result.payoutRequest.amount),
    },
  });

  if (!result.account.instantPayoutEnabled) {
    return {
      account: serializePayoutAccount(result.account),
      payoutRequest: serializePayoutRequest(result.payoutRequest),
    };
  }

  return executeProcessingPayout(fastify, request, result.payoutRequest.id, {
    successAuditAction: "payout.request.instant_paid",
    successTitle: "Saque concluido",
    successMessage: "O valor foi enviado para sua chave PIX imediatamente.",
  });
}

export async function listAdminPayoutRequests(fastify: FastifyInstance, request: FastifyRequest) {
  const { page, pageSize } = parsePagination(request.query as Record<string, unknown>);
  const status = String((request.query as Record<string, unknown>).status ?? "").trim();
  const search = String((request.query as Record<string, unknown>).search ?? "").trim();

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { streamer: { displayName: { contains: search } } },
            { streamer: { slug: { contains: search } } },
            { streamer: { user: { email: { contains: search } } } },
            { payoutAccount: { legalName: { contains: search } } },
            { payoutAccount: { pixKeyValue: { contains: search } } },
          ],
        }
      : {}),
  };

  const [items, total, groupedStatuses] = await Promise.all([
    fastify.prisma.payoutRequest.findMany({
      where,
      include: {
        streamer: true,
        payoutAccount: true,
        reviewedBy: true,
      },
      orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      skip: getOffset(page, pageSize),
      take: pageSize,
    }),
    fastify.prisma.payoutRequest.count({ where }),
    fastify.prisma.payoutRequest.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const summary = groupedStatuses.reduce(
    (accumulator, item) => {
      if (item.status === "PENDING_APPROVAL") {
        accumulator.pendingCount = item._count._all;
        accumulator.pendingAmount = decimalToNumber(item._sum.amount);
      }

      if (item.status === "PROCESSING") {
        accumulator.processingCount = item._count._all;
      }

      if (item.status === "PAID") {
        accumulator.paidCount = item._count._all;
        accumulator.paidAmount = decimalToNumber(item._sum.amount);
      }

      return accumulator;
    },
    {
      pendingCount: 0,
      processingCount: 0,
      paidCount: 0,
      pendingAmount: 0,
      paidAmount: 0,
    },
  );

  return {
    items: items.map(serializePayoutRequest),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
    summary,
  };
}

export async function approvePayoutRequest(
  fastify: FastifyInstance,
  request: FastifyRequest,
  payoutRequestId: string,
) {
  const reviewerId = request.authUser?.id;

  const marked = await fastify.prisma.payoutRequest.updateMany({
    where: {
      id: payoutRequestId,
      status: "PENDING_APPROVAL",
    },
    data: {
      status: "PROCESSING",
      reviewedAt: new Date(),
      reviewedByUserId: reviewerId,
    },
  });

  if (marked.count === 0) {
    throw new AppError("Este saque nao esta mais pendente para aprovacao.", 409, "PAYOUT_NOT_PENDING");
  }

  return executeProcessingPayout(fastify, request, payoutRequestId, {
    reviewedByUserId: reviewerId,
    successAuditAction: "payout.request.approved",
    successTitle: "Saque aprovado",
    successMessage: "Seu repasse foi enviado via PIX com sucesso.",
  });
}

export async function rejectPayoutRequest(
  fastify: FastifyInstance,
  request: FastifyRequest,
  payoutRequestId: string,
  payload: unknown,
) {
  const parsed = payoutRejectSchema.parse(payload);
  const reviewerId = request.authUser?.id;

  const result = await fastify.prisma.$transaction(async (tx) => {
    const payout = await tx.payoutRequest.findUnique({
      where: {
        id: payoutRequestId,
      },
      include: {
        streamer: true,
        payoutAccount: true,
        reviewedBy: true,
      },
    });

    if (!payout) {
      throw new AppError("Saque nao encontrado.", 404, "PAYOUT_NOT_FOUND");
    }

    if (payout.status !== "PENDING_APPROVAL") {
      throw new AppError("Apenas saques pendentes podem ser rejeitados.", 409, "PAYOUT_NOT_PENDING");
    }

    const nextAvailableBalance = roundCurrency(
      decimalToNumber(payout.payoutAccount.availableBalance) + decimalToNumber(payout.amount),
    );
    const nextLockedBalance = roundCurrency(
      Math.max(0, decimalToNumber(payout.payoutAccount.lockedBalance) - decimalToNumber(payout.amount)),
    );

    const updatedPayout = await tx.payoutRequest.update({
      where: {
        id: payout.id,
      },
      data: {
        status: "REJECTED",
        failureReason: parsed.reason,
        reviewedAt: new Date(),
        reviewedByUserId: reviewerId,
      },
      include: {
        streamer: true,
        payoutAccount: true,
        reviewedBy: true,
      },
    });

    const updatedAccount = await tx.streamerPayoutAccount.update({
      where: {
        id: payout.payoutAccountId,
      },
      data: {
        availableBalance: nextAvailableBalance,
        lockedBalance: nextLockedBalance,
      },
    });

    await tx.balanceLedgerEntry.create({
      data: {
        streamerId: payout.streamerId,
        payoutAccountId: payout.payoutAccountId,
        payoutRequestId: payout.id,
        entryType: "PAYOUT_REJECTED",
        direction: "CREDIT",
        amount: decimalToNumber(payout.amount),
        feeAmount: 0,
        balanceAfter: nextAvailableBalance,
        description: "Saque rejeitado e valor retornado ao saldo.",
        metadata: {
          reason: parsed.reason,
        } satisfies Prisma.InputJsonValue,
      },
    });

    await writeAuditLog({
      prisma: tx,
      actorUserId: reviewerId,
      streamerId: payout.streamerId,
      entityType: "payout_request",
      entityId: payout.id,
      action: "payout.request.rejected",
      metadata: {
        reason: parsed.reason,
      },
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return {
      updatedPayout,
      updatedAccount,
    };
  });

  await createStreamerNotification(fastify, {
    streamerId: result.updatedPayout.streamerId,
    type: "ALERT_BLOCKED",
    title: "Saque rejeitado",
    message: "O superadmin rejeitou o repasse e o valor voltou para seu saldo.",
    metadata: {
      payoutRequestId: result.updatedPayout.id,
      reason: result.updatedPayout.failureReason,
    },
  });

  return {
    payoutRequest: serializePayoutRequest(result.updatedPayout),
    account: serializePayoutAccount(result.updatedAccount),
  };
}
