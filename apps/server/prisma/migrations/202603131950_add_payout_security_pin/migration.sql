ALTER TABLE `streamer_payout_accounts`
  ADD COLUMN `instantPayoutEnabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `withdrawalPinHash` VARCHAR(255) NULL,
  ADD COLUMN `withdrawalPinUpdatedAt` DATETIME(3) NULL;
