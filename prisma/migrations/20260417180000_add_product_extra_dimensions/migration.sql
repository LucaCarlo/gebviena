-- CreateTable
CREATE TABLE `ProductDimension` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` TEXT NULL,
    `blockId` TEXT NULL,
    `values` TEXT NULL,
    `freeText` TEXT NULL,
    `image` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `ProductDimension_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

-- AddForeignKey
ALTER TABLE `ProductDimension` ADD CONSTRAINT `ProductDimension_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
