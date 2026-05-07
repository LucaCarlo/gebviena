-- AlterTable: testi della card di successo del form svendita (traducibili)
ALTER TABLE `LandingPageConfigTranslation`
  ADD COLUMN `successCardTitle` TEXT NULL,
  ADD COLUMN `successCardMessage` TEXT NULL;
