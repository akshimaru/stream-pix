import type { PixProvider } from "./types.js";
import { MockPixProvider } from "./mock-pix-provider.js";
import { MercadoPagoPixProvider } from "./mercado-pago-pix-provider.js";

const pixProviders = new Map<string, PixProvider>([
  ["MOCK_PIX", new MockPixProvider()],
  ["MERCADO_PAGO", new MercadoPagoPixProvider()],
]);

export function getPixProvider(providerCode: string) {
  const provider = pixProviders.get(providerCode);

  if (!provider) {
    throw new Error(`Provider PIX não encontrado: ${providerCode}`);
  }

  return provider;
}
