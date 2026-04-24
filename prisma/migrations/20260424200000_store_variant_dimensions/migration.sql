-- AlterTable
ALTER TABLE `StoreProductVariant`
  ADD COLUMN `dimensionBlockId` VARCHAR(191) NULL,
  ADD COLUMN `dimensionValues` TEXT NULL;
