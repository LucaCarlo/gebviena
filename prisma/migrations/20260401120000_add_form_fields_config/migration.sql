-- AlterTable
ALTER TABLE `LandingPageConfig` ADD COLUMN `formFields` TEXT NULL;

-- AlterTable
ALTER TABLE `EventRegistration` ADD COLUMN `company` VARCHAR(191) NULL;
ALTER TABLE `EventRegistration` ADD COLUMN `phone` VARCHAR(191) NULL;
