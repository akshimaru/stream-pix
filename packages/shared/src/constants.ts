import type { OverlayThemePreset, RoleKey } from "./enums.js";

export const appMeta = {
  name: "StreamPix",
  tagline: "PIX com voz, alertas neon e overlays em tempo real para sua live.",
  description:
    "Plataforma SaaS para streamers receberem pagamentos via PIX com overlay, TTS e analytics em tempo real.",
  supportEmail: "support@streampix.local",
};

export const demoCredentials = {
  superadmin: {
    email: "admin@streampix.dev",
    password: "Admin123!",
  },
  streamer: {
    email: "demo@streampix.dev",
    password: "Demo123!",
  },
};

export const roleLabels: Record<RoleKey, string> = {
  SUPERADMIN: "Superadmin",
  INTERNAL_ADMIN: "Admin interno",
  STREAMER: "Streamer",
};

export const socketEvents = {
  chargeSubscribe: "charge:subscribe",
  chargeStatus: "charge:status",
  dashboardSubscribe: "dashboard:subscribe",
  dashboardNotification: "dashboard:notification",
  overlaySubscribe: "overlay:subscribe",
  overlayAlert: "overlay:alert",
  overlayTts: "overlay:tts",
} as const;

export const queueNames = {
  tts: "tts-jobs",
  alerts: "alert-events",
} as const;

export const planThemeMap: Record<OverlayThemePreset, string> = {
  NEON: "Barras em neon azul e rosa com glow intenso",
  MINIMAL: "Overlay limpo com foco em legibilidade",
  GLITCH: "Visual gamer com bordas cromadas e glitch suave",
};

export const defaultBlockedWords = ["http://", "https://", "discord.gg", "bit.ly"];
