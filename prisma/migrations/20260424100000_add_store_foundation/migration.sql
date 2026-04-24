-- CreateTable
CREATE TABLE `Region` (
    `code` VARCHAR(8) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `Region_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Province` (
    `code` VARCHAR(8) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `regionCode` VARCHAR(8) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `Province_regionCode_idx`(`regionCode`),
    INDEX `Province_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `City` (
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `provinceCode` VARCHAR(8) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `City_provinceCode_idx`(`provinceCode`),
    UNIQUE INDEX `City_provinceCode_name_key`(`provinceCode`, `name`),
    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShippingTariff` (
    `id` VARCHAR(191) NOT NULL,
    `countryCode` VARCHAR(2) NOT NULL,
    `regionCode` VARCHAR(8) NULL,
    `provinceCode` VARCHAR(8) NULL,
    `cityCode` VARCHAR(191) NULL,
    `service` ENUM('CURBSIDE', 'FLOOR_1_3', 'FLOOR_4_10_MAX6') NOT NULL,
    `pricePerM3Cents` INTEGER NOT NULL,
    `minChargeCents` INTEGER NOT NULL DEFAULT 0,
    `maxVolumeM3` DECIMAL(7, 3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ShippingTariff_countryCode_regionCode_provinceCode_cityCode_idx`(`countryCode`, `regionCode`, `provinceCode`, `cityCode`),
    INDEX `ShippingTariff_service_idx`(`service`),
    INDEX `ShippingTariff_cityCode_idx`(`cityCode`),
    INDEX `ShippingTariff_provinceCode_idx`(`provinceCode`),
    INDEX `ShippingTariff_regionCode_idx`(`regionCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreAttributeValue` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('MATERIAL', 'FINISH', 'COLOR', 'OTHER') NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `hexColor` VARCHAR(9) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StoreAttributeValue_code_key`(`code`),
    INDEX `StoreAttributeValue_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreAttributeValueTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `valueId` VARCHAR(191) NOT NULL,
    `languageCode` VARCHAR(16) NOT NULL,
    `label` VARCHAR(128) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StoreAttributeValueTranslation_languageCode_idx`(`languageCode`),
    UNIQUE INDEX `StoreAttributeValueTranslation_valueId_languageCode_key`(`valueId`, `languageCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreCategory` (
    `id` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `coverImage` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StoreCategory_slug_key`(`slug`),
    INDEX `StoreCategory_parentId_idx`(`parentId`),
    INDEX `StoreCategory_isPublished_idx`(`isPublished`),
    INDEX `StoreCategory_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreCategoryTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `languageCode` VARCHAR(16) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `seoTitle` TEXT NULL,
    `seoDescription` TEXT NULL,
    `seoKeywords` TEXT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StoreCategoryTranslation_languageCode_idx`(`languageCode`),
    UNIQUE INDEX `StoreCategoryTranslation_categoryId_languageCode_key`(`categoryId`, `languageCode`),
    UNIQUE INDEX `StoreCategoryTranslation_languageCode_slug_key`(`languageCode`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreProduct` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `storeCategoryId` VARCHAR(191) NULL,
    `coverImage` TEXT NULL,
    `galleryImages` TEXT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StoreProduct_productId_key`(`productId`),
    INDEX `StoreProduct_storeCategoryId_idx`(`storeCategoryId`),
    INDEX `StoreProduct_isPublished_idx`(`isPublished`),
    INDEX `StoreProduct_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreProductTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `storeProductId` VARCHAR(191) NOT NULL,
    `languageCode` VARCHAR(16) NOT NULL,
    `name` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `shortDescription` TEXT NULL,
    `marketingDescription` TEXT NULL,
    `seoTitle` TEXT NULL,
    `seoDescription` TEXT NULL,
    `seoKeywords` TEXT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StoreProductTranslation_languageCode_idx`(`languageCode`),
    UNIQUE INDEX `StoreProductTranslation_storeProductId_languageCode_key`(`storeProductId`, `languageCode`),
    UNIQUE INDEX `StoreProductTranslation_languageCode_slug_key`(`languageCode`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreProductVariant` (
    `id` VARCHAR(191) NOT NULL,
    `storeProductId` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(64) NOT NULL,
    `priceCents` INTEGER NOT NULL,
    `stockQty` INTEGER NULL,
    `trackStock` BOOLEAN NOT NULL DEFAULT false,
    `volumeM3` DECIMAL(7, 3) NOT NULL DEFAULT 0,
    `weightKg` DECIMAL(8, 2) NULL,
    `shippingClass` ENUM('STANDARD', 'FRAGILE', 'OVERSIZED', 'QUOTE_ONLY') NOT NULL DEFAULT 'STANDARD',
    `coverImage` TEXT NULL,
    `galleryImages` TEXT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StoreProductVariant_sku_key`(`sku`),
    INDEX `StoreProductVariant_storeProductId_idx`(`storeProductId`),
    INDEX `StoreProductVariant_isPublished_idx`(`isPublished`),
    INDEX `StoreProductVariant_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreProductVariantTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `languageCode` VARCHAR(16) NOT NULL,
    `name` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StoreProductVariantTranslation_languageCode_idx`(`languageCode`),
    UNIQUE INDEX `StoreProductVariantTranslation_variantId_languageCode_key`(`variantId`, `languageCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreProductVariantAttribute` (
    `variantId` VARCHAR(191) NOT NULL,
    `valueId` VARCHAR(191) NOT NULL,

    INDEX `StoreProductVariantAttribute_valueId_idx`(`valueId`),
    PRIMARY KEY (`variantId`, `valueId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` TEXT NULL,
    `firstName` VARCHAR(128) NULL,
    `lastName` VARCHAR(128) NULL,
    `phone` VARCHAR(32) NULL,
    `taxCode` VARCHAR(32) NULL,
    `vatNumber` VARCHAR(32) NULL,
    `sdiCode` VARCHAR(16) NULL,
    `sdiPec` VARCHAR(191) NULL,
    `language` VARCHAR(16) NOT NULL DEFAULT 'it',
    `marketingOptIn` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,

    UNIQUE INDEX `Customer_email_key`(`email`),
    INDEX `Customer_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Address` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `type` ENUM('SHIPPING', 'BILLING') NOT NULL,
    `firstName` VARCHAR(128) NOT NULL,
    `lastName` VARCHAR(128) NOT NULL,
    `company` VARCHAR(191) NULL,
    `street1` VARCHAR(191) NOT NULL,
    `street2` VARCHAR(191) NULL,
    `city` VARCHAR(128) NOT NULL,
    `zip` VARCHAR(16) NOT NULL,
    `provinceCode` VARCHAR(8) NULL,
    `regionCode` VARCHAR(8) NULL,
    `countryCode` VARCHAR(2) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Address_customerId_idx`(`customerId`),
    INDEX `Address_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(32) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING',
    `email` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(128) NOT NULL,
    `lastName` VARCHAR(128) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `language` VARCHAR(16) NOT NULL DEFAULT 'it',
    `shippingAddress` TEXT NOT NULL,
    `billingAddress` TEXT NOT NULL,
    `subtotalCents` INTEGER NOT NULL,
    `shippingCents` INTEGER NOT NULL DEFAULT 0,
    `taxCents` INTEGER NOT NULL DEFAULT 0,
    `totalCents` INTEGER NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'EUR',
    `taxRateBp` INTEGER NOT NULL DEFAULT 2200,
    `shippingService` ENUM('CURBSIDE', 'FLOOR_1_3', 'FLOOR_4_10_MAX6') NULL,
    `shippingZoneLabel` VARCHAR(191) NULL,
    `trackingNumber` VARCHAR(128) NULL,
    `trackingCarrier` VARCHAR(64) NULL,
    `trackingUrl` TEXT NULL,
    `shippedAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `paymentProvider` VARCHAR(32) NULL,
    `stripeSessionId` VARCHAR(191) NULL,
    `stripePaymentIntentId` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `refundedAt` DATETIME(3) NULL,
    `refundAmountCents` INTEGER NULL,
    `refundReason` TEXT NULL,
    `stripeRefundId` VARCHAR(191) NULL,
    `customerNotes` TEXT NULL,
    `adminNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_orderNumber_key`(`orderNumber`),
    UNIQUE INDEX `Order_stripeSessionId_key`(`stripeSessionId`),
    UNIQUE INDEX `Order_stripePaymentIntentId_key`(`stripePaymentIntentId`),
    INDEX `Order_customerId_idx`(`customerId`),
    INDEX `Order_status_idx`(`status`),
    INDEX `Order_createdAt_idx`(`createdAt`),
    INDEX `Order_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NULL,
    `productName` VARCHAR(191) NOT NULL,
    `variantName` VARCHAR(191) NULL,
    `sku` VARCHAR(64) NOT NULL,
    `unitPriceCents` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `volumeM3` DECIMAL(7, 3) NOT NULL,
    `weightKg` DECIMAL(8, 2) NULL,
    `totalCents` INTEGER NOT NULL,
    `attributesSnapshot` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderItem_orderId_idx`(`orderId`),
    INDEX `OrderItem_variantId_idx`(`variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Province` ADD CONSTRAINT `Province_regionCode_fkey` FOREIGN KEY (`regionCode`) REFERENCES `Region`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `City` ADD CONSTRAINT `City_provinceCode_fkey` FOREIGN KEY (`provinceCode`) REFERENCES `Province`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShippingTariff` ADD CONSTRAINT `ShippingTariff_regionCode_fkey` FOREIGN KEY (`regionCode`) REFERENCES `Region`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShippingTariff` ADD CONSTRAINT `ShippingTariff_provinceCode_fkey` FOREIGN KEY (`provinceCode`) REFERENCES `Province`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShippingTariff` ADD CONSTRAINT `ShippingTariff_cityCode_fkey` FOREIGN KEY (`cityCode`) REFERENCES `City`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreAttributeValueTranslation` ADD CONSTRAINT `StoreAttributeValueTranslation_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `StoreAttributeValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreAttributeValueTranslation` ADD CONSTRAINT `StoreAttributeValueTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreCategory` ADD CONSTRAINT `StoreCategory_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `StoreCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreCategoryTranslation` ADD CONSTRAINT `StoreCategoryTranslation_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `StoreCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreCategoryTranslation` ADD CONSTRAINT `StoreCategoryTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreProduct` ADD CONSTRAINT `StoreProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreProduct` ADD CONSTRAINT `StoreProduct_storeCategoryId_fkey` FOREIGN KEY (`storeCategoryId`) REFERENCES `StoreCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreProductTranslation` ADD CONSTRAINT `StoreProductTranslation_storeProductId_fkey` FOREIGN KEY (`storeProductId`) REFERENCES `StoreProduct`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreProductTranslation` ADD CONSTRAINT `StoreProductTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreProductVariant` ADD CONSTRAINT `StoreProductVariant_storeProductId_fkey` FOREIGN KEY (`storeProductId`) REFERENCES `StoreProduct`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreProductVariantTranslation` ADD CONSTRAINT `StoreProductVariantTranslation_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `StoreProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreProductVariantTranslation` ADD CONSTRAINT `StoreProductVariantTranslation_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `Language`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreProductVariantAttribute` ADD CONSTRAINT `StoreProductVariantAttribute_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `StoreProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreProductVariantAttribute` ADD CONSTRAINT `StoreProductVariantAttribute_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `StoreAttributeValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Address` ADD CONSTRAINT `Address_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `StoreProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

