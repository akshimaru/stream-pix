import type {
  OverlayBootstrap,
  PlanSummary,
  PublicStreamerPage,
  ChargeSummary,
  SupporterTransaction,
  SubscriptionSummary,
} from "@streampix/shared";
import type {
  Alert,
  OverlaySettings,
  Plan,
  PublicPageSettings,
  StreamerProfile,
  StreamerSettings,
  Subscription,
  TtsJob,
} from "@prisma/client";

export function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  return typeof value === "number" ? value : Number(value);
}

export function serializePlan(plan: Plan): PlanSummary {
  const featureList = Array.isArray(plan.features) ? plan.features : [];

  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description ?? "",
    monthlyPrice: decimalToNumber(plan.monthlyPrice),
    yearlyPrice: decimalToNumber(plan.yearlyPrice),
    feePercentage: decimalToNumber(plan.feePercentage),
    fixedFee: decimalToNumber(plan.fixedFee),
    highlight: plan.highlight,
    active: plan.active,
    messageLimit: plan.messageLimit,
    ttsLimit: plan.ttsLimit,
    messageCharLimit: plan.messageCharLimit,
    features: featureList.filter((item): item is string => typeof item === "string"),
  };
}

export function serializePublicStreamer(
  streamer: StreamerProfile,
  pageSettings: PublicPageSettings,
  paymentProvider?: {
    code: string;
    name: string;
    requiresPayerEmail: boolean;
    requiresPayerDocument: boolean;
    supportsLocalSimulation: boolean;
  },
): PublicStreamerPage {
  const blockedWords = Array.isArray(pageSettings.blockedWords) ? pageSettings.blockedWords : [];

  return {
    streamerId: streamer.id,
    displayName: streamer.displayName,
    slug: streamer.slug,
    bio: streamer.bio,
    avatarUrl: streamer.avatarUrl,
    bannerUrl: streamer.bannerUrl,
    logoUrl: streamer.logoUrl,
    page: {
      headline: pageSettings.headline,
      description: pageSettings.description,
      minimumAmount: decimalToNumber(pageSettings.minimumAmount),
      maximumAmount: decimalToNumber(pageSettings.maximumAmount),
      minAmountForTts: decimalToNumber(pageSettings.minAmountForTts),
      messageCharLimit: pageSettings.messageCharLimit,
      allowVoiceMessages: pageSettings.allowVoiceMessages,
      allowLinks: pageSettings.allowLinks,
      autoModeration: pageSettings.autoModeration,
      manualModeration: pageSettings.manualModeration,
      cooldownSeconds: pageSettings.cooldownSeconds,
      blockedWords: blockedWords.filter((item): item is string => typeof item === "string"),
    },
    payment: {
      providerCode: paymentProvider?.code ?? "MOCK_PIX",
      providerName: paymentProvider?.name ?? "Mock PIX Local",
      requiresPayerEmail: paymentProvider?.requiresPayerEmail ?? false,
      requiresPayerDocument: paymentProvider?.requiresPayerDocument ?? false,
      supportsLocalSimulation: paymentProvider?.supportsLocalSimulation ?? true,
    },
  };
}

export function serializeOverlayBootstrap(input: {
  streamer: StreamerProfile;
  overlaySettings: OverlaySettings;
  streamerSettings: StreamerSettings;
}): OverlayBootstrap {
  return {
    streamerId: input.streamer.id,
    slug: input.streamer.slug,
    displayName: input.streamer.displayName,
    logoUrl: input.streamer.logoUrl,
    overlayToken: input.streamer.overlayToken,
    settings: {
      themePreset: input.overlaySettings.themePreset,
      alertSound: input.overlaySettings.alertSound as OverlayBootstrap["settings"]["alertSound"],
      primaryColor: input.overlaySettings.primaryColor,
      secondaryColor: input.overlaySettings.secondaryColor,
      accentColor: input.overlaySettings.accentColor,
      fontFamily: input.overlaySettings.fontFamily,
      cardWidth: input.overlaySettings.cardWidth,
      position: input.overlaySettings.position,
      transparency: input.overlaySettings.transparency,
      animationIn: input.overlaySettings.animationIn,
      animationOut: input.overlaySettings.animationOut,
      durationMs: input.overlaySettings.durationMs,
      showAmount: input.overlaySettings.showAmount,
      showName: input.overlaySettings.showName,
      showAvatar: input.overlaySettings.showAvatar,
      volume: input.overlaySettings.volume,
    },
    voice: {
      name: input.streamerSettings.defaultVoice,
      language: input.streamerSettings.voiceLanguage,
      speed: decimalToNumber(input.streamerSettings.voiceSpeed),
      pitch: decimalToNumber(input.streamerSettings.voicePitch),
      volume: input.streamerSettings.voiceVolume,
    },
  };
}

export function serializeSupporterTransaction(charge: {
  id: string;
  viewerName: string;
  viewerMessage: string;
  amount: unknown;
  status: SupporterTransaction["status"];
  createdAt: Date;
  confirmedAt: Date | null;
  isAnonymous: boolean;
}): SupporterTransaction {
  return {
    id: charge.id,
    supporterName: charge.viewerName,
    message: charge.viewerMessage,
    amount: decimalToNumber(charge.amount),
    status: charge.status,
    createdAt: charge.createdAt.toISOString(),
    paidAt: charge.confirmedAt?.toISOString() ?? null,
    anonymous: charge.isAnonymous,
  };
}

export function serializeCharge(charge: {
  id: string;
  txid: string;
  amount: unknown;
  pixCopyPaste: string;
  qrCodeDataUrl: string | null;
  status: ChargeSummary["status"];
  expiresAt: Date;
  viewerName: string;
  viewerEmail?: string | null;
  viewerMessage: string;
  shouldReadMessage: boolean;
  isAnonymous: boolean;
}): ChargeSummary {
  return {
    id: charge.id,
    txid: charge.txid,
    amount: decimalToNumber(charge.amount),
    pixCopyPaste: charge.pixCopyPaste,
    qrCodeDataUrl: charge.qrCodeDataUrl,
    status: charge.status,
    expiresAt: charge.expiresAt.toISOString(),
    viewerName: charge.viewerName,
    viewerEmail: charge.viewerEmail ?? null,
    message: charge.viewerMessage,
    shouldReadMessage: charge.shouldReadMessage,
    isAnonymous: charge.isAnonymous,
  };
}

export function serializeSubscription(
  subscription: Subscription & { plan: Plan },
): SubscriptionSummary {
  return {
    planName: subscription.plan.name,
    billingCycle: subscription.billingCycle,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    monthlyMessageCount: subscription.monthlyMessageCount,
    monthlyTtsCount: subscription.monthlyTtsCount,
  };
}

export function serializeAlertQueueItem(alert: Alert & { ttsJob: TtsJob | null }) {
  return {
    id: alert.id,
    supporterName: alert.supporterName,
    amount: decimalToNumber(alert.amount),
    message: alert.message,
    status: alert.status,
    ttsStatus: alert.ttsJob?.status ?? "SKIPPED",
    createdAt: alert.createdAt.toISOString(),
  };
}
