import fp from "fastify-plugin";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import { env } from "../config/env.js";
import { authenticateRequest, requireRoles } from "../modules/auth/service.js";

export const authPlugin = fp(async (fastify) => {
  await fastify.register(fastifyCookie);
  await fastify.register(fastifyJwt, {
    secret: env.JWT_ACCESS_SECRET,
  });

  fastify.decorate("authenticate", async (request) => {
    await authenticateRequest(fastify, request);
  });

  fastify.decorate("requireRoles", async (request, ...roles) => {
    await requireRoles(fastify, request, roles);
  });
});
