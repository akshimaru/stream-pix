import { nanoid } from "nanoid";
import type { ExecutePayoutPayload, PayoutExecutionResult, PayoutProvider } from "./types.js";

export class MockPayoutProvider implements PayoutProvider {
  code = "MOCK_PAYOUT";

  async execute(payload: ExecutePayoutPayload): Promise<PayoutExecutionResult> {
    if (payload.pixKeyValue.toLowerCase().includes("fail")) {
      throw new Error("Mock payout provider rejected this PIX key.");
    }

    return {
      externalId: `mock_payout_${nanoid(14)}`,
      paidAt: new Date(),
      rawPayload: {
        provider: this.code,
        status: "paid",
        payoutId: payload.payoutId,
        amount: payload.amount,
        beneficiary: payload.legalName,
        document: payload.document,
        pixKeyType: payload.pixKeyType,
        pixKeyValue: payload.pixKeyValue,
      },
    };
  }
}
