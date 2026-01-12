
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `admin_profit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_profit` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `transactionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` enum('DEPOSIT','WITHDRAW','TRANSFER','BINARY_ORDER','EXCHANGE_ORDER','INVESTMENT','AI_INVESTMENT','FOREX_DEPOSIT','FOREX_WITHDRAW','FOREX_INVESTMENT','ICO_CONTRIBUTION','STAKING','P2P_TRADE','NFT_SALE','NFT_AUCTION','NFT_OFFER','GATEWAY_PAYMENT') NOT NULL COMMENT 'Type of transaction that generated the admin profit',
  `amount` double NOT NULL COMMENT 'Profit amount earned by admin from this transaction',
  `currency` varchar(255) NOT NULL COMMENT 'Currency of the profit amount',
  `chain` varchar(255) DEFAULT NULL COMMENT 'Blockchain network if applicable',
  `description` text DEFAULT NULL COMMENT 'Additional description of the profit source',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `adminProfitTransactionIdForeign` (`transactionId`) USING BTREE,
  CONSTRAINT `admin_profit_ibfk_1` FOREIGN KEY (`transactionId`) REFERENCES `transaction` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_bot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_bot` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `marketMakerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(100) NOT NULL,
  `personality` enum('SCALPER','SWING','ACCUMULATOR','DISTRIBUTOR','MARKET_MAKER') NOT NULL DEFAULT 'SCALPER',
  `riskTolerance` decimal(3,2) NOT NULL DEFAULT 0.50,
  `tradeFrequency` enum('HIGH','MEDIUM','LOW') NOT NULL DEFAULT 'MEDIUM',
  `avgOrderSize` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `orderSizeVariance` decimal(3,2) NOT NULL DEFAULT 0.20,
  `preferredSpread` decimal(5,4) NOT NULL DEFAULT 0.0010,
  `status` enum('ACTIVE','PAUSED','COOLDOWN') NOT NULL DEFAULT 'PAUSED',
  `lastTradeAt` datetime DEFAULT NULL,
  `dailyTradeCount` int(11) NOT NULL DEFAULT 0,
  `maxDailyTrades` int(11) NOT NULL DEFAULT 100,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `realTradesExecuted` int(11) NOT NULL DEFAULT 0,
  `profitableTrades` int(11) NOT NULL DEFAULT 0,
  `totalRealizedPnL` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `totalVolume` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `currentPosition` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `avgEntryPrice` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  PRIMARY KEY (`id`),
  KEY `aiBotMarketMakerIdIdx` (`marketMakerId`) USING BTREE,
  KEY `aiBotStatusIdx` (`status`) USING BTREE,
  KEY `aiBotPersonalityIdx` (`personality`) USING BTREE,
  KEY `aiBotMarketMakerStatusIdx` (`marketMakerId`,`status`) USING BTREE,
  KEY `aiBotPnLIdx` (`totalRealizedPnL`) USING BTREE,
  CONSTRAINT `ai_bot_ibfk_1` FOREIGN KEY (`marketMakerId`) REFERENCES `ai_market_maker` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_investment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_investment` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `planId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `durationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` double NOT NULL,
  `profit` double DEFAULT NULL,
  `result` enum('WIN','LOSS','DRAW') DEFAULT NULL,
  `status` enum('ACTIVE','COMPLETED','CANCELLED','REJECTED') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `symbol` varchar(191) NOT NULL,
  `type` enum('SPOT','ECO') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `aiInvestmentIdKey` (`id`) USING BTREE,
  KEY `aiInvestmentUserIdForeign` (`userId`) USING BTREE,
  KEY `aiInvestmentPlanIdForeign` (`planId`) USING BTREE,
  KEY `aiInvestmentDurationIdForeign` (`durationId`) USING BTREE,
  CONSTRAINT `ai_investment_ibfk_43169` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ai_investment_ibfk_43170` FOREIGN KEY (`planId`) REFERENCES `ai_investment_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ai_investment_ibfk_43171` FOREIGN KEY (`durationId`) REFERENCES `ai_investment_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ai_investment_ibfk_49840` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ai_investment_ibfk_49841` FOREIGN KEY (`planId`) REFERENCES `ai_investment_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ai_investment_ibfk_49842` FOREIGN KEY (`durationId`) REFERENCES `ai_investment_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_investment_duration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_investment_duration` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `duration` int(11) NOT NULL,
  `timeframe` enum('HOUR','DAY','WEEK','MONTH') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_investment_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_investment_plan` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(1000) DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `invested` int(11) NOT NULL DEFAULT 0,
  `profitPercentage` double NOT NULL DEFAULT 0,
  `minProfit` double NOT NULL,
  `maxProfit` double NOT NULL,
  `minAmount` double NOT NULL DEFAULT 0,
  `maxAmount` double NOT NULL,
  `trending` tinyint(1) DEFAULT 0,
  `defaultProfit` double NOT NULL,
  `defaultResult` enum('WIN','LOSS','DRAW') NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `aiInvestmentPlanNameKey` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_investment_plan_duration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_investment_plan_duration` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `planId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `durationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_investment_plan_duration_durationId_planId_unique` (`planId`,`durationId`),
  KEY `aiInvestmentPlanDurationPlanIdForeign` (`planId`) USING BTREE,
  KEY `aiInvestmentPlanDurationDurationIdForeign` (`durationId`) USING BTREE,
  CONSTRAINT `ai_investment_plan_duration_ibfk_1717` FOREIGN KEY (`planId`) REFERENCES `ai_investment_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ai_investment_plan_duration_ibfk_1718` FOREIGN KEY (`durationId`) REFERENCES `ai_investment_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ai_investment_plan_duration_ibfk_6139` FOREIGN KEY (`planId`) REFERENCES `ai_investment_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ai_investment_plan_duration_ibfk_6140` FOREIGN KEY (`durationId`) REFERENCES `ai_investment_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_market_maker`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_market_maker` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `marketId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` enum('ACTIVE','PAUSED','STOPPED') NOT NULL DEFAULT 'STOPPED',
  `targetPrice` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `priceRangeLow` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `priceRangeHigh` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `aggressionLevel` enum('CONSERVATIVE','MODERATE','AGGRESSIVE') NOT NULL DEFAULT 'CONSERVATIVE',
  `maxDailyVolume` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `currentDailyVolume` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `volatilityThreshold` decimal(5,2) NOT NULL DEFAULT 5.00,
  `pauseOnHighVolatility` tinyint(1) NOT NULL DEFAULT 1,
  `realLiquidityPercent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `marketId` (`marketId`),
  UNIQUE KEY `aiMarketMakerMarketIdKey` (`marketId`) USING BTREE,
  KEY `aiMarketMakerStatusIdx` (`status`) USING BTREE,
  CONSTRAINT `ai_market_maker_ibfk_1` FOREIGN KEY (`marketId`) REFERENCES `ecosystem_market` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_market_maker_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_market_maker_history` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `marketMakerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `action` enum('TRADE','PAUSE','RESUME','REBALANCE','TARGET_CHANGE','DEPOSIT','WITHDRAW','START','STOP','CONFIG_CHANGE','EMERGENCY_STOP','AUTO_PAUSE') NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `priceAtAction` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `poolValueAtAction` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `aiMarketMakerHistoryMarketMakerIdIdx` (`marketMakerId`) USING BTREE,
  KEY `aiMarketMakerHistoryActionIdx` (`action`) USING BTREE,
  KEY `aiMarketMakerHistoryCreatedAtIdx` (`createdAt`) USING BTREE,
  KEY `aiMarketMakerHistoryMarketCreatedIdx` (`marketMakerId`,`createdAt`) USING BTREE,
  CONSTRAINT `ai_market_maker_history_ibfk_1` FOREIGN KEY (`marketMakerId`) REFERENCES `ai_market_maker` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_market_maker_pool`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_market_maker_pool` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `marketMakerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `baseCurrencyBalance` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `quoteCurrencyBalance` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `initialBaseBalance` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `initialQuoteBalance` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `totalValueLocked` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `unrealizedPnL` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `realizedPnL` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `lastRebalanceAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `marketMakerId` (`marketMakerId`),
  UNIQUE KEY `aiMarketMakerPoolMarketMakerIdKey` (`marketMakerId`) USING BTREE,
  KEY `aiMarketMakerPoolRebalanceIdx` (`lastRebalanceAt`) USING BTREE,
  CONSTRAINT `ai_market_maker_pool_ibfk_1` FOREIGN KEY (`marketMakerId`) REFERENCES `ai_market_maker` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `announcement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `announcement` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` enum('GENERAL','EVENT','UPDATE') NOT NULL DEFAULT 'GENERAL',
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `api_key`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `api_key` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `key` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`permissions`)),
  `ipWhitelist` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`ipWhitelist`)),
  `name` varchar(255) NOT NULL,
  `ipRestriction` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `apiKeyUserIdIdx` (`userId`) USING BTREE,
  CONSTRAINT `api_key_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `author`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `author` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user who is applying to become a blog author',
  `status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT 'Current status of the author application (PENDING, APPROVED, REJECTED)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `authorUserIdFkey` (`userId`),
  UNIQUE KEY `authorIdKey` (`id`) USING BTREE,
  UNIQUE KEY `authorUserIdKey` (`userId`) USING BTREE,
  CONSTRAINT `author_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_duration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_market`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binary_market` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `currency` varchar(191) NOT NULL COMMENT 'Base currency symbol (e.g., BTC, ETH)',
  `pair` varchar(191) NOT NULL COMMENT 'Trading pair symbol (e.g., USDT, USD)',
  `isTrending` tinyint(1) DEFAULT 0 COMMENT 'Whether this market is currently trending',
  `isHot` tinyint(1) DEFAULT 0 COMMENT 'Whether this market is marked as hot/popular',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Market availability status (active/inactive)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `binaryMarketCurrencyPairKey` (`currency`,`pair`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binary_order` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user who placed this order',
  `symbol` varchar(191) NOT NULL COMMENT 'Trading currency/pair for the binary option',
  `price` double NOT NULL COMMENT 'Entry price when the order was placed',
  `amount` double NOT NULL COMMENT 'Amount invested in this binary option',
  `profit` double NOT NULL COMMENT 'Potential profit amount from this option',
  `side` enum('RISE','FALL','HIGHER','LOWER','TOUCH','NO_TOUCH','CALL','PUT','UP','DOWN') NOT NULL COMMENT 'Direction/side of the binary option prediction',
  `type` enum('RISE_FALL','HIGHER_LOWER','TOUCH_NO_TOUCH','CALL_PUT','TURBO') NOT NULL COMMENT 'Type of binary option (rise/fall, higher/lower, etc.)',
  `status` enum('PENDING','WIN','LOSS','DRAW','CANCELED') NOT NULL COMMENT 'Current status of the binary option order',
  `isDemo` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this is a demo/practice order',
  `closedAt` datetime(3) NOT NULL COMMENT 'Date and time when the option expires/closes',
  `closePrice` double DEFAULT NULL COMMENT 'Final price when the option closed',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `durationType` enum('TIME','TICKS') NOT NULL DEFAULT 'TIME' COMMENT 'Duration type - time-based or tick-based',
  `barrier` double DEFAULT NULL COMMENT 'Barrier price level for barrier options',
  `strikePrice` double DEFAULT NULL COMMENT 'Strike price for the binary option',
  `payoutPerPoint` double DEFAULT NULL COMMENT 'Payout amount per point movement',
  `profitPercentage` double DEFAULT NULL COMMENT 'Profit percentage for this binary order duration',
  PRIMARY KEY (`id`),
  UNIQUE KEY `binaryOrderIdKey` (`id`) USING BTREE,
  KEY `binaryOrderUserIdForeign` (`userId`) USING BTREE,
  CONSTRAINT `binary_order_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `category` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) NOT NULL COMMENT 'Display name of the blog category',
  `slug` varchar(255) NOT NULL COMMENT 'URL-friendly slug for the category (used in URLs)',
  `image` text DEFAULT NULL COMMENT 'URL path to the category''s featured image',
  `description` text DEFAULT NULL COMMENT 'Description of the blog category',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categorySlugKey` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `comment` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `content` text NOT NULL COMMENT 'Content/text of the comment',
  `postId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the blog post this comment belongs to',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user who posted this comment',
  `status` enum('APPROVED','PENDING','REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT 'Moderation status of the comment (APPROVED, PENDING, REJECTED)',
  PRIMARY KEY (`id`),
  KEY `commentsPostIdForeign` (`postId`) USING BTREE,
  KEY `commentsAuthorIdForeign` (`userId`) USING BTREE,
  KEY `commentsUserIdForeign` (`userId`) USING BTREE,
  CONSTRAINT `comment_ibfk_4847` FOREIGN KEY (`postId`) REFERENCES `post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `comment_ibfk_4848` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `comment_ibfk_9471` FOREIGN KEY (`postId`) REFERENCES `post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `comment_ibfk_9472` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `copy_trading_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `copy_trading_audit_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `entityType` enum('LEADER','FOLLOWER','TRADE','TRANSACTION','SETTINGS') NOT NULL,
  `entityId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `action` enum('CREATE','UPDATE','DELETE','APPROVE','REJECT','SUSPEND','ACTIVATE','FOLLOW','UNFOLLOW','PAUSE','RESUME','ALLOCATE','DEALLOCATE','FORCE_STOP','RECALCULATE') NOT NULL,
  `oldValue` text DEFAULT NULL,
  `newValue` text DEFAULT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `adminId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `ipAddress` varchar(45) DEFAULT NULL,
  `userAgent` varchar(500) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `copy_trading_audit_logs_entity_idx` (`entityType`,`entityId`),
  KEY `copy_trading_audit_logs_action_idx` (`action`),
  KEY `copy_trading_audit_logs_user_id_idx` (`userId`),
  KEY `copy_trading_audit_logs_admin_id_idx` (`adminId`),
  KEY `copy_trading_audit_logs_created_at_idx` (`createdAt`),
  CONSTRAINT `copy_trading_audit_logs_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `copy_trading_audit_logs_ibfk_2` FOREIGN KEY (`adminId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `copy_trading_follower_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `copy_trading_follower_allocations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `followerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `symbol` varchar(20) NOT NULL,
  `baseAmount` float NOT NULL DEFAULT 0,
  `baseUsedAmount` float NOT NULL DEFAULT 0,
  `quoteAmount` float NOT NULL DEFAULT 0,
  `quoteUsedAmount` float NOT NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `copy_trading_follower_alloc_unique` (`followerId`,`symbol`),
  KEY `copy_trading_follower_alloc_follower_idx` (`followerId`),
  KEY `copy_trading_follower_alloc_symbol_idx` (`symbol`),
  CONSTRAINT `copy_trading_follower_allocations_ibfk_1` FOREIGN KEY (`followerId`) REFERENCES `copy_trading_followers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `copy_trading_followers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `copy_trading_followers` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `leaderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `copyMode` enum('PROPORTIONAL','FIXED_AMOUNT','FIXED_RATIO') NOT NULL DEFAULT 'PROPORTIONAL',
  `fixedAmount` float DEFAULT NULL,
  `fixedRatio` float DEFAULT NULL,
  `maxDailyLoss` float DEFAULT NULL,
  `maxPositionSize` float DEFAULT NULL,
  `stopLossPercent` float DEFAULT NULL,
  `takeProfitPercent` float DEFAULT NULL,
  `status` enum('ACTIVE','PAUSED','STOPPED') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `copy_trading_followers_user_leader_idx` (`userId`,`leaderId`),
  KEY `copy_trading_followers_user_id_idx` (`userId`),
  KEY `copy_trading_followers_leader_id_idx` (`leaderId`),
  KEY `copy_trading_followers_status_idx` (`status`),
  CONSTRAINT `copy_trading_followers_ibfk_663` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `copy_trading_followers_ibfk_664` FOREIGN KEY (`leaderId`) REFERENCES `copy_trading_leaders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `copy_trading_leader_markets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `copy_trading_leader_markets` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `leaderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `symbol` varchar(20) NOT NULL,
  `baseCurrency` varchar(10) NOT NULL,
  `quoteCurrency` varchar(10) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `minBase` double NOT NULL DEFAULT 0,
  `minQuote` double NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `copy_trading_leader_markets_unique` (`leaderId`,`symbol`),
  KEY `copy_trading_leader_markets_leader_idx` (`leaderId`),
  KEY `copy_trading_leader_markets_symbol_idx` (`symbol`),
  CONSTRAINT `copy_trading_leader_markets_ibfk_1` FOREIGN KEY (`leaderId`) REFERENCES `copy_trading_leaders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `copy_trading_leader_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `copy_trading_leader_stats` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `leaderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `date` date NOT NULL,
  `trades` int(11) NOT NULL DEFAULT 0,
  `winningTrades` int(11) NOT NULL DEFAULT 0,
  `losingTrades` int(11) NOT NULL DEFAULT 0,
  `volume` float NOT NULL DEFAULT 0,
  `profit` float NOT NULL DEFAULT 0,
  `fees` float NOT NULL DEFAULT 0,
  `startEquity` float NOT NULL DEFAULT 0,
  `endEquity` float NOT NULL DEFAULT 0,
  `highEquity` float NOT NULL DEFAULT 0,
  `lowEquity` float NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `copy_trading_leader_stats_leader_date_idx` (`leaderId`,`date`),
  KEY `copy_trading_leader_stats_leader_id_idx` (`leaderId`),
  KEY `copy_trading_leader_stats_date_idx` (`date`),
  CONSTRAINT `copy_trading_leader_stats_ibfk_1` FOREIGN KEY (`leaderId`) REFERENCES `copy_trading_leaders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `copy_trading_leaders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `copy_trading_leaders` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `displayName` varchar(100) NOT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `tradingStyle` enum('SCALPING','DAY_TRADING','SWING','POSITION') NOT NULL DEFAULT 'DAY_TRADING',
  `riskLevel` enum('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
  `profitSharePercent` float NOT NULL DEFAULT 10,
  `maxFollowers` int(11) NOT NULL DEFAULT 100,
  `status` enum('PENDING','ACTIVE','SUSPENDED','REJECTED','INACTIVE') NOT NULL DEFAULT 'PENDING',
  `isPublic` tinyint(1) NOT NULL DEFAULT 1,
  `applicationNote` text DEFAULT NULL,
  `rejectionReason` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `minFollowAmount` float NOT NULL DEFAULT 100,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`),
  UNIQUE KEY `copy_trading_leaders_user_id_idx` (`userId`),
  KEY `copy_trading_leaders_status_idx` (`status`),
  KEY `copy_trading_leaders_is_public_idx` (`isPublic`),
  CONSTRAINT `copy_trading_leaders_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `copy_trading_trades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `copy_trading_trades` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `leaderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `followerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `leaderOrderId` varchar(100) DEFAULT NULL,
  `symbol` varchar(20) NOT NULL,
  `side` enum('BUY','SELL') NOT NULL,
  `type` enum('MARKET','LIMIT') NOT NULL DEFAULT 'MARKET',
  `amount` float NOT NULL,
  `price` float NOT NULL,
  `cost` float NOT NULL DEFAULT 0,
  `fee` float NOT NULL DEFAULT 0,
  `feeCurrency` varchar(20) NOT NULL DEFAULT 'USDT',
  `executedAmount` float NOT NULL DEFAULT 0,
  `executedPrice` float NOT NULL DEFAULT 0,
  `slippage` float DEFAULT NULL,
  `latencyMs` int(11) DEFAULT NULL,
  `profit` float DEFAULT NULL,
  `profitPercent` float DEFAULT NULL,
  `profitCurrency` varchar(20) DEFAULT NULL,
  `status` enum('PENDING','PENDING_REPLICATION','REPLICATED','REPLICATION_FAILED','OPEN','CLOSED','PARTIALLY_FILLED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `errorMessage` text DEFAULT NULL,
  `isLeaderTrade` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `closedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `copy_trading_trades_leader_id_idx` (`leaderId`),
  KEY `copy_trading_trades_follower_id_idx` (`followerId`),
  KEY `copy_trading_trades_leader_order_id_idx` (`leaderOrderId`),
  KEY `copy_trading_trades_symbol_idx` (`symbol`),
  KEY `copy_trading_trades_status_idx` (`status`),
  KEY `copy_trading_trades_created_at_idx` (`createdAt`),
  CONSTRAINT `copy_trading_trades_ibfk_657` FOREIGN KEY (`leaderId`) REFERENCES `copy_trading_leaders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `copy_trading_trades_ibfk_658` FOREIGN KEY (`followerId`) REFERENCES `copy_trading_followers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `copy_trading_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `copy_trading_transactions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `leaderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `followerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `tradeId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `type` enum('ALLOCATION','DEALLOCATION','PROFIT_SHARE','TRADE_PROFIT','TRADE_LOSS','FEE','REFUND') NOT NULL,
  `amount` float NOT NULL,
  `currency` varchar(20) NOT NULL DEFAULT 'USDT',
  `fee` float NOT NULL DEFAULT 0,
  `balanceBefore` float NOT NULL DEFAULT 0,
  `balanceAfter` float NOT NULL DEFAULT 0,
  `status` enum('PENDING','COMPLETED','FAILED') NOT NULL DEFAULT 'COMPLETED',
  `description` text DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `copy_trading_transactions_user_id_idx` (`userId`),
  KEY `copy_trading_transactions_leader_id_idx` (`leaderId`),
  KEY `copy_trading_transactions_follower_id_idx` (`followerId`),
  KEY `copy_trading_transactions_trade_id_idx` (`tradeId`),
  KEY `copy_trading_transactions_type_idx` (`type`),
  KEY `copy_trading_transactions_status_idx` (`status`),
  KEY `copy_trading_transactions_created_at_idx` (`createdAt`),
  CONSTRAINT `copy_trading_transactions_ibfk_1310` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `copy_trading_transactions_ibfk_1311` FOREIGN KEY (`leaderId`) REFERENCES `copy_trading_leaders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `copy_trading_transactions_ibfk_1312` FOREIGN KEY (`followerId`) REFERENCES `copy_trading_followers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `copy_trading_transactions_ibfk_1313` FOREIGN KEY (`tradeId`) REFERENCES `copy_trading_trades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `currency`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `currency` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL COMMENT 'Full name of the currency (e.g., Bitcoin, US Dollar)',
  `symbol` varchar(191) NOT NULL COMMENT 'Currency symbol/ticker (e.g., BTC, USD, ETH)',
  `precision` double NOT NULL COMMENT 'Number of decimal places for this currency',
  `price` double DEFAULT NULL COMMENT 'Current price of the currency in base currency',
  `status` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this currency is active and available for trading',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `default_pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `default_pages` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `pageId` varchar(255) NOT NULL,
  `pageSource` enum('default','builder') NOT NULL DEFAULT 'default' COMMENT 'Source type: default for regular pages, builder for builder-created pages',
  `type` enum('variables','content') NOT NULL,
  `title` varchar(255) NOT NULL,
  `variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Structured data for home page editing (texts, images, etc.)' CHECK (json_valid(`variables`)),
  `content` text DEFAULT NULL COMMENT 'HTML/markdown content for legal pages',
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'SEO metadata and other page settings' CHECK (json_valid(`meta`)),
  `status` enum('active','draft') NOT NULL DEFAULT 'active',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_page_source` (`pageId`,`pageSource`),
  KEY `default_pages_status` (`status`),
  KEY `default_pages_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `deposit_gateway`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `deposit_gateway` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `image` varchar(1000) DEFAULT NULL,
  `alias` varchar(191) DEFAULT NULL,
  `currencies` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`currencies`)),
  `fixedFee` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`fixedFee`)),
  `percentageFee` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`percentageFee`)),
  `minAmount` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`minAmount`)),
  `maxAmount` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`maxAmount`)),
  `type` enum('FIAT','CRYPTO') NOT NULL DEFAULT 'FIAT',
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `version` varchar(191) DEFAULT '0.0.1',
  `productId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `depositGatewayNameKey` (`name`),
  UNIQUE KEY `depositGatewayAliasKey` (`alias`),
  UNIQUE KEY `depositGatewayProductIdKey` (`productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `deposit_method`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `deposit_method` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(255) NOT NULL COMMENT 'Display name of the deposit method',
  `instructions` text NOT NULL COMMENT 'Step-by-step instructions for using this deposit method',
  `image` varchar(1000) DEFAULT NULL COMMENT 'URL path to the method''s logo or icon',
  `fixedFee` double NOT NULL DEFAULT 0 COMMENT 'Fixed fee amount charged for deposits',
  `percentageFee` double NOT NULL DEFAULT 0 COMMENT 'Percentage fee charged on deposit amount',
  `minAmount` double NOT NULL DEFAULT 0 COMMENT 'Minimum deposit amount allowed',
  `maxAmount` double NOT NULL DEFAULT 0 COMMENT 'Maximum deposit amount allowed',
  `customFields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Custom form fields required for this deposit method' CHECK (json_valid(`customFields`)),
  `status` tinyint(1) DEFAULT 1 COMMENT 'Whether this deposit method is active and available',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_category` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(191) NOT NULL,
  `image` varchar(191) DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `slug` varchar(191) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_discount`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_discount` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `code` varchar(191) NOT NULL,
  `percentage` int(11) NOT NULL,
  `validUntil` datetime(3) NOT NULL,
  `productId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecommerceDiscountCodeKey` (`code`),
  KEY `ecommerceDiscountProductIdFkey` (`productId`) USING BTREE,
  CONSTRAINT `ecommerce_discount_ibfk_1` FOREIGN KEY (`productId`) REFERENCES `ecommerce_product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_order` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` enum('PENDING','COMPLETED','CANCELLED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `shippingId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `productId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecommerceOrderIdKey` (`id`) USING BTREE,
  KEY `ecommerceOrderUserIdFkey` (`userId`) USING BTREE,
  KEY `ecommerceOrderShippingIdFkey` (`shippingId`) USING BTREE,
  KEY `productId` (`productId`),
  CONSTRAINT `ecommerce_order_ibfk_39596` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_order_ibfk_39597` FOREIGN KEY (`shippingId`) REFERENCES `ecommerce_shipping` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_order_ibfk_39598` FOREIGN KEY (`productId`) REFERENCES `ecommerce_product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_order_ibfk_46033` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_order_ibfk_46034` FOREIGN KEY (`shippingId`) REFERENCES `ecommerce_shipping` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_order_ibfk_46035` FOREIGN KEY (`productId`) REFERENCES `ecommerce_product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_order_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_order_item` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `orderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `productId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `quantity` int(11) NOT NULL,
  `key` varchar(191) DEFAULT NULL,
  `filePath` varchar(191) DEFAULT NULL,
  `instructions` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecommerce_order_item_productId_orderId_unique` (`orderId`,`productId`),
  UNIQUE KEY `ecommerceOrderItemOrderIdProductIdKey` (`orderId`,`productId`) USING BTREE,
  KEY `ecommerceOrderItemProductIdFkey` (`productId`) USING BTREE,
  CONSTRAINT `ecommerce_order_item_ibfk_1123` FOREIGN KEY (`orderId`) REFERENCES `ecommerce_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_order_item_ibfk_1124` FOREIGN KEY (`productId`) REFERENCES `ecommerce_product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_order_item_ibfk_4185` FOREIGN KEY (`orderId`) REFERENCES `ecommerce_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_order_item_ibfk_4186` FOREIGN KEY (`productId`) REFERENCES `ecommerce_product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_product` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` longtext NOT NULL,
  `type` enum('DOWNLOADABLE','PHYSICAL') NOT NULL,
  `price` double NOT NULL,
  `categoryId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `inventoryQuantity` int(11) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `image` varchar(191) DEFAULT NULL,
  `currency` varchar(191) NOT NULL DEFAULT 'USD',
  `walletType` enum('FIAT','SPOT','ECO') NOT NULL DEFAULT 'SPOT',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `slug` varchar(191) NOT NULL,
  `shortDescription` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ecommerceProductCategoryIdFkey` (`categoryId`) USING BTREE,
  CONSTRAINT `ecommerce_product_ibfk_1` FOREIGN KEY (`categoryId`) REFERENCES `ecommerce_category` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_review` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `productId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` varchar(191) DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecommerceReviewProductIdUserIdUnique` (`productId`,`userId`) USING BTREE,
  KEY `ecommerceReviewUserIdFkey` (`userId`) USING BTREE,
  CONSTRAINT `ecommerce_review_ibfk_15193` FOREIGN KEY (`productId`) REFERENCES `ecommerce_product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_review_ibfk_15194` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_review_ibfk_19459` FOREIGN KEY (`productId`) REFERENCES `ecommerce_product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_review_ibfk_19460` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_shipping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_shipping` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `loadId` varchar(255) NOT NULL,
  `loadStatus` enum('PENDING','TRANSIT','DELIVERED','CANCELLED') NOT NULL,
  `shipper` varchar(255) NOT NULL,
  `transporter` varchar(255) NOT NULL,
  `goodsType` varchar(255) NOT NULL,
  `weight` float NOT NULL,
  `volume` float NOT NULL,
  `description` varchar(255) NOT NULL,
  `vehicle` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `cost` float DEFAULT NULL,
  `tax` float DEFAULT NULL,
  `deliveryDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_shipping_address`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_shipping_address` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `orderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `street` varchar(255) NOT NULL,
  `city` varchar(255) NOT NULL,
  `state` varchar(255) NOT NULL,
  `postalCode` varchar(255) NOT NULL,
  `country` varchar(255) NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `email` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `orderId` (`orderId`),
  CONSTRAINT `ecommerce_shipping_address_ibfk_5201` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_shipping_address_ibfk_5202` FOREIGN KEY (`orderId`) REFERENCES `ecommerce_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_shipping_address_ibfk_939` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_shipping_address_ibfk_940` FOREIGN KEY (`orderId`) REFERENCES `ecommerce_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_user_discount`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_user_discount` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `discountId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecommerceUserDiscountUserIdDiscountIdUnique` (`userId`,`discountId`) USING BTREE,
  KEY `ecommerceUserDiscountDiscountIdFkey` (`discountId`) USING BTREE,
  CONSTRAINT `ecommerce_user_discount_ibfk_22435` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_user_discount_ibfk_22436` FOREIGN KEY (`discountId`) REFERENCES `ecommerce_discount` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_user_discount_ibfk_26691` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_user_discount_ibfk_26692` FOREIGN KEY (`discountId`) REFERENCES `ecommerce_discount` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_wishlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_wishlist` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ecommerceWishlistUserIdFkey` (`userId`) USING BTREE,
  CONSTRAINT `ecommerce_wishlist_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_wishlist_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_wishlist_item` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `wishlistId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `productId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecommerce_wishlist_item_productId_wishlistId_unique` (`wishlistId`,`productId`),
  UNIQUE KEY `ecommerceWishlistItemWishlistIdProductId` (`wishlistId`,`productId`) USING BTREE,
  KEY `productId` (`productId`),
  CONSTRAINT `ecommerce_wishlist_item_ibfk_16357` FOREIGN KEY (`wishlistId`) REFERENCES `ecommerce_wishlist` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_wishlist_item_ibfk_16358` FOREIGN KEY (`productId`) REFERENCES `ecommerce_product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_wishlist_item_ibfk_20591` FOREIGN KEY (`wishlistId`) REFERENCES `ecommerce_wishlist` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_wishlist_item_ibfk_20592` FOREIGN KEY (`productId`) REFERENCES `ecommerce_product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecosystem_blockchain`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecosystem_blockchain` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `version` varchar(191) DEFAULT '0.0.1',
  `productId` varchar(191) NOT NULL,
  `chain` varchar(191) DEFAULT NULL,
  `link` varchar(191) DEFAULT NULL,
  `image` varchar(1000) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecosystemBlockchainNameKey` (`name`),
  UNIQUE KEY `ecosystemBlockchainProductIdKey` (`productId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecosystem_custodial_wallet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecosystem_custodial_wallet` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `masterWalletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `address` varchar(255) NOT NULL,
  `chain` varchar(255) NOT NULL,
  `network` varchar(255) NOT NULL DEFAULT 'mainnet',
  `status` enum('ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecosystemCustodialWalletAddressKey` (`address`),
  UNIQUE KEY `ecosystemCustodialWalletIdKey` (`id`) USING BTREE,
  KEY `custodialWalletMasterWalletIdIdx` (`masterWalletId`) USING BTREE,
  CONSTRAINT `ecosystem_custodial_wallet_ibfk_1` FOREIGN KEY (`masterWalletId`) REFERENCES `ecosystem_master_wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecosystem_market`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecosystem_market` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `pair` varchar(191) NOT NULL,
  `isTrending` tinyint(1) DEFAULT 0,
  `isHot` tinyint(1) DEFAULT 0,
  `metadata` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `currency` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecosystemMarketCurrencyPairKey` (`currency`,`pair`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecosystem_master_wallet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecosystem_master_wallet` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chain` varchar(255) NOT NULL,
  `currency` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `balance` double NOT NULL DEFAULT 0,
  `data` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `lastIndex` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecosystemMasterWalletIdKey` (`id`) USING BTREE,
  UNIQUE KEY `ecosystemMasterWalletChainCurrencyKey` (`chain`,`currency`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecosystem_private_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecosystem_private_ledger` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `walletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `index` int(11) NOT NULL,
  `currency` varchar(50) NOT NULL,
  `chain` varchar(50) NOT NULL,
  `network` varchar(50) NOT NULL DEFAULT 'mainnet',
  `offchainDifference` double NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniqueEcosystemPrivateLedger` (`walletId`,`index`,`currency`,`chain`,`network`) USING BTREE,
  CONSTRAINT `ecosystem_private_ledger_ibfk_1` FOREIGN KEY (`walletId`) REFERENCES `wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecosystem_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecosystem_token` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) NOT NULL,
  `currency` varchar(255) NOT NULL,
  `chain` varchar(255) NOT NULL,
  `network` varchar(255) NOT NULL,
  `contract` varchar(255) NOT NULL,
  `contractType` enum('PERMIT','NO_PERMIT','NATIVE') NOT NULL DEFAULT 'PERMIT',
  `type` varchar(255) NOT NULL,
  `decimals` int(11) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `precision` int(11) DEFAULT 8,
  `limits` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`limits`)),
  `icon` varchar(1000) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `fee` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`fee`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecosystemTokenContractChainKey` (`contract`,`chain`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecosystem_utxo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecosystem_utxo` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `walletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `transactionId` varchar(255) NOT NULL,
  `index` int(11) NOT NULL,
  `amount` double NOT NULL,
  `script` varchar(1000) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ecosystemUtxoWalletIdIdx` (`walletId`) USING BTREE,
  CONSTRAINT `ecosystem_utxo_ibfk_1` FOREIGN KEY (`walletId`) REFERENCES `wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `exchange`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchange` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL COMMENT 'Internal name identifier for the exchange',
  `title` varchar(191) NOT NULL COMMENT 'Display title of the exchange',
  `status` tinyint(1) DEFAULT 0 COMMENT 'Exchange connection status (active/inactive)',
  `username` varchar(191) DEFAULT NULL COMMENT 'Exchange API username/identifier',
  `licenseStatus` tinyint(1) DEFAULT 0 COMMENT 'Exchange license validation status',
  `version` varchar(191) DEFAULT '0.0.1' COMMENT 'Exchange integration version',
  `productId` varchar(191) DEFAULT NULL COMMENT 'Unique product identifier for the exchange',
  `type` varchar(191) DEFAULT 'spot' COMMENT 'Type of exchange (spot, futures, etc.)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `exchangeProductIdKey` (`productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `exchange_currency`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchange_currency` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `currency` varchar(191) NOT NULL COMMENT 'Currency symbol (e.g., BTC, ETH, USDT)',
  `name` varchar(191) NOT NULL COMMENT 'Full name of the currency (e.g., Bitcoin, Ethereum)',
  `precision` double NOT NULL COMMENT 'Number of decimal places for this currency',
  `price` decimal(30,15) DEFAULT NULL COMMENT 'Current price of the currency',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Currency availability status (active/inactive)',
  `fee` double DEFAULT 0 COMMENT 'Trading fee percentage for this currency',
  PRIMARY KEY (`id`),
  UNIQUE KEY `exchangeCurrencyCurrencyKey` (`currency`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `exchange_market`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchange_market` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `pair` varchar(191) NOT NULL COMMENT 'Quote currency symbol (e.g., USDT, USD)',
  `isTrending` tinyint(1) DEFAULT 0 COMMENT 'Whether this market is currently trending',
  `isHot` tinyint(1) DEFAULT 0 COMMENT 'Whether this market is marked as hot/popular',
  `metadata` text DEFAULT NULL COMMENT 'Additional market configuration and precision settings',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Market availability status (active/inactive)',
  `currency` varchar(191) NOT NULL COMMENT 'Base currency symbol (e.g., BTC, ETH)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `exchangeMarketCurrencyPairKey` (`currency`,`pair`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `exchange_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchange_order` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user who placed this order',
  `referenceId` varchar(191) DEFAULT NULL COMMENT 'External reference ID from exchange',
  `status` enum('OPEN','CLOSED','CANCELED','EXPIRED','REJECTED') NOT NULL COMMENT 'Current status of the exchange order',
  `symbol` varchar(191) NOT NULL COMMENT 'Trading symbol/pair for this order',
  `type` enum('MARKET','LIMIT') NOT NULL COMMENT 'Type of order (market or limit)',
  `timeInForce` enum('GTC','IOC','FOK','PO') NOT NULL COMMENT 'Time in force policy (GTC=Good Till Canceled, IOC=Immediate or Cancel, etc.)',
  `side` enum('BUY','SELL') NOT NULL COMMENT 'Order side - buy or sell',
  `price` double NOT NULL COMMENT 'Order price per unit',
  `average` double DEFAULT NULL COMMENT 'Average execution price for filled portions',
  `amount` double NOT NULL COMMENT 'Total amount/quantity to trade',
  `filled` double NOT NULL COMMENT 'Amount that has been filled/executed',
  `remaining` double NOT NULL COMMENT 'Amount remaining to be filled',
  `cost` double NOT NULL COMMENT 'Total cost of the order (price × filled amount)',
  `trades` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of individual trades that make up this order' CHECK (json_valid(`trades`)),
  `fee` double NOT NULL COMMENT 'Transaction fee amount',
  `feeCurrency` varchar(191) NOT NULL COMMENT 'Currency in which the fee is charged',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exchangeOrderIdKey` (`id`) USING BTREE,
  UNIQUE KEY `exchangeOrderReferenceIdKey` (`referenceId`),
  KEY `exchangeOrderUserIdForeign` (`userId`) USING BTREE,
  CONSTRAINT `exchange_order_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `exchange_watchlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchange_watchlist` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user who added this symbol to watchlist',
  `symbol` varchar(191) NOT NULL COMMENT 'Trading symbol/pair being watched',
  PRIMARY KEY (`id`),
  KEY `exchangeWatchlistUserIdForeign` (`userId`) USING BTREE,
  CONSTRAINT `exchange_watchlist_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `extension`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `extension` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `productId` varchar(191) NOT NULL COMMENT 'Unique product identifier for the extension',
  `name` varchar(191) NOT NULL COMMENT 'Internal name identifier for the extension',
  `title` varchar(191) DEFAULT NULL COMMENT 'Display title of the extension',
  `description` text DEFAULT NULL COMMENT 'Description of the extension functionality',
  `link` varchar(191) DEFAULT NULL COMMENT 'URL link to extension documentation or website',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether the extension is active and available',
  `version` varchar(191) DEFAULT '0.0.1' COMMENT 'Version number of the extension',
  `image` varchar(1000) DEFAULT NULL COMMENT 'URL path to the extension''s icon or logo',
  PRIMARY KEY (`id`),
  UNIQUE KEY `extensionProductIdKey` (`productId`),
  UNIQUE KEY `extensionNameKey` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `faq`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `faq_feedbacks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `faq_feedbacks` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `faqId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `isHelpful` tinyint(1) NOT NULL,
  `comment` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `faq_feedbacks_unique_user_faq` (`userId`,`faqId`),
  KEY `faq_feedbacks_faqId_idx` (`faqId`),
  KEY `faq_feedbacks_userId_idx` (`userId`),
  CONSTRAINT `faq_feedbacks_ibfk_5501` FOREIGN KEY (`faqId`) REFERENCES `faqs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `faq_feedbacks_ibfk_5502` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `faq_feedbacks_ibfk_9619` FOREIGN KEY (`faqId`) REFERENCES `faqs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `faq_feedbacks_ibfk_9620` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `faq_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `faq_questions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `question` text NOT NULL,
  `answer` text DEFAULT NULL,
  `status` enum('PENDING','ANSWERED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `faq_questions_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `faq_searches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `faq_searches` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `query` text NOT NULL,
  `resultCount` int(11) NOT NULL DEFAULT 0,
  `category` varchar(191) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`id`),
  KEY `faq_searches_query_idx` (`query`(768)),
  KEY `userId` (`userId`),
  CONSTRAINT `faq_searches_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `faqs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `faqs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `question` text NOT NULL,
  `answer` text NOT NULL,
  `category` varchar(191) NOT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `order` int(11) NOT NULL DEFAULT 0,
  `pagePath` varchar(191) NOT NULL,
  `relatedFaqIds` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`relatedFaqIds`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `image` varchar(191) DEFAULT NULL,
  `views` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `faqs_category_idx` (`category`),
  KEY `faqs_pagePath_idx` (`pagePath`),
  KEY `faqs_order_idx` (`order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `forex_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `forex_account` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `accountId` varchar(191) DEFAULT NULL,
  `password` varchar(191) DEFAULT NULL,
  `broker` varchar(191) DEFAULT NULL,
  `mt` int(11) DEFAULT NULL,
  `balance` double DEFAULT 0,
  `leverage` int(11) DEFAULT 1,
  `type` enum('DEMO','LIVE') NOT NULL DEFAULT 'DEMO',
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `dailyWithdrawLimit` double DEFAULT 5000,
  `monthlyWithdrawLimit` double DEFAULT 50000,
  `dailyWithdrawn` double DEFAULT 0,
  `monthlyWithdrawn` double DEFAULT 0,
  `lastWithdrawReset` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `forexAccountUserIdFkey` (`userId`) USING BTREE,
  KEY `forexAccountUserIdTypeIdx` (`userId`,`type`) USING BTREE,
  KEY `forexAccountStatusIdx` (`status`) USING BTREE,
  KEY `forexAccountCreatedAtIdx` (`createdAt`) USING BTREE,
  CONSTRAINT `forex_account_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `forex_account_signal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `forex_account_signal` (
  `forexAccountId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `forexSignalId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`forexAccountId`,`forexSignalId`),
  UNIQUE KEY `forex_account_signal_forexSignalId_forexAccountId_unique` (`forexAccountId`,`forexSignalId`),
  KEY `forexAccountSignalForexSignalIdFkey` (`forexSignalId`) USING BTREE,
  CONSTRAINT `forex_account_signal_ibfk_1` FOREIGN KEY (`forexAccountId`) REFERENCES `forex_account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `forex_account_signal_ibfk_2` FOREIGN KEY (`forexSignalId`) REFERENCES `forex_signal` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `forex_duration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `forex_duration` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `duration` int(11) NOT NULL,
  `timeframe` enum('HOUR','DAY','WEEK','MONTH') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `forex_investment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `forex_investment` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `planId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `durationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` double DEFAULT NULL,
  `profit` double DEFAULT NULL,
  `result` enum('WIN','LOSS','DRAW') DEFAULT NULL,
  `status` enum('ACTIVE','COMPLETED','CANCELLED','REJECTED') NOT NULL DEFAULT 'ACTIVE',
  `endDate` datetime(3) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  `termsAcceptedAt` datetime(3) DEFAULT NULL,
  `termsVersion` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `forexInvestmentIdKey` (`id`) USING BTREE,
  UNIQUE KEY `forexInvestmentStatusIndex` (`userId`,`planId`,`status`) USING BTREE,
  KEY `forexInvestmentUserIdFkey` (`userId`) USING BTREE,
  KEY `forexInvestmentPlanIdFkey` (`planId`) USING BTREE,
  KEY `forexInvestmentDurationIdFkey` (`durationId`) USING BTREE,
  KEY `forexInvestmentUserIdStatusIdx` (`userId`,`status`) USING BTREE,
  KEY `forexInvestmentCreatedAtIdx` (`createdAt`) USING BTREE,
  KEY `forexInvestmentEndDateIdx` (`endDate`) USING BTREE,
  CONSTRAINT `forex_investment_ibfk_38488` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `forex_investment_ibfk_38489` FOREIGN KEY (`planId`) REFERENCES `forex_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `forex_investment_ibfk_38490` FOREIGN KEY (`durationId`) REFERENCES `forex_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `forex_investment_ibfk_44600` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `forex_investment_ibfk_44601` FOREIGN KEY (`planId`) REFERENCES `forex_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `forex_investment_ibfk_44602` FOREIGN KEY (`durationId`) REFERENCES `forex_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `forex_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `forex_plan` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `title` varchar(191) DEFAULT NULL,
  `description` varchar(191) DEFAULT NULL,
  `image` varchar(191) DEFAULT NULL,
  `minProfit` double NOT NULL,
  `maxProfit` double NOT NULL,
  `minAmount` double DEFAULT 0,
  `maxAmount` double DEFAULT NULL,
  `profitPercentage` double NOT NULL DEFAULT 0,
  `status` tinyint(1) DEFAULT 0,
  `defaultProfit` int(11) NOT NULL DEFAULT 0,
  `defaultResult` enum('WIN','LOSS','DRAW') NOT NULL,
  `trending` tinyint(1) DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `currency` varchar(191) NOT NULL,
  `walletType` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `forexPlanNameKey` (`name`),
  KEY `forexPlanStatusIdx` (`status`) USING BTREE,
  KEY `forexPlanCurrencyIdx` (`currency`) USING BTREE,
  KEY `forexPlanTrendingIdx` (`trending`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `forex_plan_duration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `forex_plan_duration` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `planId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `durationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `forex_plan_duration_durationId_planId_unique` (`planId`,`durationId`),
  KEY `idxPlanId` (`planId`) USING BTREE,
  KEY `idxDurationId` (`durationId`) USING BTREE,
  CONSTRAINT `forex_plan_duration_ibfk_17961` FOREIGN KEY (`planId`) REFERENCES `forex_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `forex_plan_duration_ibfk_17962` FOREIGN KEY (`durationId`) REFERENCES `forex_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `forex_plan_duration_ibfk_3445` FOREIGN KEY (`planId`) REFERENCES `forex_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `forex_plan_duration_ibfk_3446` FOREIGN KEY (`durationId`) REFERENCES `forex_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `forex_signal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `forex_signal` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(191) NOT NULL,
  `image` varchar(191) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `futures_market`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `futures_market` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `currency` varchar(191) NOT NULL,
  `pair` varchar(191) NOT NULL,
  `isTrending` tinyint(1) DEFAULT 0,
  `isHot` tinyint(1) DEFAULT 0,
  `metadata` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `futuresMarketCurrencyPairKey` (`currency`,`pair`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `gateway_api_key`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gateway_api_key` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `merchantId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `keyPrefix` varchar(20) NOT NULL,
  `keyHash` varchar(255) NOT NULL,
  `lastFourChars` varchar(4) NOT NULL,
  `type` enum('PUBLIC','SECRET') NOT NULL,
  `mode` enum('LIVE','TEST') NOT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`permissions`)),
  `ipWhitelist` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ipWhitelist`)),
  `lastUsedAt` datetime DEFAULT NULL,
  `lastUsedIp` varchar(45) DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `expiresAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `successUrl` varchar(500) DEFAULT NULL,
  `cancelUrl` varchar(500) DEFAULT NULL,
  `webhookUrl` varchar(500) DEFAULT NULL,
  `allowedWalletTypes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`allowedWalletTypes`)),
  PRIMARY KEY (`id`),
  KEY `gatewayApiKeyMerchantIdFkey` (`merchantId`) USING BTREE,
  KEY `gatewayApiKeyHashIdx` (`keyHash`) USING BTREE,
  KEY `gatewayApiKeyStatusIdx` (`status`) USING BTREE,
  CONSTRAINT `gateway_api_key_ibfk_1` FOREIGN KEY (`merchantId`) REFERENCES `gateway_merchant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `gateway_merchant`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gateway_merchant` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `logo` varchar(1000) DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `apiKey` varchar(64) NOT NULL,
  `secretKey` varchar(64) NOT NULL,
  `webhookSecret` varchar(64) NOT NULL,
  `testMode` tinyint(1) NOT NULL DEFAULT 1,
  `allowedCurrencies` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`allowedCurrencies`)),
  `allowedWalletTypes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`allowedWalletTypes`)),
  `defaultCurrency` varchar(20) NOT NULL DEFAULT 'USD',
  `feeType` enum('PERCENTAGE','FIXED','BOTH') NOT NULL DEFAULT 'BOTH',
  `feePercentage` decimal(10,4) NOT NULL DEFAULT 2.9000,
  `feeFixed` decimal(30,8) NOT NULL DEFAULT 0.30000000,
  `payoutSchedule` enum('INSTANT','DAILY','WEEKLY','MONTHLY') NOT NULL DEFAULT 'DAILY',
  `payoutThreshold` decimal(30,8) NOT NULL DEFAULT 100.00000000,
  `payoutWalletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `status` enum('PENDING','ACTIVE','SUSPENDED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `verificationStatus` enum('UNVERIFIED','PENDING','VERIFIED') NOT NULL DEFAULT 'UNVERIFIED',
  `dailyLimit` decimal(30,8) NOT NULL DEFAULT 10000.00000000,
  `monthlyLimit` decimal(30,8) NOT NULL DEFAULT 100000.00000000,
  `transactionLimit` decimal(30,8) NOT NULL DEFAULT 5000.00000000,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postalCode` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `apiKey` (`apiKey`),
  UNIQUE KEY `secretKey` (`secretKey`),
  UNIQUE KEY `gatewayMerchantApiKeyUnique` (`apiKey`) USING BTREE,
  UNIQUE KEY `gatewayMerchantSecretKeyUnique` (`secretKey`) USING BTREE,
  UNIQUE KEY `gatewayMerchantSlugUnique` (`slug`) USING BTREE,
  UNIQUE KEY `slug_2` (`slug`),
  UNIQUE KEY `apiKey_2` (`apiKey`),
  UNIQUE KEY `secretKey_2` (`secretKey`),
  UNIQUE KEY `slug_3` (`slug`),
  UNIQUE KEY `apiKey_3` (`apiKey`),
  UNIQUE KEY `secretKey_3` (`secretKey`),
  UNIQUE KEY `slug_4` (`slug`),
  UNIQUE KEY `apiKey_4` (`apiKey`),
  UNIQUE KEY `secretKey_4` (`secretKey`),
  UNIQUE KEY `slug_5` (`slug`),
  UNIQUE KEY `apiKey_5` (`apiKey`),
  UNIQUE KEY `secretKey_5` (`secretKey`),
  UNIQUE KEY `slug_6` (`slug`),
  UNIQUE KEY `apiKey_6` (`apiKey`),
  UNIQUE KEY `secretKey_6` (`secretKey`),
  UNIQUE KEY `slug_7` (`slug`),
  UNIQUE KEY `apiKey_7` (`apiKey`),
  UNIQUE KEY `secretKey_7` (`secretKey`),
  UNIQUE KEY `slug_8` (`slug`),
  UNIQUE KEY `apiKey_8` (`apiKey`),
  UNIQUE KEY `secretKey_8` (`secretKey`),
  UNIQUE KEY `slug_9` (`slug`),
  UNIQUE KEY `apiKey_9` (`apiKey`),
  UNIQUE KEY `secretKey_9` (`secretKey`),
  UNIQUE KEY `slug_10` (`slug`),
  UNIQUE KEY `apiKey_10` (`apiKey`),
  UNIQUE KEY `secretKey_10` (`secretKey`),
  UNIQUE KEY `slug_11` (`slug`),
  UNIQUE KEY `apiKey_11` (`apiKey`),
  UNIQUE KEY `secretKey_11` (`secretKey`),
  UNIQUE KEY `slug_12` (`slug`),
  UNIQUE KEY `apiKey_12` (`apiKey`),
  UNIQUE KEY `secretKey_12` (`secretKey`),
  UNIQUE KEY `slug_13` (`slug`),
  UNIQUE KEY `apiKey_13` (`apiKey`),
  UNIQUE KEY `secretKey_13` (`secretKey`),
  UNIQUE KEY `slug_14` (`slug`),
  UNIQUE KEY `apiKey_14` (`apiKey`),
  UNIQUE KEY `secretKey_14` (`secretKey`),
  UNIQUE KEY `slug_15` (`slug`),
  UNIQUE KEY `apiKey_15` (`apiKey`),
  UNIQUE KEY `secretKey_15` (`secretKey`),
  UNIQUE KEY `slug_16` (`slug`),
  UNIQUE KEY `apiKey_16` (`apiKey`),
  UNIQUE KEY `secretKey_16` (`secretKey`),
  UNIQUE KEY `slug_17` (`slug`),
  UNIQUE KEY `apiKey_17` (`apiKey`),
  UNIQUE KEY `secretKey_17` (`secretKey`),
  UNIQUE KEY `slug_18` (`slug`),
  UNIQUE KEY `apiKey_18` (`apiKey`),
  UNIQUE KEY `secretKey_18` (`secretKey`),
  UNIQUE KEY `slug_19` (`slug`),
  UNIQUE KEY `apiKey_19` (`apiKey`),
  UNIQUE KEY `secretKey_19` (`secretKey`),
  UNIQUE KEY `slug_20` (`slug`),
  KEY `gatewayMerchantUserIdFkey` (`userId`) USING BTREE,
  KEY `gatewayMerchantStatusIdx` (`status`) USING BTREE,
  CONSTRAINT `gateway_merchant_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `gateway_merchant_balance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gateway_merchant_balance` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `merchantId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `currency` varchar(20) NOT NULL,
  `walletType` enum('FIAT','SPOT','ECO') NOT NULL DEFAULT 'FIAT',
  `available` decimal(30,8) NOT NULL DEFAULT 0.00000000,
  `pending` decimal(30,8) NOT NULL DEFAULT 0.00000000,
  `reserved` decimal(30,8) NOT NULL DEFAULT 0.00000000,
  `totalReceived` decimal(30,8) NOT NULL DEFAULT 0.00000000,
  `totalRefunded` decimal(30,8) NOT NULL DEFAULT 0.00000000,
  `totalFees` decimal(30,8) NOT NULL DEFAULT 0.00000000,
  `totalPaidOut` decimal(30,8) NOT NULL DEFAULT 0.00000000,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `gatewayMerchantBalanceUnique` (`merchantId`,`currency`,`walletType`) USING BTREE,
  KEY `gatewayMerchantBalanceMerchantIdFkey` (`merchantId`) USING BTREE,
  CONSTRAINT `gateway_merchant_balance_ibfk_1` FOREIGN KEY (`merchantId`) REFERENCES `gateway_merchant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `gateway_payment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gateway_payment` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `merchantId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `customerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `transactionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `paymentIntentId` varchar(64) NOT NULL,
  `merchantOrderId` varchar(255) DEFAULT NULL,
  `amount` decimal(30,8) NOT NULL,
  `currency` varchar(20) NOT NULL,
  `walletType` enum('FIAT','SPOT','ECO') NOT NULL DEFAULT 'FIAT',
  `feeAmount` decimal(30,8) NOT NULL DEFAULT 0.00000000,
  `netAmount` decimal(30,8) NOT NULL DEFAULT 0.00000000,
  `status` enum('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED','EXPIRED','REFUNDED','PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING',
  `checkoutUrl` varchar(1000) NOT NULL,
  `returnUrl` varchar(1000) NOT NULL,
  `cancelUrl` varchar(1000) DEFAULT NULL,
  `webhookUrl` varchar(1000) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `lineItems` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`lineItems`)),
  `customerEmail` varchar(255) DEFAULT NULL,
  `customerName` varchar(191) DEFAULT NULL,
  `billingAddress` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`billingAddress`)),
  `expiresAt` datetime NOT NULL,
  `completedAt` datetime DEFAULT NULL,
  `ipAddress` varchar(45) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `testMode` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `allocations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of wallet allocations used for this payment' CHECK (json_valid(`allocations`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `paymentIntentId` (`paymentIntentId`),
  UNIQUE KEY `gatewayPaymentIntentIdUnique` (`paymentIntentId`) USING BTREE,
  UNIQUE KEY `paymentIntentId_2` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_3` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_4` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_5` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_6` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_7` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_8` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_9` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_10` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_11` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_12` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_13` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_14` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_15` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_16` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_17` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_18` (`paymentIntentId`),
  UNIQUE KEY `paymentIntentId_19` (`paymentIntentId`),
  KEY `gatewayPaymentMerchantIdFkey` (`merchantId`) USING BTREE,
  KEY `gatewayPaymentCustomerIdFkey` (`customerId`) USING BTREE,
  KEY `gatewayPaymentTransactionIdFkey` (`transactionId`) USING BTREE,
  KEY `gatewayPaymentStatusIdx` (`status`) USING BTREE,
  KEY `gatewayPaymentMerchantOrderIdx` (`merchantId`,`merchantOrderId`) USING BTREE,
  CONSTRAINT `gateway_payment_ibfk_1600` FOREIGN KEY (`merchantId`) REFERENCES `gateway_merchant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `gateway_payment_ibfk_1601` FOREIGN KEY (`customerId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `gateway_payment_ibfk_1602` FOREIGN KEY (`transactionId`) REFERENCES `transaction` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `gateway_payout`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gateway_payout` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `merchantId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `transactionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `payoutId` varchar(64) NOT NULL,
  `amount` decimal(30,8) NOT NULL,
  `currency` varchar(20) NOT NULL,
  `walletType` varchar(20) NOT NULL DEFAULT 'FIAT',
  `status` enum('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `periodStart` datetime NOT NULL,
  `periodEnd` datetime NOT NULL,
  `grossAmount` decimal(30,8) NOT NULL DEFAULT 0.00000000,
  `feeAmount` decimal(30,8) NOT NULL DEFAULT 0.00000000,
  `netAmount` decimal(30,8) NOT NULL DEFAULT 0.00000000,
  `paymentCount` int(11) NOT NULL DEFAULT 0,
  `refundCount` int(11) NOT NULL DEFAULT 0,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payoutId` (`payoutId`),
  UNIQUE KEY `gatewayPayoutIdUnique` (`payoutId`) USING BTREE,
  UNIQUE KEY `payoutId_2` (`payoutId`),
  UNIQUE KEY `payoutId_3` (`payoutId`),
  UNIQUE KEY `payoutId_4` (`payoutId`),
  UNIQUE KEY `payoutId_5` (`payoutId`),
  UNIQUE KEY `payoutId_6` (`payoutId`),
  UNIQUE KEY `payoutId_7` (`payoutId`),
  UNIQUE KEY `payoutId_8` (`payoutId`),
  UNIQUE KEY `payoutId_9` (`payoutId`),
  UNIQUE KEY `payoutId_10` (`payoutId`),
  UNIQUE KEY `payoutId_11` (`payoutId`),
  UNIQUE KEY `payoutId_12` (`payoutId`),
  UNIQUE KEY `payoutId_13` (`payoutId`),
  UNIQUE KEY `payoutId_14` (`payoutId`),
  UNIQUE KEY `payoutId_15` (`payoutId`),
  UNIQUE KEY `payoutId_16` (`payoutId`),
  UNIQUE KEY `payoutId_17` (`payoutId`),
  UNIQUE KEY `payoutId_18` (`payoutId`),
  UNIQUE KEY `payoutId_19` (`payoutId`),
  KEY `gatewayPayoutMerchantIdFkey` (`merchantId`) USING BTREE,
  KEY `gatewayPayoutTransactionIdFkey` (`transactionId`) USING BTREE,
  KEY `gatewayPayoutStatusIdx` (`status`) USING BTREE,
  CONSTRAINT `gateway_payout_ibfk_1043` FOREIGN KEY (`merchantId`) REFERENCES `gateway_merchant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `gateway_payout_ibfk_1044` FOREIGN KEY (`transactionId`) REFERENCES `transaction` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `gateway_refund`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gateway_refund` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `paymentId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `merchantId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `transactionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `refundId` varchar(64) NOT NULL,
  `amount` decimal(30,8) NOT NULL,
  `currency` varchar(20) NOT NULL,
  `reason` enum('REQUESTED_BY_CUSTOMER','DUPLICATE','FRAUDULENT','OTHER') NOT NULL DEFAULT 'REQUESTED_BY_CUSTOMER',
  `description` text DEFAULT NULL,
  `status` enum('PENDING','COMPLETED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `refundId` (`refundId`),
  UNIQUE KEY `gatewayRefundIdUnique` (`refundId`) USING BTREE,
  UNIQUE KEY `refundId_2` (`refundId`),
  UNIQUE KEY `refundId_3` (`refundId`),
  UNIQUE KEY `refundId_4` (`refundId`),
  UNIQUE KEY `refundId_5` (`refundId`),
  UNIQUE KEY `refundId_6` (`refundId`),
  UNIQUE KEY `refundId_7` (`refundId`),
  UNIQUE KEY `refundId_8` (`refundId`),
  UNIQUE KEY `refundId_9` (`refundId`),
  UNIQUE KEY `refundId_10` (`refundId`),
  UNIQUE KEY `refundId_11` (`refundId`),
  UNIQUE KEY `refundId_12` (`refundId`),
  UNIQUE KEY `refundId_13` (`refundId`),
  UNIQUE KEY `refundId_14` (`refundId`),
  UNIQUE KEY `refundId_15` (`refundId`),
  UNIQUE KEY `refundId_16` (`refundId`),
  UNIQUE KEY `refundId_17` (`refundId`),
  UNIQUE KEY `refundId_18` (`refundId`),
  UNIQUE KEY `refundId_19` (`refundId`),
  KEY `gatewayRefundPaymentIdFkey` (`paymentId`) USING BTREE,
  KEY `gatewayRefundMerchantIdFkey` (`merchantId`) USING BTREE,
  KEY `gatewayRefundTransactionIdFkey` (`transactionId`) USING BTREE,
  KEY `gatewayRefundStatusIdx` (`status`) USING BTREE,
  CONSTRAINT `gateway_refund_ibfk_1548` FOREIGN KEY (`paymentId`) REFERENCES `gateway_payment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `gateway_refund_ibfk_1549` FOREIGN KEY (`merchantId`) REFERENCES `gateway_merchant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `gateway_refund_ibfk_1550` FOREIGN KEY (`transactionId`) REFERENCES `transaction` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `gateway_webhook`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gateway_webhook` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `merchantId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `paymentId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `refundId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `eventType` varchar(100) NOT NULL,
  `url` varchar(1000) NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `signature` varchar(255) NOT NULL,
  `status` enum('PENDING','SENT','FAILED','RETRYING') NOT NULL DEFAULT 'PENDING',
  `attempts` int(11) NOT NULL DEFAULT 0,
  `maxAttempts` int(11) NOT NULL DEFAULT 5,
  `lastAttemptAt` datetime DEFAULT NULL,
  `nextRetryAt` datetime DEFAULT NULL,
  `responseStatus` int(11) DEFAULT NULL,
  `responseBody` text DEFAULT NULL,
  `responseTime` int(11) DEFAULT NULL,
  `errorMessage` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `gatewayWebhookMerchantIdFkey` (`merchantId`) USING BTREE,
  KEY `gatewayWebhookPaymentIdFkey` (`paymentId`) USING BTREE,
  KEY `gatewayWebhookRefundIdFkey` (`refundId`) USING BTREE,
  KEY `gatewayWebhookStatusIdx` (`status`) USING BTREE,
  KEY `gatewayWebhookNextRetryIdx` (`nextRetryAt`) USING BTREE,
  CONSTRAINT `gateway_webhook_ibfk_1539` FOREIGN KEY (`merchantId`) REFERENCES `gateway_merchant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `gateway_webhook_ibfk_1540` FOREIGN KEY (`paymentId`) REFERENCES `gateway_payment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `gateway_webhook_ibfk_1541` FOREIGN KEY (`refundId`) REFERENCES `gateway_refund` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_admin_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_admin_activity` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` varchar(50) NOT NULL,
  `offeringId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `offeringName` varchar(191) NOT NULL,
  `adminId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `offeringId` (`offeringId`),
  KEY `adminId` (`adminId`),
  KEY `userId` (`userId`),
  CONSTRAINT `ico_admin_activity_ibfk_14858` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_admin_activity_ibfk_14859` FOREIGN KEY (`adminId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_admin_activity_ibfk_14860` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_admin_activity_ibfk_9000` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_admin_activity_ibfk_9001` FOREIGN KEY (`adminId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_admin_activity_ibfk_9002` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_blockchain`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_blockchain` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `value` varchar(191) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_launch_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_launch_plan` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `price` double NOT NULL,
  `currency` varchar(10) NOT NULL,
  `walletType` varchar(191) NOT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`features`)),
  `recommended` tinyint(1) NOT NULL DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_roadmap_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_roadmap_item` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `offeringId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `date` varchar(50) NOT NULL,
  `completed` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `offeringId` (`offeringId`),
  CONSTRAINT `ico_roadmap_item_ibfk_1` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_team_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_team_member` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `offeringId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `role` varchar(100) NOT NULL,
  `bio` text NOT NULL,
  `avatar` varchar(191) DEFAULT NULL,
  `linkedin` varchar(191) DEFAULT NULL,
  `twitter` varchar(191) DEFAULT NULL,
  `website` varchar(191) DEFAULT NULL,
  `github` varchar(191) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `offeringId` (`offeringId`),
  CONSTRAINT `ico_team_member_ibfk_1` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_token_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_token_detail` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `offeringId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tokenType` varchar(50) NOT NULL,
  `totalSupply` double NOT NULL,
  `tokensForSale` double NOT NULL,
  `salePercentage` double NOT NULL,
  `blockchain` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `useOfFunds` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`useOfFunds`)),
  `links` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`links`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `offeringId` (`offeringId`),
  UNIQUE KEY `icoTokenDetailOfferingIdKey` (`offeringId`),
  UNIQUE KEY `offeringId_2` (`offeringId`),
  UNIQUE KEY `offeringId_3` (`offeringId`),
  UNIQUE KEY `offeringId_4` (`offeringId`),
  UNIQUE KEY `offeringId_5` (`offeringId`),
  UNIQUE KEY `offeringId_6` (`offeringId`),
  UNIQUE KEY `offeringId_7` (`offeringId`),
  UNIQUE KEY `offeringId_8` (`offeringId`),
  UNIQUE KEY `offeringId_9` (`offeringId`),
  UNIQUE KEY `offeringId_10` (`offeringId`),
  UNIQUE KEY `offeringId_11` (`offeringId`),
  UNIQUE KEY `offeringId_12` (`offeringId`),
  UNIQUE KEY `offeringId_13` (`offeringId`),
  UNIQUE KEY `offeringId_14` (`offeringId`),
  UNIQUE KEY `offeringId_15` (`offeringId`),
  UNIQUE KEY `offeringId_16` (`offeringId`),
  UNIQUE KEY `offeringId_17` (`offeringId`),
  UNIQUE KEY `offeringId_18` (`offeringId`),
  UNIQUE KEY `offeringId_19` (`offeringId`),
  UNIQUE KEY `offeringId_20` (`offeringId`),
  UNIQUE KEY `offeringId_21` (`offeringId`),
  UNIQUE KEY `offeringId_22` (`offeringId`),
  UNIQUE KEY `offeringId_23` (`offeringId`),
  UNIQUE KEY `offeringId_24` (`offeringId`),
  UNIQUE KEY `offeringId_25` (`offeringId`),
  UNIQUE KEY `offeringId_26` (`offeringId`),
  UNIQUE KEY `offeringId_27` (`offeringId`),
  UNIQUE KEY `offeringId_28` (`offeringId`),
  UNIQUE KEY `offeringId_29` (`offeringId`),
  UNIQUE KEY `offeringId_30` (`offeringId`),
  UNIQUE KEY `offeringId_31` (`offeringId`),
  UNIQUE KEY `offeringId_32` (`offeringId`),
  UNIQUE KEY `offeringId_33` (`offeringId`),
  UNIQUE KEY `offeringId_34` (`offeringId`),
  UNIQUE KEY `offeringId_35` (`offeringId`),
  UNIQUE KEY `offeringId_36` (`offeringId`),
  UNIQUE KEY `offeringId_37` (`offeringId`),
  UNIQUE KEY `offeringId_38` (`offeringId`),
  UNIQUE KEY `offeringId_39` (`offeringId`),
  UNIQUE KEY `offeringId_40` (`offeringId`),
  UNIQUE KEY `offeringId_41` (`offeringId`),
  UNIQUE KEY `offeringId_42` (`offeringId`),
  UNIQUE KEY `offeringId_43` (`offeringId`),
  UNIQUE KEY `offeringId_44` (`offeringId`),
  UNIQUE KEY `offeringId_45` (`offeringId`),
  UNIQUE KEY `offeringId_46` (`offeringId`),
  UNIQUE KEY `offeringId_47` (`offeringId`),
  UNIQUE KEY `offeringId_48` (`offeringId`),
  UNIQUE KEY `offeringId_49` (`offeringId`),
  UNIQUE KEY `offeringId_50` (`offeringId`),
  UNIQUE KEY `offeringId_51` (`offeringId`),
  UNIQUE KEY `offeringId_52` (`offeringId`),
  UNIQUE KEY `offeringId_53` (`offeringId`),
  UNIQUE KEY `offeringId_54` (`offeringId`),
  UNIQUE KEY `offeringId_55` (`offeringId`),
  UNIQUE KEY `offeringId_56` (`offeringId`),
  UNIQUE KEY `offeringId_57` (`offeringId`),
  UNIQUE KEY `offeringId_58` (`offeringId`),
  UNIQUE KEY `offeringId_59` (`offeringId`),
  UNIQUE KEY `offeringId_60` (`offeringId`),
  UNIQUE KEY `offeringId_61` (`offeringId`),
  UNIQUE KEY `offeringId_62` (`offeringId`),
  CONSTRAINT `ico_token_detail_ibfk_1` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_token_offering`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_token_offering` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `planId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `symbol` varchar(10) NOT NULL,
  `icon` varchar(191) NOT NULL,
  `status` enum('ACTIVE','SUCCESS','FAILED','UPCOMING','PENDING','REJECTED','DISABLED') NOT NULL,
  `tokenPrice` double NOT NULL,
  `targetAmount` double NOT NULL,
  `startDate` datetime NOT NULL,
  `endDate` datetime NOT NULL,
  `participants` int(11) NOT NULL,
  `currentPrice` double DEFAULT NULL,
  `priceChange` double DEFAULT NULL,
  `submittedAt` datetime DEFAULT NULL,
  `approvedAt` datetime DEFAULT NULL,
  `rejectedAt` datetime DEFAULT NULL,
  `reviewNotes` varchar(191) DEFAULT NULL,
  `isPaused` tinyint(1) NOT NULL DEFAULT 0,
  `isFlagged` tinyint(1) NOT NULL DEFAULT 0,
  `featured` tinyint(1) DEFAULT NULL,
  `website` varchar(191) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `purchaseWalletCurrency` varchar(10) NOT NULL,
  `purchaseWalletType` varchar(191) NOT NULL,
  `typeId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `icoTokenOfferingSymbolKey` (`symbol`),
  KEY `userId` (`userId`),
  KEY `planId` (`planId`),
  KEY `typeId` (`typeId`),
  CONSTRAINT `ico_token_offering_ibfk_15785` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_token_offering_ibfk_15786` FOREIGN KEY (`planId`) REFERENCES `ico_launch_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_token_offering_ibfk_15787` FOREIGN KEY (`typeId`) REFERENCES `ico_token_type` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_token_offering_ibfk_9887` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_token_offering_ibfk_9888` FOREIGN KEY (`planId`) REFERENCES `ico_launch_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_token_offering_ibfk_9889` FOREIGN KEY (`typeId`) REFERENCES `ico_token_type` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_token_offering_phase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_token_offering_phase` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `offeringId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `tokenPrice` double NOT NULL,
  `allocation` double NOT NULL,
  `remaining` double NOT NULL,
  `duration` int(11) NOT NULL,
  `sequence` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `icoTokenOfferingPhaseOfferingIdNameKey` (`offeringId`,`name`),
  CONSTRAINT `ico_token_offering_phase_ibfk_1` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_token_offering_update`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_token_offering_update` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `offeringId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(191) NOT NULL,
  `content` text NOT NULL,
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachments`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `offeringId` (`offeringId`),
  KEY `userId` (`userId`),
  CONSTRAINT `ico_token_offering_update_ibfk_1959` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_token_offering_update_ibfk_1960` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_token_offering_update_ibfk_3963` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_token_offering_update_ibfk_3964` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_token_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_token_type` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `value` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_token_vesting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_token_vesting` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `transactionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `offeringId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `totalAmount` double NOT NULL,
  `releasedAmount` double NOT NULL DEFAULT 0,
  `vestingType` enum('LINEAR','CLIFF','MILESTONE') NOT NULL DEFAULT 'LINEAR',
  `startDate` datetime NOT NULL,
  `endDate` datetime NOT NULL,
  `cliffDuration` int(11) DEFAULT NULL COMMENT 'Cliff duration in days',
  `releaseSchedule` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON array of milestone releases [{date, percentage, amount}]' CHECK (json_valid(`releaseSchedule`)),
  `status` enum('ACTIVE','COMPLETED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ico_token_vesting_transaction_id` (`transactionId`),
  KEY `ico_token_vesting_user_id` (`userId`),
  KEY `ico_token_vesting_offering_id` (`offeringId`),
  KEY `ico_token_vesting_status` (`status`),
  KEY `ico_token_vesting_start_date_end_date` (`startDate`,`endDate`),
  CONSTRAINT `ico_token_vesting_ibfk_31` FOREIGN KEY (`transactionId`) REFERENCES `ico_transaction` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ico_token_vesting_ibfk_32` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ico_token_vesting_ibfk_33` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ico_token_vesting_ibfk_5608` FOREIGN KEY (`transactionId`) REFERENCES `ico_transaction` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_token_vesting_ibfk_5609` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_token_vesting_ibfk_5610` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_token_vesting_release`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_token_vesting_release` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `vestingId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Reference to the parent vesting record',
  `releaseDate` datetime NOT NULL COMMENT 'Date when tokens should be released',
  `releaseAmount` double NOT NULL COMMENT 'Amount of tokens to release',
  `percentage` double NOT NULL COMMENT 'Percentage of total vesting amount',
  `status` enum('PENDING','RELEASED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING' COMMENT 'Current status of this release',
  `transactionHash` varchar(191) DEFAULT NULL COMMENT 'Blockchain transaction hash if released on-chain',
  `releasedAt` datetime DEFAULT NULL COMMENT 'Actual date when tokens were released',
  `failureReason` text DEFAULT NULL COMMENT 'Reason for failure if status is FAILED',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional metadata about the release' CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ico_token_vesting_release_vesting_id` (`vestingId`),
  KEY `ico_token_vesting_release_release_date` (`releaseDate`),
  KEY `ico_token_vesting_release_status` (`status`),
  KEY `ico_token_vesting_release_vesting_id_status` (`vestingId`,`status`),
  KEY `ico_token_vesting_release_release_date_status` (`releaseDate`,`status`),
  CONSTRAINT `ico_token_vesting_release_ibfk_1` FOREIGN KEY (`vestingId`) REFERENCES `ico_token_vesting` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_transaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_transaction` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `offeringId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` double NOT NULL,
  `price` double NOT NULL,
  `status` enum('PENDING','VERIFICATION','RELEASED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `walletAddress` varchar(191) DEFAULT NULL,
  `releaseUrl` varchar(191) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `icoTransactionOfferingIdUserIdKey` (`offeringId`,`userId`),
  KEY `userId` (`userId`),
  CONSTRAINT `ico_transaction_ibfk_1489` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_transaction_ibfk_1490` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_transaction_ibfk_5231` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_transaction_ibfk_5232` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `investment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `investment` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `planId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `durationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` double NOT NULL COMMENT 'Amount invested by the user',
  `profit` double DEFAULT NULL COMMENT 'Profit earned from this investment (if completed)',
  `result` enum('WIN','LOSS','DRAW') DEFAULT NULL COMMENT 'Final result of the investment (WIN, LOSS, or DRAW)',
  `status` enum('ACTIVE','COMPLETED','CANCELLED','REJECTED') NOT NULL DEFAULT 'ACTIVE' COMMENT 'Current status of the investment',
  `endDate` datetime(3) DEFAULT NULL COMMENT 'Date when the investment period ends',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `investmentIdKey` (`id`) USING BTREE,
  UNIQUE KEY `investmentUserIdPlanIdStatusUnique` (`userId`,`planId`,`status`) USING BTREE,
  KEY `investmentUserIdFkey` (`userId`) USING BTREE,
  KEY `investmentPlanIdFkey` (`planId`) USING BTREE,
  KEY `investmentDurationIdFkey` (`durationId`) USING BTREE,
  CONSTRAINT `investment_ibfk_40452` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `investment_ibfk_40453` FOREIGN KEY (`planId`) REFERENCES `investment_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `investment_ibfk_40454` FOREIGN KEY (`durationId`) REFERENCES `investment_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `investment_ibfk_45049` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `investment_ibfk_45050` FOREIGN KEY (`planId`) REFERENCES `investment_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `investment_ibfk_45051` FOREIGN KEY (`durationId`) REFERENCES `investment_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `investment_duration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `investment_duration` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `duration` int(11) NOT NULL COMMENT 'Duration value (number of timeframe units)',
  `timeframe` enum('HOUR','DAY','WEEK','MONTH') NOT NULL COMMENT 'Time unit for the duration (HOUR, DAY, WEEK, MONTH)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `investment_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `investment_plan` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL COMMENT 'Unique name identifier for the investment plan',
  `title` varchar(191) NOT NULL COMMENT 'Display title of the investment plan shown to users',
  `image` varchar(191) DEFAULT NULL COMMENT 'URL path to the plan''s image/logo',
  `description` text NOT NULL COMMENT 'Detailed description of the investment plan',
  `currency` varchar(191) NOT NULL COMMENT 'Currency code that this plan accepts for investment',
  `minAmount` double NOT NULL COMMENT 'Minimum amount of investment required for this plan',
  `maxAmount` double NOT NULL COMMENT 'Maximum amount of investment allowed for this plan',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Indicates if this investment plan is active or inactive',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `invested` int(11) NOT NULL DEFAULT 0 COMMENT 'Total amount of money invested in this plan',
  `profitPercentage` double NOT NULL DEFAULT 0 COMMENT 'Expected profit percentage for this plan',
  `minProfit` double NOT NULL COMMENT 'Minimum profit amount for this plan',
  `maxProfit` double NOT NULL COMMENT 'Maximum profit amount for this plan',
  `defaultProfit` int(11) NOT NULL DEFAULT 0 COMMENT 'Default profit amount for this plan',
  `defaultResult` enum('WIN','LOSS','DRAW') NOT NULL COMMENT 'Default outcome for this plan (WIN, LOSS, DRAW)',
  `trending` tinyint(1) DEFAULT 0 COMMENT 'Indicates if this plan is currently trending or popular',
  `walletType` varchar(191) NOT NULL COMMENT 'Type of wallet (e.g., ''crypto'', ''fiat'') that this plan uses',
  PRIMARY KEY (`id`),
  UNIQUE KEY `investmentPlanNameKey` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `investment_plan_duration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `investment_plan_duration` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `planId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `durationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idxPlanId` (`planId`) USING BTREE,
  KEY `idxDurationId` (`durationId`) USING BTREE,
  CONSTRAINT `investment_plan_duration_ibfk_15363` FOREIGN KEY (`planId`) REFERENCES `investment_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `investment_plan_duration_ibfk_15364` FOREIGN KEY (`durationId`) REFERENCES `investment_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `investment_plan_duration_ibfk_18419` FOREIGN KEY (`planId`) REFERENCES `investment_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `investment_plan_duration_ibfk_18420` FOREIGN KEY (`durationId`) REFERENCES `investment_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `kyc_application`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kyc_application` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `levelId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','ADDITIONAL_INFO_REQUIRED') NOT NULL DEFAULT 'PENDING' COMMENT 'Current status of the KYC application review process',
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'KYC application data including documents and personal information' CHECK (json_valid(`data`)),
  `adminNotes` text DEFAULT NULL COMMENT 'Notes added by admin during KYC review process',
  `reviewedAt` datetime DEFAULT NULL COMMENT 'Date and time when the application was reviewed by admin',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `levelId` (`levelId`),
  CONSTRAINT `kyc_application_ibfk_4277` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `kyc_application_ibfk_4278` FOREIGN KEY (`levelId`) REFERENCES `kyc_level` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `kyc_application_ibfk_7315` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `kyc_application_ibfk_7316` FOREIGN KEY (`levelId`) REFERENCES `kyc_level` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `kyc_level`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kyc_level` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL COMMENT 'Name of the KYC level (e.g., ''Basic'', ''Intermediate'', ''Advanced'')',
  `description` text DEFAULT NULL COMMENT 'Detailed description of the KYC level requirements',
  `level` int(11) NOT NULL COMMENT 'Numeric level indicating the verification tier (1, 2, 3, etc.)',
  `fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Required fields and documents for this KYC level' CHECK (json_valid(`fields`)),
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Features and benefits unlocked at this KYC level' CHECK (json_valid(`features`)),
  `status` enum('ACTIVE','DRAFT','INACTIVE') NOT NULL DEFAULT 'ACTIVE' COMMENT 'Current status of this KYC level configuration',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `serviceId` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `serviceId` (`serviceId`),
  CONSTRAINT `kyc_level_ibfk_1` FOREIGN KEY (`serviceId`) REFERENCES `kyc_verification_service` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `kyc_verification_result`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kyc_verification_result` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `applicationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `serviceId` varchar(191) NOT NULL,
  `status` enum('VERIFIED','FAILED','PENDING','NOT_STARTED') NOT NULL COMMENT 'Status of the verification process for this service',
  `score` double DEFAULT NULL COMMENT 'Verification confidence score provided by the service',
  `checks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Detailed verification checks and their results' CHECK (json_valid(`checks`)),
  `documentVerifications` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Results of document verification checks' CHECK (json_valid(`documentVerifications`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `applicationId` (`applicationId`),
  KEY `serviceId` (`serviceId`),
  CONSTRAINT `kyc_verification_result_ibfk_4205` FOREIGN KEY (`applicationId`) REFERENCES `kyc_application` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `kyc_verification_result_ibfk_4206` FOREIGN KEY (`serviceId`) REFERENCES `kyc_verification_service` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `kyc_verification_result_ibfk_7229` FOREIGN KEY (`applicationId`) REFERENCES `kyc_application` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `kyc_verification_result_ibfk_7230` FOREIGN KEY (`serviceId`) REFERENCES `kyc_verification_service` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `kyc_verification_service`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kyc_verification_service` (
  `id` varchar(255) NOT NULL,
  `name` varchar(191) NOT NULL COMMENT 'Display name of the verification service provider',
  `description` text NOT NULL COMMENT 'Description of the verification service and its capabilities',
  `type` varchar(50) NOT NULL COMMENT 'Type of verification service (e.g., ''document'', ''identity'', ''address'')',
  `integrationDetails` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Configuration and API details for integrating with the service' CHECK (json_valid(`integrationDetails`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `mailwizard_block`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mailwizard_block` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `design` text NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `mailwizard_campaign`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mailwizard_campaign` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `templateId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `subject` varchar(191) NOT NULL,
  `status` enum('PENDING','PAUSED','ACTIVE','STOPPED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `speed` int(11) NOT NULL DEFAULT 1,
  `targets` longtext DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mailwizardCampaignTemplateIdForeign` (`templateId`) USING BTREE,
  CONSTRAINT `mailwizard_campaign_ibfk_1` FOREIGN KEY (`templateId`) REFERENCES `mailwizard_template` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `mailwizard_template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mailwizard_template` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `content` longtext NOT NULL,
  `design` longtext NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `mlm_binary_node`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mlm_binary_node` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `referralId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `parentId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `leftChildId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `rightChildId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mlmBinaryNodeReferralIdKey` (`referralId`) USING BTREE,
  KEY `mlmBinaryNodeParentIdFkey` (`parentId`) USING BTREE,
  KEY `mlmBinaryNodeLeftChildIdFkey` (`leftChildId`) USING BTREE,
  KEY `mlmBinaryNodeRightChildIdFkey` (`rightChildId`) USING BTREE,
  CONSTRAINT `mlm_binary_node_ibfk_17828` FOREIGN KEY (`referralId`) REFERENCES `mlm_referral` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_binary_node_ibfk_17829` FOREIGN KEY (`parentId`) REFERENCES `mlm_binary_node` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_binary_node_ibfk_17830` FOREIGN KEY (`leftChildId`) REFERENCES `mlm_binary_node` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_binary_node_ibfk_17831` FOREIGN KEY (`rightChildId`) REFERENCES `mlm_binary_node` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_binary_node_ibfk_8804` FOREIGN KEY (`referralId`) REFERENCES `mlm_referral` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_binary_node_ibfk_8805` FOREIGN KEY (`parentId`) REFERENCES `mlm_binary_node` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_binary_node_ibfk_8806` FOREIGN KEY (`leftChildId`) REFERENCES `mlm_binary_node` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_binary_node_ibfk_8807` FOREIGN KEY (`rightChildId`) REFERENCES `mlm_binary_node` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `mlm_referral`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mlm_referral` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `referrerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `referredId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` enum('PENDING','ACTIVE','REJECTED') NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mlmReferralReferredIdKey` (`referredId`) USING BTREE,
  UNIQUE KEY `mlmReferralReferrerIdReferredIdKey` (`referrerId`,`referredId`) USING BTREE,
  CONSTRAINT `mlm_referral_ibfk_1` FOREIGN KEY (`referrerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_referral_ibfk_2` FOREIGN KEY (`referredId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `mlm_referral_condition`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mlm_referral_condition` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) NOT NULL,
  `type` enum('DEPOSIT','TRADE','INVESTMENT','BINARY_WIN','AI_INVESTMENT','FOREX_INVESTMENT','ICO_CONTRIBUTION','STAKING','ECOMMERCE_PURCHASE','P2P_TRADE') NOT NULL,
  `reward` double NOT NULL,
  `rewardType` enum('PERCENTAGE','FIXED') NOT NULL,
  `rewardWalletType` enum('FIAT','SPOT','ECO') NOT NULL,
  `rewardCurrency` varchar(191) NOT NULL,
  `rewardChain` varchar(191) DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `image` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `mlmReferralConditionNameKey` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `mlm_referral_reward`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mlm_referral_reward` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `conditionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `referrerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `reward` double NOT NULL,
  `isClaimed` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mlmReferralRewardConditionIdFkey` (`conditionId`) USING BTREE,
  KEY `mlmReferralRewardReferrerIdFkey` (`referrerId`) USING BTREE,
  CONSTRAINT `mlm_referral_reward_ibfk_2253` FOREIGN KEY (`conditionId`) REFERENCES `mlm_referral_condition` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_referral_reward_ibfk_2254` FOREIGN KEY (`referrerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_referral_reward_ibfk_6745` FOREIGN KEY (`conditionId`) REFERENCES `mlm_referral_condition` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_referral_reward_ibfk_6746` FOREIGN KEY (`referrerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `mlm_unilevel_node`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mlm_unilevel_node` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `referralId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `parentId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mlmUnilevelNodeReferralIdKey` (`referralId`) USING BTREE,
  KEY `mlmUnilevelNodeParentIdFkey` (`parentId`) USING BTREE,
  CONSTRAINT `mlm_unilevel_node_ibfk_12035` FOREIGN KEY (`referralId`) REFERENCES `mlm_referral` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_unilevel_node_ibfk_12036` FOREIGN KEY (`parentId`) REFERENCES `mlm_unilevel_node` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_unilevel_node_ibfk_7563` FOREIGN KEY (`referralId`) REFERENCES `mlm_referral` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_unilevel_node_ibfk_7564` FOREIGN KEY (`parentId`) REFERENCES `mlm_unilevel_node` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_activity` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` enum('MINT','TRANSFER','SALE','LIST','DELIST','BID','OFFER','BURN','COLLECTION_CREATED','COLLECTION_DEPLOYED','AUCTION_ENDED') NOT NULL,
  `tokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `collectionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `listingId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `fromUserId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `toUserId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `price` decimal(36,18) DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `transactionHash` varchar(255) DEFAULT NULL,
  `blockNumber` int(11) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `offerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `bidId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `nftActivityTokenIdx` (`tokenId`) USING BTREE,
  KEY `nftActivityCollectionIdx` (`collectionId`) USING BTREE,
  KEY `nftActivityTypeIdx` (`type`) USING BTREE,
  KEY `nftActivityFromUserIdx` (`fromUserId`) USING BTREE,
  KEY `nftActivityToUserIdx` (`toUserId`) USING BTREE,
  KEY `nftActivityCreatedAtIdx` (`createdAt`) USING BTREE,
  KEY `listingId` (`listingId`),
  KEY `nftActivityOfferIdx` (`offerId`) USING BTREE,
  KEY `nftActivityBidIdx` (`bidId`) USING BTREE,
  CONSTRAINT `nft_activity_ibfk_5182` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_5183` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_5184` FOREIGN KEY (`listingId`) REFERENCES `nft_listing` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_5185` FOREIGN KEY (`fromUserId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_5186` FOREIGN KEY (`toUserId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_9674` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_9675` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_9676` FOREIGN KEY (`listingId`) REFERENCES `nft_listing` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_9677` FOREIGN KEY (`fromUserId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_9678` FOREIGN KEY (`toUserId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_9679` FOREIGN KEY (`offerId`) REFERENCES `nft_offer` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_9680` FOREIGN KEY (`bidId`) REFERENCES `nft_bid` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_bid`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_bid` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `listingId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` decimal(36,18) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'ETH',
  `expiresAt` datetime DEFAULT NULL,
  `status` enum('ACTIVE','ACCEPTED','REJECTED','EXPIRED','CANCELLED','OUTBID') NOT NULL DEFAULT 'ACTIVE',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `tokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `transactionHash` varchar(255) DEFAULT NULL,
  `acceptedAt` datetime DEFAULT NULL,
  `rejectedAt` datetime DEFAULT NULL,
  `outbidAt` datetime DEFAULT NULL,
  `cancelledAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `nftBidListingIdx` (`listingId`) USING BTREE,
  KEY `nftBidStatusIdx` (`status`) USING BTREE,
  KEY `nftBidAmountIdx` (`amount`) USING BTREE,
  KEY `nftBidExpiresAtIdx` (`expiresAt`) USING BTREE,
  KEY `nftBidUserIdx` (`userId`) USING BTREE,
  KEY `nftBidTokenIdx` (`tokenId`) USING BTREE,
  CONSTRAINT `nft_bid_ibfk_1854` FOREIGN KEY (`listingId`) REFERENCES `nft_listing` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_bid_ibfk_1855` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_bid_ibfk_1856` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_category` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(1000) DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nftCategoryNameKey` (`name`),
  UNIQUE KEY `nftCategorySlugKey` (`slug`),
  KEY `nftCategoryStatusIdx` (`status`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_collection`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_collection` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `symbol` varchar(10) NOT NULL,
  `contractAddress` varchar(255) DEFAULT NULL,
  `chain` varchar(255) NOT NULL,
  `network` varchar(255) NOT NULL DEFAULT 'mainnet',
  `standard` enum('ERC721','ERC1155') NOT NULL DEFAULT 'ERC721',
  `totalSupply` int(11) DEFAULT 0,
  `maxSupply` int(11) DEFAULT NULL,
  `mintPrice` decimal(36,18) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'ETH',
  `royaltyPercentage` decimal(5,2) DEFAULT 2.50,
  `royaltyAddress` varchar(255) DEFAULT NULL,
  `creatorId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `categoryId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `bannerImage` varchar(1000) DEFAULT NULL,
  `logoImage` varchar(1000) DEFAULT NULL,
  `featuredImage` varchar(1000) DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `discord` varchar(500) DEFAULT NULL,
  `twitter` varchar(500) DEFAULT NULL,
  `telegram` varchar(500) DEFAULT NULL,
  `isVerified` tinyint(1) NOT NULL DEFAULT 0,
  `isLazyMinted` tinyint(1) NOT NULL DEFAULT 1,
  `isPublicMintEnabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether public minting is enabled on the smart contract. True by default for marketplace collections.',
  `status` enum('DRAFT','PENDING','ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'DRAFT',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nftCollectionSlugKey` (`slug`),
  KEY `nftCollectionCreatorIdx` (`creatorId`) USING BTREE,
  KEY `nftCollectionChainIdx` (`chain`) USING BTREE,
  KEY `nftCollectionStatusIdx` (`status`) USING BTREE,
  KEY `categoryId` (`categoryId`),
  CONSTRAINT `nft_collection_ibfk_1203` FOREIGN KEY (`creatorId`) REFERENCES `nft_creator` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_collection_ibfk_1204` FOREIGN KEY (`categoryId`) REFERENCES `nft_category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_comment` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `collectionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `parentId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `content` text NOT NULL,
  `likes` int(11) NOT NULL DEFAULT 0,
  `isEdited` tinyint(1) NOT NULL DEFAULT 0,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_nft_comment_token` (`tokenId`),
  KEY `idx_nft_comment_collection` (`collectionId`),
  KEY `idx_nft_comment_user` (`userId`),
  KEY `idx_nft_comment_parent` (`parentId`),
  KEY `idx_nft_comment_created` (`createdAt`),
  CONSTRAINT `nft_comment_ibfk_2583` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_comment_ibfk_2584` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_comment_ibfk_2585` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `nft_comment_ibfk_2586` FOREIGN KEY (`parentId`) REFERENCES `nft_comment` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_creator`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_creator` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `displayName` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `banner` varchar(1000) DEFAULT NULL,
  `isVerified` tinyint(1) NOT NULL DEFAULT 0,
  `verificationTier` enum('BRONZE','SILVER','GOLD','PLATINUM') DEFAULT NULL,
  `totalSales` int(11) NOT NULL DEFAULT 0,
  `totalVolume` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `totalItems` int(11) NOT NULL DEFAULT 0,
  `floorPrice` decimal(36,18) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `profilePublic` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nftCreatorUserKey` (`userId`),
  KEY `nftCreatorVerifiedIdx` (`isVerified`) USING BTREE,
  KEY `nftCreatorTierIdx` (`verificationTier`) USING BTREE,
  KEY `nftCreatorVolumeIdx` (`totalVolume`) USING BTREE,
  CONSTRAINT `nft_creator_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_creator_follows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_creator_follows` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `followerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `followingId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_creator_follow` (`followerId`,`followingId`),
  KEY `idx_creator_follow_follower` (`followerId`),
  KEY `idx_creator_follow_following` (`followingId`),
  KEY `idx_creator_follow_created` (`createdAt`),
  CONSTRAINT `nft_creator_follows_ibfk_1` FOREIGN KEY (`followerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_creator_follows_ibfk_2` FOREIGN KEY (`followingId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_dispute`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_dispute` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `listingId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `tokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `transactionHash` varchar(66) DEFAULT NULL,
  `disputeType` enum('FAKE_NFT','COPYRIGHT_INFRINGEMENT','SCAM','NOT_RECEIVED','WRONG_ITEM','UNAUTHORIZED_SALE','OTHER') NOT NULL,
  `status` enum('PENDING','INVESTIGATING','AWAITING_RESPONSE','RESOLVED','REJECTED','ESCALATED') NOT NULL DEFAULT 'PENDING',
  `priority` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  `reporterId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `respondentId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `assignedToId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `evidence` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`evidence`)),
  `resolution` text DEFAULT NULL,
  `resolutionType` enum('REFUND','CANCEL_SALE','REMOVE_LISTING','BAN_USER','WARNING','NO_ACTION') DEFAULT NULL,
  `refundAmount` decimal(36,18) DEFAULT NULL,
  `escalatedAt` datetime(3) DEFAULT NULL,
  `investigatedAt` datetime(3) DEFAULT NULL,
  `resolvedAt` datetime(3) DEFAULT NULL,
  `resolvedById` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_nft_dispute_status` (`status`),
  KEY `idx_nft_dispute_priority` (`priority`),
  KEY `idx_nft_dispute_reporter` (`reporterId`),
  KEY `idx_nft_dispute_respondent` (`respondentId`),
  KEY `idx_nft_dispute_assigned` (`assignedToId`),
  KEY `idx_nft_dispute_listing` (`listingId`),
  KEY `idx_nft_dispute_token` (`tokenId`),
  KEY `idx_nft_dispute_created` (`createdAt`),
  KEY `resolvedById` (`resolvedById`),
  CONSTRAINT `nft_dispute_ibfk_3811` FOREIGN KEY (`listingId`) REFERENCES `nft_listing` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_dispute_ibfk_3812` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_dispute_ibfk_3813` FOREIGN KEY (`reporterId`) REFERENCES `user` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `nft_dispute_ibfk_3814` FOREIGN KEY (`respondentId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_dispute_ibfk_3815` FOREIGN KEY (`assignedToId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_dispute_ibfk_3816` FOREIGN KEY (`resolvedById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_dispute_message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_dispute_message` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `disputeId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `message` text NOT NULL,
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachments`)),
  `isInternal` tinyint(1) NOT NULL DEFAULT 0,
  `isSystemMessage` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_dispute_message_dispute` (`disputeId`),
  KEY `idx_dispute_message_user` (`userId`),
  KEY `idx_dispute_message_created` (`createdAt`),
  CONSTRAINT `nft_dispute_message_ibfk_1263` FOREIGN KEY (`disputeId`) REFERENCES `nft_dispute` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_dispute_message_ibfk_1264` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_favorite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_favorite` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `collectionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nftFavoriteUserTokenKey` (`userId`,`tokenId`) USING BTREE,
  UNIQUE KEY `nftFavoriteUserCollectionKey` (`userId`,`collectionId`) USING BTREE,
  KEY `nftFavoriteUserIdx` (`userId`) USING BTREE,
  KEY `nftFavoriteTokenIdx` (`tokenId`) USING BTREE,
  KEY `nftFavoriteCollectionIdx` (`collectionId`) USING BTREE,
  CONSTRAINT `nft_favorite_ibfk_3072` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_favorite_ibfk_3073` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_favorite_ibfk_3074` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_favorite_ibfk_4957` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_favorite_ibfk_4958` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_favorite_ibfk_4959` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_fractional`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_fractional` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `vaultAddress` varchar(42) DEFAULT NULL,
  `totalShares` int(11) NOT NULL,
  `availableShares` int(11) NOT NULL DEFAULT 0,
  `sharePrice` decimal(36,18) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'ETH',
  `minPurchase` int(11) NOT NULL DEFAULT 1,
  `maxPurchase` int(11) NOT NULL DEFAULT 1000,
  `buyoutPrice` decimal(36,18) DEFAULT NULL,
  `buyoutEnabled` tinyint(1) NOT NULL DEFAULT 1,
  `votingEnabled` tinyint(1) NOT NULL DEFAULT 1,
  `status` enum('PENDING','ACTIVE','BUYOUT_PENDING','BOUGHT_OUT','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `createdById` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `deployedAt` datetime(3) DEFAULT NULL,
  `buyoutAt` datetime(3) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tokenId` (`tokenId`),
  UNIQUE KEY `idx_nft_fractional_token` (`tokenId`),
  KEY `idx_nft_fractional_status` (`status`),
  KEY `idx_nft_fractional_creator` (`createdById`),
  KEY `idx_nft_fractional_vault` (`vaultAddress`),
  CONSTRAINT `nft_fractional_ibfk_1251` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `nft_fractional_ibfk_1252` FOREIGN KEY (`createdById`) REFERENCES `user` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_listing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_listing` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sellerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` enum('FIXED_PRICE','AUCTION','BUNDLE') NOT NULL DEFAULT 'FIXED_PRICE',
  `price` decimal(36,18) DEFAULT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'ETH',
  `reservePrice` decimal(36,18) DEFAULT NULL,
  `buyNowPrice` decimal(36,18) DEFAULT NULL,
  `startTime` datetime DEFAULT NULL,
  `endTime` datetime DEFAULT NULL,
  `status` enum('ACTIVE','SOLD','CANCELLED','EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  `views` int(11) NOT NULL DEFAULT 0,
  `likes` int(11) NOT NULL DEFAULT 0,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `minBidIncrement` decimal(36,18) DEFAULT NULL,
  `currentBid` decimal(36,18) DEFAULT NULL,
  `startingBid` decimal(36,18) DEFAULT NULL,
  `auctionContractAddress` varchar(255) DEFAULT NULL,
  `bundleTokenIds` text DEFAULT NULL,
  `soldAt` datetime DEFAULT NULL,
  `cancelledAt` datetime DEFAULT NULL,
  `endedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `nftListingTokenIdx` (`tokenId`) USING BTREE,
  KEY `nftListingSellerIdx` (`sellerId`) USING BTREE,
  KEY `nftListingStatusIdx` (`status`) USING BTREE,
  KEY `nftListingTypeIdx` (`type`) USING BTREE,
  KEY `nftListingPriceIdx` (`price`) USING BTREE,
  CONSTRAINT `nft_listing_ibfk_2083` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_listing_ibfk_2084` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_listing_ibfk_3425` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_listing_ibfk_3426` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_marketplace`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_marketplace` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chain` varchar(50) NOT NULL,
  `network` varchar(50) NOT NULL DEFAULT 'mainnet',
  `contractAddress` varchar(255) NOT NULL,
  `deployerAddress` varchar(255) NOT NULL,
  `deployedBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `feeRecipient` varchar(255) NOT NULL,
  `feePercentage` decimal(5,2) NOT NULL,
  `listingFee` decimal(20,8) DEFAULT 0.00000000,
  `maxRoyaltyPercentage` decimal(5,2) DEFAULT 10.00,
  `transactionHash` varchar(255) NOT NULL,
  `blockNumber` bigint(20) NOT NULL,
  `gasUsed` varchar(100) DEFAULT NULL,
  `deploymentCost` varchar(100) DEFAULT NULL,
  `status` enum('ACTIVE','PAUSED','DEPRECATED') NOT NULL DEFAULT 'ACTIVE',
  `pauseReason` text DEFAULT NULL,
  `pausedAt` datetime DEFAULT NULL,
  `pausedBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `version` varchar(50) DEFAULT '1.0.0',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nftMarketplaceChainIdx` (`chain`,`network`,`status`) USING BTREE,
  KEY `nftMarketplaceContractIdx` (`contractAddress`) USING BTREE,
  KEY `nftMarketplaceStatusIdx` (`status`) USING BTREE,
  KEY `nftMarketplaceDeployedByIdx` (`deployedBy`) USING BTREE,
  KEY `pausedBy` (`pausedBy`),
  CONSTRAINT `nft_marketplace_ibfk_1` FOREIGN KEY (`deployedBy`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_marketplace_ibfk_2` FOREIGN KEY (`pausedBy`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_offer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_offer` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `collectionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `listingId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(36,18) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'ETH',
  `expiresAt` datetime DEFAULT NULL,
  `status` enum('ACTIVE','ACCEPTED','REJECTED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` enum('TOKEN','COLLECTION') DEFAULT NULL,
  `message` text DEFAULT NULL,
  `acceptedAt` datetime DEFAULT NULL,
  `rejectedAt` datetime DEFAULT NULL,
  `cancelledAt` datetime DEFAULT NULL,
  `expiredAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `nftOfferTokenIdx` (`tokenId`) USING BTREE,
  KEY `nftOfferCollectionIdx` (`collectionId`) USING BTREE,
  KEY `nftOfferListingIdx` (`listingId`) USING BTREE,
  KEY `nftOfferStatusIdx` (`status`) USING BTREE,
  KEY `nftOfferAmountIdx` (`amount`) USING BTREE,
  KEY `nftOfferExpiresAtIdx` (`expiresAt`) USING BTREE,
  KEY `nftOfferUserIdx` (`userId`) USING BTREE,
  CONSTRAINT `nft_offer_ibfk_6728` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_offer_ibfk_6729` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_offer_ibfk_6730` FOREIGN KEY (`listingId`) REFERENCES `nft_listing` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_offer_ibfk_6731` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_price_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_price_history` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the NFT token',
  `collectionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'ID of the NFT collection',
  `price` double NOT NULL COMMENT 'Sale price in the specified currency',
  `currency` varchar(10) NOT NULL COMMENT 'Currency code (ETH, BNB, MATIC, etc.)',
  `priceUSD` double DEFAULT NULL COMMENT 'Price converted to USD at time of sale',
  `saleType` enum('DIRECT','AUCTION','OFFER') NOT NULL COMMENT 'Type of sale',
  `buyerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'ID of the buyer',
  `sellerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'ID of the seller',
  `transactionHash` varchar(191) DEFAULT NULL COMMENT 'Blockchain transaction hash',
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `nftPriceHistoryTokenIdIdx` (`tokenId`) USING BTREE,
  KEY `nftPriceHistoryCollectionIdIdx` (`collectionId`) USING BTREE,
  KEY `nftPriceHistoryCreatedAtIdx` (`createdAt`) USING BTREE,
  KEY `buyerId` (`buyerId`),
  KEY `sellerId` (`sellerId`),
  CONSTRAINT `nft_price_history_ibfk_2305` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_price_history_ibfk_2306` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_price_history_ibfk_2307` FOREIGN KEY (`buyerId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_price_history_ibfk_2308` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_review` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `collectionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `creatorId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `rating` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `isVerified` tinyint(1) NOT NULL DEFAULT 0,
  `helpfulCount` int(11) NOT NULL DEFAULT 0,
  `status` enum('PENDING','APPROVED','REJECTED','HIDDEN') NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `nftReviewUserIdx` (`userId`) USING BTREE,
  KEY `nftReviewTokenIdx` (`tokenId`) USING BTREE,
  KEY `nftReviewCollectionIdx` (`collectionId`) USING BTREE,
  KEY `nftReviewCreatorIdx` (`creatorId`) USING BTREE,
  KEY `nftReviewStatusIdx` (`status`) USING BTREE,
  KEY `nftReviewRatingIdx` (`rating`) USING BTREE,
  KEY `nftReviewVerifiedIdx` (`isVerified`) USING BTREE,
  CONSTRAINT `nft_review_ibfk_3042` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_review_ibfk_3043` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_review_ibfk_3044` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_review_ibfk_3045` FOREIGN KEY (`creatorId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_review_ibfk_4896` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_review_ibfk_4897` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_review_ibfk_4898` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_review_ibfk_4899` FOREIGN KEY (`creatorId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_royalty`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_royalty` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `saleId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `collectionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `recipientId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` decimal(36,18) NOT NULL,
  `percentage` decimal(5,2) NOT NULL,
  `currency` varchar(10) NOT NULL,
  `transactionHash` varchar(255) DEFAULT NULL,
  `blockNumber` int(11) DEFAULT NULL,
  `status` enum('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING',
  `paidAt` datetime DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `nftRoyaltySaleIdx` (`saleId`) USING BTREE,
  KEY `nftRoyaltyTokenIdx` (`tokenId`) USING BTREE,
  KEY `nftRoyaltyCollectionIdx` (`collectionId`) USING BTREE,
  KEY `nftRoyaltyRecipientIdx` (`recipientId`) USING BTREE,
  KEY `nftRoyaltyStatusIdx` (`status`) USING BTREE,
  KEY `nftRoyaltyCreatedAtIdx` (`createdAt`) USING BTREE,
  CONSTRAINT `nft_royalty_ibfk_4006` FOREIGN KEY (`saleId`) REFERENCES `nft_sale` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_royalty_ibfk_4007` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_royalty_ibfk_4008` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_royalty_ibfk_4009` FOREIGN KEY (`recipientId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_royalty_ibfk_6443` FOREIGN KEY (`saleId`) REFERENCES `nft_sale` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_royalty_ibfk_6444` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_royalty_ibfk_6445` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_royalty_ibfk_6446` FOREIGN KEY (`recipientId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_sale`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_sale` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `listingId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `sellerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `buyerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `price` decimal(36,18) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'ETH',
  `marketplaceFee` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `royaltyFee` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `totalFee` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `netAmount` decimal(36,18) NOT NULL,
  `transactionHash` varchar(255) DEFAULT NULL,
  `blockNumber` int(11) DEFAULT NULL,
  `status` enum('PENDING','COMPLETED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `nftSaleTokenIdx` (`tokenId`) USING BTREE,
  KEY `nftSaleListingIdx` (`listingId`) USING BTREE,
  KEY `nftSaleSellerIdx` (`sellerId`) USING BTREE,
  KEY `nftSaleBuyerIdx` (`buyerId`) USING BTREE,
  KEY `nftSaleStatusIdx` (`status`) USING BTREE,
  KEY `nftSalePriceIdx` (`price`) USING BTREE,
  KEY `nftSaleCreatedAtIdx` (`createdAt`) USING BTREE,
  CONSTRAINT `nft_sale_ibfk_4027` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_sale_ibfk_4028` FOREIGN KEY (`listingId`) REFERENCES `nft_listing` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_sale_ibfk_4029` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_sale_ibfk_4030` FOREIGN KEY (`buyerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_sale_ibfk_6479` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_sale_ibfk_6480` FOREIGN KEY (`listingId`) REFERENCES `nft_listing` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_sale_ibfk_6481` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_sale_ibfk_6482` FOREIGN KEY (`buyerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_token` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `collectionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tokenId` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(1000) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `metadataUri` varchar(1000) DEFAULT NULL,
  `metadataHash` varchar(255) DEFAULT NULL,
  `ownerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `creatorId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `mintedAt` datetime DEFAULT NULL,
  `isMinted` tinyint(1) NOT NULL DEFAULT 0,
  `isListed` tinyint(1) NOT NULL DEFAULT 0,
  `views` int(11) NOT NULL DEFAULT 0,
  `likes` int(11) NOT NULL DEFAULT 0,
  `rarity` enum('COMMON','UNCOMMON','RARE','EPIC','LEGENDARY') DEFAULT NULL,
  `rarityScore` decimal(10,2) DEFAULT NULL,
  `status` enum('DRAFT','MINTED','BURNED') NOT NULL DEFAULT 'DRAFT',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `ownerWalletAddress` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nftTokenCollectionTokenKey` (`collectionId`,`tokenId`) USING BTREE,
  KEY `nftTokenCollectionIdx` (`collectionId`) USING BTREE,
  KEY `nftTokenOwnerIdx` (`ownerId`) USING BTREE,
  KEY `nftTokenCreatorIdx` (`creatorId`) USING BTREE,
  KEY `nftTokenStatusIdx` (`status`) USING BTREE,
  KEY `nftTokenListedIdx` (`isListed`) USING BTREE,
  CONSTRAINT `nft_token_ibfk_3130` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_token_ibfk_3131` FOREIGN KEY (`ownerId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_token_ibfk_3132` FOREIGN KEY (`creatorId`) REFERENCES `nft_creator` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_token_ibfk_5149` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_token_ibfk_5150` FOREIGN KEY (`ownerId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_token_ibfk_5151` FOREIGN KEY (`creatorId`) REFERENCES `nft_creator` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notification` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` enum('investment','message','user','alert','system') NOT NULL,
  `message` varchar(255) NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `relatedId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `details` text DEFAULT NULL,
  `actions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`actions`)),
  `read` tinyint(1) NOT NULL DEFAULT 0,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId_index` (`userId`),
  KEY `type_index` (`type`),
  KEY `notificationsUserIdForeign` (`userId`) USING BTREE,
  CONSTRAINT `notification_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notification_template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notification_template` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `subject` varchar(191) NOT NULL,
  `emailBody` longtext DEFAULT NULL,
  `smsBody` longtext DEFAULT NULL,
  `pushBody` longtext DEFAULT NULL,
  `shortCodes` text DEFAULT NULL,
  `email` tinyint(1) DEFAULT 0,
  `sms` tinyint(1) DEFAULT 0,
  `push` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `notificationTemplateNameKey` (`name`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `one_time_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `one_time_token` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tokenId` varchar(60) NOT NULL,
  `tokenType` enum('RESET') DEFAULT NULL,
  `expiresAt` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tokenId` (`tokenId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `p2p_activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `p2p_activity_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `details` text DEFAULT NULL,
  `relatedEntity` varchar(50) DEFAULT NULL,
  `relatedEntityId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `p2p_activity_logs_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `p2p_admin_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `p2p_admin_activity` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` varchar(50) NOT NULL,
  `relatedEntityId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `relatedEntityName` varchar(191) NOT NULL,
  `adminId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `adminId` (`adminId`),
  CONSTRAINT `p2p_admin_activity_ibfk_1` FOREIGN KEY (`adminId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `p2p_commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `p2p_commissions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `adminId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` double NOT NULL,
  `description` text DEFAULT NULL,
  `tradeId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `offerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `adminId` (`adminId`),
  KEY `tradeId` (`tradeId`),
  KEY `offerId` (`offerId`),
  CONSTRAINT `p2p_commissions_ibfk_10576` FOREIGN KEY (`adminId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_commissions_ibfk_10577` FOREIGN KEY (`tradeId`) REFERENCES `p2p_trades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `p2p_commissions_ibfk_10578` FOREIGN KEY (`offerId`) REFERENCES `p2p_offers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `p2p_commissions_ibfk_5766` FOREIGN KEY (`adminId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_commissions_ibfk_5767` FOREIGN KEY (`tradeId`) REFERENCES `p2p_trades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `p2p_commissions_ibfk_5768` FOREIGN KEY (`offerId`) REFERENCES `p2p_offers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `p2p_disputes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `p2p_disputes` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tradeId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` varchar(50) NOT NULL,
  `reportedById` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `againstId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `reason` text NOT NULL,
  `details` text DEFAULT NULL,
  `filedOn` datetime NOT NULL,
  `status` enum('PENDING','IN_PROGRESS','RESOLVED') NOT NULL DEFAULT 'PENDING',
  `priority` enum('HIGH','MEDIUM','LOW') NOT NULL,
  `resolution` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`resolution`)),
  `resolvedOn` datetime DEFAULT NULL,
  `messages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`messages`)),
  `evidence` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`evidence`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `activityLog` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`activityLog`)),
  PRIMARY KEY (`id`),
  KEY `tradeId` (`tradeId`),
  KEY `reportedById` (`reportedById`),
  KEY `againstId` (`againstId`),
  CONSTRAINT `p2p_disputes_ibfk_2539` FOREIGN KEY (`tradeId`) REFERENCES `p2p_trades` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_disputes_ibfk_2540` FOREIGN KEY (`reportedById`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_disputes_ibfk_2541` FOREIGN KEY (`againstId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_disputes_ibfk_5742` FOREIGN KEY (`tradeId`) REFERENCES `p2p_trades` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_disputes_ibfk_5743` FOREIGN KEY (`reportedById`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_disputes_ibfk_5744` FOREIGN KEY (`againstId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `p2p_offer_flags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `p2p_offer_flags` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `offerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `flaggedById` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `isFlagged` tinyint(1) NOT NULL DEFAULT 1,
  `reason` text DEFAULT NULL,
  `flaggedAt` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `offerId` (`offerId`),
  KEY `flaggedById` (`flaggedById`),
  CONSTRAINT `p2p_offer_flags_ibfk_3787` FOREIGN KEY (`offerId`) REFERENCES `p2p_offers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_offer_flags_ibfk_3788` FOREIGN KEY (`flaggedById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `p2p_offer_flags_ibfk_6951` FOREIGN KEY (`offerId`) REFERENCES `p2p_offers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_offer_flags_ibfk_6952` FOREIGN KEY (`flaggedById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `p2p_offer_payment_method`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `p2p_offer_payment_method` (
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `offerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `paymentMethodId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`offerId`,`paymentMethodId`),
  KEY `paymentMethodId` (`paymentMethodId`),
  CONSTRAINT `p2p_offer_payment_method_ibfk_1` FOREIGN KEY (`offerId`) REFERENCES `p2p_offers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_offer_payment_method_ibfk_2` FOREIGN KEY (`paymentMethodId`) REFERENCES `p2p_payment_methods` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `p2p_offers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `p2p_offers` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` enum('BUY','SELL') NOT NULL,
  `currency` varchar(50) NOT NULL,
  `walletType` enum('FIAT','SPOT','ECO') NOT NULL,
  `amountConfig` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`amountConfig`)),
  `priceConfig` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`priceConfig`)),
  `tradeSettings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`tradeSettings`)),
  `locationSettings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`locationSettings`)),
  `userRequirements` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`userRequirements`)),
  `status` enum('DRAFT','PENDING_APPROVAL','ACTIVE','PAUSED','COMPLETED','CANCELLED','REJECTED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  `views` int(11) NOT NULL DEFAULT 0,
  `systemTags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`systemTags`)),
  `adminNotes` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `priceCurrency` varchar(10) DEFAULT NULL COMMENT 'Currency used for pricing (USD, EUR, GBP, etc.)',
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `p2p_offers_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `p2p_payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `p2p_payment_methods` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `icon` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `instructions` longtext DEFAULT NULL,
  `processingTime` varchar(50) DEFAULT NULL,
  `fees` varchar(50) DEFAULT NULL,
  `available` tinyint(1) NOT NULL DEFAULT 1,
  `popularityRank` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `isGlobal` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'If true, this payment method is available to all users (created by admin)',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Flexible key-value pairs for payment details (e.g., PayPal Email, Bank Account, etc.)' CHECK (json_valid(`metadata`)),
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `p2p_payment_methods_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `p2p_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `p2p_reviews` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `reviewerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `revieweeId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tradeId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `communicationRating` float NOT NULL,
  `speedRating` float NOT NULL,
  `trustRating` float NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `reviewerId` (`reviewerId`),
  KEY `revieweeId` (`revieweeId`),
  KEY `tradeId` (`tradeId`),
  KEY `userId` (`userId`),
  CONSTRAINT `p2p_reviews_ibfk_10384` FOREIGN KEY (`reviewerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_reviews_ibfk_10385` FOREIGN KEY (`revieweeId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_reviews_ibfk_10386` FOREIGN KEY (`tradeId`) REFERENCES `p2p_trades` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_reviews_ibfk_10387` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_reviews_ibfk_5656` FOREIGN KEY (`reviewerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_reviews_ibfk_5657` FOREIGN KEY (`revieweeId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_reviews_ibfk_5658` FOREIGN KEY (`tradeId`) REFERENCES `p2p_trades` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_reviews_ibfk_5659` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `p2p_trades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `p2p_trades` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `offerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `buyerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sellerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` enum('BUY','SELL') NOT NULL,
  `currency` varchar(50) NOT NULL,
  `amount` double NOT NULL,
  `price` double NOT NULL,
  `total` double NOT NULL,
  `status` enum('PENDING','PAYMENT_SENT','COMPLETED','CANCELLED','DISPUTED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `paymentMethod` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `paymentDetails` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`paymentDetails`)),
  `timeline` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`timeline`)),
  `terms` text DEFAULT NULL,
  `escrowFee` varchar(50) DEFAULT NULL,
  `escrowTime` varchar(50) DEFAULT NULL,
  `paymentConfirmedAt` datetime DEFAULT NULL,
  `paymentReference` varchar(191) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `buyerFee` double DEFAULT 0,
  `sellerFee` double DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `paymentMethod` (`paymentMethod`),
  KEY `p2p_trades_ibfk_7531` (`offerId`),
  KEY `p2p_trades_ibfk_7532` (`buyerId`),
  KEY `p2p_trades_ibfk_7533` (`sellerId`),
  KEY `p2p_trades_ibfk_7534` (`userId`),
  CONSTRAINT `p2p_trades_ibfk_3833` FOREIGN KEY (`offerId`) REFERENCES `p2p_offers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_trades_ibfk_3834` FOREIGN KEY (`buyerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_trades_ibfk_3835` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_trades_ibfk_3836` FOREIGN KEY (`paymentMethod`) REFERENCES `p2p_payment_methods` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_trades_ibfk_3837` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_trades_ibfk_7531` FOREIGN KEY (`offerId`) REFERENCES `p2p_offers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_trades_ibfk_7532` FOREIGN KEY (`buyerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_trades_ibfk_7533` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_trades_ibfk_7534` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `page`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `page` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(255) NOT NULL COMMENT 'Title of the page displayed to users and in browser tabs',
  `content` longtext NOT NULL DEFAULT '' COMMENT 'Main content/body of the page (HTML or Markdown)',
  `description` text DEFAULT NULL COMMENT 'Brief description of the page content',
  `image` text DEFAULT NULL COMMENT 'URL path to the page''s featured image',
  `slug` varchar(255) NOT NULL COMMENT 'URL-friendly slug for the page (used in the page URL)',
  `status` enum('PUBLISHED','DRAFT') NOT NULL DEFAULT 'DRAFT' COMMENT 'Publication status of the page (PUBLISHED or DRAFT)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `path` varchar(255) NOT NULL DEFAULT '' COMMENT 'Full path/route for the page in the website structure',
  `order` int(11) NOT NULL DEFAULT 0 COMMENT 'Display order for page sorting and navigation',
  `visits` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of times this page has been visited',
  `isHome` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Indicates if this page is the site''s homepage (only one allowed)',
  `isBuilderPage` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Indicates if this page was created using the page builder',
  `template` varchar(100) DEFAULT NULL COMMENT 'Template name used for this page layout',
  `category` varchar(100) DEFAULT NULL COMMENT 'Category classification for organizing pages',
  `seoTitle` varchar(255) DEFAULT NULL COMMENT 'SEO optimized title for search engines',
  `seoDescription` text DEFAULT NULL COMMENT 'SEO meta description for search engine results',
  `seoKeywords` text DEFAULT NULL COMMENT 'SEO keywords for search engine optimization',
  `ogImage` text DEFAULT NULL COMMENT 'Open Graph image URL for social media sharing',
  `ogTitle` varchar(255) DEFAULT NULL COMMENT 'Open Graph title for social media sharing',
  `ogDescription` text DEFAULT NULL COMMENT 'Open Graph description for social media sharing',
  `settings` longtext DEFAULT NULL COMMENT 'JSON string containing page-level configuration settings',
  `customCss` longtext DEFAULT NULL COMMENT 'Custom CSS styles specific to this page',
  `customJs` longtext DEFAULT NULL COMMENT 'Custom JavaScript code specific to this page',
  `lastModifiedBy` varchar(255) DEFAULT NULL COMMENT 'Username or ID of the last person to modify this page',
  `publishedAt` datetime DEFAULT NULL COMMENT 'Date and time when the page was first published',
  PRIMARY KEY (`id`),
  UNIQUE KEY `pageSlugKey` (`slug`),
  KEY `pageStatusIndex` (`status`) USING BTREE,
  KEY `pageIsHomeIndex` (`isHome`) USING BTREE,
  KEY `pageIsBuilderIndex` (`isBuilderPage`) USING BTREE,
  KEY `pageOrderIndex` (`order`) USING BTREE,
  KEY `pagePublishedAtIndex` (`publishedAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Unique permission name (e.g., access.users, create.posts)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=600 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `post`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(255) NOT NULL COMMENT 'Title of the blog post',
  `content` text NOT NULL COMMENT 'Full content/body of the blog post',
  `categoryId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the category this post belongs to',
  `authorId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the author who wrote this post',
  `slug` varchar(255) NOT NULL COMMENT 'URL-friendly slug for the post (used in URLs)',
  `description` longtext DEFAULT NULL COMMENT 'Brief description or excerpt of the post',
  `status` enum('PUBLISHED','DRAFT') NOT NULL DEFAULT 'DRAFT' COMMENT 'Publication status of the post (PUBLISHED or DRAFT)',
  `image` text DEFAULT NULL COMMENT 'URL path to the featured image for the post',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `views` int(11) DEFAULT 0 COMMENT 'Number of times this post has been viewed',
  PRIMARY KEY (`id`),
  UNIQUE KEY `postSlugKey` (`slug`),
  KEY `postsCategoryIdForeign` (`categoryId`) USING BTREE,
  KEY `postsAuthorIdForeign` (`authorId`) USING BTREE,
  CONSTRAINT `post_ibfk_21241` FOREIGN KEY (`categoryId`) REFERENCES `category` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `post_ibfk_21242` FOREIGN KEY (`authorId`) REFERENCES `author` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `post_ibfk_25867` FOREIGN KEY (`categoryId`) REFERENCES `category` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `post_ibfk_25868` FOREIGN KEY (`authorId`) REFERENCES `author` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `post_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_tag` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `postId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the blog post',
  `tagId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the tag associated with the post',
  PRIMARY KEY (`id`),
  KEY `postTagPostIdForeign` (`postId`) USING BTREE,
  KEY `postTagTagIdForeign` (`tagId`) USING BTREE,
  CONSTRAINT `post_tag_ibfk_1903` FOREIGN KEY (`postId`) REFERENCES `post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `post_tag_ibfk_1904` FOREIGN KEY (`tagId`) REFERENCES `tag` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `post_tag_ibfk_2703` FOREIGN KEY (`postId`) REFERENCES `post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `post_tag_ibfk_2704` FOREIGN KEY (`tagId`) REFERENCES `tag` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `provider_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `provider_user` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `providerUserId` varchar(255) NOT NULL,
  `provider` enum('GOOGLE','WALLET') NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `providerUserId` (`providerUserId`),
  KEY `ProviderUserUserIdFkey` (`userId`) USING BTREE,
  CONSTRAINT `provider_user_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Unique name of the role (e.g., Admin, User, Moderator)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `roleNameKey` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `role_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role_permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `roleId` int(11) NOT NULL,
  `permissionId` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permission_permissionId_roleId_unique` (`roleId`,`permissionId`),
  KEY `RolePermissionPermissionIdFkey` (`permissionId`) USING BTREE,
  KEY `RolePermissionRoleIdFkey` (`roleId`) USING BTREE,
  CONSTRAINT `role_permission_ibfk_29596` FOREIGN KEY (`roleId`) REFERENCES `role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permission_ibfk_29597` FOREIGN KEY (`permissionId`) REFERENCES `permission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permission_ibfk_34250` FOREIGN KEY (`roleId`) REFERENCES `role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permission_ibfk_34251` FOREIGN KEY (`permissionId`) REFERENCES `permission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=184 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `key` varchar(255) NOT NULL,
  `value` longtext DEFAULT NULL COMMENT 'Setting value in JSON format or plain text',
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `slider`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slider` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `image` varchar(255) NOT NULL COMMENT 'URL path to the slider image',
  `link` varchar(255) DEFAULT NULL COMMENT 'Optional URL that the slider image should link to when clicked',
  `status` tinyint(1) DEFAULT 1 COMMENT 'Whether this slider item is active and should be displayed',
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_admin_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_admin_activities` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `action` enum('create','update','delete','approve','reject','distribute') NOT NULL,
  `type` enum('pool','position','earnings','settings','withdrawal') NOT NULL,
  `relatedId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `staking_admin_activities_action_idx` (`action`),
  KEY `staking_admin_activities_type_idx` (`type`),
  KEY `staking_admin_activities_relatedId_idx` (`relatedId`),
  KEY `userId` (`userId`),
  CONSTRAINT `staking_admin_activities_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_admin_earnings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_admin_earnings` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` float NOT NULL,
  `isClaimed` tinyint(1) NOT NULL DEFAULT 0,
  `type` enum('PLATFORM_FEE','EARLY_WITHDRAWAL_FEE','PERFORMANCE_FEE','OTHER') NOT NULL,
  `currency` varchar(10) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `staking_admin_earnings_pool_idx` (`poolId`),
  KEY `staking_admin_earnings_claimed_idx` (`isClaimed`),
  CONSTRAINT `staking_admin_earnings_ibfk_1` FOREIGN KEY (`poolId`) REFERENCES `staking_pools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_earning_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_earning_records` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `positionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` float NOT NULL,
  `type` enum('REGULAR','BONUS','REFERRAL') NOT NULL DEFAULT 'REGULAR',
  `description` varchar(191) NOT NULL,
  `isClaimed` tinyint(1) NOT NULL DEFAULT 0,
  `claimedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `staking_earning_records_position_idx` (`positionId`),
  KEY `staking_earning_records_type_idx` (`type`),
  KEY `staking_earning_records_claimed_idx` (`isClaimed`),
  KEY `staking_earning_records_position_claimed_idx` (`positionId`,`isClaimed`),
  KEY `staking_earning_records_claimed_at_idx` (`claimedAt`),
  CONSTRAINT `staking_earning_records_ibfk_1` FOREIGN KEY (`positionId`) REFERENCES `staking_positions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_external_pool_performances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_external_pool_performances` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `date` datetime NOT NULL,
  `apr` float NOT NULL,
  `totalStaked` float NOT NULL,
  `profit` float NOT NULL,
  `notes` text NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `staking_external_pool_performances_pool_idx` (`poolId`),
  KEY `staking_external_pool_performances_date_idx` (`date`),
  CONSTRAINT `staking_external_pool_performances_ibfk_1` FOREIGN KEY (`poolId`) REFERENCES `staking_pools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_pool`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_pools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_pools` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `token` varchar(50) NOT NULL,
  `symbol` varchar(10) NOT NULL,
  `icon` varchar(191) DEFAULT NULL,
  `description` text NOT NULL,
  `apr` float NOT NULL,
  `lockPeriod` int(11) NOT NULL,
  `minStake` float NOT NULL,
  `maxStake` float DEFAULT NULL,
  `earlyWithdrawalFee` float NOT NULL DEFAULT 0,
  `adminFeePercentage` float NOT NULL DEFAULT 0,
  `status` enum('ACTIVE','INACTIVE','COMING_SOON') NOT NULL DEFAULT 'INACTIVE',
  `isPromoted` tinyint(1) NOT NULL DEFAULT 0,
  `order` int(11) NOT NULL DEFAULT 0,
  `earningFrequency` enum('DAILY','WEEKLY','MONTHLY','END_OF_TERM') NOT NULL DEFAULT 'DAILY',
  `autoCompound` tinyint(1) NOT NULL DEFAULT 0,
  `externalPoolUrl` varchar(191) DEFAULT NULL,
  `profitSource` text NOT NULL,
  `fundAllocation` text NOT NULL,
  `risks` text NOT NULL,
  `rewards` text NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `availableToStake` float NOT NULL DEFAULT 0,
  `walletType` enum('FIAT','SPOT','ECO') NOT NULL DEFAULT 'SPOT',
  `walletChain` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `staking_pools_token_idx` (`token`),
  KEY `staking_pools_status_idx` (`status`),
  KEY `staking_pools_order_idx` (`order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_positions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_positions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` float NOT NULL,
  `startDate` datetime NOT NULL,
  `endDate` datetime NOT NULL,
  `status` enum('ACTIVE','COMPLETED','CANCELLED','PENDING_WITHDRAWAL') NOT NULL DEFAULT 'ACTIVE',
  `withdrawalRequested` tinyint(1) NOT NULL DEFAULT 0,
  `withdrawalRequestDate` datetime DEFAULT NULL,
  `adminNotes` text DEFAULT NULL,
  `completedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `staking_positions_user_idx` (`userId`),
  KEY `staking_positions_pool_idx` (`poolId`),
  KEY `staking_positions_status_idx` (`status`),
  KEY `staking_positions_withdrawal_idx` (`withdrawalRequested`),
  KEY `staking_positions_user_status_idx` (`userId`,`status`),
  KEY `staking_positions_end_date_idx` (`endDate`),
  KEY `staking_positions_created_idx` (`createdAt`),
  CONSTRAINT `staking_positions_ibfk_4934` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `staking_positions_ibfk_4935` FOREIGN KEY (`poolId`) REFERENCES `staking_pools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `staking_positions_ibfk_8062` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `staking_positions_ibfk_8063` FOREIGN KEY (`poolId`) REFERENCES `staking_pools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `support_ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `support_ticket` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `subject` varchar(191) NOT NULL COMMENT 'Subject/title of the support ticket',
  `importance` enum('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'LOW' COMMENT 'Priority level of the support ticket',
  `status` enum('PENDING','OPEN','REPLIED','CLOSED') NOT NULL DEFAULT 'PENDING' COMMENT 'Current status of the support ticket',
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `agentId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `messages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of chat messages between user and support agent' CHECK (json_valid(`messages`)),
  `type` enum('LIVE','TICKET') NOT NULL DEFAULT 'TICKET' COMMENT 'Type of support - live chat or ticket system',
  `agentName` varchar(191) DEFAULT NULL COMMENT 'Agent display name for faster lookup',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Tags for search/filter (string array)' CHECK (json_valid(`tags`)),
  `responseTime` int(11) DEFAULT NULL COMMENT 'Minutes from creation to first agent reply',
  `satisfaction` float DEFAULT NULL COMMENT 'Rating 1-5 from user',
  PRIMARY KEY (`id`),
  UNIQUE KEY `supportTicketIdKey` (`id`) USING BTREE,
  KEY `supportTicketUserIdForeign` (`userId`) USING BTREE,
  KEY `agentId` (`agentId`) USING BTREE,
  KEY `tags_idx` (`tags`(768)) USING BTREE,
  CONSTRAINT `support_ticket_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `support_ticket_ibfk_2` FOREIGN KEY (`agentId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tag` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) NOT NULL COMMENT 'Display name of the tag',
  `slug` varchar(255) NOT NULL COMMENT 'URL-friendly slug for the tag (used in URLs)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tagSlugKey` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `transaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transaction` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `walletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` enum('FAILED','DEPOSIT','WITHDRAW','OUTGOING_TRANSFER','INCOMING_TRANSFER','PAYMENT','REFUND','BINARY_ORDER','EXCHANGE_ORDER','INVESTMENT','INVESTMENT_ROI','AI_INVESTMENT','AI_INVESTMENT_ROI','INVOICE','FOREX_DEPOSIT','FOREX_WITHDRAW','FOREX_INVESTMENT','FOREX_INVESTMENT_ROI','ICO_CONTRIBUTION','REFERRAL_REWARD','STAKING','STAKING_REWARD','P2P_OFFER_TRANSFER','P2P_TRADE','NFT_PURCHASE','NFT_SALE','NFT_MINT','NFT_BURN','NFT_TRANSFER','NFT_AUCTION_BID','NFT_AUCTION_SETTLE','NFT_OFFER') NOT NULL COMMENT 'Type of transaction (deposit, withdrawal, transfer, trading, NFT, etc.)',
  `status` enum('PENDING','COMPLETED','FAILED','CANCELLED','EXPIRED','REJECTED','REFUNDED','FROZEN','PROCESSING','TIMEOUT') NOT NULL DEFAULT 'PENDING' COMMENT 'Current status of the transaction',
  `amount` double NOT NULL COMMENT 'Transaction amount in the wallet''s currency',
  `fee` double DEFAULT 0 COMMENT 'Fee charged for this transaction',
  `description` text DEFAULT NULL COMMENT 'Human-readable description of the transaction',
  `metadata` text DEFAULT NULL COMMENT 'Additional transaction data in JSON format',
  `referenceId` varchar(191) DEFAULT NULL COMMENT 'External reference ID from payment processor or exchange',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `trxId` varchar(191) DEFAULT NULL COMMENT 'Blockchain transaction hash or ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `transactionIdKey` (`id`) USING BTREE,
  UNIQUE KEY `transactionReferenceIdKey` (`referenceId`),
  KEY `transactionWalletIdForeign` (`walletId`) USING BTREE,
  KEY `transactionUserIdFkey` (`userId`) USING BTREE,
  CONSTRAINT `transaction_ibfk_10898` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `transaction_ibfk_10899` FOREIGN KEY (`walletId`) REFERENCES `wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `transaction_ibfk_14286` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `transaction_ibfk_14287` FOREIGN KEY (`walletId`) REFERENCES `wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `two_factor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `two_factor` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `secret` varchar(255) NOT NULL,
  `type` enum('EMAIL','SMS','APP') NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `recoveryCodes` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `twoFactorUserIdFkey` (`userId`),
  UNIQUE KEY `twoFactorUserIdKey` (`userId`) USING BTREE,
  KEY `twoFactorUserIdForeign` (`userId`) USING BTREE,
  CONSTRAINT `two_factor_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `email` varchar(255) DEFAULT NULL COMMENT 'User''s email address (unique identifier)',
  `password` varchar(255) DEFAULT NULL COMMENT 'Hashed password for authentication',
  `avatar` varchar(1000) DEFAULT NULL COMMENT 'URL path to user''s profile picture',
  `firstName` varchar(255) DEFAULT NULL COMMENT 'User''s first name',
  `lastName` varchar(255) DEFAULT NULL COMMENT 'User''s last name',
  `emailVerified` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether the user''s email address has been verified',
  `phone` varchar(255) DEFAULT NULL COMMENT 'User''s phone number with country code',
  `roleId` int(11) DEFAULT NULL,
  `profile` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional user profile information in JSON format' CHECK (json_valid(`profile`)),
  `lastLogin` datetime DEFAULT NULL COMMENT 'Timestamp of the user''s last successful login',
  `lastFailedLogin` datetime DEFAULT NULL COMMENT 'Timestamp of the user''s last failed login attempt',
  `failedLoginAttempts` int(11) DEFAULT 0 COMMENT 'Number of consecutive failed login attempts',
  `status` enum('ACTIVE','INACTIVE','SUSPENDED','BANNED') DEFAULT 'ACTIVE' COMMENT 'Current status of the user account',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `phoneVerified` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether the user''s phone number has been verified',
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'User notification and preference settings' CHECK (json_valid(`settings`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`) USING BTREE,
  UNIQUE KEY `email` (`email`),
  KEY `UserRoleIdFkey` (`roleId`) USING BTREE,
  CONSTRAINT `user_ibfk_1` FOREIGN KEY (`roleId`) REFERENCES `role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_blocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_blocks` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user being blocked',
  `adminId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the admin who created this block',
  `reason` text NOT NULL COMMENT 'Reason for blocking the user',
  `isTemporary` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this is a temporary or permanent block',
  `duration` int(11) DEFAULT NULL COMMENT 'Block duration in hours (for temporary blocks)',
  `blockedUntil` datetime DEFAULT NULL COMMENT 'Date and time when the block expires',
  `isActive` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this block is currently active',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_blocks_userId_idx` (`userId`) USING BTREE,
  KEY `user_blocks_adminId_idx` (`adminId`) USING BTREE,
  KEY `user_blocks_isActive_idx` (`isActive`) USING BTREE,
  CONSTRAINT `user_blocks_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_blocks_ibfk_2` FOREIGN KEY (`adminId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `wallet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallet` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` enum('FIAT','SPOT','ECO','FUTURES','COPY_TRADING') NOT NULL COMMENT 'Type of wallet (FIAT for fiat currencies, SPOT for spot trading, ECO for ecosystem, FUTURES for futures trading)',
  `currency` varchar(255) NOT NULL COMMENT 'Currency symbol for this wallet (e.g., BTC, USD, ETH)',
  `balance` double NOT NULL DEFAULT 0 COMMENT 'Available balance in this wallet',
  `inOrder` double DEFAULT 0 COMMENT 'Amount currently locked in open orders',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this wallet is active and usable',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `address` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Blockchain addresses associated with this wallet' CHECK (json_valid(`address`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `walletIdKey` (`id`) USING BTREE,
  UNIQUE KEY `walletUserIdCurrencyTypeKey` (`userId`,`currency`,`type`) USING BTREE,
  CONSTRAINT `wallet_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `wallet_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallet_data` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `walletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `currency` varchar(255) NOT NULL COMMENT 'Currency symbol for this wallet data',
  `chain` varchar(255) NOT NULL COMMENT 'Blockchain network name (e.g., ETH, BSC, TRX)',
  `balance` double NOT NULL DEFAULT 0 COMMENT 'Current balance for this currency on this chain',
  `index` int(11) DEFAULT NULL COMMENT 'Derivation index for HD wallet generation',
  `data` text NOT NULL COMMENT 'Encrypted wallet data (private keys, addresses, etc.)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `walletDataWalletIdCurrencyChainKey` (`walletId`,`currency`,`chain`) USING BTREE,
  CONSTRAINT `wallet_data_ibfk_1` FOREIGN KEY (`walletId`) REFERENCES `wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `wallet_pnl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallet_pnl` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `balances` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Profit and loss balances for different wallet types (FIAT, SPOT, ECO)' CHECK (json_valid(`balances`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `wallet_pnl_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `withdraw_method`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `withdraw_method` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(255) NOT NULL COMMENT 'Display name of the withdrawal method',
  `processingTime` varchar(255) NOT NULL COMMENT 'Expected processing time for withdrawals (e.g., ''1-3 business days'')',
  `instructions` text NOT NULL COMMENT 'Step-by-step instructions for using this withdrawal method',
  `image` varchar(1000) DEFAULT NULL COMMENT 'URL path to the method''s logo or icon',
  `fixedFee` double NOT NULL DEFAULT 0 COMMENT 'Fixed fee amount charged for withdrawals',
  `percentageFee` double NOT NULL DEFAULT 0 COMMENT 'Percentage fee charged on withdrawal amount',
  `minAmount` double NOT NULL DEFAULT 0 COMMENT 'Minimum withdrawal amount allowed',
  `maxAmount` double NOT NULL DEFAULT 0 COMMENT 'Maximum withdrawal amount allowed',
  `customFields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Custom form fields required for this withdrawal method' CHECK (json_valid(`customFields`)),
  `status` tinyint(1) DEFAULT 1 COMMENT 'Whether this withdrawal method is active and available',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

