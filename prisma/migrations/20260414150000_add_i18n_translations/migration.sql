-- Add urlPrefix to Language
ALTER TABLE `Language` ADD COLUMN `urlPrefix` VARCHAR(16) NULL;
CREATE UNIQUE INDEX `Language_urlPrefix_key` ON `Language`(`urlPrefix`);

-- ProductTranslation
CREATE TABLE `ProductTranslation` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `languageCode` VARCHAR(16) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `materials` TEXT NULL,
  `dimensions` TEXT NULL,
  `variants` TEXT NULL,
  `seoTitle` TEXT NULL,
  `seoDescription` TEXT NULL,
  `seoKeywords` TEXT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ProductTranslation_productId_languageCode_key`(`productId`, `languageCode`),
  UNIQUE INDEX `ProductTranslation_languageCode_slug_key`(`languageCode`, `slug`),
  INDEX `ProductTranslation_languageCode_idx`(`languageCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

ALTER TABLE `ProductTranslation` ADD CONSTRAINT `ProductTranslation_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProductTranslation` ADD CONSTRAINT `ProductTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- DesignerTranslation
CREATE TABLE `DesignerTranslation` (
  `id` VARCHAR(191) NOT NULL,
  `designerId` VARCHAR(191) NOT NULL,
  `languageCode` VARCHAR(16) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `bio` TEXT NULL,
  `country` TEXT NULL,
  `seoTitle` TEXT NULL,
  `seoDescription` TEXT NULL,
  `seoKeywords` TEXT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `DesignerTranslation_designerId_languageCode_key`(`designerId`, `languageCode`),
  UNIQUE INDEX `DesignerTranslation_languageCode_slug_key`(`languageCode`, `slug`),
  INDEX `DesignerTranslation_languageCode_idx`(`languageCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

ALTER TABLE `DesignerTranslation` ADD CONSTRAINT `DesignerTranslation_designerId_fkey` FOREIGN KEY (`designerId`) REFERENCES `Designer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `DesignerTranslation` ADD CONSTRAINT `DesignerTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ProjectTranslation
CREATE TABLE `ProjectTranslation` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `languageCode` VARCHAR(16) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `city` TEXT NULL,
  `architect` TEXT NULL,
  `description` TEXT NULL,
  `shortDescription` TEXT NULL,
  `seoTitle` TEXT NULL,
  `seoDescription` TEXT NULL,
  `seoKeywords` TEXT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ProjectTranslation_projectId_languageCode_key`(`projectId`, `languageCode`),
  UNIQUE INDEX `ProjectTranslation_languageCode_slug_key`(`languageCode`, `slug`),
  INDEX `ProjectTranslation_languageCode_idx`(`languageCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

ALTER TABLE `ProjectTranslation` ADD CONSTRAINT `ProjectTranslation_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProjectTranslation` ADD CONSTRAINT `ProjectTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CampaignTranslation
CREATE TABLE `CampaignTranslation` (
  `id` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NOT NULL,
  `languageCode` VARCHAR(16) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `subtitle` TEXT NULL,
  `description` TEXT NULL,
  `seoTitle` TEXT NULL,
  `seoDescription` TEXT NULL,
  `seoKeywords` TEXT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `CampaignTranslation_campaignId_languageCode_key`(`campaignId`, `languageCode`),
  UNIQUE INDEX `CampaignTranslation_languageCode_slug_key`(`languageCode`, `slug`),
  INDEX `CampaignTranslation_languageCode_idx`(`languageCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

ALTER TABLE `CampaignTranslation` ADD CONSTRAINT `CampaignTranslation_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CampaignTranslation` ADD CONSTRAINT `CampaignTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- NewsArticleTranslation
CREATE TABLE `NewsArticleTranslation` (
  `id` VARCHAR(191) NOT NULL,
  `newsArticleId` VARCHAR(191) NOT NULL,
  `languageCode` VARCHAR(16) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `subtitle` TEXT NULL,
  `excerpt` TEXT NULL,
  `content` TEXT NULL,
  `blocks` TEXT NULL,
  `seoTitle` TEXT NULL,
  `seoDescription` TEXT NULL,
  `seoKeywords` TEXT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `NewsArticleTranslation_newsArticleId_languageCode_key`(`newsArticleId`, `languageCode`),
  UNIQUE INDEX `NewsArticleTranslation_languageCode_slug_key`(`languageCode`, `slug`),
  INDEX `NewsArticleTranslation_languageCode_idx`(`languageCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

ALTER TABLE `NewsArticleTranslation` ADD CONSTRAINT `NewsArticleTranslation_newsArticleId_fkey` FOREIGN KEY (`newsArticleId`) REFERENCES `NewsArticle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `NewsArticleTranslation` ADD CONSTRAINT `NewsArticleTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CatalogTranslation
CREATE TABLE `CatalogTranslation` (
  `id` VARCHAR(191) NOT NULL,
  `catalogId` VARCHAR(191) NOT NULL,
  `languageCode` VARCHAR(16) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `pretitle` TEXT NULL,
  `title` TEXT NULL,
  `description` TEXT NULL,
  `linkText` TEXT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `CatalogTranslation_catalogId_languageCode_key`(`catalogId`, `languageCode`),
  UNIQUE INDEX `CatalogTranslation_languageCode_slug_key`(`languageCode`, `slug`),
  INDEX `CatalogTranslation_languageCode_idx`(`languageCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

ALTER TABLE `CatalogTranslation` ADD CONSTRAINT `CatalogTranslation_catalogId_fkey` FOREIGN KEY (`catalogId`) REFERENCES `Catalog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CatalogTranslation` ADD CONSTRAINT `CatalogTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- HeroSlideTranslation
CREATE TABLE `HeroSlideTranslation` (
  `id` VARCHAR(191) NOT NULL,
  `heroSlideId` VARCHAR(191) NOT NULL,
  `languageCode` VARCHAR(16) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `subtitle` TEXT NULL,
  `ctaText` TEXT NULL,
  `ctaLink` TEXT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `HeroSlideTranslation_heroSlideId_languageCode_key`(`heroSlideId`, `languageCode`),
  INDEX `HeroSlideTranslation_languageCode_idx`(`languageCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

ALTER TABLE `HeroSlideTranslation` ADD CONSTRAINT `HeroSlideTranslation_heroSlideId_fkey` FOREIGN KEY (`heroSlideId`) REFERENCES `HeroSlide`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `HeroSlideTranslation` ADD CONSTRAINT `HeroSlideTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AwardTranslation
CREATE TABLE `AwardTranslation` (
  `id` VARCHAR(191) NOT NULL,
  `awardId` VARCHAR(191) NOT NULL,
  `languageCode` VARCHAR(16) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `seoTitle` TEXT NULL,
  `seoDescription` TEXT NULL,
  `seoKeywords` TEXT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `AwardTranslation_awardId_languageCode_key`(`awardId`, `languageCode`),
  INDEX `AwardTranslation_languageCode_idx`(`languageCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

ALTER TABLE `AwardTranslation` ADD CONSTRAINT `AwardTranslation_awardId_fkey` FOREIGN KEY (`awardId`) REFERENCES `Award`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AwardTranslation` ADD CONSTRAINT `AwardTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- UiTranslationOverride
CREATE TABLE `UiTranslationOverride` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `languageCode` VARCHAR(16) NOT NULL,
  `value` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `UiTranslationOverride_key_languageCode_key`(`key`, `languageCode`),
  INDEX `UiTranslationOverride_languageCode_idx`(`languageCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

ALTER TABLE `UiTranslationOverride` ADD CONSTRAINT `UiTranslationOverride_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;
