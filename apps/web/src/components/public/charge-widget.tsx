"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  socketEvents,
  createChargeSchema,
  type ChargeSummary,
  type CreateChargeInput,
  type PublicStreamerPage,
} from "@streampix/shared";
import { toast } from "sonner";
import { apiPost, publicFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";

export function ChargeWidget({ streamer }: { streamer: PublicStreamerPage }) {
  const [charge, setCharge] = useState<ChargeSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<CreateChargeInput>({
    resolver: zodResolver(createChargeSchema),
    defaultValues: {
      amount: streamer.page.minimumAmount,
      supporterName: "",
      payerEmail: "",
      payerDocument: "",
      message: "",
      isAnonymous: false,
      shouldReadMessage: true,
    },
  });

  const voiceEnabled = useMemo(() => streamer.page.allowVoiceMessages, [streamer.page.allowVoiceMessages]);
  const providerIsMercadoPago = streamer.payment.providerCode === "MERCADO_PAGO";

  useEffect(() => {
    if (!charge) {
      return;
    }

    const socket = getSocket();
    socket.emit(socketEvents.chargeSubscribe, {
      chargeId: charge.id,
    });

    const onStatus = (payload: { chargeId?: string; status?: string }) => {
      if (payload.chargeId === charge.id && payload.status) {
        setCharge((current) => (current ? { ...current, status: payload.status as ChargeSummary["status"] } : current));
      }
    };

    socket.on(socketEvents.chargeStatus, onStatus);

    return () => {
      socket.off(socketEvents.chargeStatus, onStatus);
    };
  }, [charge]);

  async function onSubmit(values: CreateChargeInput) {
    setSubmitting(true);

    try {
      const createdCharge = await apiPost<ChargeSummary>(`/v1/public/streamers/${streamer.slug}/charges`, {
        ...values,
        supporterName: values.supporterName?.trim() || "Desconhecido",
        payerEmail: values.payerEmail?.trim() || "",
        payerDocument: values.payerDocument?.trim() || "",
        shouldReadMessage: true,
      });

      setCharge(createdCharge);
      toast.success(providerIsMercadoPago ? "PIX do Mercado Pago gerado com sucesso." : "PIX gerado com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar o PIX.");
    } finally {
      setSubmitting(false);
    }
  }

  async function simulateConfirmation() {
    if (!charge) {
      return;
    }

    try {
      await apiPost(`/v1/public/charges/${charge.id}/simulate-confirmation`);
      const refreshed = await publicFetch<ChargeSummary>(`/v1/public/charges/${charge.id}`);
      setCharge(refreshed);
      toast.success("Pagamento mock confirmado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao simular pagamento.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">{streamer.payment.providerName}</p>
          <h3 className="mt-2 text-2xl font-bold text-white">Dispare sua mensagem na live</h3>
          <p className="mt-2 text-sm text-white/55">
            Minimo de {streamer.page.minimumAmount.toFixed(2)} BRL. Mensagens ate {streamer.page.messageCharLimit} caracteres.
          </p>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-white/70">
              Valor
              <Input type="number" step="0.01" {...form.register("amount", { valueAsNumber: true })} />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Seu nome ou nick
              <Input placeholder="Opcional, cai como Desconhecido" {...form.register("supporterName")} />
            </label>
          </div>

          {streamer.payment.requiresPayerEmail ? (
            <label className="space-y-2 text-sm text-white/70">
              E-mail do apoiador
              <Input type="email" placeholder="Seu e-mail para gerar o PIX" {...form.register("payerEmail")} />
              <p className="text-xs text-white/35">O Mercado Pago exige esse dado para criar a cobranca PIX.</p>
            </label>
          ) : null}

          {streamer.payment.requiresPayerDocument ? (
            <label className="space-y-2 text-sm text-white/70">
              CPF ou CNPJ
              <Input placeholder="Somente numeros" {...form.register("payerDocument")} />
              <p className="text-xs text-white/35">Usado pelo provider para validar o pagador antes de gerar o QR Code.</p>
            </label>
          ) : null}

          <label className="space-y-2 text-sm text-white/70">
            Mensagem
            <Textarea maxLength={streamer.page.messageCharLimit} {...form.register("message")} />
          </label>

          <div className="flex flex-wrap gap-4 text-sm text-white/70">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" {...form.register("isAnonymous")} />
              Apoio anonimo
            </label>
            <span className={voiceEnabled ? "text-emerald-300" : "text-amber-300"}>
              {voiceEnabled
                ? "A voz usada na live segue a configuracao do streamer."
                : "Este canal esta com a voz da live desativada no momento."}
            </span>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65">
            <p>Se voce nao informar nome, a mensagem entra como <span className="font-semibold text-white">Desconhecido</span>.</p>
            {providerIsMercadoPago ? (
              <p className="mt-2">O pagamento sera processado em tempo real pelo Mercado Pago e confirmado automaticamente via webhook.</p>
            ) : (
              <p className="mt-2">No modo local, voce pode simular a confirmacao para testar o overlay sem um PSP real.</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "Gerando PIX..."
              : providerIsMercadoPago
                ? "Gerar PIX no Mercado Pago"
                : "Gerar PIX e overlay"}
          </Button>
        </form>
      </Card>

      <Card className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">Status da cobranca</p>
            <h3 className="mt-2 text-xl font-bold text-white">{charge ? charge.txid : "Aguardando"}</h3>
            {charge?.viewerEmail ? <p className="mt-2 text-sm text-white/45">{charge.viewerEmail}</p> : null}
          </div>
          <StatusBadge value={charge?.status ?? "PENDING"} />
        </div>

        {charge ? (
          <>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              {charge.qrCodeDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={charge.qrCodeDataUrl}
                  alt="QR Code PIX"
                  className="mx-auto h-56 w-56 rounded-2xl border border-white/10 object-cover"
                />
              ) : null}
            </div>

            <div className="space-y-2 rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">Copia e cola</p>
              <p className="break-all text-sm text-white/70">{charge.pixCopyPaste}</p>
            </div>

            <div className="grid gap-3">
              <Button variant="secondary" onClick={() => navigator.clipboard.writeText(charge.pixCopyPaste)}>
                Copiar payload PIX
              </Button>
              {streamer.payment.supportsLocalSimulation ? (
                <Button onClick={simulateConfirmation}>Simular pagamento local</Button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.03] p-8 text-center text-white/45">
            Gere um PIX para mostrar QR Code, status em tempo real e confirmacao automatica.
          </div>
        )}
      </Card>
    </div>
  );
}
