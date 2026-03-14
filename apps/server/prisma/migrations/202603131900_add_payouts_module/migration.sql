-- CreateTable
CREATE TABLE `streamer_payout_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `legalName` VARCHAR(160) NULL,
    `document` VARCHAR(32) NULL,
    `pixKeyType` ENUM('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP') NULL,
    `pixKeyValue` VARCHAR(191) NULL,
    `payoutsEnabled` BOOLEAN NOT NULL DEFAULT false,
    `availableBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `pendingBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `lockedBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `totalPaidOut` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `streamer_payout_accounts_streamerId_key`(`streamerId`),
    INDEX `streamer_payout_accounts_payoutsEnabled_idx`(`payoutsEnabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payout_requests` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `payoutAccountId` VARCHAR(191) NOT NULL,
    `reviewedByUserId` VARCHAR(191) NULL,
    `providerCode` VARCHAR(64) NOT NULL DEFAULT 'MOCK_PAYOUT',
    `externalId` VARCHAR(191) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `feeAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `netAmount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('PENDING_APPROVAL', 'PROCESSING', 'PAID', 'REJECTED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'PENDING_APPROVAL',
    `failureReason` VARCHAR(255) NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payout_requests_externalId_key`(`externalId`),
    UNIQUE INDEX `payout_requests_idempotencyKey_key`(`idempotencyKey`),
    INDEX `payout_requests_streamerId_status_createdAt_idx`(`streamerId`, `status`, `createdAt`),
    INDEX `payout_requests_payoutAccountId_status_idx`(`payoutAccountId`, `status`),
    INDEX `payout_requests_requestedAt_idx`(`requestedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `balance_ledger_entries` (
    `id` VARCHAR(191) NOT NULL,
    `streamerId` VARCHAR(191) NOT NULL,
    `payoutAccountId` VARCHAR(191) NOT NULL,
    `chargeId` VARCHAR(191) NULL,
    `payoutRequestId` VARCHAR(191) NULL,
    `entryType` ENUM('PIX_CREDIT', 'PAYOUT_REQUEST', 'PAYOUT_COMPLETED', 'PAYOUT_REJECTED', 'MANUAL_ADJUSTMENT') NOT NULL,
    `direction` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `grossAmount` DECIMAL(12, 2) NULL,
    `feeAmount` DECIMAL(12, 2) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `balanceAfter` DECIMAL(12, 2) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `balance_ledger_entries_streamerId_createdAt_idx`(`streamerId`, `createdAt`),
    INDEX `balance_ledger_entries_payoutAccountId_createdAt_idx`(`payoutAccountId`, `createdAt`),
    INDEX `balance_ledger_entries_chargeId_idx`(`chargeId`),
    INDEX `balance_ledger_entries_payoutRequestId_idx`(`payoutRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `streamer_payout_accounts` ADD CONSTRAINT `streamer_payout_accounts_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payout_requests` ADD CONSTRAINT `payout_requests_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payout_requests` ADD CONSTRAINT `payout_requests_payoutAccountId_fkey` FOREIGN KEY (`payoutAccountId`) REFERENCES `streamer_payout_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payout_requests` ADD CONSTRAINT `payout_requests_reviewedByUserId_fkey` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `balance_ledger_entries` ADD CONSTRAINT `balance_ledger_entries_streamerId_fkey` FOREIGN KEY (`streamerId`) REFERENCES `streamer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `balance_ledger_entries` ADD CONSTRAINT `balance_ledger_entries_payoutAccountId_fkey` FOREIGN KEY (`payoutAccountId`) REFERENCES `streamer_payout_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `balance_ledger_entries` ADD CONSTRAINT `balance_ledger_entries_chargeId_fkey` FOREIGN KEY (`chargeId`) REFERENCES `pix_charges`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `balance_ledger_entries` ADD CONSTRAINT `balance_ledger_entries_payoutRequestId_fkey` FOREIGN KEY (`payoutRequestId`) REFERENCES `payout_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
