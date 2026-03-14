import type { PayoutProvider } from "./types.js";
import { MockPayoutProvider } from "./mock-payout-provider.js";
import { MercadoPagoPayoutProvider } from "./mercado-pago-payout-provider.js";

const payoutProviders = new Map<string, PayoutProvider>([
  ["MOCK_PAYOUT", new MockPayoutProvider()],
  ["MERCADO_PAGO", new MercadoPagoPayoutProvider()],
]);

export function getPayoutProvider(providerCode: string) {
  const provider = payoutProviders.get(providerCode);

  if (!provider) {
    throw new Error(`Provider de payout nao encontrado: ${providerCode}`);
  }

  return provider;
}
