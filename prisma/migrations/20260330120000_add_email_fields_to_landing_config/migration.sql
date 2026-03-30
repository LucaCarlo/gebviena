-- AlterTable
ALTER TABLE `LandingPageConfig` ADD COLUMN `emailSubject` TEXT NULL;
ALTER TABLE `LandingPageConfig` ADD COLUMN `emailTitle` TEXT NULL;
ALTER TABLE `LandingPageConfig` ADD COLUMN `emailBody` TEXT NULL;
ALTER TABLE `LandingPageConfig` ADD COLUMN `emailFooter` TEXT NULL;

-- Set defaults for existing row
UPDATE `LandingPageConfig` SET
  `emailSubject` = 'Your Event Registration - QR Code',
  `emailTitle` = 'Registration Confirmed',
  `emailBody` = 'Thank you for registering. Please find below your personal QR code to show at the entrance.\nThe QR code is personal and can''t be shared.',
  `emailFooter` = 'Gebrüder Thonet Vienna GmbH\nVia Foggia 23/H – 10152 Torino (Italy)'
WHERE `slug` = 'default';
