CREATE TABLE `ContentCategoryTranslation` (
  `id` VARCHAR(191) NOT NULL,
  `categoryId` VARCHAR(191) NOT NULL,
  `languageCode` VARCHAR(16) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ContentCategoryTranslation_categoryId_languageCode_key`(`categoryId`, `languageCode`),
  INDEX `ContentCategoryTranslation_languageCode_idx`(`languageCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

ALTER TABLE `ContentCategoryTranslation` ADD CONSTRAINT `ContentCategoryTranslation_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ContentCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ContentCategoryTranslation` ADD CONSTRAINT `ContentCategoryTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `ContentTypologyTranslation` (
  `id` VARCHAR(191) NOT NULL,
  `typologyId` VARCHAR(191) NOT NULL,
  `languageCode` VARCHAR(16) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ContentTypologyTranslation_typologyId_languageCode_key`(`typologyId`, `languageCode`),
  INDEX `ContentTypologyTranslation_languageCode_idx`(`languageCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

ALTER TABLE `ContentTypologyTranslation` ADD CONSTRAINT `ContentTypologyTranslation_typologyId_fkey` FOREIGN KEY (`typologyId`) REFERENCES `ContentTypology`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ContentTypologyTranslation` ADD CONSTRAINT `ContentTypologyTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `ContentSubcategoryTranslation` (
  `id` VARCHAR(191) NOT NULL,
  `subcategoryId` VARCHAR(191) NOT NULL,
  `languageCode` VARCHAR(16) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ContentSubcategoryTranslation_subcategoryId_languageCode_key`(`subcategoryId`, `languageCode`),
  INDEX `ContentSubcategoryTranslation_languageCode_idx`(`languageCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

ALTER TABLE `ContentSubcategoryTranslation` ADD CONSTRAINT `ContentSubcategoryTranslation_subcategoryId_fkey` FOREIGN KEY (`subcategoryId`) REFERENCES `ContentSubcategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ContentSubcategoryTranslation` ADD CONSTRAINT `ContentSubcategoryTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed IT translations from existing labels
INSERT IGNORE INTO `ContentCategoryTranslation` (id, categoryId, languageCode, label, status, isPublished, createdAt, updatedAt)
SELECT CONCAT('cct_', id), id, 'it', label, 'translated', 1, NOW(3), NOW(3) FROM `ContentCategory`;

INSERT IGNORE INTO `ContentTypologyTranslation` (id, typologyId, languageCode, label, status, isPublished, createdAt, updatedAt)
SELECT CONCAT('ctt_', id), id, 'it', label, 'translated', 1, NOW(3), NOW(3) FROM `ContentTypology`;

INSERT IGNORE INTO `ContentSubcategoryTranslation` (id, subcategoryId, languageCode, label, status, isPublished, createdAt, updatedAt)
SELECT CONCAT('cst_', id), id, 'it', label, 'translated', 1, NOW(3), NOW(3) FROM `ContentSubcategory`;
