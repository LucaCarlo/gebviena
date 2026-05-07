-- AlterTable: emailTemplateId per lingua, scelto dall'admin nel pannello traduzioni
ALTER TABLE `LandingPageConfigTranslation` ADD COLUMN `emailTemplateId` VARCHAR(191) NULL;
