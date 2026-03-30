-- CreateTable
CREATE TABLE `LandingPageConfig` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL DEFAULT 'default',
    `bannerImage` TEXT NULL,
    `logoImage` TEXT NULL,
    `heroTitle` TEXT NOT NULL,
    `heroSubtitle` TEXT NULL,
    `heroLocation` TEXT NULL,
    `heroDescription` TEXT NULL,
    `successTitle` TEXT NOT NULL,
    `successMessage` TEXT NULL,
    `privacyLabel` TEXT NOT NULL,
    `marketingLabel` TEXT NULL,
    `buttonLabel` VARCHAR(191) NOT NULL DEFAULT 'Register',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LandingPageConfig_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventRegistration` (
    `id` VARCHAR(191) NOT NULL,
    `uuid` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `profile` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `zipCode` VARCHAR(191) NOT NULL,
    `privacyAccepted` BOOLEAN NOT NULL DEFAULT false,
    `marketingConsent` BOOLEAN NOT NULL DEFAULT false,
    `qrCode` VARCHAR(191) NOT NULL,
    `checkedIn` BOOLEAN NOT NULL DEFAULT false,
    `checkedInAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EventRegistration_uuid_key`(`uuid`),
    UNIQUE INDEX `EventRegistration_qrCode_key`(`qrCode`),
    INDEX `EventRegistration_email_idx`(`email`),
    INDEX `EventRegistration_qrCode_idx`(`qrCode`),
    INDEX `EventRegistration_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default landing page config
INSERT INTO `LandingPageConfig` (`id`, `slug`, `heroTitle`, `heroSubtitle`, `heroLocation`, `heroDescription`, `successTitle`, `privacyLabel`, `marketingLabel`, `buttonLabel`, `isActive`, `updatedAt`)
VALUES (
    'clp_default',
    'default',
    'Milan Design Week 2026',
    'Come and experience the True Over Time Collection with us.',
    'Milan Flagship Store\nPalazzo Gallarati Scotti\nVia Manzoni 30',
    'Register to receive your QR code to show at entrance.\nThe QR code is personal and can''t be shared.',
    'Thank you. Your QR code has been generated.',
    'I have read and understood the Privacy Policy on processing of my personal data and I confirm that I am over 18.',
    'I agree to receive communications and updates about GTV products and events.',
    'Register',
    true,
    NOW()
);
