"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { LoadingPanel } from "@/components/shared/loading-panel";

export default function OverlayPreviewPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ profile: { overlayToken: string } }>("/v1/streamer/workspace").then((data) => setToken(data.profile.overlayToken));
  }, []);

  if (!token) {
    return <LoadingPanel label="Carregando preview..." />;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">Preview imersivo</p>
      <div className="overflow-hidden rounded-[32px] border border-white/10 bg-black">
        <iframe src={`/widget/alerts/${token}`} className="h-[78vh] w-full" />
      </div>
    </div>
  );
}
