import type { FastifyInstance } from "fastify";
import type { OverlayAlertEvent } from "@streampix/shared";
import { buildAlertSpeechText, socketEvents } from "@streampix/shared";
import { AppError } from "../../lib/errors.js";
import { decimalToNumber, serializeOverlayBootstrap } from "../../lib/serializers.js";
import { overlayRoom } from "../../lib/socket.js";
import { enqueueTtsJob, isQueueEnabled } from "../../lib/queues.js";
import { createStreamerNotification } from "../notifications/service.js";

export async function deliverAlert(
  fastify: FastifyInstance,
  alertId: string,
  options?: { testMode?: boolean; manuallyApproved?: boolean },
) {
  const alert = await fastify.prisma.alert.findUnique({
    where: { id: alertId },
    include: {
      charge: true,
      streamer: {
        include: {
          overlaySettings: true,
          streamerSettings: true,
        },
      },
      ttsJob: true,
    },
  });

  if (!alert || !alert.streamer.overlaySettings || !alert.streamer.streamerSettings) {
    throw new AppError("Alerta não encontrado.", 404, "ALERT_NOT_FOUND");
  }

  if (!options?.testMode && alert.status === "BLOCKED") {
    throw new AppError("Este alerta está bloqueado.", 400, "ALERT_BLOCKED");
  }

  const bootstrap = serializeOverlayBootstrap({
    streamer: alert.streamer,
    overlaySettings: alert.streamer.overlaySettings,
    streamerSettings: alert.streamer.streamerSettings,
  });
  const spokenText = buildAlertSpeechText({
    supporterName: alert.supporterName,
    amount: decimalToNumber(alert.amount),
    message: alert.sanitizedMessage,
    isAnonymous: alert.charge.isAnonymous,
  });

  const event: OverlayAlertEvent = {
    alertId: alert.id,
    streamerId: alert.streamerId,
    supporterName: alert.supporterName,
    amount: decimalToNumber(alert.amount),
    message: alert.sanitizedMessage,
    isAnonymous: alert.charge.isAnonymous,
    durationMs: alert.durationMs,
    settings: bootstrap.settings,
    voice: bootstrap.voice,
  };

  fastify.io.to(overlayRoom(alert.streamerId)).emit(socketEvents.overlayAlert, event);

  const shouldQueueTts =
    alert.charge.shouldReadMessage &&
    alert.streamer.streamerSettings.overlayEnabled;

  let ttsJobId = alert.ttsJob?.id;
  const queueEnabled = isQueueEnabled();
  const inlineBrowserTts = shouldQueueTts && !queueEnabled;

  if (shouldQueueTts && !ttsJobId) {
    const defaultTtsProvider = await fastify.prisma.ttsProvider.findFirst({
      where: { isDefault: true, isActive: true },
    });

    const createdTtsJob = await fastify.prisma.ttsJob.create({
      data: {
        streamerId: alert.streamerId,
        alertId: alert.id,
        ttsProviderId: defaultTtsProvider?.id,
        status: queueEnabled ? "QUEUED" : "SPOKEN",
        inputText: spokenText,
        sanitizedText: spokenText,
        voiceName: alert.streamer.streamerSettings.defaultVoice,
        language: alert.streamer.streamerSettings.voiceLanguage,
        speed: alert.streamer.streamerSettings.voiceSpeed,
        pitch: alert.streamer.streamerSettings.voicePitch,
        volume: alert.streamer.streamerSettings.voiceVolume / 100,
        startedAt: queueEnabled ? null : new Date(),
        finishedAt: queueEnabled ? null : new Date(),
        audioUrl: queueEnabled ? null : "browser://speech-synthesis",
      },
    });

    ttsJobId = createdTtsJob.id;

    await fastify.prisma.subscription.updateMany({
      where: {
        streamerId: alert.streamerId,
        status: { in: ["ACTIVE", "TRIALING"] },
      },
      data: {
        monthlyTtsCount: {
          increment: 1,
        },
      },
    });

    await enqueueTtsJob(
      "speak-message",
      {
        ttsJobId,
        streamerId: alert.streamerId,
      },
      {
        jobId: createdTtsJob.id,
      },
    );
  }

  await fastify.prisma.alert.update({
    where: { id: alert.id },
    data: {
      status: "DISPLAYED",
      deliveredAt: new Date(),
      displayedAt: new Date(),
      ttsRequested: shouldQueueTts,
      ttsExecuted: inlineBrowserTts,
    },
  });

  await createStreamerNotification(fastify, {
    streamerId: alert.streamerId,
    type: options?.testMode ? "TEST_ALERT" : "PAYMENT_CONFIRMED",
    title: options?.testMode ? "Alerta de teste enviado" : "Novo PIX confirmado",
    message: options?.testMode
      ? "Seu overlay recebeu um alerta de teste em tempo real."
      : `${alert.supporterName} enviou R$ ${decimalToNumber(alert.amount).toFixed(2)} para a live.`,
    metadata: {
      alertId: alert.id,
      manuallyApproved: options?.manuallyApproved ?? false,
      ttsJobId,
      queueEnabled,
    },
  });

  return event;
}
