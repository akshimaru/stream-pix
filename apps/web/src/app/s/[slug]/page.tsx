import Image from "next/image";
import { notFound } from "next/navigation";
import type { PublicStreamerPage } from "@streampix/shared";
import { publicFetch } from "@/lib/api";
import { ChargeWidget } from "@/components/public/charge-widget";
import { Logo } from "@/components/shared/logo";
import { Badge } from "@/components/ui/badge";

export default async function StreamerPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const streamer = await publicFetch<PublicStreamerPage>(`/v1/public/streamers/${slug}`).catch(() => null);

  if (!streamer) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-white/8">
        <div className="absolute inset-0 bg-hero-grid opacity-90" />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Logo />
            <Badge className="text-cyan-100">Pagina publica</Badge>
          </div>
          <div className="mt-12 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-4 py-3">
                {streamer.avatarUrl ? (
                  <Image
                    src={streamer.avatarUrl}
                    alt={streamer.displayName}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : null}
                <div>
                  <p className="font-semibold text-white">{streamer.displayName}</p>
                  <p className="text-sm text-white/45">@{streamer.slug}</p>
                </div>
              </div>
              <h1 className="font-[var(--font-orbitron)] text-5xl font-black text-white">{streamer.page.headline}</h1>
              <p className="max-w-2xl text-lg text-white/62">{streamer.page.description}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  `Minimo R$ ${streamer.page.minimumAmount.toFixed(2)}`,
                  `${streamer.page.messageCharLimit} caracteres`,
                  streamer.page.allowVoiceMessages ? "TTS ativado" : "Somente alerta visual",
                ].map((item) => (
                  <div key={item} className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/65">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <ChargeWidget streamer={streamer} />
          </div>
        </div>
      </section>
    </main>
  );
}
