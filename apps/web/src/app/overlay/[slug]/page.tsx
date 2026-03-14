import Link from "next/link";

export default async function OverlaySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-2xl space-y-5 rounded-[32px] border border-white/10 bg-white/[0.03] p-10 text-center shadow-neon">
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/55">Overlay route</p>
        <h1 className="font-[var(--font-orbitron)] text-4xl font-black text-white">Preview por slug preparado.</h1>
        <p className="text-white/60">
          O slug <span className="font-semibold text-white">@{slug}</span> esta reservado para experiencias futuras de
          preview e custom domains. No fluxo atual, o widget seguro usa token em <code>/widget/alerts/[token]</code>.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/dashboard/overlay" className="rounded-full bg-gradient-to-r from-primary to-secondary px-5 py-3 text-sm font-semibold text-white">
            Abrir painel overlay
          </Link>
          <Link href="/s/alpha-neon" className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80">
            Ver pagina demo
          </Link>
        </div>
      </div>
    </main>
  );
}
