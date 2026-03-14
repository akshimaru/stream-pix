import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-xl space-y-5 rounded-[32px] border border-white/10 bg-white/[0.03] p-10 text-center shadow-neon">
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/55">404</p>
        <h1 className="font-[var(--font-orbitron)] text-4xl font-black text-white">A rota se perdeu no multiverso neon.</h1>
        <p className="text-white/60">
          A pagina que voce tentou abrir nao foi encontrada. Volte para a landing ou abra a demo publica.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/" className="rounded-full bg-white/8 px-5 py-3 text-sm font-semibold text-white">
            Ir para home
          </Link>
          <Link href="/s/alpha-neon" className="rounded-full bg-gradient-to-r from-primary to-secondary px-5 py-3 text-sm font-semibold text-white">
            Abrir demo
          </Link>
        </div>
      </div>
    </main>
  );
}
