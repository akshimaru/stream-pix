"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@streampix/shared";
import { Search } from "lucide-react";
import { apiFetch, API_URL } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingPanel } from "@/components/shared/loading-panel";
import { Button } from "@/components/ui/button";

interface PaymentListResponse {
  items: Array<{
    id: string;
    txid: string;
    supporterName: string;
    message: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  meta: {
    page: number;
    pageCount: number;
  };
}

const darkSelectClassName =
  "h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-300/60 focus:bg-white/10";
const darkOptionClassName = "bg-[#0b1020] text-white";

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<PaymentListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<PaymentListResponse>(
      `/v1/streamer/payments?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`,
    )
      .then(setData)
      .finally(() => setLoading(false));
  }, [search, status]);

  if (loading || !data) {
    return <LoadingPanel label="Carregando pagamentos..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">Pagamentos</p>
          <h1 className="mt-2 font-[var(--font-orbitron)] text-4xl font-black text-white">Transacoes PIX</h1>
        </div>
        <Button variant="secondary" onClick={() => window.open(`${API_URL}/v1/streamer/payments/export.csv`, "_blank")}>
          Exportar CSV
        </Button>
      </div>

      <Card className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <Input className="pl-11" placeholder="Buscar por nome, mensagem ou txid" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <select
          className={darkSelectClassName}
          style={{ colorScheme: "dark" }}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="" className={darkOptionClassName}>
            Todos os status
          </option>
          <option value="PAID" className={darkOptionClassName}>
            PAID
          </option>
          <option value="PENDING" className={darkOptionClassName}>
            PENDING
          </option>
          <option value="BLOCKED" className={darkOptionClassName}>
            BLOCKED
          </option>
        </select>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-[1.1fr_1.4fr_0.6fr_0.7fr] gap-3 border-b border-white/8 px-6 py-4 text-xs uppercase tracking-[0.24em] text-white/35">
          <span>Apoiador</span>
          <span>Mensagem</span>
          <span>Valor</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-white/6">
          {data.items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1.1fr_1.4fr_0.6fr_0.7fr] gap-3 px-6 py-5 text-sm text-white/75">
              <div>
                <p className="font-semibold text-white">{item.supporterName}</p>
                <p className="mt-1 text-xs text-white/35">{new Date(item.createdAt).toLocaleString("pt-BR")}</p>
              </div>
              <p className="line-clamp-2">{item.message}</p>
              <p className="font-semibold text-white">{formatCurrency(item.amount)}</p>
              <div>
                <StatusBadge value={item.status} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
