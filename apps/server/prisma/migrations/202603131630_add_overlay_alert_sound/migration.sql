ALTER TABLE `overlay_settings`
ADD COLUMN `alertSound` VARCHAR(32) NOT NULL DEFAULT 'CHIME' AFTER `themePreset`;
