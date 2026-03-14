import { Logo } from "./logo";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 hero-noise opacity-30" />
      <div className="absolute -left-24 top-12 h-80 w-80 rounded-full bg-primary/25 blur-[120px]" />
      <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-400/18 blur-[120px]" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="flex flex-col justify-between rounded-[32px] border border-white/8 bg-white/[0.03] p-8 shadow-neon">
          <Logo />
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/65">Live payments engine</p>
            <h1 className="font-[var(--font-orbitron)] text-4xl font-black text-white sm:text-5xl">
              Alerta PIX com visual premium e voz na live.
            </h1>
            <p className="max-w-xl text-lg text-white/60">
              StreamPix une checkout PIX, overlay, fila TTS e analytics em uma stack pronta para producao.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Checkout PIX publico por streamer",
              "Overlay seguro com token",
              "Realtime no dashboard",
              "Fila pronta para escalar",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/70">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,48,0.98),rgba(6,9,22,0.98))] p-8 shadow-neon">
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">Workspace</p>
            <h2 className="mt-3 text-3xl font-bold text-white">{title}</h2>
            <p className="mt-3 text-white/60">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
