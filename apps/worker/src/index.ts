import { DelayedError, QueueEvents, Worker } from "bullmq";
import { queueNames } from "@streampix/shared";
import { createBullConnectionOptions, createRedisClient } from "./lib/redis.js";
import { prisma } from "./lib/prisma.js";
import { logger } from "./lib/logger.js";
import { MockTtsProvider } from "./providers/mock-tts-provider.js";
import { env } from "./config/env.js";

if (!env.REDIS_ENABLED) {
  logger.warn("Redis desabilitado por env. Worker encerrado em modo local.");
  await prisma.$disconnect();
  process.exit(0);
}

const connection = createBullConnectionOptions();
const redis = createRedisClient();
const provider = new MockTtsProvider();

const worker = new Worker(
  queueNames.tts,
  async (job) => {
    const { ttsJobId, streamerId } = job.data as { ttsJobId: string; streamerId: string };
    const lockKey = `tts-lock:${streamerId}`;
    const lock = await redis.set(lockKey, job.id ?? ttsJobId, "PX", 30000, "NX");

    if (!lock) {
      await job.moveToDelayed(Date.now() + 1500, job.token ?? "");
      throw new DelayedError();
    }

    try {
      const ttsJob = await prisma.ttsJob.findUnique({
        where: { id: ttsJobId },
        include: {
          alert: true,
        },
      });

      if (!ttsJob) {
        logger.warn({ ttsJobId }, "TTS job not found");
        return;
      }

      await prisma.ttsJob.update({
        where: { id: ttsJobId },
        data: {
          status: "PROCESSING",
          startedAt: new Date(),
          attempts: {
            increment: 1,
          },
        },
      });

      const result = await provider.speak(ttsJob.sanitizedText);

      await prisma.$transaction([
        prisma.ttsJob.update({
          where: { id: ttsJobId },
          data: {
            status: "SPOKEN",
            finishedAt: new Date(),
            audioUrl: result.audioUrl,
          },
        }),
        prisma.alert.updateMany({
          where: {
            id: ttsJob.alertId ?? undefined,
          },
          data: {
            ttsExecuted: true,
            status: "SPOKEN",
          },
        }),
        prisma.notification.create({
          data: {
            streamerId,
            type: "TTS_FINISHED",
            title: "TTS processado",
            message: "Uma mensagem foi marcada como spoken pelo worker mock.",
            metadata: {
              ttsJobId,
            },
          },
        }),
      ]);

      logger.info({ ttsJobId, streamerId }, "TTS job processed");
    } catch (error) {
      logger.error({ error, ttsJobId }, "Failed to process TTS job");

      await prisma.ttsJob.updateMany({
        where: { id: ttsJobId },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Unknown worker error",
        },
      });

      throw error;
    } finally {
      const currentLock = await redis.get(lockKey);

      if (currentLock === (job.id ?? ttsJobId)) {
        await redis.del(lockKey);
      }
    }
  },
  {
    connection,
    concurrency: 5,
  },
);

const queueEvents = new QueueEvents(queueNames.tts, {
  connection,
});

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Worker job completed");
});

worker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, error }, "Worker job failed");
});

queueEvents.on("stalled", ({ jobId }) => {
  logger.warn({ jobId }, "Worker job stalled");
});

async function shutdown() {
  await queueEvents.close();
  await worker.close();
  await redis.quit();
  await prisma.$disconnect();
}

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

logger.info("StreamPix worker running");
