import { Queue, type JobsOptions } from "bullmq";
import { queueNames } from "@streampix/shared";
import { env } from "../config/env.js";

let ttsQueue: Queue | null = null;

if (env.REDIS_ENABLED) {
  const redisUrl = new URL(env.REDIS_URL);
  const queueConnection = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    maxRetriesPerRequest: null as null,
  };

  ttsQueue = new Queue(queueNames.tts, {
    connection: queueConnection,
    defaultJobOptions: {
      attempts: 3,
      removeOnComplete: 50,
      removeOnFail: 100,
      backoff: {
        type: "exponential",
        delay: 1500,
      },
    },
  });
}

export function isQueueEnabled() {
  return Boolean(ttsQueue);
}

export async function enqueueTtsJob(
  name: string,
  data: { ttsJobId: string; streamerId: string },
  options?: JobsOptions,
) {
  if (!ttsQueue) {
    return null;
  }

  return ttsQueue.add(name, data, options);
}
