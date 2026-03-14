import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AuthUser, LoginInput, RegisterInput, ResetPasswordInput, RoleKey } from "@streampix/shared";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { addDays, addHours } from "date-fns";
import jwt from "jsonwebtoken";
import { loginSchema, registerSchema, resetPasswordSchema } from "@streampix/shared";
import { AppError } from "../../lib/errors.js";
import { hashPassword, hashToken, verifyPassword, createOpaqueToken, createPublicToken } from "../../lib/security.js";
import { zodToAppError } from "../../lib/http.js";
import { writeAuditLog } from "../../lib/audit.js";
import { env, isProd } from "../../config/env.js";

const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN_DAYS = 30;
const SOCKET_EXPIRES_IN = "2h";

type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    roles: {
      include: {
        role: true;
      };
    };
    streamerProfile: true;
  };
}>;

export interface SessionPayload {
  sub: string;
  roles: RoleKey[];
  streamerId?: string;
  streamerSlug?: string;
  type: "access" | "refresh" | "socket";
}

function buildAuthUser(user: NonNullable<UserWithRelations>): AuthUser {
  const roles = user.roles.map((item) => item.role.code as RoleKey);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles,
    streamerId: user.streamerProfile?.id,
    streamerSlug: user.streamerProfile?.slug,
    streamerDisplayName: user.streamerProfile?.displayName,
  };
}

export async function findUserById(fastify: FastifyInstance, userId: string) {
  return fastify.prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
      streamerProfile: true,
    },
  });
}

export function signAccessToken(payload: Omit<SessionPayload, "type">) {
  return jwt.sign(
    { ...payload, type: "access" satisfies SessionPayload["type"] },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: ACCESS_EXPIRES_IN,
    },
  );
}

export function signRefreshToken(payload: Omit<SessionPayload, "type">) {
  return jwt.sign(
    { ...payload, type: "refresh" satisfies SessionPayload["type"] },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: `${REFRESH_EXPIRES_IN_DAYS}d`,
    },
  );
}

export function signSocketToken(payload: Omit<SessionPayload, "type">) {
  return jwt.sign(
    { ...payload, type: "socket" satisfies SessionPayload["type"] },
    env.JWT_SOCKET_SECRET,
    {
      expiresIn: SOCKET_EXPIRES_IN,
    },
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as SessionPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as SessionPayload;
}

export function verifySocketToken(token: string) {
  return jwt.verify(token, env.JWT_SOCKET_SECRET) as SessionPayload;
}

export async function createSessionTokens(_fastify: FastifyInstance, user: AuthUser) {
  const basePayload: Omit<SessionPayload, "type"> = {
    sub: user.id,
    roles: user.roles,
    streamerId: user.streamerId,
    streamerSlug: user.streamerSlug,
  };

  const accessToken = signAccessToken(basePayload);
  const refreshToken = signRefreshToken(basePayload);
  const socketToken = signSocketToken(basePayload);

  return { accessToken, refreshToken, socketToken };
}

export async function persistRefreshToken(fastify: FastifyInstance, userId: string, refreshToken: string) {
  await fastify.prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: addDays(new Date(), REFRESH_EXPIRES_IN_DAYS),
    },
  });
}

export async function revokeRefreshToken(fastify: FastifyInstance, refreshToken?: string) {
  if (!refreshToken) {
    return;
  }

  await fastify.prisma.refreshToken.updateMany({
    where: {
      tokenHash: hashToken(refreshToken),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export function setSessionCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.COOKIE_SECURE || isProd,
    domain: env.COOKIE_DOMAIN,
    path: "/",
  };

  reply.setCookie(env.ACCESS_COOKIE_NAME, accessToken, {
    ...cookieOptions,
    maxAge: 60 * 15,
  });

  reply.setCookie(env.REFRESH_COOKIE_NAME, refreshToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * REFRESH_EXPIRES_IN_DAYS,
  });
}

export function clearSessionCookies(reply: FastifyReply) {
  reply.clearCookie(env.ACCESS_COOKIE_NAME, {
    path: "/",
    domain: env.COOKIE_DOMAIN,
  });
  reply.clearCookie(env.REFRESH_COOKIE_NAME, {
    path: "/",
    domain: env.COOKIE_DOMAIN,
  });
}

export async function authenticateRequest(fastify: FastifyInstance, request: FastifyRequest) {
  const bearer = request.headers.authorization?.replace("Bearer ", "");
  const token = bearer || request.cookies[env.ACCESS_COOKIE_NAME];

  if (!token) {
    throw new AppError("Sessão não encontrada.", 401, "UNAUTHORIZED");
  }

  const payload = verifyAccessToken(token);

  if (payload.type !== "access") {
    throw new AppError("Token inválido.", 401, "INVALID_TOKEN");
  }

  const user = await findUserById(fastify, payload.sub);

  if (!user || !user.isActive || user.deletedAt) {
    throw new AppError("Usuário não encontrado ou inativo.", 401, "UNAUTHORIZED");
  }

  request.authUser = buildAuthUser(user);
}

export async function requireRoles(
  fastify: FastifyInstance,
  request: FastifyRequest,
  roles: RoleKey[],
) {
  await authenticateRequest(fastify, request);

  const authUser = request.authUser;

  if (!authUser) {
    throw new AppError("Usuário não autenticado.", 401, "UNAUTHORIZED");
  }

  const hasPermission = roles.some((role) => authUser.roles.includes(role));

  if (!hasPermission) {
    throw new AppError("Você não tem permissão para acessar este recurso.", 403, "FORBIDDEN");
  }
}

export async function registerStreamer(
  fastify: FastifyInstance,
  input: RegisterInput,
  request: FastifyRequest,
) {
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    throw zodToAppError(parsed.error);
  }

  const existingEmail = await fastify.prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingEmail) {
    throw new AppError("Este e-mail já está em uso.", 409, "EMAIL_TAKEN");
  }

  const existingSlug = await fastify.prisma.streamerProfile.findUnique({
    where: { slug: parsed.data.slug },
  });

  if (existingSlug) {
    throw new AppError("Este slug já está em uso.", 409, "SLUG_TAKEN");
  }

  const streamerRole = await fastify.prisma.role.findUnique({
    where: { code: "STREAMER" },
  });

  const starterPlan =
    (await fastify.prisma.plan.findFirst({
      where: { active: true, code: "STARTER" },
    })) ??
    (await fastify.prisma.plan.findFirst({
      where: { active: true },
      orderBy: { monthlyPrice: "asc" },
    }));

  if (!streamerRole || !starterPlan) {
    throw new AppError("Configuração inicial da plataforma não encontrada.", 500, "BOOTSTRAP_ERROR");
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const now = new Date();

  const user = await fastify.prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        roles: {
          create: {
            roleId: streamerRole.id,
          },
        },
        streamerProfile: {
          create: {
            workspaceName: parsed.data.channelName,
            displayName: parsed.data.channelName,
            slug: parsed.data.slug,
            bio: "Streamer demo pronto para receber PIX com voz e overlay em tempo real.",
            overlayToken: createPublicToken("ovl"),
            publicApiToken: createPublicToken("pub"),
            overlaySettings: {
              create: {
                themePreset: "NEON",
                alertSound: "CHIME",
                primaryColor: "#7c3aed",
                secondaryColor: "#22d3ee",
                accentColor: "#f472b6",
                fontFamily: "Rajdhani, sans-serif",
                cardWidth: 420,
                position: "BOTTOM_RIGHT",
                transparency: 14,
                animationIn: "slide-up",
                animationOut: "fade-out",
                durationMs: 6500,
                showAmount: true,
                showName: true,
                showAvatar: false,
                volume: 92,
              },
            },
            publicPageSettings: {
              create: {
                headline: "Apoie a live com PIX e coloque sua mensagem no ar.",
                description:
                  "Seu apoio dispara um alerta neon e pode virar voz na live em segundos.",
                minimumAmount: 2,
                maximumAmount: 500,
                minAmountForTts: 5,
                messageCharLimit: 180,
                allowVoiceMessages: true,
                allowLinks: false,
                blockedWords: [],
                cooldownSeconds: 12,
                autoModeration: true,
                manualModeration: false,
              },
            },
            streamerSettings: {
              create: {
                voiceSpeed: 1,
                voicePitch: 1,
                voiceVolume: 90,
                minAmountForTts: 5,
                maxMessageLength: 180,
                featureFlags: {
                  analyticsV2: true,
                  overlayMarketplace: false,
                },
              },
            },
            subscriptions: {
              create: {
                planId: starterPlan.id,
                status: "TRIALING",
                billingCycle: "MONTHLY",
                startedAt: now,
                currentPeriodStart: now,
                currentPeriodEnd: addDays(now, 14),
                trialEndsAt: addDays(now, 14),
              },
            },
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        streamerProfile: true,
      },
    });

    await writeAuditLog({
      prisma: tx,
      actorUserId: createdUser.id,
      streamerId: createdUser.streamerProfile?.id,
      entityType: "user",
      entityId: createdUser.id,
      action: "auth.register",
      metadata: {
        email: createdUser.email,
      },
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return createdUser;
  });

  return buildAuthUser(user);
}

export async function loginUser(
  fastify: FastifyInstance,
  request: FastifyRequest,
  input: LoginInput,
) {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    throw zodToAppError(parsed.error);
  }

  const user = await fastify.prisma.user.findUnique({
    where: {
      email: parsed.data.email,
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
      streamerProfile: true,
    },
  });

  if (!user || !user.isActive || user.deletedAt) {
    throw new AppError("Credenciais inválidas.", 401, "INVALID_CREDENTIALS");
  }

  const isValid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!isValid) {
    throw new AppError("Credenciais inválidas.", 401, "INVALID_CREDENTIALS");
  }

  await fastify.prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await writeAuditLog({
    prisma: fastify.prisma,
    actorUserId: user.id,
    streamerId: user.streamerProfile?.id,
    entityType: "user",
    entityId: user.id,
    action: "auth.login",
    metadata: {
      email: user.email,
    },
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
  });

  return buildAuthUser(user);
}

export async function createPasswordResetToken(fastify: FastifyInstance, email: string) {
  const user = await fastify.prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return null;
  }

  const token = `reset_${randomUUID()}`;

  await fastify.prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: addHours(new Date(), 1),
    },
  });

  return token;
}

export async function resetPassword(
  fastify: FastifyInstance,
  input: ResetPasswordInput,
  request: FastifyRequest,
) {
  const parsed = resetPasswordSchema.safeParse(input);

  if (!parsed.success) {
    throw zodToAppError(parsed.error);
  }

  const tokenRecord = await fastify.prisma.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
    include: { user: true },
  });

  if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
    throw new AppError("Token inválido ou expirado.", 400, "INVALID_RESET_TOKEN");
  }

  await fastify.prisma.$transaction([
    fastify.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    fastify.prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    }),
    fastify.prisma.refreshToken.updateMany({
      where: { userId: tokenRecord.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await writeAuditLog({
    prisma: fastify.prisma,
    actorUserId: tokenRecord.userId,
    entityType: "user",
    entityId: tokenRecord.userId,
    action: "auth.password_reset",
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
  });
}

export async function rotateRefreshToken(fastify: FastifyInstance, refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);

  if (payload.type !== "refresh") {
    throw new AppError("Refresh token inválido.", 401, "INVALID_REFRESH_TOKEN");
  }

  const tokenRecord = await fastify.prisma.refreshToken.findUnique({
    where: {
      tokenHash: hashToken(refreshToken),
    },
  });

  if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
    throw new AppError("Sessão expirada.", 401, "SESSION_EXPIRED");
  }

  const user = await findUserById(fastify, payload.sub);

  if (!user) {
    throw new AppError("Usuário não encontrado.", 401, "UNAUTHORIZED");
  }

  const authUser = buildAuthUser(user);
  const tokens = await createSessionTokens(fastify, authUser);

  await fastify.prisma.$transaction([
    fastify.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    }),
    fastify.prisma.refreshToken.create({
      data: {
        userId: authUser.id,
        tokenHash: hashToken(tokens.refreshToken),
        expiresAt: addDays(new Date(), REFRESH_EXPIRES_IN_DAYS),
      },
    }),
  ]);

  return {
    authUser,
    tokens,
  };
}

export async function getPasswordResetPayload(token: string) {
  if (!isProd) {
    return { resetToken: token };
  }

  return undefined;
}
