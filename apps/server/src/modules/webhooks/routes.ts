import type { FastifyPluginAsync } from "fastify";
import { ok } from "../../lib/http.js";
import { AppError } from "../../lib/errors.js";
import { getPixProvider } from "../payment-providers/registry.js";
import { confirmPixCharge } from "../pix-payments/service.js";

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/v1/webhooks/payment/:providerCode", async (request) => {
    const providerCode = (request.params as { providerCode: string }).providerCode.toUpperCase();
    const provider = await fastify.prisma.paymentProvider.findUnique({
      where: { code: providerCode },
    });

    if (!provider || !provider.isActive) {
      throw new AppError("Provider de pagamento não encontrado.", 404, "PROVIDER_NOT_FOUND");
    }

    const driver = getPixProvider(provider.code);
    const confirmation = await driver.parseWebhook(
      (request.body as Record<string, unknown>) ?? {},
      request.headers as Record<string, unknown>,
      {
        config: provider.config as Record<string, unknown>,
        query: (request.query as Record<string, unknown>) ?? {},
      },
    );

    if (!confirmation) {
      return ok({
        ignored: true,
      });
    }

    const result = await confirmPixCharge(fastify, {
      chargeId: confirmation.chargeId,
      txid: confirmation.txid,
      externalId: confirmation.externalId,
      idempotencyKey: confirmation.idempotencyKey,
      paidAt: confirmation.paidAt,
      rawPayload: confirmation.rawPayload,
    });

    return ok(result);
  });
};
