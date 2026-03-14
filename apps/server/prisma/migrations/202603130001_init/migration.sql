-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `avatarUrl` VARCHAR(500) NULL,
    `emailVerifiedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_isActive_idx`(`isActive`),
    INDEX `users_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_roles_roleId_idx`(`roleId`),
    PRIMARY KEY (`userId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `streamer_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `workspaceName` VARCHAR(120) NOT NULL,
    `displayName` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `bio` TEXT NULL,
    `avatarUrl` VARCHAR(500) NULL,
    `bannerUrl` VARCHAR(500) NULL,
    `logoUrl` VARCHAR(500) NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    `publicPageEnabled` BOOLEAN NOT NULL DEFAULT true,
    `defaultCurrency` VARCHAR(8) NOT NULL DEFAULT 'BRL',
    `overlayToken` VARCHAR(191) NOT NULL,
    `publicApiToken` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `streamer_profiles_userId_key`(`userId`),
    UNIQUE INDEX `streamer_profiles_slug_key`(`slug`),
    UNIQUE INDEX `streamer_profiles_overlayToken_key`(`overlayToken`),
    UNIQUE INDEX `streamer_profiles_publicApiToken_key`(`publicApiToken`),
    INDEX `streamer_profiles_status_idx`(`status`),
    INDEX `streamer_profiles_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plans` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(255) NULL,
    `monthlyPrice` DECIMAL(10, 2) NOT NULL,
    `yearlyPrice` DECIMAL(10, 2) NOT NULL,
    `feePercentage` DECIMAL(5, 2) NOT NULL,
    `fixedFee` DECIMAL(10, 2) NOT NULL,
    `messageLimit` INTEGER NULL,
    `ttsLimit` INTEGER NULL,
    `messageCharLimit` INTEGER NOT NULL DEFAULT 180,
    `hasPremiumVoices` BOOLEAN NOT NULL DEFAULT false,
    `hasAdvancedAnalytics` BOOLEAN NOT NULL DEFAULT false,
    `removeBranding` BOOLEAN NOT NULL DEFAULT false,
    `hasAdvancedModeration` BOOLEAN NOT NULL DEFAULT false,
    `highlight` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `features` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `plans_code_key`(`code`),
    INDEX `plans_active_idx`(`active`),
    INDEX `plans_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `status` ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED') NOT NULL DEFAULT 'TRIALING',
    `billingCycle` ENUM('MONTHLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
    `startedAt` DATETIME(3) NOT NULL,
    `currentPeriodStart` DATETIME(3) NOT NULL,
    `currentPeriodEnd` DATETIME(3) NOT NULL,
    `canceledAt` DATETIME(3) NULL,
    `trialEndsAt` DATETIME(3) NULL,
    `monthlyMessageCount` INTEGER NOT NULL DEFAULT 0,
    `monthlyTtsCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `subscriptions_streamerId_status_idx`(`streamerId`, `status`),
    INDEX `subscriptions_planId_idx`(`planId`),
    INDEX `subscriptions_currentPeriodEnd_idx`(`currentPeriodEnd`),
    INDEX `subscriptions_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_providers` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `driver` VARCHAR(120) NOT NULL,
    `type` ENUM('PIX') NOT NULL DEFAULT 'PIX',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `feePercentage` DECIMAL(5, 2) NOT NULL,
    `fixedFee` DECIMAL(10, 2) NOT NULL,
    `config` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_providers_code_key`(`code`),
    INDEX `payment_providers_isActive_idx`(`isActive`),
    INDEX `payment_providers_isDefault_idx`(`isDefault`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tts_providers` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `driver` VARCHAR(120) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `config` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tts_providers_code_key`(`code`),
    INDEX `tts_providers_isActive_idx`(`isActive`),
    INDEX `tts_providers_isDefault_idx`(`isDefault`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pix_charges` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `paymentProviderId` VARCHAR(191) NOT NULL,
    `viewerName` VARCHAR(80) NOT NULL,
    `viewerEmail` VARCHAR(191) NULL,
    `viewerMessage` TEXT NOT NULL,
    `sanitizedMessage` TEXT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `netAmount` DECIMAL(10, 2) NULL,
    `platformFee` DECIMAL(10, 2) NULL,
    `gatewayFee` DECIMAL(10, 2) NULL,
    `pixCopyPaste` TEXT NOT NULL,
    `qrCodeDataUrl` LONGTEXT NULL,
    `txid` VARCHAR(191) NOT NULL,
    `externalId` VARCHAR(191) NULL,
    `payerDocument` VARCHAR(32) NULL,
    `isAnonymous` BOOLEAN NOT NULL DEFAULT false,
    `shouldReadMessage` BOOLEAN NOT NULL DEFAULT true,
    `isTest` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED', 'BLOCKED') NOT NULL DEFAULT 'PENDING',
    `statusReason` VARCHAR(255) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `pix_charges_txid_key`(`txid`),
    UNIQUE INDEX `pix_charges_externalId_key`(`externalId`),
    UNIQUE INDEX `pix_charges_idempotencyKey_key`(`idempotencyKey`),
    INDEX `pix_charges_streamerId_status_createdAt_idx`(`streamerId`, `status`, `createdAt`),
    INDEX `pix_charges_paymentProviderId_status_idx`(`paymentProviderId`, `status`),
    INDEX `pix_charges_expiresAt_idx`(`expiresAt`),
    INDEX `pix_charges_confirmedAt_idx`(`confirmedAt`),
    INDEX `pix_charges_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pix_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `chargeId` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `paymentProviderId` VARCHAR(191) NOT NULL,
    `externalId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `grossAmount` DECIMAL(10, 2) NOT NULL,
    `netAmount` DECIMAL(10, 2) NOT NULL,
    `platformFee` DECIMAL(10, 2) NOT NULL,
    `gatewayFee` DECIMAL(10, 2) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `settlementAt` DATETIME(3) NULL,
    `rawPayload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pix_transactions_externalId_key`(`externalId`),
    INDEX `pix_transactions_chargeId_idx`(`chargeId`),
    INDEX `pix_transactions_streamerId_status_createdAt_idx`(`streamerId`, `status`, `createdAt`),
    INDEX `pix_transactions_paidAt_idx`(`paidAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alerts` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `chargeId` VARCHAR(191) NOT NULL,
    `status` ENUM('QUEUED', 'PROCESSING', 'DISPLAYED', 'SPOKEN', 'FAILED', 'BLOCKED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'QUEUED',
    `title` VARCHAR(120) NOT NULL,
    `supporterName` VARCHAR(80) NOT NULL,
    `message` TEXT NOT NULL,
    `sanitizedMessage` TEXT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `showAmount` BOOLEAN NOT NULL DEFAULT true,
    `showName` BOOLEAN NOT NULL DEFAULT true,
    `ttsRequested` BOOLEAN NOT NULL DEFAULT true,
    `ttsExecuted` BOOLEAN NOT NULL DEFAULT false,
    `deliveredAt` DATETIME(3) NULL,
    `displayedAt` DATETIME(3) NULL,
    `durationMs` INTEGER NOT NULL DEFAULT 6500,
    `themeSnapshot` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `alerts_chargeId_key`(`chargeId`),
    INDEX `alerts_streamerId_status_createdAt_idx`(`streamerId`, `status`, `createdAt`),
    INDEX `alerts_displayedAt_idx`(`displayedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tts_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `alertId` VARCHAR(191) NULL,
    `ttsProviderId` VARCHAR(191) NULL,
    `status` ENUM('QUEUED', 'PROCESSING', 'SPOKEN', 'FAILED', 'SKIPPED', 'MUTED') NOT NULL DEFAULT 'QUEUED',
    `inputText` TEXT NOT NULL,
    `sanitizedText` TEXT NOT NULL,
    `voiceName` VARCHAR(120) NOT NULL,
    `language` VARCHAR(16) NOT NULL,
    `speed` DECIMAL(5, 2) NOT NULL,
    `pitch` DECIMAL(5, 2) NULL,
    `volume` DECIMAL(5, 2) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 3,
    `errorMessage` VARCHAR(255) NULL,
    `audioUrl` VARCHAR(500) NULL,
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tts_jobs_alertId_key`(`alertId`),
    INDEX `tts_jobs_streamerId_status_createdAt_idx`(`streamerId`, `status`, `createdAt`),
    INDEX `tts_jobs_ttsProviderId_idx`(`ttsProviderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `overlay_settings` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `themePreset` ENUM('NEON', 'MINIMAL', 'GLITCH') NOT NULL DEFAULT 'NEON',
    `primaryColor` VARCHAR(32) NOT NULL,
    `secondaryColor` VARCHAR(32) NOT NULL,
    `accentColor` VARCHAR(32) NOT NULL,
    `fontFamily` VARCHAR(120) NOT NULL,
    `cardStyle` VARCHAR(40) NOT NULL DEFAULT 'glass',
    `logoUrl` VARCHAR(500) NULL,
    `backgroundImageUrl` VARCHAR(500) NULL,
    `borderRadius` INTEGER NOT NULL DEFAULT 24,
    `glowIntensity` INTEGER NOT NULL DEFAULT 80,
    `cardWidth` INTEGER NOT NULL DEFAULT 420,
    `position` ENUM('TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT', 'CENTER') NOT NULL DEFAULT 'BOTTOM_RIGHT',
    `transparency` INTEGER NOT NULL DEFAULT 14,
    `animationIn` VARCHAR(40) NOT NULL DEFAULT 'slide-up',
    `animationOut` VARCHAR(40) NOT NULL DEFAULT 'fade-out',
    `durationMs` INTEGER NOT NULL DEFAULT 6500,
    `showAmount` BOOLEAN NOT NULL DEFAULT true,
    `showName` BOOLEAN NOT NULL DEFAULT true,
    `showAvatar` BOOLEAN NOT NULL DEFAULT false,
    `volume` INTEGER NOT NULL DEFAULT 88,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `overlay_settings_streamerId_key`(`streamerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `public_page_settings` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `headline` VARCHAR(140) NOT NULL,
    `description` TEXT NOT NULL,
    `minimumAmount` DECIMAL(10, 2) NOT NULL,
    `maximumAmount` DECIMAL(10, 2) NOT NULL,
    `minAmountForTts` DECIMAL(10, 2) NOT NULL,
    `messageCharLimit` INTEGER NOT NULL DEFAULT 180,
    `allowVoiceMessages` BOOLEAN NOT NULL DEFAULT true,
    `allowLinks` BOOLEAN NOT NULL DEFAULT false,
    `blockedWords` JSON NOT NULL,
    `cooldownSeconds` INTEGER NOT NULL DEFAULT 12,
    `autoModeration` BOOLEAN NOT NULL DEFAULT true,
    `manualModeration` BOOLEAN NOT NULL DEFAULT false,
    `primaryColor` VARCHAR(32) NOT NULL DEFAULT '#7c3aed',
    `secondaryColor` VARCHAR(32) NOT NULL DEFAULT '#06b6d4',
    `accentColor` VARCHAR(32) NOT NULL DEFAULT '#f472b6',
    `backgroundPreset` VARCHAR(64) NOT NULL DEFAULT 'aurora-grid',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `public_page_settings_streamerId_key`(`streamerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `streamer_settings` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(16) NOT NULL DEFAULT 'pt-BR',
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
    `defaultVoice` VARCHAR(120) NOT NULL DEFAULT 'Neon Pulse',
    `voiceLanguage` VARCHAR(16) NOT NULL DEFAULT 'pt-BR',
    `voiceSpeed` DECIMAL(5, 2) NOT NULL,
    `voicePitch` DECIMAL(5, 2) NOT NULL,
    `voiceVolume` INTEGER NOT NULL DEFAULT 90,
    `minAmountForTts` DECIMAL(10, 2) NOT NULL,
    `maxMessageLength` INTEGER NOT NULL DEFAULT 180,
    `fallbackMessage` VARCHAR(255) NULL,
    `moderationLevel` ENUM('OFF', 'BASIC', 'STRICT') NOT NULL DEFAULT 'BASIC',
    `alertsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `overlayEnabled` BOOLEAN NOT NULL DEFAULT true,
    `notifyOnPayment` BOOLEAN NOT NULL DEFAULT true,
    `featureFlags` JSON NOT NULL,
    `onboardingCompletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `streamer_settings_streamerId_key`(`streamerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `superadmin_settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(120) NOT NULL,
    `value` JSON NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `superadmin_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `streamerId` VARCHAR(191) NULL,
    `entityType` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(120) NOT NULL,
    `metadata` JSON NULL,
    `ipAddress` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_actorUserId_idx`(`actorUserId`),
    INDEX `audit_logs_streamerId_createdAt_idx`(`streamerId`, `createdAt`),
    INDEX `audit_logs_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_events` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NULL,
    `paymentProviderId` VARCHAR(191) NULL,
    `chargeId` VARCHAR(191) NULL,
    `source` VARCHAR(120) NOT NULL,
    `eventType` VARCHAR(120) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `status` ENUM('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED') NOT NULL DEFAULT 'RECEIVED',
    `payload` JSON NOT NULL,
    `processedAt` DATETIME(3) NULL,
    `errorMessage` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `webhook_events_idempotencyKey_key`(`idempotencyKey`),
    INDEX `webhook_events_streamerId_createdAt_idx`(`streamerId`, `createdAt`),
    INDEX `webhook_events_paymentProviderId_status_idx`(`paymentProviderId`, `status`),
    INDEX `webhook_events_chargeId_idx`(`chargeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `number` VARCHAR(64) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'VOID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `amount` DECIMAL(10, 2) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_number_key`(`number`),
    INDEX `invoices_streamerId_status_idx`(`streamerId`, `status`),
    INDEX `invoices_dueDate_idx`(`dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usage_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `messagesCount` INTEGER NOT NULL DEFAULT 0,
    `ttsCount` INTEGER NOT NULL DEFAULT 0,
    `chargesCount` INTEGER NOT NULL DEFAULT 0,
    `grossAmount` DECIMAL(12, 2) NOT NULL,
    `netAmount` DECIMAL(12, 2) NOT NULL,
    `platformRevenue` DECIMAL(12, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `usage_metrics_streamerId_periodStart_idx`(`streamerId`, `periodStart`),
    UNIQUE INDEX `usage_metrics_streamerId_periodStart_periodEnd_key`(`streamerId`, `periodStart`, `periodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(80) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `message` VARCHAR(255) NOT NULL,
    `metadata` JSON NULL,
    `readAt` DATETIME(3) NULL,
    `readByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `notifications_streamerId_createdAt_idx`(`streamerId`, `createdAt`),
    INDEX `notifications_readAt_idx`(`readAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `keyHash` VARCHAR(255) NOT NULL,
    `scopes` JSON NOT NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `api_keys_streamerId_createdAt_idx`(`streamerId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_members` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` ENUM('MANAGER', 'MODERATOR', 'ANALYST') NOT NULL,
    `status` ENUM('INVITED', 'ACTIVE', 'DISABLED') NOT NULL DEFAULT 'INVITED',
    `invitedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acceptedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `team_members_streamerId_status_idx`(`streamerId`, `status`),
    INDEX `team_members_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_tokens_token_key`(`token`),
    INDEX `password_reset_tokens_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `refresh_tokens_tokenHash_key`(`tokenHash`),
    INDEX `refresh_tokens_userId_expiresAt_idx`(`userId`, `expiresAt`),
    INDEX `refresh_tokens_revokedAt_idx`(`revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `streamer_profiles` ADD CONSTRAINT `streamer_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pix_charges` ADD CONSTRAINT `pix_charges_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pix_charges` ADD CONSTRAINT `pix_charges_paymentProviderId_fkey` FOREIGN KEY (`paymentProviderId`) REFERENCES `payment_providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pix_transactions` ADD CONSTRAINT `pix_transactions_chargeId_fkey` FOREIGN KEY (`chargeId`) REFERENCES `pix_charges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pix_transactions` ADD CONSTRAINT `pix_transactions_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pix_transactions` ADD CONSTRAINT `pix_transactions_paymentProviderId_fkey` FOREIGN KEY (`paymentProviderId`) REFERENCES `payment_providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_chargeId_fkey` FOREIGN KEY (`chargeId`) REFERENCES `pix_charges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tts_jobs` ADD CONSTRAINT `tts_jobs_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tts_jobs` ADD CONSTRAINT `tts_jobs_alertId_fkey` FOREIGN KEY (`alertId`) REFERENCES `alerts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tts_jobs` ADD CONSTRAINT `tts_jobs_ttsProviderId_fkey` FOREIGN KEY (`ttsProviderId`) REFERENCES `tts_providers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `overlay_settings` ADD CONSTRAINT `overlay_settings_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `public_page_settings` ADD CONSTRAINT `public_page_settings_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `streamer_settings` ADD CONSTRAINT `streamer_settings_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhook_events` ADD CONSTRAINT `webhook_events_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhook_events` ADD CONSTRAINT `webhook_events_paymentProviderId_fkey` FOREIGN KEY (`paymentProviderId`) REFERENCES `payment_providers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhook_events` ADD CONSTRAINT `webhook_events_chargeId_fkey` FOREIGN KEY (`chargeId`) REFERENCES `pix_charges`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usage_metrics` ADD CONSTRAINT `usage_metrics_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_readByUserId_fkey` FOREIGN KEY (`readByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

