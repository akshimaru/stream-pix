"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  overlaySettingsSchema,
  type OverlayAlertSound,
  type OverlayPosition,
  type OverlaySettingsInput,
} from "@streampix/shared";
import { toast } from "sonner";
import { apiFetch, apiPatch, apiPost } from "@/lib/api";
import { playOverlayAlertSound } from "@/lib/alert-sound";
import { playTestAlertFallback, type TestAlertResponse } from "@/lib/test-alert";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingPanel } from "@/components/shared/loading-panel";

interface WorkspacePayload {
  profile: {
    displayName: string;
    overlayToken: string;
    overlayUrl: string;
  };
  overlaySettings: OverlaySettingsInput;
}

interface PreviewOverlayCardProps {
  displayName: string;
  settings: OverlaySettingsInput;
}

interface ColorFieldProps {
  description: string;
  error?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const positionOptions: Array<{ label: string; value: OverlayPosition }> = [
  { label: "Topo esquerdo", value: "TOP_LEFT" },
  { label: "Topo direito", value: "TOP_RIGHT" },
  { label: "Base esquerda", value: "BOTTOM_LEFT" },
  { label: "Base direita", value: "BOTTOM_RIGHT" },
  { label: "Centro", value: "CENTER" },
];
const alertSoundOptions: Array<{ label: string; description: string; value: OverlayAlertSound }> = [
  { label: "Sem som", description: "Entra direto na voz, sem toque antes do alerta.", value: "NONE" },
  { label: "Chime neon", description: "Brilho curto e elegante, estilo premium.", value: "CHIME" },
  { label: "Din dong", description: "Toque classico de alerta antes da mensagem.", value: "DING_DONG" },
  { label: "Level up", description: "Subida gamer rapida, com energia positiva.", value: "LEVEL_UP" },
  { label: "Laser pop", description: "Impacto curto e futurista para entradas rapidas.", value: "LASER_POP" },
];

const darkSelectClassName =
  "h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-300/60 focus:bg-white/10";
const darkOptionClassName = "bg-[#0b1020] text-white";

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

function normalizeColor(value: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : "#7c3aed";
}

function hexToRgb(hex: string) {
  const normalized = normalizeColor(hex).replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  const numeric = Number.parseInt(expanded, 16);

  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
}

function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getPreviewPositionClass(position: OverlayPosition) {
  switch (position) {
    case "TOP_LEFT":
      return "items-start justify-start";
    case "TOP_RIGHT":
      return "items-start justify-end";
    case "BOTTOM_LEFT":
      return "items-end justify-start";
    case "CENTER":
      return "items-center justify-center";
    default:
      return "items-end justify-end";
  }
}

function formatPositionLabel(position: OverlayPosition) {
  return positionOptions.find((item) => item.value === position)?.label ?? position;
}

function ColorField({ description, error, label, value, onChange }: ColorFieldProps) {
  const currentColor = normalizeColor(value);

  return (
    <label className="space-y-2 text-sm text-white/70">
      {label}
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="h-full w-full" style={{ backgroundColor: currentColor }} />
          <input
            type="color"
            value={currentColor}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={label}
          />
        </div>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#7c3aed"
          className="font-mono uppercase"
        />
      </div>
      <p className="text-xs text-white/45">{description}</p>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </label>
  );
}

function PreviewOverlayCard({ displayName, settings }: PreviewOverlayCardProps) {
  const previewMessage = "Esse e um teste do StreamPix para voce validar a overlay.";
  const cardOpacity = Math.max(0.28, 1 - settings.transparency / 100);
  const positionClass = getPreviewPositionClass(settings.position);
  const stageBackground = `radial-gradient(circle at 15% 12%, ${hexToRgba(settings.primaryColor, 0.22)}, transparent 24%), radial-gradient(circle at 82% 18%, ${hexToRgba(settings.accentColor, 0.18)}, transparent 28%), radial-gradient(circle at 78% 84%, ${hexToRgba(settings.secondaryColor, 0.18)}, transparent 24%), linear-gradient(160deg, #050816 0%, #090d1d 42%, #03050d 100%)`;
  const cardBackground = `linear-gradient(135deg, ${hexToRgba(settings.primaryColor, 0.3)}, rgba(6, 10, 20, ${cardOpacity}), ${hexToRgba(settings.secondaryColor, 0.22)})`;
  const cardWidth = `min(100%, ${settings.cardWidth}px)`;

  return (
    <div
      className={cn(
        "relative flex h-[420px] overflow-hidden rounded-[28px] border border-white/10 p-6",
        settings.themePreset === "GLITCH" && "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-cyan-300/50 before:content-['']",
      )}
      style={{ background: stageBackground }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className={cn("relative z-10 flex h-full w-full", positionClass)}>
        <div
          className={cn(
            "relative overflow-hidden rounded-[32px] border px-6 py-5 text-white shadow-neon backdrop-blur",
            settings.themePreset === "MINIMAL" ? "border-white/10" : "border-white/15",
          )}
          style={{
            width: cardWidth,
            fontFamily: settings.fontFamily,
            background: cardBackground,
            boxShadow:
              settings.themePreset === "GLITCH"
                ? `0 0 0 1px ${hexToRgba(settings.accentColor, 0.4)}, 0 0 32px ${hexToRgba(settings.primaryColor, 0.28)}`
                : `0 20px 60px ${hexToRgba(settings.primaryColor, 0.22)}`,
          }}
        >
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background: `radial-gradient(circle at top right, ${hexToRgba(settings.accentColor, 0.4)}, transparent 38%)`,
            }}
          />
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.32em] text-white/55">{displayName}</p>
              <span
                className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70"
                style={{
                  borderColor: hexToRgba(settings.accentColor, 0.35),
                  backgroundColor: hexToRgba(settings.accentColor, 0.12),
                }}
              >
                ao vivo
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {settings.showAvatar ? (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border text-xs font-semibold uppercase"
                    style={{
                      borderColor: hexToRgba(settings.secondaryColor, 0.3),
                      background: `linear-gradient(135deg, ${hexToRgba(settings.secondaryColor, 0.35)}, ${hexToRgba(
                        settings.accentColor,
                        0.3,
                      )})`,
                    }}
                  >
                    DM
                  </div>
                ) : null}
                <div>
                  <p className="font-[var(--font-orbitron)] text-2xl font-black">
                    {settings.showName ? "Demo" : "Novo StreamPix"}
                  </p>
                  {settings.showAmount ? (
                    <p className="mt-1 text-sm text-cyan-200/80">R$ 5,00 em tempo real</p>
                  ) : (
                    <p className="mt-1 text-sm text-white/45">Posicao: {formatPositionLabel(settings.position)}</p>
                  )}
                </div>
              </div>
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 text-sm font-bold"
                style={{
                  background: `linear-gradient(135deg, ${hexToRgba(settings.secondaryColor, 0.45)}, ${hexToRgba(
                    settings.accentColor,
                    0.4,
                  )})`,
                }}
              >
                PIX
              </div>
            </div>
            <p className="mt-4 text-lg leading-relaxed text-white/88">{previewMessage}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OverlayPage() {
  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
  const [savingOverlay, setSavingOverlay] = useState(false);
  const [previewingSound, setPreviewingSound] = useState(false);
  const form = useForm<OverlaySettingsInput>({
    resolver: zodResolver(overlaySettingsSchema),
  });
  const liveSettings = form.watch();
  const durationMs = liveSettings.durationMs ?? 6500;
  const durationSeconds = Number((durationMs / 1000).toFixed(1));

  useEffect(() => {
    apiFetch<WorkspacePayload>("/v1/streamer/workspace").then((data) => {
      setWorkspace(data);
      form.reset(data.overlaySettings);
    });
  }, [form]);

  const previewSettings = useMemo<OverlaySettingsInput | null>(() => {
    if (!workspace) {
      return null;
    }

    return {
      ...workspace.overlaySettings,
      ...liveSettings,
    };
  }, [liveSettings, workspace]);

  async function onSubmit(values: OverlaySettingsInput) {
    try {
      setSavingOverlay(true);
      await apiPatch("/v1/streamer/overlay-settings", values);
      setWorkspace((current) => (current ? { ...current, overlaySettings: values } : current));
      form.reset(values);
      toast.success("Overlay salva e pronta para a live.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a overlay.");
    } finally {
      setSavingOverlay(false);
    }
  }

  async function testAlert() {
    try {
      const response = await apiPost<TestAlertResponse>("/v1/streamer/alerts/test");
      const playedLocally = playTestAlertFallback(response);
      toast.success(
        playedLocally
          ? "Teste enviado. Como nao ha overlay conectada, a voz tocou aqui no painel."
          : "Teste enviado ao overlay.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar teste para o overlay.");
    }
  }

  async function previewSound() {
    if (!previewSettings) {
      return;
    }

    try {
      setPreviewingSound(true);
      await playOverlayAlertSound({
        preset: previewSettings.alertSound,
        volume: previewSettings.volume,
      });
      toast.success("Reproduzindo a previa do som do alerta.");
    } catch {
      toast.error("Nao foi possivel reproduzir o som no navegador.");
    } finally {
      setPreviewingSound(false);
    }
  }

  if (!workspace || !previewSettings) {
    return <LoadingPanel label="Carregando overlay..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">Overlay</p>
          <h1 className="mt-2 font-[var(--font-orbitron)] text-4xl font-black text-white">Personalizacao ao vivo</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/55">
            O preview abaixo responde em tempo real ao formulario. Quando voce salvar, esse modelo vira a versao oficial
            do widget da live.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/overlay/preview"
            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80"
          >
            Abrir preview
          </Link>
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80"
            onClick={() => window.open(workspace.profile.overlayUrl, "_blank")}
          >
            Abrir widget seguro
          </button>
          <Button type="button" onClick={testAlert}>
            Testar alerta
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">Preview</p>
              <p className="mt-2 text-sm text-white/55">Veja o card como ele vai aparecer na tela da live.</p>
            </div>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
                form.formState.isDirty
                  ? "border-amber-300/25 bg-amber-400/10 text-amber-200"
                  : "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
              )}
            >
              {form.formState.isDirty ? "Alteracoes nao salvas" : "Modelo salvo"}
            </span>
          </div>
          <div className="mt-5">
            <PreviewOverlayCard displayName={workspace.profile.displayName} settings={previewSettings} />
          </div>
        </Card>
        <Card>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              toast.error(
                getFirstErrorMessage(errors as FieldErrors<Record<string, unknown>>) ??
                  "Revise os campos da overlay antes de salvar.",
              );
            })}
          >
            <ColorField
              label="Cor primaria"
              value={liveSettings.primaryColor ?? previewSettings.primaryColor}
              onChange={(value) => form.setValue("primaryColor", value, { shouldDirty: true, shouldValidate: true })}
              description="Tom principal do glow e da borda do card."
              error={form.formState.errors.primaryColor?.message}
            />
            <ColorField
              label="Cor secundaria"
              value={liveSettings.secondaryColor ?? previewSettings.secondaryColor}
              onChange={(value) => form.setValue("secondaryColor", value, { shouldDirty: true, shouldValidate: true })}
              description="Usada nos gradientes e no bloco lateral do PIX."
              error={form.formState.errors.secondaryColor?.message}
            />
            <ColorField
              label="Cor accent"
              value={liveSettings.accentColor ?? previewSettings.accentColor}
              onChange={(value) => form.setValue("accentColor", value, { shouldDirty: true, shouldValidate: true })}
              description="Destaques pequenos, brilho e detalhes de energia."
              error={form.formState.errors.accentColor?.message}
            />
            <label className="space-y-2 text-sm text-white/70">
              Fonte
              <Input {...form.register("fontFamily")} />
              <p className="text-xs text-white/45">Fonte usada no corpo do card. Exemplo: Rajdhani, sans-serif.</p>
              {form.formState.errors.fontFamily ? (
                <p className="text-xs text-rose-300">{form.formState.errors.fontFamily.message}</p>
              ) : null}
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Largura do card
              <Input type="number" {...form.register("cardWidth", { valueAsNumber: true })} />
              <p className="text-xs text-white/45">Controla o tamanho horizontal do alerta dentro da overlay.</p>
              {form.formState.errors.cardWidth ? (
                <p className="text-xs text-rose-300">{form.formState.errors.cardWidth.message}</p>
              ) : null}
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Duracao do alerta
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white/60">Tempo visivel na live</span>
                  <span className="font-semibold text-cyan-200">{durationSeconds.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={15}
                  step={0.5}
                  value={durationSeconds}
                  onChange={(event) =>
                    form.setValue("durationMs", Number(event.target.value) * 1000, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-300"
                />
                <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/35">
                  <span>2s</span>
                  <span>15s</span>
                </div>
              </div>
              <p className="text-xs text-white/45">Se a voz durar mais, a mensagem espera a fala terminar para sumir.</p>
              {form.formState.errors.durationMs ? (
                <p className="text-xs text-rose-300">{form.formState.errors.durationMs.message}</p>
              ) : null}
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Posicao
              <select
                className={darkSelectClassName}
                style={{ colorScheme: "dark" }}
                {...form.register("position")}
              >
                {positionOptions.map((option) => (
                  <option key={option.value} value={option.value} className={darkOptionClassName}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-white/45">Escolhe onde o card aparece dentro da cena.</p>
              {form.formState.errors.position ? (
                <p className="text-xs text-rose-300">{form.formState.errors.position.message}</p>
              ) : null}
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Tema
              <select
                className={darkSelectClassName}
                style={{ colorScheme: "dark" }}
                {...form.register("themePreset")}
              >
                <option value="NEON" className={darkOptionClassName}>
                  Neon
                </option>
                <option value="MINIMAL" className={darkOptionClassName}>
                  Minimal
                </option>
                <option value="GLITCH" className={darkOptionClassName}>
                  Glitch
                </option>
              </select>
              <p className="text-xs text-white/45">Muda a energia visual do card sem trocar seu layout base.</p>
              {form.formState.errors.themePreset ? (
                <p className="text-xs text-rose-300">{form.formState.errors.themePreset.message}</p>
              ) : null}
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Som do alerta
              <select
                className={darkSelectClassName}
                style={{ colorScheme: "dark" }}
                {...form.register("alertSound")}
              >
                {alertSoundOptions.map((option) => (
                  <option key={option.value} value={option.value} className={darkOptionClassName}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-white/45">
                {alertSoundOptions.find((option) => option.value === previewSettings.alertSound)?.description ??
                  "Escolha o toque que entra antes da voz da mensagem."}
              </p>
              {form.formState.errors.alertSound ? (
                <p className="text-xs text-rose-300">{form.formState.errors.alertSound.message}</p>
              ) : null}
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Transparencia
              <Input type="number" {...form.register("transparency", { valueAsNumber: true })} />
              <p className="text-xs text-white/45">Vai de `0` a `100` e deixa o card mais solido ou mais discreto.</p>
              {form.formState.errors.transparency ? (
                <p className="text-xs text-rose-300">{form.formState.errors.transparency.message}</p>
              ) : null}
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Volume
              <Input type="number" {...form.register("volume", { valueAsNumber: true })} />
              <p className="text-xs text-white/45">Ajusta o volume padrao do alerta dentro da overlay.</p>
              {form.formState.errors.volume ? (
                <p className="text-xs text-rose-300">{form.formState.errors.volume.message}</p>
              ) : null}
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-4 text-sm text-white/70">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" {...form.register("showAmount")} />
                Mostrar valor
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" {...form.register("showName")} />
                Mostrar nome
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" {...form.register("showAvatar")} />
                Mostrar avatar
              </label>
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-white/45">
                O modelo muda ao vivo aqui no painel. Clique em salvar para publicar no widget oficial.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="secondary" disabled={previewingSound} onClick={previewSound}>
                  {previewingSound ? "Tocando..." : "Ouvir som"}
                </Button>
                <Button type="submit" disabled={savingOverlay}>
                  {savingOverlay ? "Salvando..." : "Salvar overlay"}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
