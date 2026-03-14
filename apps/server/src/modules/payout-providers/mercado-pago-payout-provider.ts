import type { ExecutePayoutPayload, PayoutExecutionResult, PayoutProvider } from "./types.js";
import { AppError } from "../../lib/errors.js";
import {
  buildMercadoPagoPayoutSignature,
  getMercadoPagoProviderConfig,
  mercadoPagoRequest,
} from "../payment-providers/mercado-pago-shared.js";

type MercadoPagoPayoutResponse = {
  id?: string;
  status?: string;
  created_date?: string;
  last_updated_date?: string;
  external_reference?: string;
  transaction?: {
    to?: {
      accounts?: Array<{
        amount?: string;
        origin_id?: string;
      }>;
    };
  };
};

export class MercadoPagoPayoutProvider implements PayoutProvider {
  code = "MERCADO_PAGO";

  async execute(payload: ExecutePayoutPayload): Promise<PayoutExecutionResult> {
    const config = getMercadoPagoProviderConfig(payload.context?.config);

    if (!config.supportsPayouts) {
      throw new AppError(
        "O payout do Mercado Pago ainda nao foi habilitado no superadmin.",
        400,
        "MERCADO_PAGO_PAYOUTS_DISABLED",
      );
    }

    const accessToken = config.payoutAccessToken || config.accessToken;

    if (!accessToken) {
      throw new AppError(
        "Configure o Access Token de payout do Mercado Pago no superadmin para liberar saques reais.",
        400,
        "MERCADO_PAGO_PAYOUT_ACCESS_TOKEN_MISSING",
      );
    }

    const normalizedDocument = payload.document.replace(/\D+/g, "");
    const body = {
      external_reference: payload.payoutId,
      point_of_interaction: {
        type: "PSP_TRANSFER",
      },
      seller_configuration: {
        notification_info: {
          notification_url: config.payoutNotificationUrl || payload.context?.notificationUrl,
        },
      },
      transaction: {
        from: {
          accounts: [
            {
              amount: Number(payload.amount.toFixed(2)),
            },
          ],
        },
        to: {
          accounts: [
            {
              type: "current",
              amount: Number(payload.amount.toFixed(2)),
              chave: {
                type: payload.pixKeyType,
                value: payload.pixKeyValue,
              },
              owner: {
                identification: {
                  type: normalizedDocument.length > 11 ? "CNPJ" : "CPF",
                  number: normalizedDocument,
                },
              },
            },
          ],
        },
        total_amount: Number(payload.amount.toFixed(2)),
      },
    } satisfies Record<string, unknown>;

    const signature = buildMercadoPagoPayoutSignature({
      body,
      config,
    });

    const response = await mercadoPagoRequest<MercadoPagoPayoutResponse>({
      accessToken,
      path: "/v1/transaction-intents/process",
      method: "POST",
      headers: {
        "X-Idempotency-Key": payload.payoutId,
        "x-enforce-signature": String(signature.enforceSignature),
        ...(signature.signature ? { "x-signature": signature.signature } : {}),
      },
      body,
    });

    if (!response.id || response.status !== "approved") {
      throw new AppError(
        "Mercado Pago nao aprovou o saque PIX solicitado.",
        502,
        "MERCADO_PAGO_PAYOUT_REJECTED",
        response,
      );
    }

    return {
      externalId: response.id,
      paidAt: new Date(response.last_updated_date ?? response.created_date ?? new Date().toISOString()),
      rawPayload: response as Record<string, unknown>,
    };
  }
}
