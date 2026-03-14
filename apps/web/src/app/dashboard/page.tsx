"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ChartPoint, DashboardNotificationEvent, StreamerOverview } from "@streampix/shared";
import { formatCurrency } from "@streampix/shared";
import { toast } from "sonner";
import { Copy, ExternalLink, Radio } from "lucide-react";
import { apiFetch, apiPost } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { playTestAlertFallback, type TestAlertResponse } from "@/lib/test-alert";
import { useAuthStore } from "@/store/auth-store";
import { MetricCard } from "@/components/shared/metric-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingPanel } from "@/components/shared/loading-panel";

interface OverviewPayload extends StreamerOverview {
  recentTransactions: Array<{
    id: string;
    supporterName: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  topSupporters: Array<{
    name: string;
    amount: number;
    donations: number;
  }>;
}

export default function DashboardOverviewPage() {
  const { realtimeToken } = useAuthStore();
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [analytics, setAnalytics] = useState<ChartPoint[]>([]);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; message: string; createdAt: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [overviewData, analyticsData, notificationData] = await Promise.all([
          apiFetch<OverviewPayload>("/v1/streamer/dashboard/overview"),
          apiFetch<ChartPoint[]>("/v1/streamer/dashboard/analytics"),
          apiFetch<Array<{ id: string; title: string; message: string; createdAt: string }>>(
            "/v1/streamer/notifications",
          ),
        ]);
        setOverview(overviewData);
        setAnalytics(analyticsData);
        setNotifications(notificationData);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao carregar dashboard.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (!realtimeToken) {
      return;
    }

    const socket = getSocket();
    socket.emit("dashboard:subscribe", {
      token: realtimeToken,
    });

    const onNotification = (payload: DashboardNotificationEvent) => {
      toast.success(payload.title, {
        description: payload.message,
      });
      setNotifications((current) => [
        {
          id: `${payload.type}-${payload.timestamp}`,
          title: payload.title,
          message: payload.message,
          createdAt: payload.timestamp,
        },
        ...current,
      ]);
    };

    socket.on("dashboard:notification", onNotification);
    return () => {
      socket.off("dashboard:notification", onNotification);
    };
  }, [realtimeToken]);

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado.");
  }

  async function testAlert() {
    try {
      const response = await apiPost<TestAlertResponse>("/v1/streamer/alerts/test");
      const playedLocally = playTestAlertFallback(response);
      toast.success(
        playedLocally
          ? "Alerta de teste enviado. Como nao ha overlay conectada, a voz tocou aqui no painel."
          : "Alerta de teste enviado para a overlay.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar alerta de teste.");
    }
  }

  if (loading || !overview) {
    return <LoadingPanel label="Carregando overview..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">Streamer workspace</p>
          <h1 className="mt-2 font-[var(--font-orbitron)] text-4xl font-black text-white">
            {overview.displayName}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge value={overview.subscriptionStatus} />
            {overview.currentPlan ? <StatusBadge value={overview.currentPlan.name.toUpperCase()} /> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => copyLink(overview.publicUrl)}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar pagina publica
          </Button>
          <Link
            href="/dashboard/overlay"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80"
          >
            Ajustar overlay
          </Link>
          <Button onClick={testAlert}>
            <Radio className="mr-2 h-4 w-4" />
            Testar alerta
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Receita hoje" value={formatCurrency(overview.totals.today)} />
        <MetricCard label="Semana" value={formatCurrency(overview.totals.week)} />
        <MetricCard label="Mes" value={formatCurrency(overview.totals.month)} />
        <MetricCard label="Liquido" value={formatCurrency(overview.totals.net)} hint={`Taxas ${formatCurrency(overview.totals.fees)}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <RevenueChart data={analytics} />
        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.28em] text-white/45">Acoes rapidas</p>
          <div className="grid gap-3">
            <button
              className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-left text-white/75"
              onClick={() => window.open(overview.publicUrl, "_blank")}
            >
              Abrir pagina publica
              <ExternalLink className="mt-2 h-4 w-4 text-cyan-200" />
            </button>
            <button
              className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-left text-white/75"
              onClick={() => window.open(overview.overlayUrl, "_blank")}
            >
              Abrir overlay seguro
              <ExternalLink className="mt-2 h-4 w-4 text-cyan-200" />
            </button>
            <Link
              href="/dashboard/onboarding"
              className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-left text-white/75"
            >
              Revisar onboarding inicial
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">Ultimas transacoes</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Fluxo recente</h2>
            </div>
            <Link href="/dashboard/payments" className="text-sm text-cyan-200">
              Ver tudo
            </Link>
          </div>
          <div className="mt-6 space-y-3">
            {overview.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <div>
                  <p className="font-semibold text-white">{transaction.supporterName}</p>
                  <p className="text-sm text-white/45">{new Date(transaction.createdAt).toLocaleString("pt-BR")}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">{formatCurrency(transaction.amount)}</p>
                  <StatusBadge value={transaction.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">Top apoiadores</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Ranking do mes</h2>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {overview.topSupporters.map((supporter) => (
              <div key={supporter.name} className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">{supporter.name}</p>
                  <p className="text-cyan-200">{formatCurrency(supporter.amount)}</p>
                </div>
                <p className="mt-2 text-sm text-white/45">{supporter.donations} apoios confirmados</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <p className="text-xs uppercase tracking-[0.28em] text-white/45">Notificacoes</p>
        <div className="mt-5 grid gap-3">
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="font-semibold text-white">{notification.title}</p>
              <p className="mt-1 text-sm text-white/55">{notification.message}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.24em] text-white/35">
                {new Date(notification.createdAt).toLocaleString("pt-BR")}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
