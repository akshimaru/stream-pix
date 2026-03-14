import QRCode from "qrcode";
import { addMinutes } from "date-fns";
import { nanoid } from "nanoid";
import type {
  CreatePixChargePayload,
  PixConfirmationResult,
  PixProvider,
} from "./types.js";

export class MockPixProvider implements PixProvider {
  code = "MOCK_PIX";
  supportsSimulation = true;

  async createCharge(payload: CreatePixChargePayload) {
    const txid = `spx_${nanoid(14)}`;
    const externalId = `mock_${payload.chargeId}`;
    const pixCopyPaste =
      `00020126610014BR.GOV.BCB.PIX0136${payload.streamer.slug}@streampix.dev` +
      `520400005303986540${payload.amount.toFixed(2)}5802BR5913STREAMPIX6009SAOPAULO` +
      `62070503***6304${txid.slice(-4).toUpperCase()}`;
    const qrCodeDataUrl = await QRCode.toDataURL(pixCopyPaste, {
      width: 320,
      margin: 1,
      color: {
        dark: "#ffffff",
        light: "#0b1020",
      },
    });

    return {
      txid,
      externalId,
      pixCopyPaste,
      qrCodeDataUrl,
      expiresAt: addMinutes(new Date(), 15),
    };
  }

  async simulateConfirmation(txid: string): Promise<PixConfirmationResult> {
    return {
      txid,
      externalId: `mock_${txid}`,
      idempotencyKey: `mock-confirm-${txid}`,
      paidAt: new Date(),
      rawPayload: {
        provider: this.code,
        status: "paid",
        txid,
      },
    };
  }

  async parseWebhook(
    payload: Record<string, unknown>,
    _headers: Record<string, unknown>,
    _context: CreatePixChargePayload["context"],
  ): Promise<PixConfirmationResult> {
    const txid = String(payload.txid ?? "");

    return {
      txid,
      chargeId: typeof payload.chargeId === "string" ? payload.chargeId : undefined,
      externalId: String(payload.externalId ?? `mock_${txid}`),
      idempotencyKey: String(payload.idempotencyKey ?? `webhook-${txid}`),
      paidAt: payload.paidAt ? new Date(String(payload.paidAt)) : new Date(),
      rawPayload: payload,
    };
  }
}
