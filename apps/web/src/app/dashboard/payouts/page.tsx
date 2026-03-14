"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatCurrency } from "@streampix/shared";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingPanel } from "@/components/shared/loading-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiFetch, apiPatch, apiPost } from "@/lib/api";

const darkSelectClassName =
  "h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-300/60 focus:bg-white/10";
const darkOptionClassName = "bg-[#0b1020] text-white";

const payoutAccountSchema = z.object({
  legalName: z.string().trim().max(160),
  document: z.string().trim().max(32),
  pixKeyType: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"]).nullable(),
  pixKeyValue: z.string().trim().max(191),
  payoutsEnabled: z.boolean(),
  instantPayoutEnabled: z.boolean(),
  securityCode: z.string().trim().optional(),
  confirmSecurityCode: z.string().trim().optional(),
});

const payoutRequestSchema = z.object({
  amount: z.coerce.number().min(10),
  securityCode: z.string().trim().min(6).max(6),
});

type PayoutAccountInput = z.infer<typeof payoutAccountSchema>;
type PayoutRequestInput = z.infer<typeof payoutRequestSchema>;

interface PayoutAccountPayload {
  id: string;
  legalName: string | null;
  document: string | null;
  pixKeyType: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP" | null;
  pixKeyValue: string | null;
  payoutsEnabled: boolean;
  instantPayoutEnabled: boolean;
  hasSecurityCode: boolean;
  securityCodeUpdatedAt: string | null;
  availableBalance: number;
  pendingBalance: number;
  lockedBalance: number;
  totalPaidOut: number;
}

interface PayoutRequestItem {
  id: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
  failureReason: string | null;
  reviewerName: string | null;
}

interface LedgerItem {
  id: string;
  entryType: string;
  direction: string;
  amount: number;
  feeAmount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

interface PayoutOverviewResponse {
  minimumPayoutAmount: number;
  providerCode: string;
  account: PayoutAccountPayload;
  recentRequests: PayoutRequestItem[];
  recentLedger: LedgerItem[];
}

interface PayoutListResponse {
  items: PayoutRequestItem[];
  meta: {
    page: number;
    pageCount: number;
    total: number;
  };
}

export default function PayoutsPage() {
  const [overview, setOverview] = useState<PayoutOverviewResponse | null>(null);
  const [history, setHistory] = useState<PayoutListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const accountForm = useForm<PayoutAccountInput>({
    resolver: zodResolver(payoutAccountSchema),
    defaultValues: {
      legalName: "",
      document: "",
      pixKeyType: "EMAIL",
      pixKeyValue: "",
      payoutsEnabled: false,
      instantPayoutEnabled: true,
      securityCode: "",
      confirmSecurityCode: "",
    },
  });

  const payoutForm = useForm<PayoutRequestInput>({
    resolver: zodResolver(payoutRequestSchema),
    defaultValues: {
      amount: 10,
      securityCode: "",
    },
  });

  async function load() {
    setLoading(true);

    try {
      const [nextOverview, nextHistory] = await Promise.all([
        apiFetch<PayoutOverviewResponse>("/v1/streamer/payouts/overview"),
        apiFetch<PayoutListResponse>("/v1/streamer/payouts?page=1&pageSize=12"),
      ]);

      setOverview(nextOverview);
      setHistory(nextHistory);

      accountForm.reset({
        legalName: nextOverview.account.legalName ?? "",
        document: nextOverview.account.document ?? "",
        pixKeyType: nextOverview.account.pixKeyType ?? "EMAIL",
        pixKeyValue: nextOverview.account.pixKeyValue ?? "",
        payoutsEnabled: nextOverview.account.payoutsEnabled,
        instantPayoutEnabled: nextOverview.account.instantPayoutEnabled,
        securityCode: "",
        confirmSecurityCode: "",
      });
      payoutForm.reset({
        amount: Math.max(nextOverview.minimumPayoutAmount, 10),
        securityCode: "",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar repasses.");
      setLoading(false);
    });
  }, []);

  async function saveAccount(values: PayoutAccountInput) {
    try {
      setSavingAccount(true);
      await apiPatch("/v1/streamer/payout-account", values);
      toast.success("Conta PIX e seguranca de saque salvas.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a conta PIX.");
    } finally {
      setSavingAccount(false);
    }
  }

  async function requestPayout(values: PayoutRequestInput) {
    try {
      setRequestingPayout(true);
      await apiPost("/v1/streamer/payouts/request", values);
      toast.success("Saque enviado para PIX instantaneo.");
      payoutForm.reset({
        amount: Math.max(overview?.minimumPayoutAmount ?? 10, 10),
        securityCode: "",
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel criar o saque.");
    } finally {
      setRequestingPayout(false);
    }
  }

  if (loading || !overview || !history) {
    return <LoadingPanel label="Carregando repasses..." />;
  }

  const canRequestPayout =
    overview.account.payoutsEnabled &&
    overview.account.instantPayoutEnabled &&
    overview.account.availableBalance >= overview.minimumPayoutAmount &&
    !!overview.account.pixKeyType &&
    !!overview.account.pixKeyValue &&
    overview.account.hasSecurityCode;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">Repasses</p>
          <h1 className="mt-2 font-[var(--font-orbitron)] text-4xl font-black text-white">Conta PIX e saque instantaneo</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/55">
            O PIX confirmado vira saldo disponivel. Com chave configurada e numero de seguranca ativo, o saque segue direto para sua chave PIX.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/70">
          Provider atual: <span className="font-semibold text-white">{overview.providerCode}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.28em] text-white/45">Disponivel</p>
          <p className="mt-4 text-3xl font-black text-white">{formatCurrency(overview.account.availableBalance)}</p>
          <p className="mt-2 text-sm text-white/45">Saldo pronto para saque agora.</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.28em] text-white/45">Bloqueado</p>
          <p className="mt-4 text-3xl font-black text-white">{formatCurrency(overview.account.lockedBalance)}</p>
          <p className="mt-2 text-sm text-white/45">Saques em processamento no provider.</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.28em] text-white/45">Seguranca</p>
          <p className="mt-4 text-3xl font-black text-white">{overview.account.hasSecurityCode ? "PIN ativo" : "PIN pendente"}</p>
          <p className="mt-2 text-sm text-white/45">
            {overview.account.securityCodeUpdatedAt
              ? `Atualizado em ${new Date(overview.account.securityCodeUpdatedAt).toLocaleDateString("pt-BR")}`
              : "Defina um codigo de 6 digitos para liberar saques."}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.28em] text-white/45">Total repassado</p>
          <p className="mt-4 text-3xl font-black text-white">{formatCurrency(overview.account.totalPaidOut)}</p>
          <p className="mt-2 text-sm text-white/45">Historico de PIX enviados ao streamer.</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Conta PIX do streamer</h2>
              <p className="mt-2 text-sm text-white/45">
                Configure a chave que vai receber o saque e o PIN de 6 digitos exigido na retirada.
              </p>
            </div>
            <StatusBadge value={overview.account.payoutsEnabled ? "ACTIVE" : "PENDING"} />
          </div>

          <form className="mt-6 grid gap-4" onSubmit={accountForm.handleSubmit(saveAccount)}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Nome legal</label>
                <Input placeholder="Alpha Neon LTDA" {...accountForm.register("legalName")} />
                <p className="text-xs text-white/35">Nome do recebedor que vai aparecer no PIX de saque.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/70">Documento</label>
                <Input placeholder="CPF ou CNPJ" {...accountForm.register("document")} />
                <p className="text-xs text-white/35">Usado para validacao do recebedor no payout.</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Tipo da chave PIX</label>
                <select
                  className={darkSelectClassName}
                  style={{ colorScheme: "dark" }}
                  {...accountForm.register("pixKeyType")}
                >
                  <option value="CPF" className={darkOptionClassName}>
                    CPF
                  </option>
                  <option value="CNPJ" className={darkOptionClassName}>
                    CNPJ
                  </option>
                  <option value="EMAIL" className={darkOptionClassName}>
                    E-mail
                  </option>
                  <option value="PHONE" className={darkOptionClassName}>
                    Telefone
                  </option>
                  <option value="EVP" className={darkOptionClassName}>
                    Chave aleatoria
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Chave PIX</label>
                <Input placeholder="financeiro@alpha-neon.live" {...accountForm.register("pixKeyValue")} />
                <p className="text-xs text-white/35">Destino final do saque do streamer.</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Numero de seguranca</label>
                <Input type="password" inputMode="numeric" maxLength={6} placeholder="6 digitos" {...accountForm.register("securityCode")} />
                <p className="text-xs text-white/35">
                  Se ja existe um PIN ativo, deixe em branco para manter o atual.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/70">Confirmar numero</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Repita o numero"
                  {...accountForm.register("confirmSecurityCode")}
                />
                <p className="text-xs text-white/35">Esse numero sera exigido em todo saque.</p>
              </div>
            </div>

            <div className="grid gap-3">
              <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-transparent"
                  {...accountForm.register("payoutsEnabled")}
                />
                Ativar saques nesta conta PIX
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-transparent"
                  {...accountForm.register("instantPayoutEnabled")}
                />
                Liberar saque instantaneo quando houver saldo
              </label>
            </div>

            <div className="rounded-3xl border border-cyan-300/15 bg-cyan-400/5 p-4 text-sm text-white/70">
              <p>
                Saque minimo atual: <span className="font-semibold text-white">{formatCurrency(overview.minimumPayoutAmount)}</span>
              </p>
              <p className="mt-2">
                Status do PIN: <span className="font-semibold text-white">{overview.account.hasSecurityCode ? "Configurado" : "Ainda nao configurado"}</span>
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingAccount}>
                {savingAccount ? "Salvando conta..." : "Salvar conta PIX"}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <div>
            <h2 className="text-2xl font-bold text-white">Saque instantaneo</h2>
            <p className="mt-2 text-sm text-white/45">
              O valor sai do saldo disponivel e segue para o provider PIX assim que o PIN for validado.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={payoutForm.handleSubmit(requestPayout)}>
            <div className="space-y-2">
              <label className="text-sm text-white/70">Valor do saque</label>
              <Input type="number" step="0.01" min={overview.minimumPayoutAmount} {...payoutForm.register("amount", { valueAsNumber: true })} />
              <p className="text-xs text-white/35">Use apenas o valor que ja esta no saldo disponivel.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/70">Numero de seguranca</label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Digite o PIN para confirmar"
                {...payoutForm.register("securityCode")}
              />
              <p className="text-xs text-white/35">Protege o saque mesmo se alguem acessar sua sessao logada.</p>
            </div>

            <div className="rounded-3xl border border-cyan-300/15 bg-cyan-400/5 p-4 text-sm text-white/70">
              <p>
                Disponivel agora: <span className="font-semibold text-white">{formatCurrency(overview.account.availableBalance)}</span>
              </p>
              <p className="mt-2">
                Destino atual:{" "}
                <span className="font-semibold text-white">
                  {overview.account.pixKeyValue ?? "Configure a chave PIX para habilitar repasses"}
                </span>
              </p>
              <p className="mt-2">
                Modo atual:{" "}
                <span className="font-semibold text-white">
                  {overview.account.instantPayoutEnabled ? "Saque instantaneo" : "Aprovacao manual"}
                </span>
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={!canRequestPayout || requestingPayout}>
              {requestingPayout ? "Enviando saque..." : "Sacar agora"}
            </Button>

            {!canRequestPayout ? (
              <p className="text-sm text-amber-200/80">
                Ative a conta PIX, configure o PIN de 6 digitos e mantenha saldo acima do minimo para liberar o saque.
              </p>
            ) : null}
          </form>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Historico de saques</h2>
            <span className="text-sm text-white/45">{history.meta.total} registros</span>
          </div>
          <div className="mt-6 space-y-3">
            {history.items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/45">
                Nenhum saque criado ainda.
              </div>
            ) : (
              history.items.map((item) => (
                <div key={item.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{formatCurrency(item.amount)}</p>
                      <p className="mt-1 text-sm text-white/45">
                        Pedido em {new Date(item.requestedAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <StatusBadge value={item.status} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-white/60 md:grid-cols-2">
                    <p>Liquido: {formatCurrency(item.netAmount)}</p>
                    <p>Revisado por: {item.reviewerName ?? "Fluxo automatico"}</p>
                    <p>Pago em: {item.paidAt ? new Date(item.paidAt).toLocaleString("pt-BR") : "Ainda nao pago"}</p>
                    <p>Motivo: {item.failureReason ?? "Sem observacoes"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Extrato do saldo</h2>
            <span className="text-sm text-white/45">Ultimos movimentos financeiros</span>
          </div>
          <div className="mt-6 space-y-3">
            {overview.recentLedger.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/45">
                Ainda nao existem lancamentos no saldo.
              </div>
            ) : (
              overview.recentLedger.map((entry) => (
                <div key={entry.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{entry.description}</p>
                      <p className="mt-1 text-sm text-white/45">{new Date(entry.createdAt).toLocaleString("pt-BR")}</p>
                    </div>
                    <StatusBadge value={entry.entryType} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-white/60 md:grid-cols-2">
                    <p>Movimento: {formatCurrency(entry.amount)}</p>
                    <p>Saldo apos: {formatCurrency(entry.balanceAfter)}</p>
                    <p>Direcao: {entry.direction}</p>
                    <p>Taxas: {formatCurrency(entry.feeAmount)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
