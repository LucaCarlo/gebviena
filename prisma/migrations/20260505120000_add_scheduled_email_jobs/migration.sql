-- CreateTable
CREATE TABLE `ScheduledEmailJob` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `landingPageId` VARCHAR(191) NULL,
    `subscriberIds` MEDIUMTEXT NOT NULL,
    `totalCount` INTEGER NOT NULL DEFAULT 0,
    `scheduledAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `sentCount` INTEGER NOT NULL DEFAULT 0,
    `failedCount` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ScheduledEmailJob_scheduledAt_idx`(`scheduledAt`),
    INDEX `ScheduledEmailJob_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ScheduledEmailJob` ADD CONSTRAINT `ScheduledEmailJob_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `EmailTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduledEmailJob` ADD CONSTRAINT `ScheduledEmailJob_landingPageId_fkey` FOREIGN KEY (`landingPageId`) REFERENCES `LandingPageConfig`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
