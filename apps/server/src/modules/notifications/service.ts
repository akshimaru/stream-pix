import type { DashboardNotificationEvent } from "@streampix/shared";
import type { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { socketEvents } from "@streampix/shared";
import { dashboardRoom } from "../../lib/socket.js";

interface NotificationInput {
  streamerId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function createStreamerNotification(
  fastify: FastifyInstance,
  input: NotificationInput,
) {
  const notification = await fastify.prisma.notification.create({
    data: {
      streamerId: input.streamerId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  const payload: DashboardNotificationEvent = {
    type: input.type as DashboardNotificationEvent["type"],
    title: input.title,
    message: input.message,
    timestamp: notification.createdAt.toISOString(),
  };

  fastify.io.to(dashboardRoom(input.streamerId)).emit(socketEvents.dashboardNotification, payload);

  return notification;
}
