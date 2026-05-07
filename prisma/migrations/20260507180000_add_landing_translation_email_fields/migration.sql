-- AlterTable: aggiungi campi email traducibili (subject/title/body) per la conferma di registrazione
ALTER TABLE `LandingPageConfigTranslation`
  ADD COLUMN `emailSubject` TEXT NULL,
  ADD COLUMN `emailTitle` TEXT NULL,
  ADD COLUMN `emailBody` TEXT NULL;
