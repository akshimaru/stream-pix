import type { FastifyPluginAsync } from "fastify";
import { ok } from "../../lib/http.js";
import { serializePlan } from "../../lib/serializers.js";

export const planRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/v1/plans/public", async () => {
    const plans = await fastify.prisma.plan.findMany({
      where: {
        active: true,
        deletedAt: null,
      },
      orderBy: [
        {
          monthlyPrice: "asc",
        },
        {
          name: "asc",
        },
      ],
    });

    return ok(plans.map(serializePlan));
  });
};
