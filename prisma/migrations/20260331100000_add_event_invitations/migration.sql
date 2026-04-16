-- CreateTable
CREATE TABLE `EventInvitation` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `landingPageId` VARCHAR(191) NOT NULL,
    `emailTemplateId` VARCHAR(191) NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EventInvitation_email_idx`(`email`),
    INDEX `EventInvitation_landingPageId_idx`(`landingPageId`),
    UNIQUE INDEX `EventInvitation_email_landingPageId_key`(`email`, `landingPageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EventInvitation` ADD CONSTRAINT `EventInvitation_landingPageId_fkey` FOREIGN KEY (`landingPageId`) REFERENCES `LandingPageConfig`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
