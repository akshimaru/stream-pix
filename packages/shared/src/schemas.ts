import { z } from "zod";
import { overlayAlertSounds, overlayPositions, overlayThemePresets } from "./enums.js";

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  email: z.string().email("Informe um e-mail válido."),
  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .regex(/[A-Z]/, "Inclua uma letra maiúscula.")
    .regex(/[0-9]/, "Inclua pelo menos um número."),
  channelName: z.string().min(3, "Informe o nome do canal."),
  slug: z
    .string()
    .min(3, "Slug muito curto.")
    .max(24, "Slug muito longo.")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Token inválido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export const createChargeSchema = z.object({
  amount: z.coerce.number().min(1, "Valor mínimo inválido.").max(20000, "Valor acima do permitido."),
  supporterName: z.string().trim().max(40).optional().default(""),
  payerEmail: z.union([z.string().trim().email("Informe um e-mail vÃ¡lido."), z.literal("")]).optional().default(""),
  payerDocument: z.string().trim().max(32).optional().default(""),
  message: z.string().min(3, "Escreva uma mensagem.").max(240),
  isAnonymous: z.boolean().default(false),
  shouldReadMessage: z.boolean().default(true),
});

export const overlaySettingsSchema = z.object({
  themePreset: z.enum(overlayThemePresets),
  alertSound: z.enum(overlayAlertSounds),
  primaryColor: z.string().min(4),
  secondaryColor: z.string().min(4),
  accentColor: z.string().min(4),
  fontFamily: z.string().min(2),
  cardWidth: z.coerce.number().min(280).max(720),
  position: z.enum(overlayPositions),
  transparency: z.coerce.number().min(0).max(100),
  durationMs: z.coerce.number().min(2000).max(15000),
  showAmount: z.boolean(),
  showName: z.boolean(),
  showAvatar: z.boolean(),
  volume: z.coerce.number().min(0).max(100),
});

export const streamerSettingsSchema = z.object({
  defaultVoice: z.string().min(2),
  voiceLanguage: z.string().min(2),
  voiceSpeed: z.coerce.number().min(0.5).max(1.8),
  voicePitch: z.coerce.number().min(0.5).max(2),
  voiceVolume: z.coerce.number().min(0).max(100),
  minAmountForTts: z.coerce.number().min(0).max(20000),
  maxMessageLength: z.coerce.number().min(40).max(500),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateChargeInput = z.infer<typeof createChargeSchema>;
export type OverlaySettingsInput = z.infer<typeof overlaySettingsSchema>;
export type StreamerSettingsInput = z.infer<typeof streamerSettingsSchema>;
