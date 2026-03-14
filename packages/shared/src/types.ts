import type {
  AlertStatus,
  BillingCycle,
  OverlayAlertSound,
  OverlayPosition,
  OverlayThemePreset,
  PixChargeStatus,
  RoleKey,
  StreamerStatus,
  SubscriptionStatus,
  TtsJobStatus,
} from "./enums.js";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: RoleKey[];
  streamerId?: string;
  streamerSlug?: string;
  streamerDisplayName?: string;
}

export interface PlanSummary {
  id: string;
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  feePercentage: number;
  fixedFee: number;
  highlight: boolean;
  active: boolean;
  messageLimit?: number | null;
  ttsLimit?: number | null;
  messageCharLimit: number;
  features: string[];
}

export interface StreamerOverview {
  streamerId: string;
  displayName: string;
  slug: string;
  status: StreamerStatus;
  currentPlan: PlanSummary;
  subscriptionStatus: SubscriptionStatus;
  totals: {
    today: number;
    week: number;
    month: number;
    gross: number;
    net: number;
    fees: number;
  };
  counts: {
    messages: number;
    ttsExecuted: number;
    pendingAlerts: number;
  };
  overlayUrl: string;
  publicUrl: string;
  paymentProviderName: string;
  ttsProviderName: string;
}

export interface ChartPoint {
  label: string;
  grossAmount: number;
  netAmount: number;
  messages: number;
}

export interface SupporterTransaction {
  id: string;
  supporterName: string;
  message: string;
  amount: number;
  status: PixChargeStatus;
  createdAt: string;
  paidAt?: string | null;
  anonymous: boolean;
}

export interface AlertQueueItem {
  id: string;
  supporterName: string;
  amount: number;
  message: string;
  status: AlertStatus;
  ttsStatus: TtsJobStatus;
  createdAt: string;
}

export interface PublicStreamerPage {
  streamerId: string;
  displayName: string;
  slug: string;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  page: {
    headline: string;
    description: string;
    minimumAmount: number;
    maximumAmount: number;
    minAmountForTts: number;
    messageCharLimit: number;
    allowVoiceMessages: boolean;
    allowLinks: boolean;
    autoModeration: boolean;
    manualModeration: boolean;
    cooldownSeconds: number;
    blockedWords: string[];
  };
  payment: {
    providerCode: string;
    providerName: string;
    requiresPayerEmail: boolean;
    requiresPayerDocument: boolean;
    supportsLocalSimulation: boolean;
  };
}

export interface ChargeSummary {
  id: string;
  txid: string;
  amount: number;
  pixCopyPaste: string;
  qrCodeDataUrl?: string | null;
  status: PixChargeStatus;
  expiresAt: string;
  viewerName: string;
  viewerEmail?: string | null;
  message: string;
  shouldReadMessage: boolean;
  isAnonymous: boolean;
}

export interface OverlayBootstrap {
  streamerId: string;
  slug: string;
  displayName: string;
  logoUrl?: string | null;
  overlayToken: string;
  settings: {
    themePreset: OverlayThemePreset;
    alertSound: OverlayAlertSound;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    cardWidth: number;
    position: OverlayPosition;
    transparency: number;
    animationIn: string;
    animationOut: string;
    durationMs: number;
    showAmount: boolean;
    showName: boolean;
    showAvatar: boolean;
    volume: number;
  };
  voice: {
    name: string;
    language: string;
    speed: number;
    pitch: number;
    volume: number;
  };
}

export interface OverlayAlertEvent {
  alertId: string;
  streamerId: string;
  supporterName: string;
  amount: number;
  message: string;
  isAnonymous: boolean;
  durationMs: number;
  settings: OverlayBootstrap["settings"];
  voice: OverlayBootstrap["voice"];
}

export interface DashboardNotificationEvent {
  type: "PAYMENT_CONFIRMED" | "ALERT_BLOCKED" | "TTS_FINISHED" | "TEST_ALERT";
  title: string;
  message: string;
  timestamp: string;
}

export interface AdminOverview {
  totals: {
    mrr: number;
    arr: number;
    totalProcessed: number;
    totalFees: number;
    activeStreamers: number;
    newAccounts: number;
    alertsExecuted: number;
    ttsExecuted: number;
  };
  recentStreamers: Array<{
    id: string;
    name: string;
    slug: string;
    status: StreamerStatus;
    planName: string;
    monthlyRevenue: number;
  }>;
}

export interface SubscriptionSummary {
  planName: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  monthlyMessageCount: number;
  monthlyTtsCount: number;
}
