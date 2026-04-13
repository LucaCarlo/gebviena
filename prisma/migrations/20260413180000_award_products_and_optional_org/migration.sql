-- AlterTable: organization becomes nullable
ALTER TABLE `Award` MODIFY `organization` TEXT NULL;

-- CreateTable
CREATE TABLE `AwardProduct` (
    `id` VARCHAR(191) NOT NULL,
    `awardId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `AwardProduct_awardId_productId_key`(`awardId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

-- AddForeignKey
ALTER TABLE `AwardProduct` ADD CONSTRAINT `AwardProduct_awardId_fkey` FOREIGN KEY (`awardId`) REFERENCES `Award`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AwardProduct` ADD CONSTRAINT `AwardProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
