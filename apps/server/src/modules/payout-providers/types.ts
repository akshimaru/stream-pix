export interface ExecutePayoutPayload {
  payoutId: string;
  amount: number;
  legalName: string;
  document: string;
  pixKeyType: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";
  pixKeyValue: string;
  context?: {
    config?: Record<string, unknown>;
    notificationUrl?: string;
  };
}

export interface PayoutExecutionResult {
  externalId: string;
  paidAt: Date;
  rawPayload: Record<string, unknown>;
}

export interface PayoutProvider {
  code: string;
  execute(payload: ExecutePayoutPayload): Promise<PayoutExecutionResult>;
}
