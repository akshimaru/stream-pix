"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, apiPost } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPanel } from "@/components/shared/loading-panel";

interface WorkspaceSummary {
  profile: {
    displayName: string;
    publicUrl: string;
    overlayUrl: string;
  };
}

export default function OnboardingPage() {
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);

  useEffect(() => {
    apiFetch<WorkspaceSummary>("/v1/streamer/workspace").then(setWorkspace);
  }, []);

  async function complete() {
    await apiPost("/v1/streamer/onboarding/complete");
    toast.success("Onboarding marcado como concluido.");
  }

  if (!workspace) {
    return <LoadingPanel label="Carregando onboarding..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">Wizard inicial</p>
        <h1 className="mt-2 font-[var(--font-orbitron)] text-4xl font-black text-white">
          {workspace.profile.displayName}, vamos colocar tudo no ar.
        </h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {[
          {
            title: "1. Revisar pagina publica",
            text: "Confirme headline, valores minimo/maximo, cooldown e moderacao antes de divulgar o link.",
            href: "/dashboard/settings",
          },
          {
            title: "2. Ajustar overlay e tema",
            text: "Personalize cores, duracao e layout do card. O preview ao vivo ajuda a testar no OBS.",
            href: "/dashboard/overlay",
          },
          {
            title: "3. Testar alerta em tempo real",
            text: "Dispare um alerta manual para validar seu widget seguro e a fila de voz.",
            href: "/dashboard",
          },
        ].map((step) => (
          <Card key={step.title} className="space-y-4">
            <p className="text-xl font-bold text-white">{step.title}</p>
            <p className="text-white/60">{step.text}</p>
            <Link href={step.href} className="inline-flex rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80">
              Abrir etapa
            </Link>
          </Card>
        ))}
      </div>

      <Card className="space-y-4">
        <p className="text-white/65">Links prontos para compartilhar ou usar no setup:</p>
        <div className="grid gap-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            Pagina publica: {workspace.profile.publicUrl}
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            Overlay seguro: {workspace.profile.overlayUrl}
          </div>
        </div>
        <Button onClick={complete}>Concluir onboarding</Button>
      </Card>
    </div>
  );
}
