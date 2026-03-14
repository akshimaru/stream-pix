"use client";

import type { OverlayBootstrap } from "@streampix/shared";
import { speakBrowserTts } from "./browser-tts";

export interface TestAlertResponse {
  alertId: string;
  overlayListeners: number;
  speechText: string;
  voice: OverlayBootstrap["voice"];
}

export function playTestAlertFallback(response: TestAlertResponse) {
  if (response.overlayListeners > 0) {
    return false;
  }

  speakBrowserTts({
    text: response.speechText,
    voiceName: response.voice.name,
    language: response.voice.language,
    speed: response.voice.speed,
    pitch: response.voice.pitch,
    volume: response.voice.volume,
  });

  return true;
}
