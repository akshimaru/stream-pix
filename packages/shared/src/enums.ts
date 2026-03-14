export const roleKeys = ["SUPERADMIN", "INTERNAL_ADMIN", "STREAMER"] as const;
export type RoleKey = (typeof roleKeys)[number];

export const streamerStatuses = ["ACTIVE", "SUSPENDED", "BLOCKED"] as const;
export type StreamerStatus = (typeof streamerStatuses)[number];

export const billingCycles = ["MONTHLY", "YEARLY"] as const;
export type BillingCycle = (typeof billingCycles)[number];

export const subscriptionStatuses = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "EXPIRED",
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const pixChargeStatuses = [
  "PENDING",
  "PAID",
  "FAILED",
  "CANCELED",
  "EXPIRED",
  "REFUNDED",
  "BLOCKED",
] as const;
export type PixChargeStatus = (typeof pixChargeStatuses)[number];

export const pixTransactionStatuses = [
  "PENDING",
  "PAID",
  "FAILED",
  "CANCELED",
  "REFUNDED",
] as const;
export type PixTransactionStatus = (typeof pixTransactionStatuses)[number];

export const alertStatuses = [
  "QUEUED",
  "PROCESSING",
  "DISPLAYED",
  "SPOKEN",
  "FAILED",
  "BLOCKED",
  "APPROVED",
  "REJECTED",
] as const;
export type AlertStatus = (typeof alertStatuses)[number];

export const ttsJobStatuses = [
  "QUEUED",
  "PROCESSING",
  "SPOKEN",
  "FAILED",
  "SKIPPED",
  "MUTED",
] as const;
export type TtsJobStatus = (typeof ttsJobStatuses)[number];

export const webhookStatuses = ["RECEIVED", "PROCESSED", "FAILED", "IGNORED"] as const;
export type WebhookStatus = (typeof webhookStatuses)[number];

export const invoiceStatuses = ["PENDING", "PAID", "VOID", "OVERDUE"] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const paymentProviderTypes = ["PIX"] as const;
export type PaymentProviderType = (typeof paymentProviderTypes)[number];

export const overlayThemePresets = ["NEON", "MINIMAL", "GLITCH"] as const;
export type OverlayThemePreset = (typeof overlayThemePresets)[number];

export const overlayAlertSounds = ["NONE", "CHIME", "DING_DONG", "LEVEL_UP", "LASER_POP"] as const;
export type OverlayAlertSound = (typeof overlayAlertSounds)[number];

export const overlayPositions = [
  "TOP_LEFT",
  "TOP_RIGHT",
  "BOTTOM_LEFT",
  "BOTTOM_RIGHT",
  "CENTER",
] as const;
export type OverlayPosition = (typeof overlayPositions)[number];

export const moderationLevels = ["OFF", "BASIC", "STRICT"] as const;
export type ModerationLevel = (typeof moderationLevels)[number];

export const teamMemberRoles = ["MANAGER", "MODERATOR", "ANALYST"] as const;
export type TeamMemberRole = (typeof teamMemberRoles)[number];

export const teamMemberStatuses = ["INVITED", "ACTIVE", "DISABLED"] as const;
export type TeamMemberStatus = (typeof teamMemberStatuses)[number];
