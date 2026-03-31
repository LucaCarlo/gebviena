-- AlterTable
ALTER TABLE `AdminUser` ADD COLUMN `scanLandingPageId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `AdminUser_scanLandingPageId_idx` ON `AdminUser`(`scanLandingPageId`);

-- AddForeignKey
ALTER TABLE `AdminUser` ADD CONSTRAINT `AdminUser_scanLandingPageId_fkey` FOREIGN KEY (`scanLandingPageId`) REFERENCES `LandingPageConfig`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
