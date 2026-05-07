-- AlterTable: aggiungi formFieldLabels JSON per tradurre le label dei campi del form
ALTER TABLE `LandingPageConfigTranslation` ADD COLUMN `formFieldLabels` TEXT NULL;
