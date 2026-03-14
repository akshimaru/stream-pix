"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@streampix/shared";
import { toast } from "sonner";
import { apiFetch, apiPost } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingPanel } from "@/components/shared/loading-panel";

interface AlertsResponse {
  items: Array<{
    id: string;
    supporterName: string;
    amount: number;
    message: string;
    status: string;
    ttsStatus: string;
    createdAt: string;
  }>;
}

export default function AlertsPage() {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setData(await apiFetch<AlertsResponse>("/v1/streamer/alerts"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(alertId: string) {
    await apiPost(`/v1/streamer/alerts/${alertId}/approve`);
    toast.success("Alerta aprovado e enviado ao overlay.");
    load();
  }

  async function handleReject(alertId: string) {
    await apiPost(`/v1/streamer/alerts/${alertId}/reject`);
    toast.success("Alerta rejeitado.");
    load();
  }

  if (loading || !data) {
    return <LoadingPanel label="Carregando fila de alertas..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">Fila</p>
        <h1 className="mt-2 font-[var(--font-orbitron)] text-4xl font-black text-white">Alertas e moderacao</h1>
      </div>

      <div className="grid gap-4">
        {data.items.map((alert) => (
          <Card key={alert.id} className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xl font-bold text-white">{alert.supporterName}</p>
                <StatusBadge value={alert.status} />
                <StatusBadge value={alert.ttsStatus} />
              </div>
              <p className="text-sm text-white/75">{alert.message}</p>
              <p className="text-sm text-white/35">{new Date(alert.createdAt).toLocaleString("pt-BR")}</p>
            </div>
            <div className="flex flex-col justify-between gap-4">
              <div>
                <p className="text-3xl font-black text-white">{formatCurrency(alert.amount)}</p>
                <p className="text-sm text-white/45">Valor pago pelo viewer</p>
              </div>
              {alert.status === "PROCESSING" ? (
                <div className="flex gap-3">
                  <Button className="flex-1" onClick={() => handleApprove(alert.id)}>
                    Aprovar
                  </Button>
                  <Button className="flex-1" variant="secondary" onClick={() => handleReject(alert.id)}>
                    Rejeitar
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/55">
                  Sem acao manual necessaria.
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
