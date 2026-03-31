-- CreateTable
CREATE TABLE `EventInvitation` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `landingPageId` VARCHAR(191) NULL,
    `token` VARCHAR(191) NOT NULL,
    `campaign` TEXT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `openedAt` DATETIME(3) NULL,
    `clickedAt` DATETIME(3) NULL,
    `registeredAt` DATETIME(3) NULL,
    `registrationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EventInvitation_token_key`(`token`),
    UNIQUE INDEX `EventInvitation_registrationId_key`(`registrationId`),
    INDEX `EventInvitation_email_idx`(`email`),
    INDEX `EventInvitation_landingPageId_idx`(`landingPageId`),
    INDEX `EventInvitation_token_idx`(`token`),
    INDEX `EventInvitation_sentAt_idx`(`sentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable EventRegistration: add source field
ALTER TABLE `EventRegistration` ADD COLUMN `source` VARCHAR(20) NULL;

-- AddForeignKey
ALTER TABLE `EventInvitation` ADD CONSTRAINT `EventInvitation_landingPageId_fkey` FOREIGN KEY (`landingPageId`) REFERENCES `LandingPageConfig`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `EventInvitation` ADD CONSTRAINT `EventInvitation_registrationId_fkey` FOREIGN KEY (`registrationId`) REFERENCES `EventRegistration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
