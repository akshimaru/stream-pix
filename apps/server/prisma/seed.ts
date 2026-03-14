import { PrismaClient } from "@prisma/client";
import { demoCredentials } from "@streampix/shared";
import { hashPassword } from "../src/lib/security.js";

const prisma = new PrismaClient();

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

async function upsertRole(code: string, name: string, description: string) {
  return prisma.role.upsert({
    where: { code },
    update: { name, description },
    create: { code, name, description },
  });
}

async function main() {
  const [superadminRole, internalAdminRole, streamerRole] = await Promise.all([
    upsertRole("SUPERADMIN", "Superadmin", "Controle total da plataforma"),
    upsertRole("INTERNAL_ADMIN", "Admin interno", "Operação interna da plataforma"),
    upsertRole("STREAMER", "Streamer", "Conta assinante com workspace isolado"),
  ]);

  const starterPlan = await prisma.plan.upsert({
    where: { code: "STARTER" },
    update: {
      name: "Starter",
      description: "Entrada rápida para quem quer colocar PIX com voz no ar.",
      monthlyPrice: 29.9,
      yearlyPrice: 299,
      feePercentage: 4.99,
      fixedFee: 0.39,
      messageLimit: 120,
      ttsLimit: 80,
      messageCharLimit: 160,
      hasPremiumVoices: false,
      hasAdvancedAnalytics: false,
      removeBranding: false,
      hasAdvancedModeration: false,
      highlight: false,
      active: true,
      features: [
        "Pagina publica personalizada",
        "Overlay neon para OBS",
        "PIX mock/local pronto",
        "Analytics essencial",
      ],
    },
    create: {
      code: "STARTER",
      name: "Starter",
      description: "Entrada rápida para quem quer colocar PIX com voz no ar.",
      monthlyPrice: 29.9,
      yearlyPrice: 299,
      feePercentage: 4.99,
      fixedFee: 0.39,
      messageLimit: 120,
      ttsLimit: 80,
      messageCharLimit: 160,
      hasPremiumVoices: false,
      hasAdvancedAnalytics: false,
      removeBranding: false,
      hasAdvancedModeration: false,
      highlight: false,
      active: true,
      features: [
        "Pagina publica personalizada",
        "Overlay neon para OBS",
        "PIX mock/local pronto",
        "Analytics essencial",
      ],
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { code: "PRO" },
    update: {
      name: "Pro",
      description: "Plano recomendado para streamers ativos e criadores multiplataforma.",
      monthlyPrice: 79.9,
      yearlyPrice: 799,
      feePercentage: 3.49,
      fixedFee: 0.29,
      messageLimit: 1000,
      ttsLimit: 700,
      messageCharLimit: 220,
      hasPremiumVoices: true,
      hasAdvancedAnalytics: true,
      removeBranding: true,
      hasAdvancedModeration: true,
      highlight: true,
      active: true,
      features: [
        "Tudo do Starter",
        "Vozes premium liberadas",
        "Moderação avancada",
        "Branding removivel",
        "Exportacao CSV",
      ],
    },
    create: {
      code: "PRO",
      name: "Pro",
      description: "Plano recomendado para streamers ativos e criadores multiplataforma.",
      monthlyPrice: 79.9,
      yearlyPrice: 799,
      feePercentage: 3.49,
      fixedFee: 0.29,
      messageLimit: 1000,
      ttsLimit: 700,
      messageCharLimit: 220,
      hasPremiumVoices: true,
      hasAdvancedAnalytics: true,
      removeBranding: true,
      hasAdvancedModeration: true,
      highlight: true,
      active: true,
      features: [
        "Tudo do Starter",
        "Vozes premium liberadas",
        "Moderação avancada",
        "Branding removivel",
        "Exportacao CSV",
      ],
    },
  });

  await prisma.plan.upsert({
    where: { code: "ELITE" },
    update: {
      name: "Elite",
      description: "Operacao premium para creators com escala, equipe e integrações futuras.",
      monthlyPrice: 149.9,
      yearlyPrice: 1499,
      feePercentage: 2.49,
      fixedFee: 0.19,
      messageLimit: 99999,
      ttsLimit: 99999,
      messageCharLimit: 260,
      hasPremiumVoices: true,
      hasAdvancedAnalytics: true,
      removeBranding: true,
      hasAdvancedModeration: true,
      highlight: false,
      active: true,
      features: [
        "Tudo do Pro",
        "Roadmap de integracoes",
        "Suporte prioritario",
        "Estrutura para equipe e split",
      ],
    },
    create: {
      code: "ELITE",
      name: "Elite",
      description: "Operacao premium para creators com escala, equipe e integrações futuras.",
      monthlyPrice: 149.9,
      yearlyPrice: 1499,
      feePercentage: 2.49,
      fixedFee: 0.19,
      messageLimit: 99999,
      ttsLimit: 99999,
      messageCharLimit: 260,
      hasPremiumVoices: true,
      hasAdvancedAnalytics: true,
      removeBranding: true,
      hasAdvancedModeration: true,
      highlight: false,
      active: true,
      features: [
        "Tudo do Pro",
        "Roadmap de integracoes",
        "Suporte prioritario",
        "Estrutura para equipe e split",
      ],
    },
  });

  const paymentProvider = await prisma.paymentProvider.upsert({
    where: { code: "MOCK_PIX" },
    update: {
      name: "Mock PIX Local",
      driver: "mock-pix-provider",
      type: "PIX",
      isActive: true,
      isDefault: true,
      feePercentage: 1.49,
      fixedFee: 0.29,
      config: {
        mode: "local",
      },
    },
    create: {
      code: "MOCK_PIX",
      name: "Mock PIX Local",
      driver: "mock-pix-provider",
      type: "PIX",
      isActive: true,
      isDefault: true,
      feePercentage: 1.49,
      fixedFee: 0.29,
      config: {
        mode: "local",
      },
    },
  });

  await prisma.paymentProvider.upsert({
    where: { code: "MERCADO_PAGO" },
    update: {
      name: "Mercado Pago PIX",
      driver: "mercado-pago-pix-provider",
      type: "PIX",
      isActive: false,
      isDefault: false,
      feePercentage: 0.99,
      fixedFee: 0,
      config: {
        accessToken: "",
        publicKey: "",
        webhookSecret: "",
        notificationUrl: "",
        paymentExpirationMinutes: 30,
        requirePayerEmail: true,
        requirePayerDocument: false,
        statementDescriptor: "STREAMPIX",
        testMode: true,
        supportsPayouts: false,
        payoutAccessToken: "",
        payoutNotificationUrl: "",
        payoutEnforceSignature: false,
        payoutPrivateKeyPem: "",
      },
    },
    create: {
      code: "MERCADO_PAGO",
      name: "Mercado Pago PIX",
      driver: "mercado-pago-pix-provider",
      type: "PIX",
      isActive: false,
      isDefault: false,
      feePercentage: 0.99,
      fixedFee: 0,
      config: {
        accessToken: "",
        publicKey: "",
        webhookSecret: "",
        notificationUrl: "",
        paymentExpirationMinutes: 30,
        requirePayerEmail: true,
        requirePayerDocument: false,
        statementDescriptor: "STREAMPIX",
        testMode: true,
        supportsPayouts: false,
        payoutAccessToken: "",
        payoutNotificationUrl: "",
        payoutEnforceSignature: false,
        payoutPrivateKeyPem: "",
      },
    },
  });

  await prisma.ttsProvider.upsert({
    where: { code: "MOCK_TTS" },
    update: {
      name: "Mock TTS Local",
      driver: "mock-tts-provider",
      isActive: true,
      isDefault: true,
      config: {
        mode: "local",
      },
    },
    create: {
      code: "MOCK_TTS",
      name: "Mock TTS Local",
      driver: "mock-tts-provider",
      isActive: true,
      isDefault: true,
      config: {
        mode: "local",
      },
    },
  });

  const adminPassword = await hashPassword(demoCredentials.superadmin.password);
  const streamerPassword = await hashPassword(demoCredentials.streamer.password);
  const payoutSecurityCodeHash = await hashPassword("246810");

  const superadminUser = await prisma.user.upsert({
    where: { email: demoCredentials.superadmin.email },
    update: {
      name: "StreamPix Admin",
      passwordHash: adminPassword,
      isActive: true,
    },
    create: {
      name: "StreamPix Admin",
      email: demoCredentials.superadmin.email,
      passwordHash: adminPassword,
      isActive: true,
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: demoCredentials.streamer.email },
    update: {
      name: "Alpha Neon",
      passwordHash: streamerPassword,
      isActive: true,
    },
    create: {
      name: "Alpha Neon",
      email: demoCredentials.streamer.email,
      passwordHash: streamerPassword,
      isActive: true,
    },
  });

  await prisma.userRole.deleteMany({
    where: {
      userId: {
        in: [superadminUser.id, demoUser.id],
      },
    },
  });

  await prisma.userRole.createMany({
    data: [
      { userId: superadminUser.id, roleId: superadminRole.id },
      { userId: superadminUser.id, roleId: internalAdminRole.id },
      { userId: demoUser.id, roleId: streamerRole.id },
    ],
    skipDuplicates: true,
  });

  let demoStreamer = await prisma.streamerProfile.findUnique({
    where: { slug: "alpha-neon" },
  });

  if (!demoStreamer) {
    demoStreamer = await prisma.streamerProfile.create({
      data: {
        userId: demoUser.id,
        workspaceName: "Alpha Neon",
        displayName: "Alpha Neon",
        slug: "alpha-neon",
        bio: "Streamer demo da plataforma com visual neon, TTS ativo e overlay pronto para OBS.",
        avatarUrl:
          "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=600&q=80",
        bannerUrl:
          "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1600&q=80",
        logoUrl:
          "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=500&q=80",
        status: "ACTIVE",
        publicPageEnabled: true,
        defaultCurrency: "BRL",
        overlayToken: "ovl_demo_alpha_neon",
        publicApiToken: "pub_demo_alpha_neon",
      },
    });
  }

  await prisma.overlaySettings.upsert({
    where: { streamerId: demoStreamer.id },
    update: {
      themePreset: "NEON",
      alertSound: "CHIME",
      primaryColor: "#7c3aed",
      secondaryColor: "#22d3ee",
      accentColor: "#f472b6",
      fontFamily: "Rajdhani, sans-serif",
      cardStyle: "glass",
      cardWidth: 430,
      position: "BOTTOM_RIGHT",
      transparency: 14,
      animationIn: "slide-up",
      animationOut: "fade-out",
      durationMs: 6500,
      showAmount: true,
      showName: true,
      showAvatar: false,
      volume: 88,
    },
    create: {
      streamerId: demoStreamer.id,
      themePreset: "NEON",
      alertSound: "CHIME",
      primaryColor: "#7c3aed",
      secondaryColor: "#22d3ee",
      accentColor: "#f472b6",
      fontFamily: "Rajdhani, sans-serif",
      cardStyle: "glass",
      cardWidth: 430,
      position: "BOTTOM_RIGHT",
      transparency: 14,
      animationIn: "slide-up",
      animationOut: "fade-out",
      durationMs: 6500,
      showAmount: true,
      showName: true,
      showAvatar: false,
      volume: 88,
    },
  });

  await prisma.publicPageSettings.upsert({
    where: { streamerId: demoStreamer.id },
    update: {
      headline: "Apoie Alpha Neon com PIX e apareca na live em tempo real.",
      description:
        "Seu PIX gera alerta neon, animacao em overlay e pode virar voz na live em segundos.",
      minimumAmount: 2,
      maximumAmount: 500,
      minAmountForTts: 5,
      messageCharLimit: 180,
      allowVoiceMessages: true,
      allowLinks: false,
      blockedWords: ["spam", "golpe"],
      cooldownSeconds: 12,
      autoModeration: true,
      manualModeration: false,
      primaryColor: "#7c3aed",
      secondaryColor: "#22d3ee",
      accentColor: "#f472b6",
      backgroundPreset: "aurora-grid",
    },
    create: {
      streamerId: demoStreamer.id,
      headline: "Apoie Alpha Neon com PIX e apareca na live em tempo real.",
      description:
        "Seu PIX gera alerta neon, animacao em overlay e pode virar voz na live em segundos.",
      minimumAmount: 2,
      maximumAmount: 500,
      minAmountForTts: 5,
      messageCharLimit: 180,
      allowVoiceMessages: true,
      allowLinks: false,
      blockedWords: ["spam", "golpe"],
      cooldownSeconds: 12,
      autoModeration: true,
      manualModeration: false,
      primaryColor: "#7c3aed",
      secondaryColor: "#22d3ee",
      accentColor: "#f472b6",
      backgroundPreset: "aurora-grid",
    },
  });

  await prisma.streamerSettings.upsert({
    where: { streamerId: demoStreamer.id },
    update: {
      locale: "pt-BR",
      timezone: "America/Sao_Paulo",
      defaultVoice: "Neon Pulse",
      voiceLanguage: "pt-BR",
      voiceSpeed: 1,
      voicePitch: 1,
      voiceVolume: 90,
      minAmountForTts: 5,
      maxMessageLength: 180,
      fallbackMessage: "Valeu pelo apoio na live.",
      moderationLevel: "BASIC",
      alertsEnabled: true,
      overlayEnabled: true,
      notifyOnPayment: true,
      featureFlags: {
        analyticsV2: true,
        ranking: false,
        customDomains: false,
      },
      onboardingCompletedAt: new Date(),
    },
    create: {
      streamerId: demoStreamer.id,
      locale: "pt-BR",
      timezone: "America/Sao_Paulo",
      defaultVoice: "Neon Pulse",
      voiceLanguage: "pt-BR",
      voiceSpeed: 1,
      voicePitch: 1,
      voiceVolume: 90,
      minAmountForTts: 5,
      maxMessageLength: 180,
      fallbackMessage: "Valeu pelo apoio na live.",
      moderationLevel: "BASIC",
      alertsEnabled: true,
      overlayEnabled: true,
      notifyOnPayment: true,
      featureFlags: {
        analyticsV2: true,
        ranking: false,
        customDomains: false,
      },
      onboardingCompletedAt: new Date(),
    },
  });

  await prisma.streamerPayoutAccount.upsert({
    where: {
      streamerId: demoStreamer.id,
    },
    update: {
      legalName: "Alpha Neon LTDA",
      document: "12345678000199",
      pixKeyType: "EMAIL",
      pixKeyValue: "financeiro@alpha-neon.live",
      payoutsEnabled: true,
      instantPayoutEnabled: true,
      withdrawalPinHash: payoutSecurityCodeHash,
      withdrawalPinUpdatedAt: new Date(),
    },
    create: {
      streamerId: demoStreamer.id,
      legalName: "Alpha Neon LTDA",
      document: "12345678000199",
      pixKeyType: "EMAIL",
      pixKeyValue: "financeiro@alpha-neon.live",
      payoutsEnabled: true,
      instantPayoutEnabled: true,
      withdrawalPinHash: payoutSecurityCodeHash,
      withdrawalPinUpdatedAt: new Date(),
    },
  });

  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      streamerId: demoStreamer.id,
      status: {
        in: ["ACTIVE", "TRIALING"],
      },
    },
  });

  if (existingSubscription) {
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        planId: proPlan.id,
        status: "ACTIVE",
        billingCycle: "MONTHLY",
        currentPeriodStart: new Date("2026-03-01T00:00:00.000Z"),
        currentPeriodEnd: new Date("2026-04-01T00:00:00.000Z"),
        monthlyMessageCount: 12,
        monthlyTtsCount: 9,
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        streamerId: demoStreamer.id,
        planId: proPlan.id,
        status: "ACTIVE",
        billingCycle: "MONTHLY",
        startedAt: new Date("2026-03-01T00:00:00.000Z"),
        currentPeriodStart: new Date("2026-03-01T00:00:00.000Z"),
        currentPeriodEnd: new Date("2026-04-01T00:00:00.000Z"),
        monthlyMessageCount: 12,
        monthlyTtsCount: 9,
      },
    });
  }

  await prisma.superadminSetting.upsert({
    where: { key: "platform.defaults" },
    update: {
      value: {
        defaultPlanCode: starterPlan.code,
        defaultPaymentProvider: paymentProvider.code,
        defaultTtsProvider: "MOCK_TTS",
        supportEmail: "support@streampix.local",
      },
      description: "Defaults globais da plataforma.",
    },
    create: {
      key: "platform.defaults",
      value: {
        defaultPlanCode: starterPlan.code,
        defaultPaymentProvider: paymentProvider.code,
        defaultTtsProvider: "MOCK_TTS",
        supportEmail: "support@streampix.local",
      },
      description: "Defaults globais da plataforma.",
    },
  });

  const existingCharges = await prisma.pixCharge.count({
    where: { streamerId: demoStreamer.id },
  });

  if (existingCharges === 0) {
    const chargeA = await prisma.pixCharge.create({
      data: {
        streamerId: demoStreamer.id,
        paymentProviderId: paymentProvider.id,
        viewerName: "LunaByte",
        viewerMessage: "Essa live esta absurda, continua assim!",
        sanitizedMessage: "Essa live esta absurda, continua assim!",
        amount: 25,
        netAmount: 23.1,
        platformFee: 1.03,
        gatewayFee: 0.87,
        pixCopyPaste: "mock-luna-byte",
        qrCodeDataUrl: "data:image/svg+xml;base64,PHN2Zy8+",
        txid: "seed_tx_lunabyte",
        externalId: "seed_ext_lunabyte",
        isAnonymous: false,
        shouldReadMessage: true,
        status: "PAID",
        confirmedAt: new Date("2026-03-10T22:15:00.000Z"),
        expiresAt: new Date("2026-03-10T22:30:00.000Z"),
      },
    });

    await prisma.pixTransaction.create({
      data: {
        chargeId: chargeA.id,
        streamerId: demoStreamer.id,
        paymentProviderId: paymentProvider.id,
        externalId: "seed_ext_lunabyte",
        status: "PAID",
        grossAmount: 25,
        netAmount: 23.1,
        platformFee: 1.03,
        gatewayFee: 0.87,
        paidAt: new Date("2026-03-10T22:15:00.000Z"),
        settlementAt: new Date("2026-03-10T22:15:00.000Z"),
        rawPayload: { seed: true },
      },
    });

    const alertA = await prisma.alert.create({
      data: {
        streamerId: demoStreamer.id,
        chargeId: chargeA.id,
        status: "DISPLAYED",
        title: "LunaByte apoiou a live",
        supporterName: "LunaByte",
        message: chargeA.viewerMessage,
        sanitizedMessage: chargeA.sanitizedMessage,
        amount: 25,
        showAmount: true,
        showName: true,
        ttsRequested: true,
        ttsExecuted: true,
        deliveredAt: new Date("2026-03-10T22:15:04.000Z"),
        displayedAt: new Date("2026-03-10T22:15:04.000Z"),
        durationMs: 6500,
        themeSnapshot: { preset: "NEON" },
      },
    });

    await prisma.ttsJob.create({
      data: {
        streamerId: demoStreamer.id,
        alertId: alertA.id,
        status: "SPOKEN",
        inputText: chargeA.viewerMessage,
        sanitizedText: chargeA.sanitizedMessage,
        voiceName: "Neon Pulse",
        language: "pt-BR",
        speed: 1,
        pitch: 1,
        volume: 0.9,
        attempts: 1,
        maxAttempts: 3,
        audioUrl: "mock://tts/seed-lunabyte",
        startedAt: new Date("2026-03-10T22:15:04.000Z"),
        finishedAt: new Date("2026-03-10T22:15:05.000Z"),
      },
    });

    const chargeB = await prisma.pixCharge.create({
      data: {
        streamerId: demoStreamer.id,
        paymentProviderId: paymentProvider.id,
        viewerName: "GhostPulse",
        viewerMessage: "Manda um salve para o squad da madrugada!",
        sanitizedMessage: "Manda um salve para o squad da madrugada!",
        amount: 12,
        netAmount: 10.98,
        platformFee: 0.71,
        gatewayFee: 0.31,
        pixCopyPaste: "mock-ghost-pulse",
        qrCodeDataUrl: "data:image/svg+xml;base64,PHN2Zy8+",
        txid: "seed_tx_ghostpulse",
        externalId: "seed_ext_ghostpulse",
        isAnonymous: false,
        shouldReadMessage: true,
        status: "PAID",
        confirmedAt: new Date("2026-03-12T01:20:00.000Z"),
        expiresAt: new Date("2026-03-12T01:35:00.000Z"),
      },
    });

    await prisma.pixTransaction.create({
      data: {
        chargeId: chargeB.id,
        streamerId: demoStreamer.id,
        paymentProviderId: paymentProvider.id,
        externalId: "seed_ext_ghostpulse",
        status: "PAID",
        grossAmount: 12,
        netAmount: 10.98,
        platformFee: 0.71,
        gatewayFee: 0.31,
        paidAt: new Date("2026-03-12T01:20:00.000Z"),
        settlementAt: new Date("2026-03-12T01:20:00.000Z"),
        rawPayload: { seed: true },
      },
    });

    await prisma.alert.create({
      data: {
        streamerId: demoStreamer.id,
        chargeId: chargeB.id,
        status: "PROCESSING",
        title: "GhostPulse apoiou a live",
        supporterName: "GhostPulse",
        message: chargeB.viewerMessage,
        sanitizedMessage: chargeB.sanitizedMessage,
        amount: 12,
        showAmount: true,
        showName: true,
        ttsRequested: true,
        ttsExecuted: false,
        durationMs: 6500,
        themeSnapshot: { preset: "NEON" },
      },
    });

    await prisma.pixCharge.create({
      data: {
        streamerId: demoStreamer.id,
        paymentProviderId: paymentProvider.id,
        viewerName: "Nova pessoa",
        viewerMessage: "Acabei de chegar e ja curti demais a stream!",
        sanitizedMessage: "Acabei de chegar e ja curti demais a stream!",
        amount: 8,
        pixCopyPaste: "mock-pending-charge",
        qrCodeDataUrl: "data:image/svg+xml;base64,PHN2Zy8+",
        txid: "seed_tx_pending_live",
        externalId: "seed_ext_pending_live",
        isAnonymous: false,
        shouldReadMessage: true,
        status: "PENDING",
        expiresAt: new Date("2026-03-13T03:00:00.000Z"),
      },
    });

    await prisma.notification.createMany({
      data: [
        {
          streamerId: demoStreamer.id,
          type: "PAYMENT_CONFIRMED",
          title: "Novo PIX confirmado",
          message: "LunaByte enviou R$ 25,00 para a live.",
        },
        {
          streamerId: demoStreamer.id,
          type: "ALERT_BLOCKED",
          title: "Mensagem aguardando moderacao",
          message: "Uma mensagem paga esta aguardando sua aprovacao manual.",
        },
      ],
    });

    await prisma.usageMetric.createMany({
      data: [
        {
          streamerId: demoStreamer.id,
          periodStart: new Date("2026-03-10T00:00:00.000Z"),
          periodEnd: new Date("2026-03-10T23:59:59.999Z"),
          messagesCount: 3,
          ttsCount: 2,
          chargesCount: 3,
          grossAmount: 55,
          netAmount: 49.8,
          platformRevenue: 2.5,
        },
        {
          streamerId: demoStreamer.id,
          periodStart: new Date("2026-03-11T00:00:00.000Z"),
          periodEnd: new Date("2026-03-11T23:59:59.999Z"),
          messagesCount: 2,
          ttsCount: 1,
          chargesCount: 2,
          grossAmount: 28,
          netAmount: 25.1,
          platformRevenue: 1.4,
        },
        {
          streamerId: demoStreamer.id,
          periodStart: new Date("2026-03-12T00:00:00.000Z"),
          periodEnd: new Date("2026-03-12T23:59:59.999Z"),
          messagesCount: 4,
          ttsCount: 3,
          chargesCount: 4,
          grossAmount: 71,
          netAmount: 64.2,
          platformRevenue: 3.4,
        },
      ],
      skipDuplicates: true,
    });

    await prisma.auditLog.createMany({
      data: [
        {
          actorUserId: superadminUser.id,
          entityType: "streamer_profile",
          entityId: demoStreamer.id,
          action: "support.seed_bootstrap",
          metadata: {
            source: "seed",
          },
        },
        {
          actorUserId: demoUser.id,
          streamerId: demoStreamer.id,
          entityType: "alert",
          entityId: alertA.id,
          action: "alert.seed_displayed",
          metadata: {
            source: "seed",
          },
        },
      ],
    });
  }

  const payoutAccount = await prisma.streamerPayoutAccount.findUniqueOrThrow({
    where: {
      streamerId: demoStreamer.id,
    },
  });

  const existingLedgerEntries = await prisma.balanceLedgerEntry.count({
    where: {
      streamerId: demoStreamer.id,
    },
  });

  if (existingLedgerEntries === 0) {
    const paidCharges = await prisma.pixCharge.findMany({
      where: {
        streamerId: demoStreamer.id,
        status: "PAID",
        isTest: false,
      },
      orderBy: {
        confirmedAt: "asc",
      },
    });

    let availableBalance = 0;

    for (const charge of paidCharges) {
      const netAmount = roundCurrency(Number(charge.netAmount ?? 0));
      const feeAmount = roundCurrency(Number(charge.platformFee ?? 0) + Number(charge.gatewayFee ?? 0));

      availableBalance = roundCurrency(availableBalance + netAmount);

      await prisma.balanceLedgerEntry.create({
        data: {
          streamerId: demoStreamer.id,
          payoutAccountId: payoutAccount.id,
          chargeId: charge.id,
          entryType: "PIX_CREDIT",
          direction: "CREDIT",
          grossAmount: Number(charge.amount),
          feeAmount,
          amount: netAmount,
          balanceAfter: availableBalance,
          description: `Credito liquido do PIX ${charge.txid}`,
          metadata: {
            source: "seed_backfill",
          },
        },
      });
    }

    await prisma.streamerPayoutAccount.update({
      where: {
        id: payoutAccount.id,
      },
      data: {
        availableBalance,
        pendingBalance: 0,
        lockedBalance: 0,
        totalPaidOut: 0,
      },
    });
  }

  const existingPayoutRequests = await prisma.payoutRequest.count({
    where: {
      streamerId: demoStreamer.id,
    },
  });

  if (existingPayoutRequests === 0) {
    const freshAccount = await prisma.streamerPayoutAccount.findUniqueOrThrow({
      where: {
        streamerId: demoStreamer.id,
      },
    });

    const availableBalance = Number(freshAccount.availableBalance);
    const paidSeedAmount = availableBalance >= 14.08 ? 14.08 : availableBalance >= 10 ? 10 : 0;

    if (paidSeedAmount > 0) {
      const nextAvailableBalance = roundCurrency(availableBalance - paidSeedAmount);

      const paidPayout = await prisma.payoutRequest.create({
        data: {
          streamerId: demoStreamer.id,
          payoutAccountId: freshAccount.id,
          reviewedByUserId: superadminUser.id,
          providerCode: "MOCK_PAYOUT",
          externalId: "seed_payout_paid_alpha",
          amount: paidSeedAmount,
          feeAmount: 0,
          netAmount: paidSeedAmount,
          status: "PAID",
          requestedAt: new Date("2026-03-11T10:15:00.000Z"),
          reviewedAt: new Date("2026-03-11T10:20:00.000Z"),
          paidAt: new Date("2026-03-11T10:21:00.000Z"),
          metadata: {
            source: "seed",
          },
        },
      });

      await prisma.balanceLedgerEntry.create({
        data: {
          streamerId: demoStreamer.id,
          payoutAccountId: freshAccount.id,
          payoutRequestId: paidPayout.id,
          entryType: "PAYOUT_COMPLETED",
          direction: "DEBIT",
          amount: paidSeedAmount,
          feeAmount: 0,
          balanceAfter: nextAvailableBalance,
          description: "Repasse PIX concluido para o streamer.",
          metadata: {
            source: "seed",
          },
        },
      });

      await prisma.streamerPayoutAccount.update({
        where: {
          id: freshAccount.id,
        },
        data: {
          availableBalance: nextAvailableBalance,
          totalPaidOut: paidSeedAmount,
        },
      });
    }

  }

  console.log("Seed concluido.");
  console.log(`Superadmin: ${demoCredentials.superadmin.email} / ${demoCredentials.superadmin.password}`);
  console.log(`Streamer demo: ${demoCredentials.streamer.email} / ${demoCredentials.streamer.password}`);
  console.log("PIN de saque demo: 246810");
  console.log("Pagina publica demo: /s/alpha-neon");
  console.log("Overlay demo: /widget/alerts/ovl_demo_alpha_neon");
}

main()
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
