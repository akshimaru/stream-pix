import Link from "next/link";
import type { PlanSummary } from "@streampix/shared";
import { publicFetch } from "@/lib/api";
import { Logo } from "@/components/shared/logo";
import { Card } from "@/components/ui/card";

export default async function PricingPage() {
  const plans = await publicFetch<PlanSummary[]>("/v1/plans/public").catch(() => []);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <Logo />
        <Link href="/" className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/70">
          Voltar
        </Link>
      </div>
      <div className="mt-16 max-w-3xl space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">Pricing</p>
        <h1 className="font-[var(--font-orbitron)] text-5xl font-black text-white">Planos para cada estagio da live.</h1>
        <p className="text-lg text-white/60">
          Combine mensalidade, fee por PIX e recursos premium sem travar seu roadmap futuro.
        </p>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="flex flex-col">
            <div className="space-y-4">
              <p className="font-[var(--font-orbitron)] text-2xl font-black text-white">{plan.name}</p>
              <p className="text-white/55">{plan.description}</p>
              <div>
                <p className="text-4xl font-black text-white">R$ {plan.monthlyPrice.toFixed(2)}</p>
                <p className="text-sm text-white/45">
                  anual: R$ {plan.yearlyPrice.toFixed(2)} · fee {plan.feePercentage.toFixed(2)}%
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <div key={feature} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
                  {feature}
                </div>
              ))}
            </div>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary via-accent to-secondary px-6 py-3 text-sm font-semibold text-white shadow-neon"
            >
              Criar conta
            </Link>
          </Card>
        ))}
      </div>
    </main>
  );
}
