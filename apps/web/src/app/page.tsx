import Link from "next/link";
import { Check, ChevronRight, Radio, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { appMeta, type PlanSummary } from "@streampix/shared";
import { publicFetch } from "@/lib/api";
import { Logo } from "@/components/shared/logo";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionTitle } from "@/components/shared/section-title";

const faq = [
  {
    question: "Posso trocar o provider PIX depois?",
    answer: "Sim. A arquitetura desacopla a camada de cobranca, entao o mock inicial pode virar gateway real sem reescrever o produto.",
  },
  {
    question: "O overlay funciona no OBS Browser Source?",
    answer: "Sim. O widget foi desenhado para OBS, Twitch Studio, YouTube e outros ambientes baseados em navegador.",
  },
  {
    question: "O TTS esta pronto para escalar?",
    answer: "Sim. O fluxo usa fila dedicada e o worker ja respeita lock por streamer para evitar sobreposicao.",
  },
];

const testimonials = [
  {
    name: "NexaRaid",
    role: "Streamer FPS",
    quote: "A configuracao levou minutos e o overlay parece de um produto AAA. A comunidade sentiu o upgrade na hora.",
  },
  {
    name: "LunaFrames",
    role: "Criadora de conteudo",
    quote: "O fluxo de PIX + voz aumentou muito a participacao do chat e finalmente ficou organizado para escalar.",
  },
  {
    name: "ByteWizard",
    role: "Streamer variety",
    quote: "O dashboard passa confianca financeira e o realtime deixa tudo muito mais profissional durante a live.",
  },
];

export default async function LandingPage() {
  const plans = await publicFetch<PlanSummary[]>("/v1/plans/public").catch(() => []);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="hero-noise relative border-b border-white/6">
        <div className="absolute inset-0 bg-hero-grid opacity-90" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-5 rounded-[32px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur md:flex-row md:items-center md:justify-between">
            <Logo />
            <nav className="flex flex-wrap items-center gap-3 text-sm text-white/65">
              <Link href="/pricing" className="rounded-full px-4 py-2 transition hover:bg-white/6 hover:text-white">
                Pricing
              </Link>
              <Link href="/login" className="rounded-full px-4 py-2 transition hover:bg-white/6 hover:text-white">
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-gradient-to-r from-primary via-accent to-secondary px-5 py-2.5 font-semibold text-white shadow-neon"
              >
                Comecar
              </Link>
            </nav>
          </header>

          <div className="grid gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-8">
              <Badge className="border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                SaaS premium para streamers e lives
              </Badge>
              <div className="space-y-5">
                <h1 className="font-[var(--font-orbitron)] text-5xl font-black leading-tight text-white sm:text-6xl">
                  PIX com <span className="text-gradient">voz, glow e realtime</span> para sua live.
                </h1>
                <p className="max-w-2xl text-lg text-white/62">
                  {appMeta.description} Cada streamer ganha um workspace isolado, pagina publica, overlay seguro,
                  analytics, assinatura e arquitetura pronta para crescer.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary via-accent to-secondary px-6 py-3 text-sm font-semibold text-white shadow-neon"
                >
                  Testar agora
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/s/alpha-neon"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 hover:border-cyan-300/30 hover:bg-white/10"
                >
                  Ver pagina demo
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { value: "Setup em minutos", hint: "PIX mock + overlay" },
                  { value: "Multi-tenant real", hint: "Workspace por streamer" },
                  { value: "Fila pronta", hint: "TTS desacoplado" },
                ].map((item) => (
                  <Card key={item.value} className="p-5">
                    <p className="text-lg font-bold text-white">{item.value}</p>
                    <p className="mt-2 text-sm text-white/55">{item.hint}</p>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="relative overflow-hidden border-cyan-300/15 bg-black/20 p-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.2),transparent_30%),radial-gradient(circle_at_10%_80%,rgba(34,211,238,0.15),transparent_25%)]" />
              <div className="relative grid gap-4 p-6">
                <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/45">Widget ativo</p>
                    <p className="mt-2 text-2xl font-black text-white">Alpha Neon</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-100">
                    <Radio className="h-5 w-5" />
                  </div>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.24),rgba(8,12,24,0.98),rgba(34,211,238,0.16))] p-5 shadow-neon">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-[var(--font-orbitron)] text-2xl font-black text-white">LunaByte</p>
                      <p className="mt-1 text-sm text-cyan-200/80">R$ 25,00 enviados em tempo real</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white/80">
                      PIX LIVE
                    </div>
                  </div>
                  <p className="mt-4 text-lg text-white/88">
                    Essa live esta absurda, continua assim e manda salve para o squad da madrugada!
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      icon: Wallet,
                      title: "Checkout PIX",
                      text: "Provider desacoplado com QR Code, copia e cola e confirmacao realtime.",
                    },
                    {
                      icon: Sparkles,
                      title: "Overlay premium",
                      text: "Tema neon com preview no painel, token seguro e compatibilidade com OBS.",
                    },
                    {
                      icon: ShieldCheck,
                      title: "Governanca",
                      text: "Moderacao, auditoria, rate limit, roles e idempotencia de webhook.",
                    },
                    {
                      icon: Radio,
                      title: "Realtime",
                      text: "Dashboard e overlay atualizados no segundo em que o PIX confirma.",
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="inline-flex rounded-2xl border border-white/10 bg-white/6 p-3 text-cyan-200">
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-lg font-bold text-white">{item.title}</p>
                        <p className="mt-2 text-sm text-white/55">{item.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Como funciona"
          title="Viewer paga, plataforma valida, overlay dispara."
          description="O fluxo inteiro foi desenhado para separar captura de pagamento, validacao, realtime, TTS e analytics em modulos independentes."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {[
            "Viewer preenche valor, nome e mensagem.",
            "Mock PIX gera cobranca e QR Code na hora.",
            "Webhook ou simulacao confirma o pagamento com idempotencia.",
            "Overlay recebe o alerta e o worker processa o TTS.",
          ].map((item, index) => (
            <Card key={item} className="p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/60">0{index + 1}</p>
              <p className="mt-4 text-lg font-semibold text-white">{item}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Beneficios"
          title="Arquitetura preparada para o hoje e para o roadmap."
          description="Base modular para Twitch API, YouTube Live, chatbot, sorteios, ranking, split e multilanguage sem desmontar a plataforma."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[
            "Autenticacao segura com cookies, roles e refresh token.",
            "Multi-tenant com isolamento logico por streamer.",
            "Prisma + MySQL com migrations e seeds reais.",
            "BullMQ + Redis para TTS e processamento assincrono.",
            "Socket.IO para overlay e dashboard em tempo real.",
            "Superadmin com MRR, planos, transacoes e auditoria.",
          ].map((item) => (
            <Card key={item} className="flex items-start gap-4">
              <span className="mt-1 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-200">
                <Check className="h-4 w-4" />
              </span>
              <p className="text-white/75">{item}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Planos" title="Escalone do setup rapido ao creator premium." />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={plan.highlight ? "border-cyan-300/20" : ""}>
              <div className="flex items-center justify-between">
                <p className="font-[var(--font-orbitron)] text-2xl font-black text-white">{plan.name}</p>
                {plan.highlight ? <Badge className="text-cyan-100">Mais escolhido</Badge> : null}
              </div>
              <p className="mt-3 text-white/55">{plan.description}</p>
              <p className="mt-6 text-4xl font-black text-white">R$ {plan.monthlyPrice.toFixed(2)}</p>
              <p className="text-sm text-white/50">mensal + {plan.feePercentage.toFixed(2)}% por PIX</p>
              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm text-white/70">
                    <Check className="h-4 w-4 text-cyan-200" />
                    {feature}
                  </div>
                ))}
              </div>
              <Link
                href="/register"
                className="mt-8 inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:border-cyan-300/30 hover:bg-white/10"
              >
                Assinar {plan.name}
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Depoimentos" title="Criadores querem uma stack que pareca confiavel no ar." />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="space-y-4">
              <p className="text-white/75">"{testimonial.quote}"</p>
              <div>
                <p className="font-semibold text-white">{testimonial.name}</p>
                <p className="text-sm text-white/45">{testimonial.role}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="FAQ" title="Perguntas frequentes de quem quer colocar no ar rapido." />
        <div className="mt-12 grid gap-5">
          {faq.map((item) => (
            <Card key={item.question} className="space-y-3">
              <p className="text-xl font-semibold text-white">{item.question}</p>
              <p className="text-white/60">{item.answer}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>{appMeta.name} · base SaaS para alertas PIX com TTS e overlay</p>
          <div className="flex gap-5">
            <Link href="/privacy">Privacidade</Link>
            <Link href="/terms">Termos</Link>
            <Link href="/login">Entrar</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
