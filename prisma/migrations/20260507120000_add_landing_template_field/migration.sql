-- AlterTable: aggiungi colonna `template` per disaccoppiare la scelta del layout pubblico dal permalink
ALTER TABLE `LandingPageConfig` ADD COLUMN `template` VARCHAR(191) NOT NULL DEFAULT 'default';
