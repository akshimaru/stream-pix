import type { FastifyPluginAsync } from "fastify";
import { ok } from "../../lib/http.js";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import {
  clearSessionCookies,
  createPasswordResetToken,
  createSessionTokens,
  getPasswordResetPayload,
  loginUser,
  persistRefreshToken,
  registerStreamer,
  resetPassword,
  revokeRefreshToken,
  signSocketToken,
  rotateRefreshToken,
  setSessionCookies,
} from "./service.js";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/v1/auth/register", async (request, reply) => {
    const authUser = await registerStreamer(fastify, request.body as never, request);
    const tokens = await createSessionTokens(fastify, authUser);

    await persistRefreshToken(fastify, authUser.id, tokens.refreshToken);
    setSessionCookies(reply, tokens.accessToken, tokens.refreshToken);

    return ok({
      user: authUser,
      realtimeToken: tokens.socketToken,
    });
  });

  fastify.post("/v1/auth/login", async (request, reply) => {
    const authUser = await loginUser(fastify, request, request.body as never);
    const tokens = await createSessionTokens(fastify, authUser);

    await persistRefreshToken(fastify, authUser.id, tokens.refreshToken);
    setSessionCookies(reply, tokens.accessToken, tokens.refreshToken);

    return ok({
      user: authUser,
      realtimeToken: tokens.socketToken,
    });
  });

  fastify.post("/v1/auth/refresh", async (request, reply) => {
    const refreshToken = request.cookies[env.REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      throw new AppError("Refresh token não encontrado.", 401, "MISSING_REFRESH_TOKEN");
    }

    const session = await rotateRefreshToken(fastify, refreshToken);
    setSessionCookies(reply, session.tokens.accessToken, session.tokens.refreshToken);

    return ok({
      user: session.authUser,
      realtimeToken: session.tokens.socketToken,
    });
  });

  fastify.post("/v1/auth/logout", async (request, reply) => {
    await revokeRefreshToken(fastify, request.cookies[env.REFRESH_COOKIE_NAME]);
    clearSessionCookies(reply);

    return ok({ loggedOut: true });
  });

  fastify.get("/v1/auth/me", async (request) => {
    await fastify.authenticate(request);

    return ok({
      user: request.authUser,
      realtimeToken: signSocketToken({
        sub: request.authUser!.id,
        roles: request.authUser!.roles,
        streamerId: request.authUser!.streamerId,
        streamerSlug: request.authUser!.streamerSlug,
      }),
    });
  });

  fastify.post("/v1/auth/forgot-password", async (request) => {
    const email = (request.body as { email?: string })?.email ?? "";
    const token = await createPasswordResetToken(fastify, email);

    return ok({
      message: "Se o e-mail existir, você receberá instruções para redefinir a senha.",
      ...(token ? await getPasswordResetPayload(token) : {}),
    });
  });

  fastify.post("/v1/auth/reset-password", async (request) => {
    await resetPassword(fastify, request.body as never, request);

    return ok({
      message: "Senha redefinida com sucesso.",
    });
  });
};
