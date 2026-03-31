-- AlterTable
ALTER TABLE `NewsletterSubscriber` ADD COLUMN `profile` TEXT NULL;
ALTER TABLE `NewsletterSubscriber` ADD COLUMN `address` TEXT NULL;
ALTER TABLE `NewsletterSubscriber` ADD COLUMN `city` TEXT NULL;
ALTER TABLE `NewsletterSubscriber` ADD COLUMN `zip` VARCHAR(20) NULL;
ALTER TABLE `NewsletterSubscriber` ADD COLUMN `province` VARCHAR(10) NULL;
ALTER TABLE `NewsletterSubscriber` ADD COLUMN `country` TEXT NULL;
ALTER TABLE `NewsletterSubscriber` ADD COLUMN `website` TEXT NULL;
ALTER TABLE `NewsletterSubscriber` ADD COLUMN `notes` TEXT NULL;
ALTER TABLE `NewsletterSubscriber` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
