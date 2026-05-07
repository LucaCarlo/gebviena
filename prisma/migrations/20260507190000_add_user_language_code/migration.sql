-- AlterTable: lingua del visitatore al momento dell'iscrizione (per filtri admin per nazione)
ALTER TABLE `NewsletterSubscriber` ADD COLUMN `languageCode` VARCHAR(16) NULL;
ALTER TABLE `EventRegistration` ADD COLUMN `languageCode` VARCHAR(16) NULL;
