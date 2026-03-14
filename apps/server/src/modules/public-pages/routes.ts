import type { FastifyPluginAsync } from "fastify";
import { ok } from "../../lib/http.js";
import { serializePublicStreamer } from "../../lib/serializers.js";
import { AppError } from "../../lib/errors.js";
import { getMercadoPagoProviderConfig } from "../payment-providers/mercado-pago-shared.js";
import { getPixProvider } from "../payment-providers/registry.js";

export const publicPageRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/v1/public/streamers/:slug", async (request) => {
    const [streamer, paymentProvider] = await Promise.all([
      fastify.prisma.streamerProfile.findUnique({
        where: {
          slug: (request.params as { slug: string }).slug,
        },
        include: {
          publicPageSettings: true,
        },
      }),
      fastify.prisma.paymentProvider.findFirst({
        where: {
          isActive: true,
          isDefault: true,
        },
      }),
    ]);

    if (!streamer || !streamer.publicPageSettings || !streamer.publicPageEnabled) {
      throw new AppError("PÃ¡gina pÃºblica nÃ£o encontrada.", 404, "PUBLIC_PAGE_NOT_FOUND");
    }

    const mercadoPagoConfig =
      paymentProvider?.code === "MERCADO_PAGO" ? getMercadoPagoProviderConfig(paymentProvider.config) : null;
    const providerDriver = paymentProvider ? getPixProvider(paymentProvider.code) : null;

    return ok(
      serializePublicStreamer(streamer, streamer.publicPageSettings, {
        code: paymentProvider?.code ?? "MOCK_PIX",
        name: paymentProvider?.name ?? "Mock PIX Local",
        requiresPayerEmail: mercadoPagoConfig?.requirePayerEmail ?? false,
        requiresPayerDocument: mercadoPagoConfig?.requirePayerDocument ?? false,
        supportsLocalSimulation: providerDriver?.supportsSimulation ?? true,
      }),
    );
  });
};
