import type { FastifyPluginAsync } from "fastify";
import { ok } from "../../lib/http.js";
import { AppError } from "../../lib/errors.js";
import { serializeOverlayBootstrap } from "../../lib/serializers.js";

export const overlayRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/v1/overlays/token/:token/bootstrap", async (request) => {
    const token = (request.params as { token: string }).token;
    const streamer = await fastify.prisma.streamerProfile.findUnique({
      where: {
        overlayToken: token,
      },
      include: {
        overlaySettings: true,
        streamerSettings: true,
      },
    });

    if (!streamer || !streamer.overlaySettings || !streamer.streamerSettings) {
      throw new AppError("Overlay não encontrado.", 404, "OVERLAY_NOT_FOUND");
    }

    return ok(
      serializeOverlayBootstrap({
        streamer,
        overlaySettings: streamer.overlaySettings,
        streamerSettings: streamer.streamerSettings,
      }),
    );
  });
};
