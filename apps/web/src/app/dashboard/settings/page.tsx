"use client";

import { useEffect, useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { buildAlertSpeechText, streamerSettingsSchema, type StreamerSettingsInput } from "@streampix/shared";
import { toast } from "sonner";
import { apiFetch, apiPatch } from "@/lib/api";
import { speakBrowserTts } from "@/lib/browser-tts";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingPanel } from "@/components/shared/loading-panel";

const publicSettingsSchema = z
  .object({
    headline: z.string().min(3, "Escreva um titulo curto para a sua pagina."),
    description: z.string().min(10, "Explique em uma frase como o apoio funciona."),
    minimumAmount: z.coerce.number().min(1, "O valor minimo precisa ser de pelo menos R$1,00."),
    maximumAmount: z.coerce.number().min(1, "O valor maximo precisa ser de pelo menos R$1,00."),
    minAmountForTts: z.coerce.number().min(0),
    messageCharLimit: z.coerce.number().min(40),
    allowVoiceMessages: z.boolean(),
    allowLinks: z.boolean(),
    cooldownSeconds: z.coerce.number().min(0, "O cooldown nao pode ser negativo."),
    autoModeration: z.boolean(),
    manualModeration: z.boolean(),
    blockedWords: z.array(z.string()),
  })
  .superRefine((values, context) => {
    if (values.maximumAmount < values.minimumAmount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maximumAmount"],
        message: "O valor maximo precisa ser maior ou igual ao minimo.",
      });
    }
  });

type PublicSettingsInput = z.infer<typeof publicSettingsSchema>;

interface WorkspaceResponse {
  streamerSettings: StreamerSettingsInput;
  publicPageSettings: Omit<PublicSettingsInput, "blockedWords"> & { blockedWords: string[] };
}

interface BrowserVoiceOption {
  name: string;
  lang: string;
  label: string;
}

const darkSelectClassName =
  "h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-300/60 focus:bg-white/10";
const darkOptionClassName = "bg-[#0b1020] text-white";

export default function SettingsPage() {
  const [loaded, setLoaded] = useState(false);
  const [voiceOptions, setVoiceOptions] = useState<BrowserVoiceOption[]>([]);
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const [savingTts, setSavingTts] = useState(false);
  const [savingPublicPage, setSavingPublicPage] = useState(false);
  const ttsForm = useForm<StreamerSettingsInput>({
    resolver: zodResolver(streamerSettingsSchema),
  });
  const publicForm = useForm<PublicSettingsInput>({
    resolver: zodResolver(publicSettingsSchema),
    defaultValues: {
      blockedWords: [],
    },
  });

  useEffect(() => {
    apiFetch<WorkspaceResponse>("/v1/streamer/workspace").then((data) => {
      ttsForm.reset(data.streamerSettings);
      publicForm.reset(data.publicPageSettings);
      setLoaded(true);
    });
  }, [publicForm, ttsForm]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const loadVoices = () => {
      const nextOptions = window.speechSynthesis
        .getVoices()
        .map((voice) => ({
          name: voice.name,
          lang: voice.lang || "pt-BR",
          label: `${voice.name} (${voice.lang || "pt-BR"})`,
        }))
        .filter((voice, index, allVoices) => allVoices.findIndex((candidate) => candidate.name === voice.name) === index)
        .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));

      setVoiceOptions(nextOptions);
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  if (!loaded) {
    return <LoadingPanel label="Carregando configuracoes..." />;
  }

  function getFirstErrorMessage(errors: FieldErrors<Record<string, unknown>>): string | null {
    for (const value of Object.values(errors)) {
      if (!value) {
        continue;
      }

      if (typeof value === "object" && "message" in value && typeof value.message === "string") {
        return value.message;
      }

      if (typeof value === "object") {
        const nestedMessage = getFirstErrorMessage(value as FieldErrors<Record<string, unknown>>);

        if (nestedMessage) {
          return nestedMessage;
        }
      }
    }

    return null;
  }

  async function saveTts(values: StreamerSettingsInput) {
    try {
      setSavingTts(true);
      await apiPatch("/v1/streamer/settings", values);
      ttsForm.reset(values);
      toast.success("Configuracoes de voz salvas.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar as configuracoes de voz.");
    } finally {
      setSavingTts(false);
    }
  }

  async function savePublicPage(values: PublicSettingsInput) {
    try {
      setSavingPublicPage(true);
      await apiPatch("/v1/streamer/public-page-settings", values);
      publicForm.reset(values);
      toast.success("Pagina publica salva.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a pagina publica.");
    } finally {
      setSavingPublicPage(false);
    }
  }

  function previewVoice() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Seu navegador nao oferece preview de voz.");
      return;
    }

    const voiceSettings = ttsForm.getValues();

    if (!voiceSettings.defaultVoice) {
      toast.error("Selecione uma voz antes de ouvir a previa.");
      return;
    }

    setPreviewingVoice(true);

    const previewText = buildAlertSpeechText({
      supporterName: "Demo",
      amount: 5,
      message: "Esse e um teste do StreamPix.",
    });

    speakBrowserTts({
      text: previewText,
      voiceName: voiceSettings.defaultVoice,
      language: voiceSettings.voiceLanguage,
      speed: voiceSettings.voiceSpeed,
      pitch: voiceSettings.voicePitch,
      volume: voiceSettings.voiceVolume,
    });

    toast.success("Reproduzindo previa da voz selecionada.");
    window.setTimeout(() => {
      setPreviewingVoice(false);
    }, 1800);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">TTS</p>
        <h1 className="mt-2 text-3xl font-black text-white">Voz, limites e fallback</h1>
        <form
          className="mt-6 grid gap-4"
          onSubmit={ttsForm.handleSubmit(saveTts, (errors) => {
            toast.error(getFirstErrorMessage(errors as FieldErrors<Record<string, unknown>>) ?? "Revise os campos da voz.");
          })}
        >
          <input type="hidden" {...ttsForm.register("minAmountForTts", { valueAsNumber: true })} />
          <label className="space-y-2 text-sm text-white/70">
            Voz padrao
            <select
              className={darkSelectClassName}
              style={{ colorScheme: "dark" }}
              value={ttsForm.watch("defaultVoice") ?? ""}
              onChange={(event) => {
                const selectedVoice = voiceOptions.find((voice) => voice.name === event.target.value);
                ttsForm.setValue("defaultVoice", event.target.value, { shouldDirty: true });

                if (selectedVoice) {
                  ttsForm.setValue("voiceLanguage", selectedVoice.lang, { shouldDirty: true });
                }
              }}
            >
              {!voiceOptions.some((voice) => voice.name === (ttsForm.watch("defaultVoice") ?? "")) ? (
                <option value={ttsForm.watch("defaultVoice") ?? ""} className={darkOptionClassName}>
                  {(ttsForm.watch("defaultVoice") ?? "Selecione uma voz")} (salva atualmente)
                </option>
              ) : null}
              {voiceOptions.map((voice) => (
                <option key={voice.name} value={voice.name} className={darkOptionClassName}>
                  {voice.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-white/45">Essa e a voz usada para ler as doacoes na live.</p>
            {ttsForm.formState.errors.defaultVoice ? (
              <p className="text-xs text-rose-300">{ttsForm.formState.errors.defaultVoice.message}</p>
            ) : null}
          </label>
          <label className="space-y-2 text-sm text-white/70">
            Idioma
            <Input {...ttsForm.register("voiceLanguage")} />
            <p className="text-xs text-white/45">Exemplo: pt-BR. Normalmente acompanha a voz escolhida.</p>
            {ttsForm.formState.errors.voiceLanguage ? (
              <p className="text-xs text-rose-300">{ttsForm.formState.errors.voiceLanguage.message}</p>
            ) : null}
          </label>
          <label className="space-y-2 text-sm text-white/70">
            Velocidade
            <Input type="number" step="0.1" {...ttsForm.register("voiceSpeed", { valueAsNumber: true })} />
            <p className="text-xs text-white/45">`1` e o ritmo normal. Menor fala mais devagar.</p>
            {ttsForm.formState.errors.voiceSpeed ? (
              <p className="text-xs text-rose-300">{ttsForm.formState.errors.voiceSpeed.message}</p>
            ) : null}
          </label>
          <label className="space-y-2 text-sm text-white/70">
            Pitch
            <Input type="number" step="0.1" {...ttsForm.register("voicePitch", { valueAsNumber: true })} />
            <p className="text-xs text-white/45">Ajusta o tom da voz. `1` costuma soar mais natural.</p>
            {ttsForm.formState.errors.voicePitch ? (
              <p className="text-xs text-rose-300">{ttsForm.formState.errors.voicePitch.message}</p>
            ) : null}
          </label>
          <label className="space-y-2 text-sm text-white/70">
            Volume
            <Input type="number" {...ttsForm.register("voiceVolume", { valueAsNumber: true })} />
            <p className="text-xs text-white/45">Vai de `0` a `100` e controla a altura da fala.</p>
            {ttsForm.formState.errors.voiceVolume ? (
              <p className="text-xs text-rose-300">{ttsForm.formState.errors.voiceVolume.message}</p>
            ) : null}
          </label>
          <label className="space-y-2 text-sm text-white/70">
            Tamanho maximo da mensagem
            <Input type="number" {...ttsForm.register("maxMessageLength", { valueAsNumber: true })} />
            <p className="text-xs text-white/45">Limita quantos caracteres podem entrar na fala.</p>
            {ttsForm.formState.errors.maxMessageLength ? (
              <p className="text-xs text-rose-300">{ttsForm.formState.errors.maxMessageLength.message}</p>
            ) : null}
          </label>
          <div className="rounded-3xl border border-cyan-300/15 bg-cyan-300/5 px-4 py-4 text-sm text-cyan-100/80">
            Toda mensagem confirmada entra na fala da overlay no formato:
            <span className="mt-2 block font-semibold text-white">
              Demo mandou R$5,00 no StreamPix: Esse e um teste do StreamPix.
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={previewVoice} disabled={previewingVoice}>
              {previewingVoice ? "Reproduzindo..." : "Ouvir voz"}
            </Button>
            <Button type="submit" disabled={savingTts}>
              {savingTts ? "Salvando..." : "Salvar TTS"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">Pagina publica</p>
        <h2 className="mt-2 text-3xl font-black text-white">Regras de cobranca e moderacao</h2>
        <form
          className="mt-6 grid gap-4"
          onSubmit={publicForm.handleSubmit(savePublicPage, (errors) => {
            toast.error(
              getFirstErrorMessage(errors as FieldErrors<Record<string, unknown>>) ??
                "Revise os campos da pagina publica.",
            );
          })}
        >
          <input type="hidden" {...publicForm.register("minAmountForTts", { valueAsNumber: true })} />
          <label className="space-y-2 text-sm text-white/70">
            Headline
            <Input {...publicForm.register("headline")} />
            <p className="text-xs text-white/45">Frase curta que aparece no topo da sua pagina.</p>
            {publicForm.formState.errors.headline ? (
              <p className="text-xs text-rose-300">{publicForm.formState.errors.headline.message}</p>
            ) : null}
          </label>
          <label className="space-y-2 text-sm text-white/70">
            Descricao
            <Textarea {...publicForm.register("description")} />
            <p className="text-xs text-white/45">Explique rapidamente o que acontece quando alguem apoia.</p>
            {publicForm.formState.errors.description ? (
              <p className="text-xs text-rose-300">{publicForm.formState.errors.description.message}</p>
            ) : null}
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-white/70">
              Minimo
              <Input type="number" step="0.01" {...publicForm.register("minimumAmount", { valueAsNumber: true })} />
              <p className="text-xs text-white/45">Valor minimo aceito por doacao.</p>
              {publicForm.formState.errors.minimumAmount ? (
                <p className="text-xs text-rose-300">{publicForm.formState.errors.minimumAmount.message}</p>
              ) : null}
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Maximo
              <Input type="number" step="0.01" {...publicForm.register("maximumAmount", { valueAsNumber: true })} />
              <p className="text-xs text-white/45">Limite maximo aceito em uma unica cobranca.</p>
              {publicForm.formState.errors.maximumAmount ? (
                <p className="text-xs text-rose-300">{publicForm.formState.errors.maximumAmount.message}</p>
              ) : null}
            </label>
          </div>
          <label className="space-y-2 text-sm text-white/70">
            Cooldown
            <Input type="number" {...publicForm.register("cooldownSeconds", { valueAsNumber: true })} />
            <p className="text-xs text-white/45">Tempo de espera entre tentativas. Exemplo: `16` = `16s`.</p>
            {publicForm.formState.errors.cooldownSeconds ? (
              <p className="text-xs text-rose-300">{publicForm.formState.errors.cooldownSeconds.message}</p>
            ) : null}
          </label>
          <label className="space-y-2 text-sm text-white/70">
            Palavras bloqueadas
            <Input
              value={(publicForm.watch("blockedWords") ?? []).join(", ")}
              onChange={(event) =>
                publicForm.setValue(
                  "blockedWords",
                  event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                )
              }
            />
            <p className="text-xs text-white/45">Separe por virgula. Exemplo: spam, golpe, ofensa.</p>
          </label>
          <div className="flex flex-wrap gap-4 text-sm text-white/70">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" {...publicForm.register("allowVoiceMessages")} />
              Permitir voz
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" {...publicForm.register("allowLinks")} />
              Permitir links
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" {...publicForm.register("autoModeration")} />
              Moderacao automatica
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" {...publicForm.register("manualModeration")} />
              Moderacao manual
            </label>
          </div>
          <p className="text-xs text-white/45">
            `Permitir voz` ativa a fala no alerta. `Moderacao automatica` filtra termos bloqueados. `Moderacao manual`
            segura novas mensagens para aprovacao.
          </p>
          <Button type="submit" disabled={savingPublicPage}>
            {savingPublicPage ? "Salvando..." : "Salvar pagina publica"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
