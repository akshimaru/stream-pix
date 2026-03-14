import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Prisma } from "@prisma/client";
import { stringify } from "csv-stringify/sync";
import { z } from "zod";
import { subDays } from "date-fns";
import jwt from "jsonwebtoken";
import { AppError } from "../../lib/errors.js";
import { decimalToNumber, serializePlan } from "../../lib/serializers.js";
import { getOffset, parsePagination } from "../../lib/http.js";
import { env } from "../../config/env.js";
import {
  getMercadoPagoProviderConfig,
  mercadoPagoRequest,
  serializeMercadoPagoProviderConfigForAdmin,
} from "../payment-providers/mercado-pago-shared.js";

const planInputSchema = z.object({
  code: z.string().min(2).max(64),
  name: z.string().min(2).max(120),
  description: z.string().max(255).optional().nullable(),
  monthlyPrice: z.coerce.number().min(0),
  yearlyPrice: z.coerce.number().min(0),
  feePercentage: z.coerce.number().min(0).max(100),
  fixedFee: z.coerce.number().min(0).max(999),
  messageLimit: z.coerce.number().int().positive().optional().nullable(),
  ttsLimit: z.coerce.number().int().positive().optional().nullable(),
  messageCharLimit: z.coerce.number().int().min(40).max(500),
  hasPremiumVoices: z.boolean(),
  hasAdvancedAnalytics: z.boolean(),
  removeBranding: z.boolean(),
  hasAdvancedModeration: z.boolean(),
  highlight: z.boolean(),
  active: z.boolean(),
  features: z.array(z.string()).min(1),
});

const mercadoPagoAdminConfigSchema = z.object({
  accessToken: z.string().trim().optional().default(""),
  publicKey: z.string().trim().optional().default(""),
  webhookSecret: z.string().trim().optional().default(""),
  notificationUrl: z.string().trim().optional().default(""),
  paymentExpirationMinutes: z.coerce.number().int().min(5).max(1440).default(30),
  requirePayerEmail: z.boolean().default(true),
  requirePayerDocument: z.boolean().default(false),
  statementDescriptor: z.string().trim().max(22).optional().default("STREAMPIX"),
  testMode: z.boolean().default(false),
  supportsPayouts: z.boolean().default(false),
  payoutAccessToken: z.string().trim().optional().default(""),
  payoutNotificationUrl: z.string().trim().optional().default(""),
  payoutEnforceSignature: z.boolean().default(false),
  payoutPrivateKeyPem: z.string().trim().optional().default(""),
});

const paymentProviderInputSchema = z.object({
  name: z.string().min(2).max(120),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  feePercentage: z.coerce.number().min(0).max(100),
  fixedFee: z.coerce.number().min(0).max(999),
  config: z.record(z.string(), z.unknown()).optional().default({}),
});

function mergeMercadoPagoConfig(existingConfig: unknown, incomingConfig: Record<string, unknown>) {
  const existing = getMercadoPagoProviderConfig(existingConfig);
  const incoming = mercadoPagoAdminConfigSchema.parse(incomingConfig);

  return {
    ...existing,
    ...incoming,
    accessToken: incoming.accessToken || existing.accessToken,
    webhookSecret: incoming.webhookSecret || existing.webhookSecret,
    payoutAccessToken: incoming.payoutAccessToken || existing.payoutAccessToken,
    payoutPrivateKeyPem: incoming.payoutPrivateKeyPem || existing.payoutPrivateKeyPem,
  };
}

function serializeAdminPaymentProvider(provider: {
  id: string;
  code: string;
  name: string;
  driver: string;
  type: string;
  isActive: boolean;
  isDefault: boolean;
  feePercentage: unknown;
  fixedFee: unknown;
  config: unknown;
}) {
  return {
    id: provider.id,
    code: provider.code,
    name: provider.name,
    driver: provider.driver,
    type: provider.type,
    isActive: provider.isActive,
    isDefault: provider.isDefault,
    feePercentage: decimalToNumber(provider.feePercentage),
    fixedFee: decimalToNumber(provider.fixedFee),
    webhookUrl: `${env.SERVER_URL}/v1/webhooks/payment/${provider.code}?source_news=webhooks`,
    config:
      provider.code === "MERCADO_PAGO"
        ? serializeMercadoPagoProviderConfigForAdmin(provider.config)
        : provider.config,
  };
}

export async function getAdminOverview(fastify: FastifyInstance) {
  const [activeSubscriptions, platformCharges, activeStreamers, newAccounts, alertsExecuted, ttsExecuted, recentStreamers] =
    await Promise.all([
      fastify.prisma.subscription.findMany({
        where: {
          status: {
            in: ["ACTIVE", "TRIALING"],
          },
        },
        include: {
          plan: true,
          streamer: true,
        },
      }),
      fastify.prisma.pixCharge.aggregate({
        where: {
          status: "PAID",
          isTest: false,
        },
        _sum: {
          amount: true,
          platformFee: true,
        },
      }),
      fastify.prisma.streamerProfile.count({
        where: {
          status: "ACTIVE",
        },
      }),
      fastify.prisma.user.count({
        where: {
          createdAt: {
            gte: subDays(new Date(), 30),
          },
        },
      }),
      fastify.prisma.alert.count({
        where: {
          status: "DISPLAYED",
          charge: {
            isTest: false,
          },
        },
      }),
      fastify.prisma.alert.count({
        where: {
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
      fastify.prisma.streamerProfile.findMany({
        include: {
          subscriptions: {
            where: {
              status: {
                in: ["ACTIVE", "TRIALING"],
              },
            },
            include: {
              plan: true,
            },
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
          },
          pixCharges: {
            where: {
              status: "PAID",
              isTest: false,
              confirmedAt: {
                gte: subDays(new Date(), 30),
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      }),
    ]);

  const monthlyRecurringRevenue = activeSubscriptions.reduce((total, subscription) => {
    const amount =
      subscription.billingCycle === "YEARLY"
        ? decimalToNumber(subscription.plan.yearlyPrice) / 12
        : decimalToNumber(subscription.plan.monthlyPrice);

    return total + amount;
  }, 0);

  return {
    totals: {
      mrr: Number(monthlyRecurringRevenue.toFixed(2)),
      arr: Number((monthlyRecurringRevenue * 12).toFixed(2)),
      totalProcessed: decimalToNumber(platformCharges._sum.amount),
      totalFees: decimalToNumber(platformCharges._sum.platformFee),
      activeStreamers,
      newAccounts,
      alertsExecuted,
      ttsExecuted,
    },
    recentStreamers: recentStreamers.map((streamer) => ({
      id: streamer.id,
      name: streamer.displayName,
      slug: streamer.slug,
      status: streamer.status,
      planName: streamer.subscriptions[0]?.plan.name ?? "Sem plano",
      monthlyRevenue: streamer.pixCharges.reduce((sum, charge) => sum + decimalToNumber(charge.amount), 0),
    })),
  };
}

export async function listAdminStreamers(fastify: FastifyInstance, request: FastifyRequest) {
  const { page, pageSize } = parsePagination(request.query as Record<string, unknown>);
  const search = String((request.query as Record<string, unknown>).search ?? "").trim();
  const status = String((request.query as Record<string, unknown>).status ?? "").trim();

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { displayName: { contains: search } },
            { slug: { contains: search } },
            { user: { email: { contains: search } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    fastify.prisma.streamerProfile.findMany({
      where,
      include: {
        user: true,
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
      skip: getOffset(page, pageSize),
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
    }),
    fastify.prisma.streamerProfile.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      displayName: item.displayName,
      slug: item.slug,
      email: item.user.email,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      planName: item.subscriptions[0]?.plan.name ?? "Sem plano",
    })),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
  };
}

export async function listAdminPlans(fastify: FastifyInstance) {
  const plans = await fastify.prisma.plan.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      monthlyPrice: "asc",
    },
  });

  return plans.map(serializePlan);
}

export async function createAdminPlan(fastify: FastifyInstance, payload: unknown) {
  const parsed = planInputSchema.parse(payload);

  const existing = await fastify.prisma.plan.findUnique({
    where: { code: parsed.code },
  });

  if (existing) {
    throw new AppError("Já existe um plano com este código.", 409, "PLAN_CODE_EXISTS");
  }

  const plan = await fastify.prisma.plan.create({
    data: parsed,
  });

  return serializePlan(plan);
}

export async function updateAdminPlan(fastify: FastifyInstance, planId: string, payload: unknown) {
  const parsed = planInputSchema.partial().parse(payload);

  const plan = await fastify.prisma.plan.update({
    where: { id: planId },
    data: parsed,
  });

  return serializePlan(plan);
}

export async function listAdminPaymentProviders(fastify: FastifyInstance) {
  const providers = await fastify.prisma.paymentProvider.findMany({
    orderBy: [
      {
        isDefault: "desc",
      },
      {
        createdAt: "asc",
      },
    ],
  });

  return {
    items: providers.map(serializeAdminPaymentProvider),
  };
}

export async function updateAdminPaymentProvider(
  fastify: FastifyInstance,
  providerId: string,
  payload: unknown,
) {
  const parsed = paymentProviderInputSchema.parse(payload);
  const provider = await fastify.prisma.paymentProvider.findUnique({
    where: {
      id: providerId,
    },
  });

  if (!provider) {
    throw new AppError("Provider PIX nao encontrado.", 404, "PAYMENT_PROVIDER_NOT_FOUND");
  }

  if (parsed.isDefault && !parsed.isActive) {
    throw new AppError("O provider padrao precisa estar ativo.", 400, "PAYMENT_PROVIDER_DEFAULT_MUST_BE_ACTIVE");
  }

  const nextConfig =
    provider.code === "MERCADO_PAGO"
      ? mergeMercadoPagoConfig(provider.config, parsed.config)
      : {
          ...(provider.config && typeof provider.config === "object" ? (provider.config as Record<string, unknown>) : {}),
          ...parsed.config,
        };

  const updatedProvider = await fastify.prisma.$transaction(async (tx) => {
    if (parsed.isDefault) {
      await tx.paymentProvider.updateMany({
        where: {
          id: {
            not: provider.id,
          },
        },
        data: {
          isDefault: false,
        },
      });
    }

    return tx.paymentProvider.update({
      where: {
        id: provider.id,
      },
      data: {
        name: parsed.name,
        isActive: parsed.isActive,
        isDefault: parsed.isDefault,
        feePercentage: parsed.feePercentage,
        fixedFee: parsed.fixedFee,
        config: nextConfig as Prisma.InputJsonValue,
      },
    });
  });

  return serializeAdminPaymentProvider(updatedProvider);
}

export async function testAdminPaymentProvider(
  fastify: FastifyInstance,
  providerId: string,
) {
  const provider = await fastify.prisma.paymentProvider.findUnique({
    where: {
      id: providerId,
    },
  });

  if (!provider) {
    throw new AppError("Provider PIX nao encontrado.", 404, "PAYMENT_PROVIDER_NOT_FOUND");
  }

  if (provider.code === "MOCK_PIX") {
    return {
      status: "ok",
      providerCode: provider.code,
      message: "Provider mock local pronto para desenvolvimento.",
    };
  }

  if (provider.code !== "MERCADO_PAGO") {
    return {
      status: "unknown",
      providerCode: provider.code,
      message: "Teste automatico ainda nao implementado para este provider.",
    };
  }

  const config = getMercadoPagoProviderConfig(provider.config);

  if (!config.accessToken) {
    throw new AppError("Configure o Access Token do Mercado Pago para testar a conexao.", 400, "MERCADO_PAGO_ACCESS_TOKEN_MISSING");
  }

  const account = await mercadoPagoRequest<Record<string, unknown>>({
    accessToken: config.accessToken,
    path: "/users/me",
  });

  let payoutStatus: "disabled" | "configured" | "missing_token" = "disabled";

  if (config.supportsPayouts) {
    payoutStatus = config.payoutAccessToken || config.accessToken ? "configured" : "missing_token";
  }

  return {
    status: "ok",
    providerCode: provider.code,
    message: "Credenciais do Mercado Pago validadas com sucesso.",
    account: {
      id: typeof account.id === "number" || typeof account.id === "string" ? String(account.id) : null,
      nickname: typeof account.nickname === "string" ? account.nickname : null,
      email: typeof account.email === "string" ? account.email : null,
      siteId: typeof account.site_id === "string" ? account.site_id : null,
    },
    payoutStatus,
  };
}

export async function listAdminTransactions(fastify: FastifyInstance, request: FastifyRequest) {
  const { page, pageSize } = parsePagination(request.query as Record<string, unknown>);
  const status = String((request.query as Record<string, unknown>).status ?? "").trim();
  const search = String((request.query as Record<string, unknown>).search ?? "").trim();

  const where = {
    isTest: false,
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { viewerName: { contains: search } },
            { txid: { contains: search } },
            { streamer: { displayName: { contains: search } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    fastify.prisma.pixCharge.findMany({
      where,
      include: {
        streamer: true,
      },
      skip: getOffset(page, pageSize),
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
    }),
    fastify.prisma.pixCharge.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      txid: item.txid,
      streamerName: item.streamer.displayName,
      streamerSlug: item.streamer.slug,
      supporterName: item.viewerName,
      amount: decimalToNumber(item.amount),
      platformFee: decimalToNumber(item.platformFee),
      status: item.status,
      confirmedAt: item.confirmedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
  };
}

export async function listAuditLogs(fastify: FastifyInstance) {
  const logs = await fastify.prisma.auditLog.findMany({
    include: {
      actor: true,
      streamer: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    actor: log.actor?.email ?? "system",
    streamer: log.streamer?.displayName ?? null,
    createdAt: log.createdAt.toISOString(),
  }));
}

export async function toggleStreamerStatus(fastify: FastifyInstance, streamerId: string) {
  const streamer = await fastify.prisma.streamerProfile.findUnique({
    where: { id: streamerId },
  });

  if (!streamer) {
    throw new AppError("Streamer não encontrado.", 404, "STREAMER_NOT_FOUND");
  }

  const nextStatus = streamer.status === "BLOCKED" ? "ACTIVE" : "BLOCKED";

  return fastify.prisma.streamerProfile.update({
    where: {
      id: streamerId,
    },
    data: {
      status: nextStatus,
    },
  });
}

export async function changeStreamerPlan(
  fastify: FastifyInstance,
  streamerId: string,
  planId: string,
) {
  const subscription = await fastify.prisma.subscription.findFirst({
    where: {
      streamerId,
      status: {
        in: ["ACTIVE", "TRIALING"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!subscription) {
    throw new AppError("Assinatura não encontrada.", 404, "SUBSCRIPTION_NOT_FOUND");
  }

  return fastify.prisma.subscription.update({
    where: {
      id: subscription.id,
    },
    data: {
      planId,
      status: "ACTIVE",
    },
  });
}

export async function exportAdminTransactionsCsv(fastify: FastifyInstance) {
  const rows = await fastify.prisma.pixCharge.findMany({
    where: {
      isTest: false,
    },
    include: {
      streamer: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5000,
  });

  return stringify(
    rows.map((row) => ({
      id: row.id,
      txid: row.txid,
      streamer: row.streamer.displayName,
      supporterName: row.viewerName,
      amount: decimalToNumber(row.amount),
      platformFee: decimalToNumber(row.platformFee),
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      confirmedAt: row.confirmedAt?.toISOString() ?? "",
    })),
    {
      header: true,
    },
  );
}

export async function createImpersonationPayload(
  fastify: FastifyInstance,
  streamerId: string,
  request: FastifyRequest,
) {
  const streamer = await fastify.prisma.streamerProfile.findUnique({
    where: { id: streamerId },
  });

  if (!streamer) {
    throw new AppError("Streamer não encontrado.", 404, "STREAMER_NOT_FOUND");
  }

  const token = jwt.sign(
    {
      streamerId,
      type: "support-impersonation",
      actorId: request.authUser?.id,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: "10m",
    },
  );

  return {
    token,
    streamerId,
    streamerSlug: streamer.slug,
    displayName: streamer.displayName,
  };
}
