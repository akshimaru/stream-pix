import type { FastifyInstance, FastifyRequest } from "fastify";
import { stringify } from "csv-stringify/sync";
import { subDays, startOfDay, endOfDay, startOfMonth } from "date-fns";
import { z } from "zod";
import {
  overlaySettingsSchema,
  streamerSettingsSchema,
  socketEvents,
  type AuthUser,
} from "@streampix/shared";
import { AppError } from "../../lib/errors.js";
import { decimalToNumber, serializeAlertQueueItem, serializePlan, serializeSubscription } from "../../lib/serializers.js";
import { getOffset, parsePagination } from "../../lib/http.js";
import { env } from "../../config/env.js";
import { chargeRoom } from "../../lib/socket.js";
import { deliverAlert } from "../alerts/service.js";
import { createStreamerNotification } from "../notifications/service.js";

const publicPageSettingsSchema = z.object({
  headline: z.string().min(3).max(140),
  description: z.string().min(10).max(400),
  minimumAmount: z.coerce.number().min(1).max(20000),
  maximumAmount: z.coerce.number().min(1).max(20000),
  minAmountForTts: z.coerce.number().min(0).max(20000),
  messageCharLimit: z.coerce.number().min(40).max(300),
  allowVoiceMessages: z.boolean(),
  allowLinks: z.boolean(),
  cooldownSeconds: z.coerce.number().min(0).max(300),
  autoModeration: z.boolean(),
  manualModeration: z.boolean(),
  blockedWords: z.array(z.string()).max(50),
});

function getStreamerIdFromAuth(authUser?: AuthUser) {
  if (!authUser?.streamerId) {
    throw new AppError("Workspace do streamer não encontrado.", 403, "STREAMER_CONTEXT_REQUIRED");
  }

  return authUser.streamerId;
}

async function getWorkspaceData(fastify: FastifyInstance, streamerId: string) {
  const streamer = await fastify.prisma.streamerProfile.findUnique({
    where: { id: streamerId },
    include: {
      overlaySettings: true,
      publicPageSettings: true,
      streamerSettings: true,
      subscriptions: {
        where: {
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
        take: 1,
      },
    },
  });

  if (!streamer || !streamer.overlaySettings || !streamer.publicPageSettings || !streamer.streamerSettings) {
    throw new AppError("Workspace do streamer não encontrado.", 404, "STREAMER_NOT_FOUND");
  }

  return streamer;
}

export async function getStreamerWorkspaceBootstrap(fastify: FastifyInstance, request: FastifyRequest) {
  const streamerId = getStreamerIdFromAuth(request.authUser);
  const streamer = await getWorkspaceData(fastify, streamerId);
  const subscription = streamer.subscriptions[0];

  return {
    profile: {
      id: streamer.id,
      displayName: streamer.displayName,
      slug: streamer.slug,
      status: streamer.status,
      bio: streamer.bio,
      avatarUrl: streamer.avatarUrl,
      bannerUrl: streamer.bannerUrl,
      logoUrl: streamer.logoUrl,
      overlayToken: streamer.overlayToken,
      publicUrl: `${env.WEB_ORIGIN}/s/${streamer.slug}`,
      overlayUrl: `${env.WEB_ORIGIN}/widget/alerts/${streamer.overlayToken}`,
    },
    overlaySettings: streamer.overlaySettings,
    publicPageSettings: streamer.publicPageSettings,
    streamerSettings: streamer.streamerSettings,
    subscription: subscription ? serializeSubscription(subscription) : null,
    currentPlan: subscription ? serializePlan(subscription.plan) : null,
  };
}

export async function getStreamerOverview(fastify: FastifyInstance, request: FastifyRequest) {
  const streamerId = getStreamerIdFromAuth(request.authUser);
  const streamer = await getWorkspaceData(fastify, streamerId);
  const now = new Date();
  const today = startOfDay(now);
  const week = subDays(now, 7);
  const month = startOfMonth(now);
  const subscription = streamer.subscriptions[0];

  const [todayTotals, weekTotals, monthTotals, pendingAlerts, ttsExecuted, messagesCount, recentCharges, topSupporters, paymentProvider, ttsProvider] =
    await Promise.all([
      fastify.prisma.pixCharge.aggregate({
        where: { streamerId, status: "PAID", isTest: false, confirmedAt: { gte: today } },
        _sum: { amount: true, netAmount: true, platformFee: true },
      }),
      fastify.prisma.pixCharge.aggregate({
        where: { streamerId, status: "PAID", isTest: false, confirmedAt: { gte: week } },
        _sum: { amount: true, netAmount: true, platformFee: true },
      }),
      fastify.prisma.pixCharge.aggregate({
        where: { streamerId, status: "PAID", isTest: false, confirmedAt: { gte: month } },
        _sum: { amount: true, netAmount: true, platformFee: true },
      }),
      fastify.prisma.alert.count({
        where: {
          streamerId,
          charge: {
            isTest: false,
          },
          status: {
            in: ["PROCESSING", "QUEUED"],
          },
        },
      }),
      fastify.prisma.alert.count({
        where: {
          streamerId,
          charge: {
            isTest: false,
          },
          OR: [
            {
              ttsExecuted: true,
            },
            {
              ttsJob: {
                is: {
                  status: "SPOKEN",
                },
              },
            },
          ],
        },
      }),
      fastify.prisma.pixCharge.count({
        where: {
          streamerId,
          status: "PAID",
          isTest: false,
        },
      }),
      fastify.prisma.pixCharge.findMany({
        where: {
          streamerId,
          isTest: false,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      }),
      fastify.prisma.pixCharge.groupBy({
        by: ["viewerName"],
        where: {
          streamerId,
          status: "PAID",
          isTest: false,
          isAnonymous: false,
        },
        _sum: {
          amount: true,
        },
        _count: {
          _all: true,
        },
        orderBy: {
          _sum: {
            amount: "desc",
          },
        },
        take: 5,
      }),
      fastify.prisma.paymentProvider.findFirst({ where: { isDefault: true } }),
      fastify.prisma.ttsProvider.findFirst({ where: { isDefault: true } }),
    ]);

  return {
    streamerId,
    displayName: streamer.displayName,
    slug: streamer.slug,
    status: streamer.status,
    currentPlan: subscription ? serializePlan(subscription.plan) : null,
    subscriptionStatus: subscription?.status ?? "PAST_DUE",
    totals: {
      today: decimalToNumber(todayTotals._sum.amount),
      week: decimalToNumber(weekTotals._sum.amount),
      month: decimalToNumber(monthTotals._sum.amount),
      gross: decimalToNumber(monthTotals._sum.amount),
      net: decimalToNumber(monthTotals._sum.netAmount),
      fees: decimalToNumber(monthTotals._sum.platformFee),
    },
    counts: {
      messages: messagesCount,
      ttsExecuted,
      pendingAlerts,
    },
    overlayUrl: `${env.WEB_ORIGIN}/widget/alerts/${streamer.overlayToken}`,
    publicUrl: `${env.WEB_ORIGIN}/s/${streamer.slug}`,
    paymentProviderName: paymentProvider?.name ?? "Mock PIX",
    ttsProviderName: ttsProvider?.name ?? "Mock TTS",
    recentTransactions: recentCharges.map((charge) => ({
      id: charge.id,
      supporterName: charge.viewerName,
      amount: decimalToNumber(charge.amount),
      status: charge.status,
      createdAt: charge.createdAt.toISOString(),
      confirmedAt: charge.confirmedAt?.toISOString() ?? null,
    })),
    topSupporters: topSupporters.map((supporter) => ({
      name: supporter.viewerName,
      amount: decimalToNumber(supporter._sum.amount),
      donations: supporter._count._all,
    })),
  };
}

export async function getStreamerAnalytics(fastify: FastifyInstance, request: FastifyRequest) {
  const streamerId = getStreamerIdFromAuth(request.authUser);
  const metrics = await fastify.prisma.usageMetric.findMany({
    where: {
      streamerId,
      periodStart: {
        gte: subDays(startOfDay(new Date()), 6),
      },
    },
    orderBy: {
      periodStart: "asc",
    },
  });

  return metrics.map((metric) => ({
    label: metric.periodStart.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
    grossAmount: decimalToNumber(metric.grossAmount),
    netAmount: decimalToNumber(metric.netAmount),
    messages: metric.messagesCount,
  }));
}

export async function listStreamerPayments(fastify: FastifyInstance, request: FastifyRequest) {
  const streamerId = getStreamerIdFromAuth(request.authUser);
  const { page, pageSize } = parsePagination(request.query as Record<string, unknown>);
  const search = String((request.query as Record<string, unknown>).search ?? "").trim();
  const status = String((request.query as Record<string, unknown>).status ?? "").trim();
  const sort = String((request.query as Record<string, unknown>).sort ?? "createdAt:desc");
  const [sortField, sortDirection] = sort.split(":");

  const where = {
    streamerId,
    isTest: false,
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { viewerName: { contains: search } },
            { viewerMessage: { contains: search } },
            { txid: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    fastify.prisma.pixCharge.findMany({
      where,
      orderBy: {
        [sortField || "createdAt"]: sortDirection === "asc" ? "asc" : "desc",
      },
      skip: getOffset(page, pageSize),
      take: pageSize,
    }),
    fastify.prisma.pixCharge.count({ where }),
  ]);

  return {
    items: items.map((charge) => ({
      id: charge.id,
      txid: charge.txid,
      supporterName: charge.viewerName,
      message: charge.viewerMessage,
      amount: decimalToNumber(charge.amount),
      status: charge.status,
      isAnonymous: charge.isAnonymous,
      confirmedAt: charge.confirmedAt?.toISOString() ?? null,
      createdAt: charge.createdAt.toISOString(),
    })),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
  };
}

export async function listStreamerAlerts(fastify: FastifyInstance, request: FastifyRequest) {
  const streamerId = getStreamerIdFromAuth(request.authUser);
  const { page, pageSize } = parsePagination(request.query as Record<string, unknown>);
  const status = String((request.query as Record<string, unknown>).status ?? "").trim();

  const where = {
    streamerId,
    ...(status ? { status: status as never } : {}),
  };

  const [items, total] = await Promise.all([
    fastify.prisma.alert.findMany({
      where,
      include: {
        ttsJob: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: getOffset(page, pageSize),
      take: pageSize,
    }),
    fastify.prisma.alert.count({ where }),
  ]);

  return {
    items: items.map(serializeAlertQueueItem),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
  };
}

export async function updateOverlaySettings(fastify: FastifyInstance, request: FastifyRequest, payload: unknown) {
  const streamerId = getStreamerIdFromAuth(request.authUser);
  const parsed = overlaySettingsSchema.parse(payload);

  return fastify.prisma.overlaySettings.update({
    where: {
      streamerId,
    },
    data: parsed,
  });
}

export async function updateStreamerSettings(fastify: FastifyInstance, request: FastifyRequest, payload: unknown) {
  const streamerId = getStreamerIdFromAuth(request.authUser);
  const parsed = streamerSettingsSchema.parse(payload);

  return fastify.prisma.streamerSettings.update({
    where: {
      streamerId,
    },
    data: parsed,
  });
}

export async function updatePublicPageSettings(
  fastify: FastifyInstance,
  request: FastifyRequest,
  payload: unknown,
) {
  const streamerId = getStreamerIdFromAuth(request.authUser);
  const parsed = publicPageSettingsSchema.parse(payload);

  return fastify.prisma.publicPageSettings.update({
    where: {
      streamerId,
    },
    data: parsed,
  });
}

export async function getStreamerNotifications(fastify: FastifyInstance, request: FastifyRequest) {
  const streamerId = getStreamerIdFromAuth(request.authUser);
  const notifications = await fastify.prisma.notification.findMany({
    where: {
      streamerId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  return notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  }));
}

export async function approveAlert(fastify: FastifyInstance, request: FastifyRequest, alertId: string) {
  const streamerId = getStreamerIdFromAuth(request.authUser);
  const alert = await fastify.prisma.alert.findFirst({
    where: {
      id: alertId,
      streamerId,
    },
  });

  if (!alert) {
    throw new AppError("Alerta não encontrado.", 404, "ALERT_NOT_FOUND");
  }

  if (alert.status === "REJECTED") {
    throw new AppError("Este alerta já foi rejeitado.", 400, "ALERT_ALREADY_REJECTED");
  }

  await fastify.prisma.alert.update({
    where: { id: alertId },
    data: {
      status: "QUEUED",
    },
  });

  const event = await deliverAlert(fastify, alertId, { manuallyApproved: true });

  return {
    approved: true,
    event,
  };
}

export async function rejectAlert(fastify: FastifyInstance, request: FastifyRequest, alertId: string) {
  const streamerId = getStreamerIdFromAuth(request.authUser);
  const alert = await fastify.prisma.alert.findFirst({
    where: {
      id: alertId,
      streamerId,
    },
    include: {
      charge: true,
    },
  });

  if (!alert) {
    throw new AppError("Alerta não encontrado.", 404, "ALERT_NOT_FOUND");
  }

  await fastify.prisma.alert.update({
    where: { id: alertId },
    data: {
      status: "REJECTED",
    },
  });

  fastify.io.to(chargeRoom(alert.chargeId)).emit(socketEvents.chargeStatus, {
    chargeId: alert.chargeId,
    status: "REJECTED",
  });

  await createStreamerNotification(fastify, {
    streamerId,
    type: "ALERT_BLOCKED",
    title: "Mensagem rejeitada",
    message: "Você rejeitou uma mensagem pendente antes do envio ao overlay.",
    metadata: {
      alertId,
    },
  });

  return { rejected: true };
}

export async function completeOnboarding(fastify: FastifyInstance, request: FastifyRequest) {
  const streamerId = getStreamerIdFromAuth(request.authUser);

  await fastify.prisma.streamerSettings.update({
    where: {
      streamerId,
    },
    data: {
      onboardingCompletedAt: new Date(),
    },
  });

  return { completed: true };
}

export async function exportStreamerPaymentsCsv(fastify: FastifyInstance, request: FastifyRequest) {
  const streamerId = getStreamerIdFromAuth(request.authUser);
  const rows = await fastify.prisma.pixCharge.findMany({
    where: {
      streamerId,
      isTest: false,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 2000,
  });

  return stringify(
    rows.map((row) => ({
      id: row.id,
      txid: row.txid,
      supporterName: row.viewerName,
      amount: decimalToNumber(row.amount),
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      confirmedAt: row.confirmedAt?.toISOString() ?? "",
    })),
    {
      header: true,
    },
  );
}
