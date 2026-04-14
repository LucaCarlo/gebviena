-- Copia contenuti italiani esistenti come traduzione 'it' nelle tabelle *Translation.
-- Idempotente: usa INSERT IGNORE.

INSERT IGNORE INTO `ProductTranslation`
  (id, productId, languageCode, name, slug, description, materials, dimensions, variants,
   seoTitle, seoDescription, seoKeywords, status, isPublished, createdAt, updatedAt)
SELECT
  CONCAT('pt_', id), id, 'it', name, slug, description, materials, dimensions, variants,
  seoTitle, seoDescription, seoKeywords, 'translated', 1, NOW(3), NOW(3)
FROM `Product`;

INSERT IGNORE INTO `DesignerTranslation`
  (id, designerId, languageCode, name, slug, bio, country,
   seoTitle, seoDescription, seoKeywords, status, isPublished, createdAt, updatedAt)
SELECT
  CONCAT('dt_', id), id, 'it', name, slug, bio, country,
  seoTitle, seoDescription, seoKeywords, 'translated', 1, NOW(3), NOW(3)
FROM `Designer`;

INSERT IGNORE INTO `ProjectTranslation`
  (id, projectId, languageCode, name, slug, city, architect, description, shortDescription,
   seoTitle, seoDescription, seoKeywords, status, isPublished, createdAt, updatedAt)
SELECT
  CONCAT('prt_', id), id, 'it', name, slug, city, architect, description, shortDescription,
  seoTitle, seoDescription, seoKeywords, 'translated', 1, NOW(3), NOW(3)
FROM `Project`;

INSERT IGNORE INTO `CampaignTranslation`
  (id, campaignId, languageCode, name, slug, subtitle, description,
   seoTitle, seoDescription, seoKeywords, status, isPublished, createdAt, updatedAt)
SELECT
  CONCAT('ct_', id), id, 'it', name, slug, subtitle, description,
  seoTitle, seoDescription, seoKeywords, 'translated', 1, NOW(3), NOW(3)
FROM `Campaign`;

INSERT IGNORE INTO `NewsArticleTranslation`
  (id, newsArticleId, languageCode, title, slug, subtitle, excerpt, content, blocks,
   seoTitle, seoDescription, seoKeywords, status, isPublished, createdAt, updatedAt)
SELECT
  CONCAT('nt_', id), id, 'it', title, slug, subtitle, excerpt, content, blocks,
  seoTitle, seoDescription, seoKeywords, 'translated', 1, NOW(3), NOW(3)
FROM `NewsArticle`;

INSERT IGNORE INTO `CatalogTranslation`
  (id, catalogId, languageCode, name, slug, pretitle, title, description, linkText,
   status, isPublished, createdAt, updatedAt)
SELECT
  CONCAT('cat_', id), id, 'it', name, slug, pretitle, title, description, linkText,
  'translated', 1, NOW(3), NOW(3)
FROM `Catalog`;

INSERT IGNORE INTO `HeroSlideTranslation`
  (id, heroSlideId, languageCode, title, subtitle, ctaText, ctaLink,
   status, isPublished, createdAt, updatedAt)
SELECT
  CONCAT('ht_', id), id, 'it', title, subtitle, ctaText, ctaLink,
  'translated', 1, NOW(3), NOW(3)
FROM `HeroSlide`;

INSERT IGNORE INTO `AwardTranslation`
  (id, awardId, languageCode, name, description,
   seoTitle, seoDescription, seoKeywords, status, isPublished, createdAt, updatedAt)
SELECT
  CONCAT('at_', id), id, 'it', name, description,
  seoTitle, seoDescription, seoKeywords, 'translated', 1, NOW(3), NOW(3)
FROM `Award`;
