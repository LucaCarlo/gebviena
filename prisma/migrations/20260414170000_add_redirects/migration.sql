CREATE TABLE `Redirect` (
  `id` VARCHAR(191) NOT NULL,
  `fromPath` VARCHAR(500) NOT NULL,
  `toPath` VARCHAR(500) NOT NULL,
  `statusCode` INTEGER NOT NULL DEFAULT 301,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `hits` INTEGER NOT NULL DEFAULT 0,
  `lastHitAt` DATETIME(3) NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Redirect_fromPath_key`(`fromPath`),
  INDEX `Redirect_enabled_idx`(`enabled`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;
