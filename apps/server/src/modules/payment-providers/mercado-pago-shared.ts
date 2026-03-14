import { createHmac, createPrivateKey, createSign, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";

const mercadoPagoProviderConfigSchema = z.object({
  accessToken: z.string().trim().optional().default(""),
  publicKey: z.string().trim().optional().default(""),
  webhookSecret: z.string().trim().optional().default(""),
  notificationUrl: z.string().trim().optional().default(""),
  paymentExpirationMinutes: z.coerce.number().int().min(5).max(1440).default(30),
  requirePayerEmail: z.boolean().default(true),
  requirePayerDocument: z.boolean().default(false),
  statementDescriptor: z.string().trim().max(22).optional().default("STREAMPIX"),
  testMode: z.boolean().default(false),
  supportsPayouts: z.boolean().default(false),
  payoutAccessToken: z.string().trim().optional().default(""),
  payoutNotificationUrl: z.string().trim().optional().default(""),
  payoutEnforceSignature: z.boolean().default(false),
  payoutPrivateKeyPem: z.string().trim().optional().default(""),
});

export type MercadoPagoProviderConfig = z.infer<typeof mercadoPagoProviderConfigSchema>;

type MercadoPagoErrorPayload = {
  message?: string;
  error?: string;
  cause?: Array<{ code?: string | number; description?: string }>;
};

function maskSecret(value: string) {
  if (!value) {
    return "";
  }

  if (value.length <= 10) {
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }

  return `${value.slice(0, 6)}***${value.slice(-4)}`;
}

function normalizeSignatureValue(value: string) {
  return /^[a-z0-9]+$/i.test(value) ? value.toLowerCase() : value;
}

function extractMercadoPagoErrorMessage(payload: MercadoPagoErrorPayload | null, status: number) {
  const causeMessage = payload?.cause?.find((item) => item.description)?.description;

  return (
    causeMessage ||
    payload?.message ||
    payload?.error ||
    `Mercado Pago retornou erro ${status} ao processar a solicitacao.`
  );
}

function parseMercadoPagoSignatureHeader(headerValue: string) {
  const parts = headerValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [key, value] = item.split("=", 2);

      return [key?.trim().toLowerCase(), value?.trim()] as const;
    });

  return {
    ts: parts.find(([key]) => key === "ts")?.[1] ?? "",
    v1: parts.find(([key]) => key === "v1")?.[1] ?? "",
  };
}

export function getMercadoPagoProviderConfig(input: unknown): MercadoPagoProviderConfig {
  return mercadoPagoProviderConfigSchema.parse(input ?? {});
}

export function serializeMercadoPagoProviderConfigForAdmin(input: unknown) {
  const config = getMercadoPagoProviderConfig(input);

  return {
    publicKey: config.publicKey,
    notificationUrl: config.notificationUrl,
    paymentExpirationMinutes: config.paymentExpirationMinutes,
    requirePayerEmail: config.requirePayerEmail,
    requirePayerDocument: config.requirePayerDocument,
    statementDescriptor: config.statementDescriptor,
    testMode: config.testMode,
    supportsPayouts: config.supportsPayouts,
    payoutNotificationUrl: config.payoutNotificationUrl,
    payoutEnforceSignature: config.payoutEnforceSignature,
    hasAccessToken: Boolean(config.accessToken),
    hasWebhookSecret: Boolean(config.webhookSecret),
    hasPayoutAccessToken: Boolean(config.payoutAccessToken),
    hasPayoutPrivateKey: Boolean(config.payoutPrivateKeyPem),
    accessTokenMasked: maskSecret(config.accessToken),
    webhookSecretMasked: maskSecret(config.webhookSecret),
    payoutAccessTokenMasked: maskSecret(config.payoutAccessToken),
  };
}

export async function mercadoPagoRequest<T>(input: {
  accessToken: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
}) {
  const response = await fetch(`https://api.mercadopago.com${input.path}`, {
    method: input.method ?? "GET",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      ...(input.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(input.headers ?? {}),
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });

  const responseText = await response.text();
  let payload: T | MercadoPagoErrorPayload | null = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText) as T | MercadoPagoErrorPayload;
    } catch {
      payload = {
        message: responseText,
      };
    }
  }

  if (!response.ok) {
    throw new AppError(
      extractMercadoPagoErrorMessage(payload as MercadoPagoErrorPayload | null, response.status),
      response.status === 400 ? 400 : 502,
      "MERCADO_PAGO_REQUEST_FAILED",
      payload,
    );
  }

  return payload as T;
}

export function validateMercadoPagoWebhookSignature(input: {
  secret: string;
  signatureHeader?: string;
  requestIdHeader?: string;
  dataId?: string;
}) {
  if (!input.secret) {
    return true;
  }

  const signatureHeader = input.signatureHeader?.trim();
  const requestIdHeader = input.requestIdHeader?.trim();
  const dataId = input.dataId?.trim();

  if (!signatureHeader || !requestIdHeader || !dataId) {
    return false;
  }

  const parsedSignature = parseMercadoPagoSignatureHeader(signatureHeader);

  if (!parsedSignature.ts || !parsedSignature.v1) {
    return false;
  }

  const manifest = `id:${normalizeSignatureValue(dataId)};request-id:${requestIdHeader};ts:${parsedSignature.ts};`;
  const expectedSignature = createHmac("sha256", input.secret).update(manifest).digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(parsedSignature.v1, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function buildMercadoPagoPayoutSignature(input: {
  body: Record<string, unknown>;
  config: MercadoPagoProviderConfig;
}) {
  if (!input.config.payoutEnforceSignature) {
    return {
      enforceSignature: false,
      signature: undefined as string | undefined,
    };
  }

  if (!input.config.payoutPrivateKeyPem) {
    throw new AppError(
      "A assinatura de payout esta ativada, mas a chave privada do Mercado Pago nao foi configurada.",
      400,
      "MERCADO_PAGO_PAYOUT_SIGNATURE_MISSING",
    );
  }

  const signer = createSign("RSA-SHA256");
  signer.update(JSON.stringify(input.body));
  signer.end();

  return {
    enforceSignature: true,
    signature: signer.sign(createPrivateKey(input.config.payoutPrivateKeyPem), "base64"),
  };
}
