-- CreateTable
CREATE TABLE `LandingPageConfigTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `landingPageId` VARCHAR(191) NOT NULL,
    `languageCode` VARCHAR(16) NOT NULL,
    `heroTitle` TEXT NULL,
    `heroSubtitle` TEXT NULL,
    `buttonLabel` TEXT NULL,
    `privacyLabel` TEXT NULL,
    `marketingLabel` TEXT NULL,
    `successTitle` TEXT NULL,
    `successMessage` TEXT NULL,
    `navLabelActive` TEXT NULL,
    `navLabelShowroom` TEXT NULL,
    `navLabelContatti` TEXT NULL,
    `eyebrow` TEXT NULL,
    `block1Title` TEXT NULL,
    `block1Lines` TEXT NULL,
    `block1HighlightPrefix` TEXT NULL,
    `block1HighlightStrong` TEXT NULL,
    `block1Period` TEXT NULL,
    `block2Title` TEXT NULL,
    `block2Lines` TEXT NULL,
    `block2HighlightPrefix` TEXT NULL,
    `block2HighlightStrong` TEXT NULL,
    `block2Period` TEXT NULL,
    `longDescription` TEXT NULL,
    `formCardTitle` TEXT NULL,
    `formCardSubtitle` TEXT NULL,
    `disclaimer` TEXT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LandingPageConfigTranslation_languageCode_idx`(`languageCode`),
    UNIQUE INDEX `LandingPageConfigTranslation_landingPageId_languageCode_key`(`landingPageId`, `languageCode`),
    PRIMARY KEY (`id`)
);

-- AddForeignKey
ALTER TABLE `LandingPageConfigTranslation` ADD CONSTRAINT `LandingPageConfigTranslation_landingPageId_fkey` FOREIGN KEY (`landingPageId`) REFERENCES `LandingPageConfig`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LandingPageConfigTranslation` ADD CONSTRAINT `LandingPageConfigTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;
