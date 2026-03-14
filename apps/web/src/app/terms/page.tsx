import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Card } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <Logo />
        <Link href="/" className="text-sm text-white/55">
          Voltar
        </Link>
      </div>
      <Card className="mt-12 space-y-5">
        <h1 className="font-[var(--font-orbitron)] text-4xl font-black text-white">Termos mockados</h1>
        <p className="text-white/65">
          Esta base inclui uma pagina de termos apenas para facilitar evolucao do produto. O texto juridico real deve
          ser substituido antes da publicacao em producao.
        </p>
        <p className="text-white/55">
          O objetivo desta tela e reservar a estrutura de navegacao, roteamento e placeholders para futuro hardening
          legal.
        </p>
      </Card>
    </main>
  );
}
