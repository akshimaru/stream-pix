"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatCurrency } from "@streampix/shared";
import { toast } from "sonner";
import { SessionGate } from "@/components/shared/session-gate";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingPanel } from "@/components/shared/loading-panel";
import { API_URL, apiFetch, apiPatch, apiPost } from "@/lib/api";

const planFormSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  description: z.string().min(4),
  monthlyPrice: z.coerce.number().min(0),
  yearlyPrice: z.coerce.number().min(0),
  feePercentage: z.coerce.number().min(0),
  fixedFee: z.coerce.number().min(0),
  messageCharLimit: z.coerce.number().min(40),
  hasPremiumVoices: z.boolean(),
  hasAdvancedAnalytics: z.boolean(),
  removeBranding: z.boolean(),
  hasAdvancedModeration: z.boolean(),
  highlight: z.boolean(),
  active: z.boolean(),
  features: z.array(z.string()).min(1),
});

type PlanFormInput = z.infer<typeof planFormSchema>;

interface AdminPaymentProviderConfig {
  accessToken?: string;
  publicKey?: string;
  webhookSecret?: string;
  notificationUrl?: string;
  paymentExpirationMinutes?: number;
  requirePayerEmail?: boolean;
  requirePayerDocument?: boolean;
  statementDescriptor?: string;
  testMode?: boolean;
  supportsPayouts?: boolean;
  payoutAccessToken?: string;
  payoutNotificationUrl?: string;
  payoutEnforceSignature?: boolean;
  payoutPrivateKeyPem?: string;
  hasAccessToken?: boolean;
  hasWebhookSecret?: boolean;
  hasPayoutAccessToken?: boolean;
  hasPayoutPrivateKey?: boolean;
  accessTokenMasked?: string;
  webhookSecretMasked?: string;
  payoutAccessTokenMasked?: string;
  [key: string]: unknown;
}

interface AdminPaymentProvider {
  id: string;
  code: string;
  name: string;
  driver: string;
  type: string;
  isActive: boolean;
  isDefault: boolean;
  feePercentage: number;
  fixedFee: number;
  webhookUrl: string;
  config: AdminPaymentProviderConfig;
}

interface AdminPayload {
  overview: {
    totals: {
      mrr: number;
      arr: number;
      totalProcessed: number;
      totalFees: number;
      activeStreamers: number;
      newAccounts: number;
      alertsExecuted: number;
      ttsExecuted: number;
    };
  };
  streamers: {
    items: Array<{
      id: string;
      displayName: string;
      slug: string;
      email: string;
      status: string;
      planName: string;
    }>;
  };
  plans: Array<{
    id: string;
    code: string;
    name: string;
    monthlyPrice: number;
    feePercentage: number;
    highlight: boolean;
  }>;
  paymentProviders: {
    items: AdminPaymentProvider[];
  };
  transactions: {
    items: Array<{
      id: string;
      txid: string;
      streamerName: string;
      supporterName: string;
      amount: number;
      platformFee: number;
      status: string;
    }>;
  };
  payouts: {
    items: Array<{
      id: string;
      streamerName: string;
      streamerSlug: string;
      legalName: string | null;
      pixKeyMasked: string | null;
      amount: number;
      netAmount: number;
      status: string;
      requestedAt: string;
      paidAt: string | null;
      failureReason: string | null;
      reviewerName: string | null;
    }>;
    summary: {
      pendingCount: number;
      processingCount: number;
      paidCount: number;
      pendingAmount: number;
      paidAmount: number;
    };
  };
  auditLogs: Array<{
    id: string;
    action: string;
    actor: string;
    streamer: string | null;
    createdAt: string;
  }>;
}

function cloneProviderItems(items: AdminPaymentProvider[]) {
  return Object.fromEntries(items.map((item) => [item.id, JSON.parse(JSON.stringify(item)) as AdminPaymentProvider]));
}

function buildProviderPayload(provider: AdminPaymentProvider) {
  if (provider.code !== "MERCADO_PAGO") {
    return {
      name: provider.name,
      isActive: provider.isActive,
      isDefault: provider.isDefault,
      feePercentage: Number(provider.feePercentage),
      fixedFee: Number(provider.fixedFee),
      config: provider.config ?? {},
    };
  }

  return {
    name: provider.name,
    isActive: provider.isActive,
    isDefault: provider.isDefault,
    feePercentage: Number(provider.feePercentage),
    fixedFee: Number(provider.fixedFee),
    config: {
      accessToken: String(provider.config.accessToken ?? ""),
      publicKey: String(provider.config.publicKey ?? ""),
      webhookSecret: String(provider.config.webhookSecret ?? ""),
      notificationUrl: String(provider.config.notificationUrl ?? ""),
      paymentExpirationMinutes: Number(provider.config.paymentExpirationMinutes ?? 30),
      requirePayerEmail: Boolean(provider.config.requirePayerEmail),
      requirePayerDocument: Boolean(provider.config.requirePayerDocument),
      statementDescriptor: String(provider.config.statementDescriptor ?? "STREAMPIX"),
      testMode: Boolean(provider.config.testMode),
      supportsPayouts: Boolean(provider.config.supportsPayouts),
      payoutAccessToken: String(provider.config.payoutAccessToken ?? ""),
      payoutNotificationUrl: String(provider.config.payoutNotificationUrl ?? ""),
      payoutEnforceSignature: Boolean(provider.config.payoutEnforceSignature),
      payoutPrivateKeyPem: String(provider.config.payoutPrivateKeyPem ?? ""),
    },
  };
}

function AdminContent() {
  const [payload, setPayload] = useState<AdminPayload | null>(null);
  const [providerDrafts, setProviderDrafts] = useState<Record<string, AdminPaymentProvider>>({});
  const [busyPayoutId, setBusyPayoutId] = useState<string | null>(null);
  const [savingProviderId, setSavingProviderId] = useState<string | null>(null);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const form = useForm<PlanFormInput>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      monthlyPrice: 0,
      yearlyPrice: 0,
      feePercentage: 0,
      fixedFee: 0,
      messageCharLimit: 180,
      hasPremiumVoices: true,
      hasAdvancedAnalytics: true,
      removeBranding: true,
      hasAdvancedModeration: true,
      highlight: false,
      active: true,
      features: ["Overlay premium"],
    },
  });

  async function load() {
    const [overview, streamers, plans, paymentProviders, transactions, payouts, auditLogs] = await Promise.all([
      apiFetch<AdminPayload["overview"]>("/v1/admin/overview"),
      apiFetch<AdminPayload["streamers"]>("/v1/admin/streamers"),
      apiFetch<AdminPayload["plans"]>("/v1/admin/plans"),
      apiFetch<AdminPayload["paymentProviders"]>("/v1/admin/payment-providers"),
      apiFetch<AdminPayload["transactions"]>("/v1/admin/transactions"),
      apiFetch<AdminPayload["payouts"]>("/v1/admin/payouts?page=1&pageSize=10"),
      apiFetch<AdminPayload["auditLogs"]>("/v1/admin/audit-logs"),
    ]);

    setPayload({ overview, streamers, plans, paymentProviders, transactions, payouts, auditLogs });
    setProviderDrafts(cloneProviderItems(paymentProviders.items));
  }

  useEffect(() => {
    load().catch((error) => toast.error(error instanceof Error ? error.message : "Falha no admin."));
  }, []);

  function updateProviderDraft(providerId: string, updater: (current: AdminPaymentProvider) => AdminPaymentProvider) {
    setProviderDrafts((current) => {
      const provider = current[providerId];

      if (!provider) {
        return current;
      }

      return {
        ...current,
        [providerId]: updater(provider),
      };
    });
  }

  async function createPlan(values: PlanFormInput) {
    await apiPost("/v1/admin/plans", values);
    toast.success("Plano criado.");
    form.reset();
    await load();
  }

  async function toggleStreamer(streamerId: string) {
    await apiPost(`/v1/admin/streamers/${streamerId}/toggle-status`);
    toast.success("Status do streamer atualizado.");
    await load();
  }

  async function approvePayout(payoutRequestId: string) {
    try {
      setBusyPayoutId(payoutRequestId);
      await apiPost(`/v1/admin/payouts/${payoutRequestId}/approve`);
      toast.success("Repasse aprovado e enviado.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel aprovar o repasse.");
    } finally {
      setBusyPayoutId(null);
    }
  }

  async function rejectPayout(payoutRequestId: string) {
    const reason = window.prompt("Motivo da rejeicao", "Dados financeiros inconsistentes");

    if (!reason) {
      return;
    }

    try {
      setBusyPayoutId(payoutRequestId);
      await apiPost(`/v1/admin/payouts/${payoutRequestId}/reject`, { reason });
      toast.success("Repasse rejeitado e saldo devolvido.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel rejeitar o repasse.");
    } finally {
      setBusyPayoutId(null);
    }
  }

  async function saveProvider(providerId: string) {
    const provider = providerDrafts[providerId];

    if (!provider) {
      return;
    }

    try {
      setSavingProviderId(providerId);
      await apiPatch(`/v1/admin/payment-providers/${providerId}`, buildProviderPayload(provider));
      toast.success(`${provider.name} salvo com sucesso.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar o provider.");
    } finally {
      setSavingProviderId(null);
    }
  }

  async function testProvider(providerId: string) {
    try {
      setTestingProviderId(providerId);
      const result = await apiPost<{ message: string; account?: { nickname?: string | null; email?: string | null } }>(
        `/v1/admin/payment-providers/${providerId}/test`,
      );
      const identity = result.account?.nickname || result.account?.email;
      toast.success(identity ? `${result.message} Conta: ${identity}.` : result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel testar o provider.");
    } finally {
      setTestingProviderId(null);
    }
  }

  if (!payload) {
    return <LoadingPanel label="Carregando superadmin..." />;
  }

  return (
    <DashboardShell isAdmin>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">Superadmin</p>
            <h1 className="mt-2 font-[var(--font-orbitron)] text-4xl font-black text-white">Operacao global</h1>
          </div>
          <Button variant="secondary" onClick={() => window.open(`${API_URL}/v1/admin/transactions/export.csv`, "_blank")}>
            Exportar transacoes CSV
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card><p className="text-xs uppercase tracking-[0.28em] text-white/45">MRR</p><p className="mt-4 text-3xl font-black text-white">{formatCurrency(payload.overview.totals.mrr)}</p></Card>
          <Card><p className="text-xs uppercase tracking-[0.28em] text-white/45">ARR</p><p className="mt-4 text-3xl font-black text-white">{formatCurrency(payload.overview.totals.arr)}</p></Card>
          <Card><p className="text-xs uppercase tracking-[0.28em] text-white/45">Total processado</p><p className="mt-4 text-3xl font-black text-white">{formatCurrency(payload.overview.totals.totalProcessed)}</p></Card>
          <Card><p className="text-xs uppercase tracking-[0.28em] text-white/45">Taxas coletadas</p><p className="mt-4 text-3xl font-black text-white">{formatCurrency(payload.overview.totals.totalFees)}</p></Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">Novas contas</p>
            <p className="mt-4 text-3xl font-black text-white">{payload.overview.totals.newAccounts}</p>
            <p className="mt-2 text-sm text-white/45">Cadastros criados nos ultimos 30 dias.</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">Saques pendentes</p>
            <p className="mt-4 text-3xl font-black text-white">{payload.payouts.summary.pendingCount}</p>
            <p className="mt-2 text-sm text-white/45">Fila aguardando aprovacao manual.</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">Valor pendente</p>
            <p className="mt-4 text-3xl font-black text-white">{formatCurrency(payload.payouts.summary.pendingAmount)}</p>
            <p className="mt-2 text-sm text-white/45">Obrigacao aberta da plataforma com streamers.</p>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Providers PIX e payout</h2>
              <p className="mt-2 text-sm text-white/45">
                O provider padrao define quem gera o QR Code PIX da pagina publica e, se habilitado, tambem executa os saques dos streamers.
              </p>
            </div>
            <div className="text-sm text-white/45">
              Webhook real do Mercado Pago: configure a URL exibida em cada card.
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            {payload.paymentProviders.items.map((providerItem) => {
              const provider = providerDrafts[providerItem.id] ?? providerItem;
              const config = provider.config;

              return (
                <div key={provider.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/55">{provider.code}</p>
                      <h3 className="mt-2 text-2xl font-bold text-white">{provider.name}</h3>
                      <p className="mt-2 text-sm text-white/45">{provider.driver}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge value={provider.isActive ? "ACTIVE" : "PENDING"} />
                      {provider.isDefault ? <StatusBadge value="DEFAULT" /> : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm text-white/70">Nome</label>
                      <Input value={provider.name} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, name: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-white/70">Webhook URL</label>
                      <Input value={provider.webhookUrl} readOnly />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-white/70">Fee percentual do gateway</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={provider.feePercentage}
                        onChange={(event) =>
                          updateProviderDraft(provider.id, (current) => ({
                            ...current,
                            feePercentage: Number(event.target.value || 0),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-white/70">Fee fixa do gateway</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={provider.fixedFee}
                        onChange={(event) =>
                          updateProviderDraft(provider.id, (current) => ({
                            ...current,
                            fixedFee: Number(event.target.value || 0),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
                      <input type="checkbox" checked={provider.isActive} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, isActive: event.target.checked }))} />
                      Provider ativo para gerar cobrancas PIX
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
                      <input
                        type="checkbox"
                        checked={provider.isDefault}
                        onChange={(event) =>
                          updateProviderDraft(provider.id, (current) => ({
                            ...current,
                            isDefault: event.target.checked,
                            isActive: event.target.checked ? true : current.isActive,
                          }))
                        }
                      />
                      Usar como provider padrao global
                    </label>
                  </div>

                  {provider.code === "MERCADO_PAGO" ? (
                    <div className="mt-6 space-y-4 rounded-3xl border border-cyan-300/10 bg-cyan-400/5 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm text-white/70">Access Token</label>
                          <Input type="password" placeholder={String(config.accessTokenMasked || "Cole o APP_USR do Mercado Pago")} value={String(config.accessToken ?? "")} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, config: { ...current.config, accessToken: event.target.value } }))} />
                          <p className="text-xs text-white/35">Se deixar em branco, o token atual permanece salvo.</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-white/70">Public Key</label>
                          <Input placeholder="APP_USR ou APP_PUB" value={String(config.publicKey ?? "")} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, config: { ...current.config, publicKey: event.target.value } }))} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-white/70">Webhook secret</label>
                          <Input type="password" placeholder={String(config.webhookSecretMasked || "Segredo do webhook, se configurado")} value={String(config.webhookSecret ?? "")} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, config: { ...current.config, webhookSecret: event.target.value } }))} />
                          <p className="text-xs text-white/35">Usado para validar o x-signature dos webhooks do Mercado Pago.</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-white/70">Notification URL override</label>
                          <Input placeholder={provider.webhookUrl} value={String(config.notificationUrl ?? "")} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, config: { ...current.config, notificationUrl: event.target.value } }))} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-white/70">Expiracao do PIX (min)</label>
                          <Input type="number" min={5} max={1440} value={Number(config.paymentExpirationMinutes ?? 30)} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, config: { ...current.config, paymentExpirationMinutes: Number(event.target.value || 30) } }))} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-white/70">Statement descriptor</label>
                          <Input maxLength={22} value={String(config.statementDescriptor ?? "STREAMPIX")} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, config: { ...current.config, statementDescriptor: event.target.value } }))} />
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
                          <input type="checkbox" checked={Boolean(config.requirePayerEmail)} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, config: { ...current.config, requirePayerEmail: event.target.checked } }))} />
                          Exigir e-mail do apoiador na pagina publica
                        </label>
                        <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
                          <input type="checkbox" checked={Boolean(config.requirePayerDocument)} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, config: { ...current.config, requirePayerDocument: event.target.checked } }))} />
                          Exigir CPF/CNPJ do apoiador
                        </label>
                        <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
                          <input type="checkbox" checked={Boolean(config.testMode)} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, config: { ...current.config, testMode: event.target.checked } }))} />
                          Ambiente de testes/homologacao
                        </label>
                      </div>

                      <div className="border-t border-white/10 pt-4">
                        <h4 className="text-lg font-bold text-white">Payout dos streamers via Mercado Pago</h4>
                        <p className="mt-2 text-sm text-white/45">
                          Quando ativo, o saque instantaneo do streamer usa o saldo da conta master do Mercado Pago configurada aqui.
                        </p>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm text-white/70">Access Token de payout</label>
                            <Input type="password" placeholder={String(config.payoutAccessTokenMasked || "Opcional, usa o token principal se vazio")} value={String(config.payoutAccessToken ?? "")} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, config: { ...current.config, payoutAccessToken: event.target.value } }))} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-white/70">Notification URL do payout</label>
                            <Input placeholder="Opcional para callbacks do payout" value={String(config.payoutNotificationUrl ?? "")} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, config: { ...current.config, payoutNotificationUrl: event.target.value } }))} />
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3">
                          <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
                            <input type="checkbox" checked={Boolean(config.supportsPayouts)} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, config: { ...current.config, supportsPayouts: event.target.checked } }))} />
                            Habilitar saques reais via Mercado Pago
                          </label>
                          <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
                            <input type="checkbox" checked={Boolean(config.payoutEnforceSignature)} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, config: { ...current.config, payoutEnforceSignature: event.target.checked } }))} />
                            Exigir assinatura no payout (fluxo avancado do Mercado Pago)
                          </label>
                        </div>

                        <div className="mt-4 space-y-2">
                          <label className="text-sm text-white/70">Chave privada PEM do payout</label>
                          <Textarea placeholder={config.hasPayoutPrivateKey ? "Ja existe uma chave salva. Cole uma nova apenas se quiser substituir." : "Cole a chave privada PEM usada para assinar o body do payout."} value={String(config.payoutPrivateKeyPem ?? "")} onChange={(event) => updateProviderDraft(provider.id, (current) => ({ ...current, config: { ...current.config, payoutPrivateKeyPem: event.target.value } }))} />
                          <p className="text-xs text-white/35">
                            O docs oficial do payout informa o cabecalho `x-signature` com o body em base64 usando o par de chaves do integrador.
                            Aqui o sistema usa assinatura RSA-SHA256 como inferencia operacional para esse fluxo.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-3xl border border-white/8 bg-white/[0.03] p-4 text-sm text-white/55">
                      Provider local para desenvolvimento e simulacao de pagamentos sem PSP real.
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <Button variant="secondary" disabled={testingProviderId === provider.id} onClick={() => testProvider(provider.id)}>
                      {testingProviderId === provider.id ? "Testando..." : "Testar conexao"}
                    </Button>
                    <Button disabled={savingProviderId === provider.id} onClick={() => saveProvider(provider.id)}>
                      {savingProviderId === provider.id ? "Salvando..." : "Salvar provider"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Streamers</h2>
              <span className="text-sm text-white/45">{payload.overview.totals.activeStreamers} ativos</span>
            </div>
            <div className="mt-6 space-y-3">
              {payload.streamers.items.map((streamer) => (
                <div key={streamer.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{streamer.displayName}</p>
                      <p className="text-sm text-white/45">{streamer.email} · {streamer.slug}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge value={streamer.status} />
                      <Button size="sm" variant="secondary" onClick={() => toggleStreamer(streamer.id)}>
                        Alternar status
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-white/55">Plano atual: {streamer.planName}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-2xl font-bold text-white">Planos ativos</h2>
            <div className="mt-6 grid gap-3">
              {payload.plans.map((plan) => (
                <div key={plan.id} className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{plan.name}</p>
                      <p className="text-sm text-white/45">{plan.code}</p>
                    </div>
                    <StatusBadge value={plan.highlight ? "ACTIVE" : "PENDING"} />
                  </div>
                  <p className="mt-3 text-sm text-white/65">
                    {formatCurrency(plan.monthlyPrice)} mensal · fee {plan.feePercentage.toFixed(2)}%
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <h2 className="text-2xl font-bold text-white">Ultimas transacoes</h2>
            <div className="mt-6 space-y-3">
              {payload.transactions.items.map((transaction) => (
                <div key={transaction.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{transaction.supporterName}</p>
                      <p className="text-sm text-white/45">{transaction.streamerName} · {transaction.txid}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{formatCurrency(transaction.amount)}</p>
                      <p className="text-sm text-white/45">Fee {formatCurrency(transaction.platformFee)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <StatusBadge value={transaction.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-2xl font-bold text-white">Criar plano</h2>
            <form className="mt-6 grid gap-4" onSubmit={form.handleSubmit(createPlan)}>
              <Input placeholder="Codigo" {...form.register("code")} />
              <Input placeholder="Nome" {...form.register("name")} />
              <Input placeholder="Descricao" {...form.register("description")} />
              <div className="grid gap-4 md:grid-cols-2">
                <Input type="number" step="0.01" placeholder="Mensal" {...form.register("monthlyPrice", { valueAsNumber: true })} />
                <Input type="number" step="0.01" placeholder="Anual" {...form.register("yearlyPrice", { valueAsNumber: true })} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input type="number" step="0.01" placeholder="Fee %" {...form.register("feePercentage", { valueAsNumber: true })} />
                <Input type="number" step="0.01" placeholder="Taxa fixa" {...form.register("fixedFee", { valueAsNumber: true })} />
              </div>
              <Input
                placeholder="Features separadas por virgula"
                value={(form.watch("features") ?? []).join(", ")}
                onChange={(event) =>
                  form.setValue(
                    "features",
                    event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  )
                }
              />
              <Button type="submit">Criar plano</Button>
            </form>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Fila de repasses</h2>
              <p className="mt-2 text-sm text-white/45">
                Aprovacao manual de saques, com retorno automatico do saldo em caso de rejeicao ou falha.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-white/55">
              <span>Processando: {payload.payouts.summary.processingCount}</span>
              <span>Pagos: {payload.payouts.summary.paidCount}</span>
              <span>Total pago: {formatCurrency(payload.payouts.summary.paidAmount)}</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {payload.payouts.items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/45">
                Nenhum repasse encontrado nesta fase.
              </div>
            ) : (
              payload.payouts.items.map((payout) => (
                <div key={payout.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{payout.streamerName}</p>
                      <p className="mt-1 text-sm text-white/45">
                        {payout.streamerSlug} · {payout.legalName ?? "Sem nome legal"} · {payout.pixKeyMasked ?? "Sem chave"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{formatCurrency(payout.amount)}</p>
                      <p className="mt-1 text-sm text-white/45">Liquido {formatCurrency(payout.netAmount)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge value={payout.status} />
                      <span className="text-sm text-white/45">{new Date(payout.requestedAt).toLocaleString("pt-BR")}</span>
                      <span className="text-sm text-white/45">Revisor: {payout.reviewerName ?? "Aguardando"}</span>
                    </div>
                    {payout.status === "PENDING_APPROVAL" ? (
                      <div className="flex gap-3">
                        <Button size="sm" disabled={busyPayoutId === payout.id} onClick={() => approvePayout(payout.id)}>
                          {busyPayoutId === payout.id ? "Processando..." : "Aprovar e pagar"}
                        </Button>
                        <Button size="sm" variant="danger" disabled={busyPayoutId === payout.id} onClick={() => rejectPayout(payout.id)}>
                          Rejeitar
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-white/60 md:grid-cols-2">
                    <p>Pago em: {payout.paidAt ? new Date(payout.paidAt).toLocaleString("pt-BR") : "Ainda nao pago"}</p>
                    <p>Falha/observacao: {payout.failureReason ?? "Sem observacoes"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-bold text-white">Auditoria recente</h2>
          <div className="mt-6 space-y-3">
            {payload.auditLogs.map((log) => (
              <div key={log.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{log.action}</p>
                    <p className="text-sm text-white/45">{log.actor} · {log.streamer ?? "global"}</p>
                  </div>
                  <p className="text-sm text-white/35">{new Date(log.createdAt).toLocaleString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}

export default function AdminPage() {
  return (
    <SessionGate requiredRoles={["SUPERADMIN", "INTERNAL_ADMIN"]}>
      <AdminContent />
    </SessionGate>
  );
}
