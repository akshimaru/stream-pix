import type { StreamerProfile } from "@prisma/client";

export interface CreatePixChargePayload {
  streamer: StreamerProfile;
  amount: number;
  viewerName: string;
  viewerEmail?: string | null;
  payerDocument?: string | null;
  message: string;
  chargeId: string;
  context: {
    config?: Record<string, unknown>;
    notificationUrl?: string;
    query?: Record<string, unknown>;
  };
}

export interface PixChargeProviderResult {
  txid: string;
  externalId: string;
  pixCopyPaste: string;
  qrCodeDataUrl: string | null;
  expiresAt: Date;
}

export interface PixConfirmationResult {
  txid: string;
  externalId?: string;
  chargeId?: string;
  idempotencyKey: string;
  paidAt: Date;
  rawPayload: Record<string, unknown>;
}

export interface PixProvider {
  code: string;
  supportsSimulation?: boolean;
  createCharge(payload: CreatePixChargePayload): Promise<PixChargeProviderResult>;
  simulateConfirmation(
    txid: string,
    context?: CreatePixChargePayload["context"],
  ): Promise<PixConfirmationResult>;
  parseWebhook(
    payload: Record<string, unknown>,
    headers: Record<string, unknown>,
    context: CreatePixChargePayload["context"],
  ): Promise<PixConfirmationResult | null>;
}
