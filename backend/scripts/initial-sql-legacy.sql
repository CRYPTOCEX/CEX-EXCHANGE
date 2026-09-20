-- Tables the shipped schema carries that no model in backend/models/** creates.
--
-- Read verbatim by scripts/build-initial-sql.ts and merged into the generated
-- dump, so a fresh install and a long-lived upgraded install still have the same
-- set of tables. All three are dead: the live models are `faqs`, `staking_pools`
-- and binaryDuration was dropped outright. They stay because rows can still be
-- sitting in them on an upgraded install (see retire-staking-pool-legacy.mjs).
--
-- Retiring one for real means deleting its block here in the same change that
-- removes its last reader.

CREATE TABLE `binary_duration` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `duration` int(11) NOT NULL COMMENT 'Duration in minutes for binary option expiry',
  `profitPercentage` double NOT NULL COMMENT 'Profit percentage offered for this duration',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this duration is active and available for trading',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `binaryDuration_pkey` (`id`),
  KEY `binaryDuration_duration_idx` (`duration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `faq` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `faqCategoryId` varchar(191) NOT NULL,
  `question` longtext NOT NULL,
  `answer` longtext NOT NULL,
  `videoUrl` longtext DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `faqCategoryId` (`faqCategoryId`),
  CONSTRAINT `faq_ibfk_1` FOREIGN KEY (`faqCategoryId`) REFERENCES `faq_category` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `staking_pool` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `currency` varchar(191) NOT NULL,
  `chain` varchar(191) DEFAULT NULL,
  `type` enum('FIAT','SPOT','ECO') NOT NULL DEFAULT 'SPOT',
  `minStake` double NOT NULL,
  `maxStake` double NOT NULL,
  `status` enum('ACTIVE','INACTIVE','COMPLETED') NOT NULL DEFAULT 'ACTIVE',
  `icon` varchar(1000) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stakingPoolIdKey` (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
