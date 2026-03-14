"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-xl space-y-5 rounded-[32px] border border-rose-400/15 bg-rose-500/5 p-10 text-center shadow-neon">
        <p className="text-xs uppercase tracking-[0.32em] text-rose-200/70">Erro</p>
        <h1 className="font-[var(--font-orbitron)] text-4xl font-black text-white">Algo saiu do script.</h1>
        <p className="text-white/60">
          A interface encontrou um erro inesperado. Tente recarregar o estado da pagina ou volte para o dashboard.
        </p>
        <div className="flex justify-center gap-3">
          <button
            className="rounded-full bg-gradient-to-r from-primary to-secondary px-5 py-3 text-sm font-semibold text-white"
            onClick={reset}
          >
            Tentar novamente
          </button>
          <Link href="/" className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80">
            Ir para home
          </Link>
        </div>
      </div>
    </main>
  );
}
