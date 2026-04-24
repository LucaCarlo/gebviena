-- CreateTable
CREATE TABLE `CustomerFavorite` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `storeProductId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CustomerFavorite_customerId_idx`(`customerId`),
    INDEX `CustomerFavorite_storeProductId_idx`(`storeProductId`),
    UNIQUE INDEX `CustomerFavorite_customerId_storeProductId_key`(`customerId`, `storeProductId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CustomerFavorite` ADD CONSTRAINT `CustomerFavorite_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerFavorite` ADD CONSTRAINT `CustomerFavorite_storeProductId_fkey` FOREIGN KEY (`storeProductId`) REFERENCES `StoreProduct`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
