import { notFound } from "next/navigation";
import type { OverlayBootstrap } from "@streampix/shared";
import { publicFetch } from "@/lib/api";
import { LiveOverlay } from "@/components/overlay/live-overlay";

export default async function WidgetAlertPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const bootstrap = await publicFetch<OverlayBootstrap>(`/v1/overlays/token/${token}/bootstrap`).catch(() => null);

  if (!bootstrap) {
    notFound();
  }

  return <LiveOverlay bootstrap={bootstrap} />;
}
