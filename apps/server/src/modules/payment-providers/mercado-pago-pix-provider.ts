import type { PixConfirmationResult, PixProvider } from "./types.js";
import {
  getMercadoPagoProviderConfig,
  mercadoPagoRequest,
  validateMercadoPagoWebhookSignature,
} from "./mercado-pago-shared.js";
import { AppError } from "../../lib/errors.js";

type MercadoPagoPaymentResponse = {
  id?: number | string;
  status?: string;
  status_detail?: string;
  date_created?: string;
  date_approved?: string;
  date_of_expiration?: string;
  external_reference?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
};

function splitSupporterName(input: string) {
  const normalized = input.trim();

  if (!normalized) {
    return {
      firstName: "Desconhecido",
      lastName: "StreamPix",
    };
  }

  const [firstName, ...rest] = normalized.split(/\s+/);

  return {
    firstName: firstName || "Desconhecido",
    lastName: rest.join(" ") || "StreamPix",
  };
}

function normalizeMercadoPagoQrCodeDataUrl(input?: string) {
  if (!input) {
    return null;
  }

  return input.startsWith("data:") ? input : `data:image/png;base64,${input}`;
}

function resolveWebhookDataId(input: {
  payload: Record<string, unknown>;
  query?: Record<string, unknown>;
}) {
  const queryValue =
    input.query?.["data.id"] ??
    input.query?.data_id ??
    input.query?.id;

  if (typeof queryValue === "string" || typeof queryValue === "number") {
    return String(queryValue);
  }

  const payloadData = input.payload.data;

  if (payloadData && typeof payloadData === "object" && "id" in payloadData) {
    const value = (payloadData as { id?: unknown }).id;

    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
  }

  return null;
}

async function getApprovedPayment(input: {
  accessToken: string;
  paymentId: string;
}) {
  const payment = await mercadoPagoRequest<MercadoPagoPaymentResponse>({
    accessToken: input.accessToken,
    path: `/v1/payments/${input.paymentId}`,
  });

  if (payment.status !== "approved") {
    return null;
  }

  if (!payment.id) {
    throw new AppError("Mercado Pago retornou o pagamento sem identificador.", 502, "MERCADO_PAGO_INVALID_PAYMENT");
  }

  return payment;
}

export class MercadoPagoPixProvider implements PixProvider {
  code = "MERCADO_PAGO";
  supportsSimulation = false;

  async createCharge(payload: Parameters<PixProvider["createCharge"]>[0]) {
    const config = getMercadoPagoProviderConfig(payload.context.config);

    if (!config.accessToken) {
      throw new AppError(
        "Mercado Pago ativo, mas o Access Token ainda nao foi configurado no superadmin.",
        500,
        "MERCADO_PAGO_ACCESS_TOKEN_MISSING",
      );
    }

    if (config.requirePayerEmail && !payload.viewerEmail) {
      throw new AppError(
        "O Mercado Pago exige o e-mail do apoiador para gerar o PIX.",
        400,
        "MERCADO_PAGO_PAYER_EMAIL_REQUIRED",
      );
    }

    const expirationDate = new Date(Date.now() + config.paymentExpirationMinutes * 60 * 1000);
    const names = splitSupporterName(payload.viewerName);
    const normalizedDocument = payload.payerDocument?.replace(/\D+/g, "") || undefined;

    const payment = await mercadoPagoRequest<MercadoPagoPaymentResponse>({
      accessToken: config.accessToken,
      path: "/v1/payments",
      method: "POST",
      headers: {
        "X-Idempotency-Key": payload.chargeId,
      },
      body: {
        transaction_amount: Number(payload.amount.toFixed(2)),
        description: `StreamPix para ${payload.streamer.displayName}`,
        payment_method_id: "pix",
        external_reference: payload.chargeId,
        notification_url: config.notificationUrl || payload.context.notificationUrl,
        date_of_expiration: expirationDate.toISOString(),
        statement_descriptor: config.statementDescriptor,
        payer: {
          email: payload.viewerEmail || undefined,
          first_name: names.firstName,
          last_name: names.lastName,
          identification: normalizedDocument
            ? {
                type: normalizedDocument.length > 11 ? "CNPJ" : "CPF",
                number: normalizedDocument,
              }
            : undefined,
        },
        metadata: {
          streamerId: payload.streamer.id,
          streamerSlug: payload.streamer.slug,
          chargeId: payload.chargeId,
        },
      },
    });

    const paymentId = payment.id ? String(payment.id) : null;
    const qrCode = payment.point_of_interaction?.transaction_data?.qr_code ?? "";
    const qrCodeDataUrl = normalizeMercadoPagoQrCodeDataUrl(
      payment.point_of_interaction?.transaction_data?.qr_code_base64,
    );

    if (!paymentId || !qrCode) {
      throw new AppError(
        "Mercado Pago nao retornou QR Code PIX valido para a cobranca.",
        502,
        "MERCADO_PAGO_PIX_RESPONSE_INVALID",
        payment,
      );
    }

    return {
      txid: `mp_pay_${paymentId}`,
      externalId: paymentId,
      pixCopyPaste: qrCode,
      qrCodeDataUrl,
      expiresAt: payment.date_of_expiration ? new Date(payment.date_of_expiration) : expirationDate,
    };
  }

  async simulateConfirmation(): Promise<PixConfirmationResult> {
    throw new AppError(
      "O Mercado Pago nao suporta simulacao local por esta rota. Use o ambiente de testes do provider.",
      400,
      "SIMULATION_NOT_SUPPORTED",
    );
  }

  async parseWebhook(payload: Record<string, unknown>, headers: Record<string, unknown>, context: Parameters<PixProvider["parseWebhook"]>[2]) {
    const config = getMercadoPagoProviderConfig(context.config);
    const paymentId = resolveWebhookDataId({
      payload,
      query: context.query,
    });
    const type = typeof payload.type === "string" ? payload.type : typeof context.query?.type === "string" ? context.query.type : "";

    if (!paymentId) {
      return null;
    }

    if (!validateMercadoPagoWebhookSignature({
      secret: config.webhookSecret,
      signatureHeader: typeof headers["x-signature"] === "string" ? headers["x-signature"] : undefined,
      requestIdHeader: typeof headers["x-request-id"] === "string" ? headers["x-request-id"] : undefined,
      dataId: paymentId,
    })) {
      throw new AppError("Assinatura do webhook do Mercado Pago invalida.", 401, "MERCADO_PAGO_INVALID_WEBHOOK_SIGNATURE");
    }

    if (type && type !== "payment") {
      return null;
    }

    if (!config.accessToken) {
      throw new AppError(
        "Mercado Pago ativo, mas o Access Token ainda nao foi configurado no superadmin.",
        500,
        "MERCADO_PAGO_ACCESS_TOKEN_MISSING",
      );
    }

    const payment = await getApprovedPayment({
      accessToken: config.accessToken,
      paymentId,
    });

    if (!payment) {
      return null;
    }

    return {
      txid: `mp_pay_${paymentId}`,
      externalId: paymentId,
      chargeId: payment.external_reference ?? undefined,
      idempotencyKey: `mp:payment:${paymentId}:approved`,
      paidAt: new Date(payment.date_approved ?? payment.date_created ?? new Date().toISOString()),
      rawPayload: payment as Record<string, unknown>,
    };
  }
}
