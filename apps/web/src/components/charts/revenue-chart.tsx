"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartPoint } from "@streampix/shared";
import { Card } from "@/components/ui/card";

export function RevenueChart({ data }: { data: ChartPoint[] }) {
  return (
    <Card className="h-[320px]">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.28em] text-white/45">Analytics</p>
        <h3 className="mt-2 text-xl font-bold text-white">Fluxo da semana</h3>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gross" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.55} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="net" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#f472b6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 12 }} axisLine={false} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "#08101f",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
            }}
          />
          <Area type="monotone" dataKey="grossAmount" stroke="#22d3ee" fill="url(#gross)" strokeWidth={3} />
          <Area type="monotone" dataKey="netAmount" stroke="#f472b6" fill="url(#net)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
