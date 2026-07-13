-- Aggiunge campo opzionale mobileImageUrl a HeroSlide per gestire versione mobile dell'immagine hero.
ALTER TABLE `HeroSlide` ADD COLUMN `mobileImageUrl` TEXT NULL;
