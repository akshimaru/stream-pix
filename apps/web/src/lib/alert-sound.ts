"use client";

import type { OverlayAlertSound } from "@streampix/shared";

interface PlayAlertSoundInput {
  preset: OverlayAlertSound;
  volume: number;
}

interface SoundStep {
  frequency: number;
  durationMs: number;
  type?: OscillatorType;
  gain?: number;
}

let sharedAudioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const BrowserAudioContext = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!BrowserAudioContext) {
    return null;
  }

  if (!sharedAudioContext) {
    sharedAudioContext = new BrowserAudioContext();
  }

  return sharedAudioContext;
}

function getSoundSteps(preset: OverlayAlertSound): SoundStep[] {
  switch (preset) {
    case "CHIME":
      return [
        { frequency: 784, durationMs: 120, type: "triangle", gain: 0.55 },
        { frequency: 1047, durationMs: 220, type: "sine", gain: 0.42 },
      ];
    case "DING_DONG":
      return [
        { frequency: 880, durationMs: 170, type: "triangle", gain: 0.55 },
        { frequency: 659, durationMs: 250, type: "triangle", gain: 0.48 },
      ];
    case "LEVEL_UP":
      return [
        { frequency: 523, durationMs: 90, type: "square", gain: 0.4 },
        { frequency: 659, durationMs: 100, type: "square", gain: 0.42 },
        { frequency: 784, durationMs: 180, type: "triangle", gain: 0.48 },
      ];
    case "LASER_POP":
      return [
        { frequency: 1180, durationMs: 70, type: "sawtooth", gain: 0.32 },
        { frequency: 960, durationMs: 80, type: "sawtooth", gain: 0.28 },
        { frequency: 760, durationMs: 120, type: "triangle", gain: 0.26 },
      ];
    default:
      return [];
  }
}

function scheduleStep(
  context: AudioContext,
  inputVolume: number,
  step: SoundStep,
  offsetSeconds: number,
) {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const startAt = context.currentTime + offsetSeconds;
  const endAt = startAt + step.durationMs / 1000;
  const volume = Math.max(0, Math.min(1, inputVolume / 100)) * (step.gain ?? 0.4);

  oscillator.type = step.type ?? "sine";
  oscillator.frequency.setValueAtTime(step.frequency, startAt);

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), startAt + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(startAt);
  oscillator.stop(endAt + 0.02);

  return endAt - context.currentTime;
}

export async function playOverlayAlertSound(input: PlayAlertSoundInput): Promise<"played" | "skipped" | "unsupported"> {
  if (input.preset === "NONE") {
    return "skipped";
  }

  const context = getAudioContext();

  if (!context) {
    return "unsupported";
  }

  if (context.state === "suspended") {
    await context.resume().catch(() => null);
  }

  const steps = getSoundSteps(input.preset);

  if (steps.length === 0) {
    return "skipped";
  }

  let offsetSeconds = 0;

  for (const step of steps) {
    scheduleStep(context, input.volume, step, offsetSeconds);
    offsetSeconds += step.durationMs / 1000 + 0.015;
  }

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, offsetSeconds * 1000);
  });

  return "played";
}
