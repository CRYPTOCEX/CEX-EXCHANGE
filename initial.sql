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
DROP TABLE IF EXISTS `admin_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_audit_log` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'The admin who performed the action. Nullable: a few logged routes run unauthenticated (installer, cron-triggered maintenance), and losing the row entirely would be worse than recording an unattributed one.',
  `module` varchar(64) NOT NULL COMMENT 'The route''s logModule, e.g. ADMIN_FIN, ADMIN_CRM, ADMIN_SYS',
  `title` varchar(191) NOT NULL COMMENT 'The route''s logTitle, e.g. ''Approve Withdrawal''',
  `method` varchar(10) NOT NULL,
  `path` varchar(255) NOT NULL COMMENT 'Request path with the query string stripped',
  `targetId` varchar(64) DEFAULT NULL COMMENT 'The record the action was aimed at, lifted from the path''s last id-shaped segment. Denormalised on purpose: it is what makes ''show me everything that touched this withdrawal'' a single indexed lookup.',
  `targetIds` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Every id a BULK route was aimed at. `targetId` holds the first of them so the indexed per-record lookup still resolves; this holds the whole list, because ''approved 40 withdrawals'' has to be able to say which forty.' CHECK (json_valid(`targetIds`)),
  `status` enum('SUCCESS','ERROR') NOT NULL,
  `reason` text DEFAULT NULL COMMENT 'Operator-supplied justification, taken from a `reason` query param or body field. This is the slot the DataTable destructive-action dialog already fills.',
  `error` text DEFAULT NULL COMMENT 'Failure message when status is ERROR',
  `durationMs` int(11) DEFAULT NULL,
  `requestId` varchar(64) DEFAULT NULL COMMENT 'Ties the row back to the console trace for the same request',
  `ip` varchar(45) DEFAULT NULL COMMENT 'IPv6-length; where the action came from',
  `steps` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'The ctx.step() trail the handler emitted — the narrative of what the operation actually did.' CHECK (json_valid(`steps`)),
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_admin_audit_log_createdAt` (`createdAt`) USING BTREE,
  KEY `idx_admin_audit_log_userId_createdAt` (`userId`,`createdAt`) USING BTREE,
  KEY `idx_admin_audit_log_targetId` (`targetId`) USING BTREE,
  KEY `idx_admin_audit_log_module` (`module`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_profit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_profit` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `transactionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'ID of the transaction that generated this profit; NULL for a platform loss recorded when the treasury had nothing to debit',
  `type` enum('DEPOSIT','WITHDRAW','TRANSFER','BINARY_ORDER','EXCHANGE_ORDER','INVESTMENT','AI_INVESTMENT','FOREX_DEPOSIT','FOREX_WITHDRAW','FOREX_INVESTMENT','ICO_CONTRIBUTION','STAKING','P2P_TRADE','NFT_SALE','NFT_AUCTION','NFT_OFFER','GATEWAY_PAYMENT','TRADE','REFERRAL_REWARD','DEX_SWAP','DEX_LP_FEE','DEX_LISTING','POOL_BACKING') NOT NULL COMMENT 'Type of transaction that generated the admin profit',
  `amount` decimal(36,18) NOT NULL COMMENT 'Profit amount earned by admin from this transaction',
  `currency` varchar(255) NOT NULL COMMENT 'Currency of the profit amount',
  `chain` varchar(255) DEFAULT NULL COMMENT 'Blockchain network if applicable',
  `description` text DEFAULT NULL COMMENT 'Additional description of the profit source',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `adminProfitTransactionIdForeign` (`transactionId`) USING BTREE,
  KEY `idx_admin_profit_type` (`type`) USING BTREE,
  KEY `idx_admin_profit_created_at` (`createdAt`) USING BTREE,
  KEY `idx_admin_profit_summary` (`type`,`createdAt`,`currency`) USING BTREE,
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
  `firstRealTradeAt` datetime DEFAULT NULL,
  `cooldownUntil` datetime DEFAULT NULL,
  `dailyTradeCount` int(11) NOT NULL DEFAULT 0,
  `maxDailyTrades` int(11) NOT NULL DEFAULT 100,
  `realTradesExecuted` int(11) NOT NULL DEFAULT 0,
  `profitableTrades` int(11) NOT NULL DEFAULT 0,
  `totalRealizedPnL` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `totalVolume` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `currentPosition` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `avgEntryPrice` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
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
  `symbol` varchar(191) NOT NULL,
  `type` enum('SPOT','ECO') NOT NULL,
  `amount` double NOT NULL,
  `profit` double DEFAULT NULL COMMENT 'DEPRECATED: use roiPercentage. Kept for backward compat.',
  `roiPercentage` double DEFAULT NULL COMMENT 'Profit as percentage of amount (e.g., 5 = 5%)',
  `result` enum('WIN','LOSS','DRAW') DEFAULT NULL,
  `status` enum('ACTIVE','COMPLETED','CANCELLED','REJECTED') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `aiInvestmentUserIdForeign` (`userId`) USING BTREE,
  KEY `aiInvestmentPlanIdForeign` (`planId`) USING BTREE,
  KEY `aiInvestmentDurationIdForeign` (`durationId`) USING BTREE,
  CONSTRAINT `ai_investment_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ai_investment_ibfk_2` FOREIGN KEY (`planId`) REFERENCES `ai_investment_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ai_investment_ibfk_3` FOREIGN KEY (`durationId`) REFERENCES `ai_investment_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_investment_duration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_investment_duration` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `duration` int(11) NOT NULL,
  `timeframe` enum('HOUR','DAY','WEEK','MONTH') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  UNIQUE KEY `aiInvestmentPlanNameKey` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_investment_plan_duration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_investment_plan_duration` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `planId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `durationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_investment_plan_duration_planId_durationId_unique` (`planId`,`durationId`),
  KEY `aiInvestmentPlanDurationPlanIdForeign` (`planId`) USING BTREE,
  KEY `aiInvestmentPlanDurationDurationIdForeign` (`durationId`) USING BTREE,
  CONSTRAINT `ai_investment_plan_duration_ibfk_1` FOREIGN KEY (`planId`) REFERENCES `ai_investment_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ai_investment_plan_duration_ibfk_2` FOREIGN KEY (`durationId`) REFERENCES `ai_investment_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_market_maker`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_market_maker` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `marketId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `marketType` enum('ECO','FUTURES') NOT NULL DEFAULT 'ECO' COMMENT 'Which table marketId names: ecosystem_market (ECO) or futures_market (FUTURES)',
  `futuresLeverage` decimal(6,2) NOT NULL DEFAULT 1.00 COMMENT 'Leverage the maker posts FUTURES orders at. Ignored on ECO markets.',
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
  `requoteFloorPerSide` int(11) NOT NULL DEFAULT 3,
  `maxRestingRealOrders` int(11) DEFAULT NULL,
  `priceMode` enum('AUTONOMOUS','FOLLOW_EXTERNAL','HYBRID','MIRROR') NOT NULL DEFAULT 'AUTONOMOUS',
  `externalSymbol` varchar(20) DEFAULT NULL COMMENT 'External symbol to track (e.g., BTC/USDT) when in FOLLOW or HYBRID mode',
  `correlationStrength` decimal(5,2) NOT NULL DEFAULT 50.00,
  `marketBias` enum('BULLISH','BEARISH','NEUTRAL') NOT NULL DEFAULT 'NEUTRAL',
  `biasStrength` decimal(5,2) NOT NULL DEFAULT 50.00,
  `currentPhase` enum('ACCUMULATION','MARKUP','DISTRIBUTION','MARKDOWN') NOT NULL DEFAULT 'ACCUMULATION',
  `phaseStartedAt` datetime DEFAULT NULL,
  `nextPhaseChangeAt` datetime DEFAULT NULL,
  `phaseTargetPrice` decimal(30,18) DEFAULT NULL,
  `baseVolatility` decimal(5,2) NOT NULL DEFAULT 2.00,
  `volatilityMultiplier` decimal(3,2) NOT NULL DEFAULT 1.00,
  `momentumDecay` decimal(4,3) NOT NULL DEFAULT 0.950,
  `lastKnownPrice` decimal(30,18) DEFAULT NULL,
  `trendMomentum` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `lastMomentumUpdate` datetime DEFAULT NULL,
  `entropySeed` varchar(16) DEFAULT NULL COMMENT 'SECRET 64-bit seed (hex) for the price process. Never expose via API/WS.',
  `priceEngineState` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Serialised PriceProcess state for restart continuity' CHECK (json_valid(`priceEngineState`)),
  `priceEngineStateAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `aiMarketMakerMarketKey` (`marketType`,`marketId`) USING BTREE,
  KEY `aiMarketMakerStatusIdx` (`status`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_market_maker_engine_lease`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_market_maker_engine_lease` (
  `id` varchar(32) NOT NULL,
  `instanceId` varchar(64) NOT NULL,
  `hostname` varchar(255) DEFAULT NULL,
  `pid` int(11) DEFAULT NULL,
  `expiresAt` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_market_maker_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_market_maker_history` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `marketMakerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `action` enum('TRADE','PAUSE','RESUME','REBALANCE','TARGET_CHANGE','DEPOSIT','WITHDRAW','START','STOP','CONFIG_CHANGE','EMERGENCY_STOP','AUTO_PAUSE','PHASE_CHANGE','BIAS_CHANGE','MOMENTUM_EVENT') NOT NULL,
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
  UNIQUE KEY `aiMarketMakerPoolMarketMakerIdKey` (`marketMakerId`) USING BTREE,
  KEY `aiMarketMakerPoolRebalanceIdx` (`lastRebalanceAt`) USING BTREE,
  CONSTRAINT `ai_market_maker_pool_ibfk_1` FOREIGN KEY (`marketMakerId`) REFERENCES `ai_market_maker` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_admin_action`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_admin_action` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `proposedTo` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `action` varchar(64) NOT NULL,
  `permission` varchar(64) NOT NULL,
  `reason` text DEFAULT NULL,
  `workflowId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `procedure` varchar(64) DEFAULT NULL,
  `stepIndex` int(11) DEFAULT NULL,
  `state` enum('PROPOSED','CONFIRMED','COMPLETED','FAILED','EXPIRED') NOT NULL DEFAULT 'PROPOSED',
  `approvedBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `approvedAt` datetime DEFAULT NULL,
  `completedAt` datetime DEFAULT NULL,
  `result` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_support_admin_action_pending_idx` (`proposedTo`,`state`) USING BTREE,
  KEY `ai_support_admin_action_approved_idx` (`approvedBy`,`completedAt`) USING BTREE,
  KEY `ai_support_admin_action_workflow_idx` (`workflowId`,`stepIndex`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_admin_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_admin_session` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `adminId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(160) NOT NULL,
  `screen` varchar(191) DEFAULT NULL,
  `turnCount` int(11) NOT NULL DEFAULT 0,
  `costUsdTotal` decimal(12,6) NOT NULL DEFAULT 0.000000,
  `lastMessageAt` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_support_admin_session_owner_idx` (`adminId`,`lastMessageAt`) USING BTREE,
  KEY `ai_support_admin_session_age_idx` (`lastMessageAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_admin_turn`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_admin_turn` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sessionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `adminId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `question` text NOT NULL,
  `answer` longtext NOT NULL,
  `grounded` tinyint(1) NOT NULL DEFAULT 0,
  `sources` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`sources`)),
  `proposals` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`proposals`)),
  `screen` varchar(191) DEFAULT NULL,
  `providerId` varchar(32) DEFAULT NULL,
  `model` varchar(64) DEFAULT NULL,
  `inputTokens` int(11) NOT NULL DEFAULT 0,
  `outputTokens` int(11) NOT NULL DEFAULT 0,
  `cacheReadTokens` int(11) NOT NULL DEFAULT 0,
  `cacheWriteTokens` int(11) NOT NULL DEFAULT 0,
  `costUsd` decimal(12,6) NOT NULL DEFAULT 0.000000,
  `latencyMs` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_support_admin_turn_session_idx` (`sessionId`,`createdAt`) USING BTREE,
  KEY `ai_support_admin_turn_cost_idx` (`createdAt`,`costUsd`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_agent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_agent` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(96) NOT NULL,
  `slug` varchar(96) NOT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `persona` text NOT NULL,
  `disclosureText` text DEFAULT NULL,
  `model` varchar(96) DEFAULT NULL,
  `effort` enum('low','medium','high','xhigh','max') DEFAULT NULL,
  `maxTokens` int(11) NOT NULL DEFAULT 4000,
  `autonomy` enum('COPILOT','AUTO_TICKET','AUTO_ALL') NOT NULL DEFAULT 'COPILOT',
  `toolsEnabled` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`toolsEnabled`)),
  `channels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`channels`)),
  `languages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`languages`)),
  `workingHours` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`workingHours`)),
  `timezone` varchar(64) DEFAULT 'UTC',
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `ai_support_agent_slug_uq` (`slug`) USING BTREE,
  KEY `ai_support_agent_status_idx` (`status`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_article`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_article` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `question` text NOT NULL,
  `answer` mediumtext NOT NULL DEFAULT '',
  `category` varchar(96) DEFAULT NULL,
  `productSlug` varchar(96) DEFAULT NULL,
  `status` enum('DRAFT','PUBLISHED') NOT NULL DEFAULT 'DRAFT',
  `isPolicyStub` tinyint(1) NOT NULL DEFAULT 0,
  `sourceTicketId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `approvedBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `generatedBy` varchar(64) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_support_article_status_idx` (`status`) USING BTREE,
  KEY `ai_support_article_stub_idx` (`isPolicyStub`,`status`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_chunk`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_chunk` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sourceId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ord` int(11) NOT NULL DEFAULT 0,
  `breadcrumb` varchar(512) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `anchor` varchar(191) DEFAULT NULL,
  `text` mediumtext NOT NULL,
  `tokens` int(11) NOT NULL DEFAULT 0,
  `citationUrl` varchar(512) DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `weight` float NOT NULL DEFAULT 1,
  `audience` enum('CUSTOMER','OPERATOR') NOT NULL DEFAULT 'CUSTOMER',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_support_chunk_source_ord_idx` (`sourceId`,`ord`) USING BTREE,
  KEY `ai_support_chunk_updated_idx` (`updatedAt`) USING BTREE,
  CONSTRAINT `ai_support_chunk_ibfk_1` FOREIGN KEY (`sourceId`) REFERENCES `ai_support_source` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_deflection`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_deflection` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `question` text NOT NULL,
  `chunkId` varchar(191) DEFAULT NULL,
  `articleQuestion` text DEFAULT NULL,
  `outcome` enum('SHOWN','RESOLVED','FILED') NOT NULL DEFAULT 'SHOWN',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_support_deflection_user_created_idx` (`userId`,`createdAt`) USING BTREE,
  KEY `ai_support_deflection_outcome_created_idx` (`outcome`,`createdAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_feedback` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `turnId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `isHelpful` tinyint(1) NOT NULL,
  `comment` text DEFAULT NULL,
  `source` enum('CUSTOMER','AGENT') NOT NULL DEFAULT 'CUSTOMER',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_support_feedback_turn_user_uq` (`turnId`,`userId`) USING BTREE,
  CONSTRAINT `ai_support_feedback_ibfk_1` FOREIGN KEY (`turnId`) REFERENCES `ai_support_turn` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_gap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_gap` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `normalisedQuestion` varchar(255) NOT NULL,
  `sampleQuestion` text DEFAULT NULL,
  `count` int(11) NOT NULL DEFAULT 1,
  `firstSeen` datetime NOT NULL,
  `lastSeen` datetime NOT NULL,
  `bestScore` float DEFAULT NULL,
  `status` enum('OPEN','DRAFTED','RESOLVED','IGNORED') NOT NULL DEFAULT 'OPEN',
  `articleId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_support_gap_question_uq` (`normalisedQuestion`) USING BTREE,
  KEY `ai_support_gap_status_count_idx` (`status`,`count`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_glossary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_glossary` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `term` varchar(96) NOT NULL,
  `canonical` varchar(96) NOT NULL,
  `definition` text DEFAULT NULL,
  `forbidden` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`forbidden`)),
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `term` (`term`),
  UNIQUE KEY `ai_support_glossary_term_uq` (`term`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_handover`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_handover` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sessionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `fromState` varchar(32) DEFAULT NULL,
  `toState` varchar(32) NOT NULL,
  `actor` enum('AI','HUMAN','SYSTEM','USER') NOT NULL DEFAULT 'SYSTEM',
  `actorId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `reason` varchar(96) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_support_handover_session_idx` (`sessionId`,`createdAt`) USING BTREE,
  CONSTRAINT `ai_support_handover_ibfk_1` FOREIGN KEY (`sessionId`) REFERENCES `ai_support_session` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_operation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_operation` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ticketId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `operation` varchar(64) NOT NULL,
  `reason` text DEFAULT NULL,
  `workflowId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `stepIndex` int(11) DEFAULT NULL,
  `state` enum('PROPOSED','CONFIRMED','COMPLETED','FAILED','EXPIRED') NOT NULL DEFAULT 'PROPOSED',
  `confirmedAt` datetime DEFAULT NULL,
  `completedAt` datetime DEFAULT NULL,
  `result` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_support_operation_user_state_idx` (`userId`,`state`) USING BTREE,
  KEY `ai_support_operation_ticket_idx` (`ticketId`) USING BTREE,
  KEY `ai_support_operation_workflow_idx` (`workflowId`,`stepIndex`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_rule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_rule` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `priority` int(11) NOT NULL DEFAULT 100,
  `matchType` enum('KEYWORD','REGEX','INTENT','CONFIDENCE','TURN_COUNT','KYC_FEATURE','ALWAYS') NOT NULL DEFAULT 'KEYWORD',
  `matchValue` text DEFAULT NULL,
  `action` enum('ESCALATE','SUSPEND_AI','TAG','SET_IMPORTANCE','REFUSE') NOT NULL DEFAULT 'ESCALATE',
  `actionValue` varchar(191) DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_support_rule_status_priority_idx` (`status`,`priority`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_session` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ticketId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `agentId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `state` enum('AI_ACTIVE','AWAITING_USER','HUMAN_REQUESTED','HUMAN_ACTIVE','AI_SUSPENDED','RESOLVED') NOT NULL DEFAULT 'AI_ACTIVE',
  `previousState` varchar(32) DEFAULT NULL,
  `generationToken` varchar(64) DEFAULT NULL,
  `activeTurnId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `humanAgentId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `turnCount` int(11) NOT NULL DEFAULT 0,
  `escalationReason` varchar(96) DEFAULT NULL,
  `locale` varchar(16) DEFAULT NULL,
  `handoverSummary` text DEFAULT NULL,
  `lastStateAt` datetime DEFAULT NULL,
  `deflected` tinyint(1) DEFAULT NULL,
  `costUsdTotal` decimal(12,6) NOT NULL DEFAULT 0.000000,
  `channel` enum('TICKET','LIVE') NOT NULL DEFAULT 'TICKET',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticketId` (`ticketId`),
  UNIQUE KEY `ai_support_session_ticket_uq` (`ticketId`) USING BTREE,
  KEY `ai_support_session_state_idx` (`state`) USING BTREE,
  KEY `ai_support_session_agent_idx` (`agentId`) USING BTREE,
  CONSTRAINT `ai_support_session_ibfk_1` FOREIGN KEY (`ticketId`) REFERENCES `support_ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ai_support_session_ibfk_2` FOREIGN KEY (`agentId`) REFERENCES `ai_support_agent` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_source`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_source` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `kind` enum('DOCS_PACK','DOCS_REMOTE','FAQ','ARTICLE','CRAWL') NOT NULL DEFAULT 'DOCS_PACK',
  `title` varchar(191) NOT NULL,
  `locator` varchar(255) DEFAULT NULL,
  `productSlug` varchar(96) DEFAULT NULL,
  `version` varchar(32) DEFAULT NULL,
  `checksum` varchar(64) DEFAULT NULL,
  `chunkCount` int(11) NOT NULL DEFAULT 0,
  `weight` float NOT NULL DEFAULT 1,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `lastIndexedAt` datetime DEFAULT NULL,
  `error` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_support_source_kind_status_idx` (`kind`,`status`) USING BTREE,
  KEY `ai_support_source_product_idx` (`productSlug`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_turn`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_turn` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sessionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ticketId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `messageKey` varchar(64) DEFAULT NULL,
  `trigger` enum('NEW_TICKET','CUSTOMER_REPLY','MANUAL','RETRY','HANDBACK') NOT NULL DEFAULT 'CUSTOMER_REPLY',
  `providerId` varchar(32) NOT NULL DEFAULT 'null',
  `model` varchar(96) DEFAULT NULL,
  `effort` varchar(16) DEFAULT NULL,
  `status` enum('PENDING','STREAMING','SUCCEEDED','FAILED','CANCELLED','SKIPPED','REFUSED') NOT NULL DEFAULT 'PENDING',
  `skipReason` varchar(96) DEFAULT NULL,
  `inputTokens` int(11) NOT NULL DEFAULT 0,
  `outputTokens` int(11) NOT NULL DEFAULT 0,
  `cacheReadTokens` int(11) NOT NULL DEFAULT 0,
  `cacheWriteTokens` int(11) NOT NULL DEFAULT 0,
  `costUsd` decimal(12,6) NOT NULL DEFAULT 0.000000,
  `latencyMs` int(11) DEFAULT NULL,
  `aiFirstResponseMs` int(11) DEFAULT NULL,
  `retrievalScore` float DEFAULT NULL,
  `retrievedChunkIds` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`retrievedChunkIds`)),
  `citations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`citations`)),
  `citationMode` enum('NATIVE','MARKER') DEFAULT NULL,
  `toolCalls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`toolCalls`)),
  `groundedness` float DEFAULT NULL,
  `verdict` enum('ANSWERED','ESCALATED','REFUSED') DEFAULT NULL,
  `escalationReason` varchar(96) DEFAULT NULL,
  `draftText` text DEFAULT NULL,
  `sentText` text DEFAULT NULL,
  `editDistance` float DEFAULT NULL,
  `wasSent` tinyint(1) DEFAULT NULL,
  `promptHash` varchar(64) DEFAULT NULL,
  `errorCode` varchar(64) DEFAULT NULL,
  `errorMessage` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_support_turn_session_idx` (`sessionId`) USING BTREE,
  KEY `ai_support_turn_ticket_idx` (`ticketId`) USING BTREE,
  KEY `ai_support_turn_status_created_idx` (`status`,`createdAt`) USING BTREE,
  KEY `ai_support_turn_verdict_idx` (`verdict`) USING BTREE,
  KEY `ai_support_turn_cost_idx` (`createdAt`,`costUsd`) USING BTREE,
  CONSTRAINT `ai_support_turn_ibfk_1` FOREIGN KEY (`sessionId`) REFERENCES `ai_support_session` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_support_workflow`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_support_workflow` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ticketId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `workflow` varchar(64) NOT NULL,
  `reason` text DEFAULT NULL,
  `currentStep` int(11) NOT NULL DEFAULT 0,
  `state` enum('RUNNING','COMPLETED','CANCELLED','EXPIRED','FAILED') NOT NULL DEFAULT 'RUNNING',
  `cancelledBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `completedAt` datetime DEFAULT NULL,
  `result` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_support_workflow_ticket_state_idx` (`ticketId`,`state`) USING BTREE,
  KEY `ai_support_workflow_user_state_idx` (`userId`,`state`) USING BTREE
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `api_key`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `api_key` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `key` varchar(255) NOT NULL,
  `secret` varchar(255) DEFAULT NULL,
  `secretCreatedAt` datetime DEFAULT NULL,
  `type` enum('user','plugin') NOT NULL DEFAULT 'user',
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`permissions`)),
  `ipRestriction` tinyint(1) NOT NULL DEFAULT 0,
  `ipWhitelist` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`ipWhitelist`)),
  `lastUsedAt` datetime DEFAULT NULL,
  `lastUsedIp` varchar(64) DEFAULT NULL,
  `expiresAt` datetime DEFAULT NULL,
  `disabled` tinyint(1) NOT NULL DEFAULT 0,
  `disabledAt` datetime DEFAULT NULL,
  `disabledReason` varchar(255) DEFAULT NULL,
  `disabledBy` enum('user','admin') DEFAULT NULL,
  `rateLimitOverride` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`rateLimitOverride`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `apiKeyKeyIdx` (`key`) USING BTREE,
  KEY `apiKeyUserIdIdx` (`userId`) USING BTREE,
  CONSTRAINT `api_key_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `api_key_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `api_key_audit_log` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `apiKeyId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `action` varchar(64) NOT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `userAgent` varchar(512) DEFAULT NULL,
  `routePath` varchar(255) DEFAULT NULL,
  `method` varchar(16) DEFAULT NULL,
  `statusCode` int(11) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `apiKeyAuditLogApiKeyIdIdx` (`apiKeyId`) USING BTREE,
  KEY `apiKeyAuditLogActionIdx` (`action`) USING BTREE,
  KEY `apiKeyAuditLogCreatedAtIdx` (`createdAt`) USING BTREE,
  CONSTRAINT `api_key_audit_log_ibfk_1` FOREIGN KEY (`apiKeyId`) REFERENCES `api_key` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `api_key_audit_log_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `author`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `author` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the blog author',
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user who is applying to become a blog author',
  `status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT 'Current status of the author application (PENDING, APPROVED, REJECTED)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `authorUserIdKey` (`userId`) USING BTREE,
  CONSTRAINT `author_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_ai_engine`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binary_ai_engine` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `marketMakerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` enum('ACTIVE','PAUSED','STOPPED') NOT NULL DEFAULT 'STOPPED',
  `targetUserWinRate` decimal(5,4) NOT NULL DEFAULT 0.3500,
  `winRateVariance` decimal(5,4) NOT NULL DEFAULT 0.0500,
  `winRateResetHours` int(11) NOT NULL DEFAULT 24,
  `practiceMode` enum('DISABLED','SAME_AS_LIVE','CUSTOM') NOT NULL DEFAULT 'DISABLED',
  `practiceTargetWinRate` decimal(5,4) NOT NULL DEFAULT 0.5500,
  `practiceWinRateVariance` decimal(5,4) NOT NULL DEFAULT 0.1000,
  `optimizationStrategy` enum('CONSERVATIVE','MODERATE','AGGRESSIVE') NOT NULL DEFAULT 'MODERATE',
  `maxPriceAdjustmentPercent` decimal(7,6) NOT NULL DEFAULT 0.003000,
  `adjustmentLeadTimeSeconds` int(11) NOT NULL DEFAULT 30,
  `volatilityMaskingEnabled` tinyint(1) NOT NULL DEFAULT 1,
  `volatilityNoisePercent` decimal(7,6) NOT NULL DEFAULT 0.001000,
  `enableUserTiers` tinyint(1) NOT NULL DEFAULT 0,
  `tierCalculationMethod` enum('VOLUME','DEPOSIT','MANUAL') NOT NULL DEFAULT 'VOLUME',
  `enableBigWinCooldown` tinyint(1) NOT NULL DEFAULT 1,
  `bigWinThreshold` decimal(18,8) NOT NULL DEFAULT 1000.00000000,
  `cooldownDurationMinutes` int(11) NOT NULL DEFAULT 60,
  `cooldownWinRateReduction` decimal(5,4) NOT NULL DEFAULT 0.1000,
  `enableStreakCooldown` tinyint(1) NOT NULL DEFAULT 0,
  `streakThreshold` int(11) NOT NULL DEFAULT 3,
  `streakCooldownDuration` int(11) NOT NULL DEFAULT 30,
  `enableWhaleDetection` tinyint(1) NOT NULL DEFAULT 1,
  `whaleThreshold` decimal(18,8) NOT NULL DEFAULT 5000.00000000,
  `whaleStrategy` enum('REDUCE_EXPOSURE','ALERT_ONLY','FORCE_LOSS') NOT NULL DEFAULT 'REDUCE_EXPOSURE',
  `whaleWinRateCap` decimal(5,4) NOT NULL DEFAULT 0.2500,
  `whaleProfitMultiplier` decimal(5,2) NOT NULL DEFAULT 1.50,
  `emergencyStopLoss` decimal(18,8) NOT NULL DEFAULT 50000.00000000,
  `correlationConfig` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`correlationConfig`)),
  `simulationMode` tinyint(1) NOT NULL DEFAULT 0,
  `logSimulatedActions` tinyint(1) NOT NULL DEFAULT 1,
  `enableExternalCorrelation` tinyint(1) NOT NULL DEFAULT 0,
  `externalPriceSource` varchar(50) DEFAULT NULL,
  `maxDeviationPercent` decimal(5,4) NOT NULL DEFAULT 0.0500,
  `allowedOrderTypes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`allowedOrderTypes`)),
  `minPositionForOptimization` decimal(18,8) NOT NULL DEFAULT 10.00000000,
  `maxDailyLoss` decimal(18,8) NOT NULL DEFAULT 10000.00000000,
  `maxSingleOrderExposure` decimal(18,8) NOT NULL DEFAULT 5000.00000000,
  `currentPeriodWins` int(11) NOT NULL DEFAULT 0,
  `currentPeriodLosses` int(11) NOT NULL DEFAULT 0,
  `currentPeriodPlatformProfit` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `lastPeriodResetAt` datetime NOT NULL,
  `practicePeriodWins` int(11) NOT NULL DEFAULT 0,
  `practicePeriodLosses` int(11) NOT NULL DEFAULT 0,
  `lastPracticePeriodResetAt` datetime NOT NULL,
  `lastSnapshotId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `mlModelWeights` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`mlModelWeights`)),
  `enableMlAutoApply` tinyint(1) NOT NULL DEFAULT 0,
  `enableWhaleAlerts` tinyint(1) DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `binary_ai_engine_market_maker_id` (`marketMakerId`),
  KEY `binary_ai_engine_status` (`status`),
  CONSTRAINT `binary_ai_engine_ibfk_1` FOREIGN KEY (`marketMakerId`) REFERENCES `ai_market_maker` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_ai_engine_ab_test`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binary_ai_engine_ab_test` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `engineId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('DRAFT','RUNNING','COMPLETED','CANCELLED','STOPPED','PAUSED') NOT NULL DEFAULT 'DRAFT',
  `startedAt` datetime DEFAULT NULL,
  `endedAt` datetime DEFAULT NULL,
  `controlConfig` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`controlConfig`)),
  `variantConfig` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`variantConfig`)),
  `trafficSplit` decimal(3,2) NOT NULL DEFAULT 0.50,
  `controlOrders` int(11) NOT NULL DEFAULT 0,
  `controlWins` int(11) NOT NULL DEFAULT 0,
  `controlProfit` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `variantOrders` int(11) NOT NULL DEFAULT 0,
  `variantWins` int(11) NOT NULL DEFAULT 0,
  `variantProfit` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `winningVariant` enum('CONTROL','VARIANT','TIE','INCONCLUSIVE') DEFAULT NULL,
  `confidenceLevel` decimal(5,4) DEFAULT NULL,
  `results` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`results`)),
  `variants` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`variants`)),
  `primaryMetric` varchar(100) DEFAULT NULL,
  `targetSampleSize` int(11) DEFAULT NULL,
  `durationDays` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `binary_ai_engine_ab_test_engine_id` (`engineId`),
  KEY `binary_ai_engine_ab_test_status` (`status`),
  KEY `binary_ai_engine_ab_test_started_at` (`startedAt`),
  CONSTRAINT `binary_ai_engine_ab_test_ibfk_1` FOREIGN KEY (`engineId`) REFERENCES `binary_ai_engine` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_ai_engine_ab_test_assignment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binary_ai_engine_ab_test_assignment` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `testId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `variant` enum('CONTROL','TREATMENT') NOT NULL,
  `assignedAt` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `binary_ai_engine_ab_test_assignment_test_user_unique` (`testId`,`userId`),
  KEY `binary_ai_engine_ab_test_assignment_test_id` (`testId`),
  KEY `binary_ai_engine_ab_test_assignment_user_id` (`userId`),
  KEY `binary_ai_engine_ab_test_assignment_variant` (`variant`),
  CONSTRAINT `binary_ai_engine_ab_test_assignment_ibfk_1` FOREIGN KEY (`testId`) REFERENCES `binary_ai_engine_ab_test` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `binary_ai_engine_ab_test_assignment_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_ai_engine_action`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binary_ai_engine_action` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `engineId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `actionType` enum('PRICE_ADJUSTMENT','OUTCOME_OVERRIDE','PERIOD_RESET','CONFIG_CHANGE','ENGINE_CREATED','ENGINE_START','ENGINE_STOP','ENGINE_PAUSE','EMERGENCY_STOP','MANUAL_OVERRIDE','TIER_ADJUSTMENT','COOLDOWN_APPLIED','COOLDOWN_REMOVED','WHALE_DETECTED','WHALE_HANDLED','SIMULATION_RUN','ROLLBACK_EXECUTED','CORRELATION_ALERT','AB_TEST_STARTED','AB_TEST_ENDED') NOT NULL,
  `symbol` varchar(20) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `previousValue` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`previousValue`)),
  `newValue` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`newValue`)),
  `triggeredBy` varchar(100) NOT NULL DEFAULT 'SYSTEM',
  `isDemo` tinyint(1) NOT NULL DEFAULT 0,
  `isSimulated` tinyint(1) NOT NULL DEFAULT 0,
  `affectedUserId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `binary_ai_engine_action_engine_id` (`engineId`),
  KEY `binary_ai_engine_action_action_type` (`actionType`),
  KEY `binary_ai_engine_action_created_at` (`createdAt`),
  KEY `binary_ai_engine_action_is_simulated` (`isSimulated`),
  KEY `binary_ai_engine_action_affected_user_id` (`affectedUserId`),
  KEY `binary_ai_engine_action_is_demo` (`isDemo`),
  CONSTRAINT `binary_ai_engine_action_ibfk_1` FOREIGN KEY (`engineId`) REFERENCES `binary_ai_engine` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_ai_engine_cohort`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binary_ai_engine_cohort` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `engineId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('SIGNUP_DATE','DEPOSIT_AMOUNT','TRADE_FREQUENCY','CUSTOM') NOT NULL,
  `startDate` datetime DEFAULT NULL,
  `endDate` datetime DEFAULT NULL,
  `minValue` decimal(18,8) DEFAULT NULL,
  `maxValue` decimal(18,8) DEFAULT NULL,
  `criteria` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`criteria`)),
  `userCount` int(11) NOT NULL DEFAULT 0,
  `totalOrders` int(11) NOT NULL DEFAULT 0,
  `totalWins` int(11) NOT NULL DEFAULT 0,
  `avgWinRate` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `totalProfit` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `lastCalculatedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `binary_ai_engine_cohort_engine_id` (`engineId`),
  KEY `binary_ai_engine_cohort_type` (`type`),
  KEY `binary_ai_engine_cohort_name` (`name`),
  CONSTRAINT `binary_ai_engine_cohort_ibfk_1` FOREIGN KEY (`engineId`) REFERENCES `binary_ai_engine` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_ai_engine_correlation_alert`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binary_ai_engine_correlation_alert` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `engineId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `symbol` varchar(20) NOT NULL,
  `internalPrice` decimal(18,8) NOT NULL,
  `externalPrice` decimal(18,8) NOT NULL,
  `deviationPercent` decimal(8,4) NOT NULL,
  `priceSource` varchar(50) DEFAULT NULL,
  `provider` varchar(50) NOT NULL,
  `message` text DEFAULT NULL,
  `resolved` tinyint(1) NOT NULL DEFAULT 0,
  `severity` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  `status` enum('ACTIVE','ACKNOWLEDGED','RESOLVED') NOT NULL DEFAULT 'ACTIVE',
  `acknowledgedBy` varchar(100) DEFAULT NULL,
  `acknowledgedAt` datetime DEFAULT NULL,
  `resolvedBy` varchar(100) DEFAULT NULL,
  `resolvedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `binary_ai_engine_correlation_alert_engine_id` (`engineId`),
  KEY `binary_ai_engine_correlation_alert_status` (`status`),
  KEY `binary_ai_engine_correlation_alert_severity` (`severity`),
  KEY `binary_ai_engine_correlation_alert_created_at` (`createdAt`),
  KEY `binary_ai_engine_correlation_alert_symbol` (`symbol`),
  CONSTRAINT `binary_ai_engine_correlation_alert_ibfk_1` FOREIGN KEY (`engineId`) REFERENCES `binary_ai_engine` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_ai_engine_correlation_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binary_ai_engine_correlation_history` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `engineId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `symbol` varchar(50) NOT NULL,
  `internalPrice` decimal(18,8) NOT NULL,
  `externalPrice` decimal(18,8) NOT NULL,
  `deviationPercent` decimal(8,4) NOT NULL,
  `provider` varchar(50) NOT NULL,
  `timestamp` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `binary_ai_engine_correlation_history_engine_id` (`engineId`),
  KEY `binary_ai_engine_correlation_history_symbol` (`symbol`),
  KEY `binary_ai_engine_correlation_history_provider` (`provider`),
  KEY `binary_ai_engine_correlation_history_timestamp` (`timestamp`),
  KEY `binary_ai_engine_correlation_history_engine_id_symbol_timestamp` (`engineId`,`symbol`,`timestamp`),
  CONSTRAINT `binary_ai_engine_correlation_history_ibfk_1` FOREIGN KEY (`engineId`) REFERENCES `binary_ai_engine` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_ai_engine_daily_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binary_ai_engine_daily_stats` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `engineId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `date` date NOT NULL,
  `isDemo` tinyint(1) NOT NULL DEFAULT 0,
  `totalOrdersProcessed` int(11) NOT NULL DEFAULT 0,
  `totalWins` int(11) NOT NULL DEFAULT 0,
  `totalLosses` int(11) NOT NULL DEFAULT 0,
  `totalDraws` int(11) NOT NULL DEFAULT 0,
  `platformProfit` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `effectiveUserWinRate` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `targetUserWinRate` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `profitMargin` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `priceAdjustmentCount` int(11) NOT NULL DEFAULT 0,
  `avgAdjustmentPercent` decimal(7,6) NOT NULL DEFAULT 0.000000,
  `largestAdjustmentPercent` decimal(7,6) NOT NULL DEFAULT 0.000000,
  `whaleOrdersCount` int(11) NOT NULL DEFAULT 0,
  `cooldownsApplied` int(11) NOT NULL DEFAULT 0,
  `tierBreakdown` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tierBreakdown`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `binary_ai_engine_daily_stats_engine_id_date_is_demo` (`engineId`,`date`,`isDemo`),
  KEY `binary_ai_engine_daily_stats_date` (`date`),
  KEY `binary_ai_engine_daily_stats_engine_id` (`engineId`),
  CONSTRAINT `binary_ai_engine_daily_stats_ibfk_1` FOREIGN KEY (`engineId`) REFERENCES `binary_ai_engine` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_ai_engine_position`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binary_ai_engine_position` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `engineId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `binaryOrderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `symbol` varchar(20) NOT NULL,
  `side` enum('RISE','FALL') NOT NULL,
  `amount` decimal(18,8) NOT NULL,
  `entryPrice` decimal(18,8) NOT NULL,
  `expiryTime` datetime NOT NULL,
  `isDemo` tinyint(1) NOT NULL DEFAULT 0,
  `userTier` varchar(20) DEFAULT NULL,
  `isWhale` tinyint(1) NOT NULL DEFAULT 0,
  `hasCooldown` tinyint(1) NOT NULL DEFAULT 0,
  `outcome` enum('PENDING','WIN','LOSS','DRAW') NOT NULL DEFAULT 'PENDING',
  `status` enum('ACTIVE','SETTLED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `settledAt` datetime DEFAULT NULL,
  `closePrice` decimal(18,8) DEFAULT NULL,
  `platformProfit` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `wasManipulated` tinyint(1) NOT NULL DEFAULT 0,
  `manipulationDetails` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`manipulationDetails`)),
  `abTestId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `abVariant` enum('CONTROL','TREATMENT') DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `binary_ai_engine_position_binary_order_id` (`binaryOrderId`),
  KEY `binary_ai_engine_position_engine_id` (`engineId`),
  KEY `binary_ai_engine_position_user_id` (`userId`),
  KEY `binary_ai_engine_position_expiry_time` (`expiryTime`),
  KEY `binary_ai_engine_position_outcome` (`outcome`),
  KEY `binary_ai_engine_position_status` (`status`),
  KEY `binary_ai_engine_position_is_whale` (`isWhale`),
  KEY `binary_ai_engine_position_user_tier` (`userTier`),
  KEY `binary_ai_engine_position_is_demo` (`isDemo`),
  KEY `binary_ai_engine_position_ab_test_id_ab_variant` (`abTestId`,`abVariant`),
  CONSTRAINT `binary_ai_engine_position_ibfk_1` FOREIGN KEY (`engineId`) REFERENCES `binary_ai_engine` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `binary_ai_engine_position_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_ai_engine_simulation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binary_ai_engine_simulation` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `engineId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `startedAt` datetime NOT NULL,
  `endedAt` datetime DEFAULT NULL,
  `status` enum('RUNNING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'RUNNING',
  `ordersAnalyzed` int(11) NOT NULL DEFAULT 0,
  `simulatedWins` int(11) NOT NULL DEFAULT 0,
  `simulatedLosses` int(11) NOT NULL DEFAULT 0,
  `simulatedProfit` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `priceAdjustmentsWouldHaveMade` int(11) NOT NULL DEFAULT 0,
  `configUsed` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`configUsed`)),
  `summary` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`summary`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `binary_ai_engine_simulation_engine_id` (`engineId`),
  KEY `binary_ai_engine_simulation_status` (`status`),
  KEY `binary_ai_engine_simulation_started_at` (`startedAt`),
  CONSTRAINT `binary_ai_engine_simulation_ibfk_1` FOREIGN KEY (`engineId`) REFERENCES `binary_ai_engine` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_ai_engine_snapshot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binary_ai_engine_snapshot` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `engineId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `configData` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`configData`)),
  `configSnapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`configSnapshot`)),
  `performanceSnapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`performanceSnapshot`)),
  `tierData` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tierData`)),
  `isAutomatic` tinyint(1) NOT NULL DEFAULT 0,
  `reason` enum('AUTO','MANUAL','PRE_CHANGE') NOT NULL DEFAULT 'MANUAL',
  `createdBy` varchar(100) NOT NULL DEFAULT 'SYSTEM',
  `notes` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `binary_ai_engine_snapshot_engine_id` (`engineId`),
  KEY `binary_ai_engine_snapshot_created_at` (`createdAt`),
  KEY `binary_ai_engine_snapshot_reason` (`reason`),
  CONSTRAINT `binary_ai_engine_snapshot_ibfk_1` FOREIGN KEY (`engineId`) REFERENCES `binary_ai_engine` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_ai_engine_user_cooldown`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binary_ai_engine_user_cooldown` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `engineId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `reason` enum('BIG_WIN','STREAK','MANUAL') NOT NULL DEFAULT 'BIG_WIN',
  `triggerOrderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `triggerAmount` decimal(18,8) DEFAULT NULL,
  `winRateReduction` decimal(5,4) NOT NULL,
  `startsAt` datetime NOT NULL,
  `expiresAt` datetime NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `binary_ai_engine_user_cooldown_engine_id_user_id` (`engineId`,`userId`),
  KEY `binary_ai_engine_user_cooldown_expires_at` (`expiresAt`),
  KEY `binary_ai_engine_user_cooldown_is_active` (`isActive`),
  KEY `binary_ai_engine_user_cooldown_user_id` (`userId`),
  CONSTRAINT `binary_ai_engine_user_cooldown_ibfk_1` FOREIGN KEY (`engineId`) REFERENCES `binary_ai_engine` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `binary_ai_engine_user_cooldown_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `binary_ai_engine_user_tier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binary_ai_engine_user_tier` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `engineId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tierName` varchar(20) NOT NULL,
  `tierOrder` int(11) NOT NULL DEFAULT 0,
  `minVolume` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `maxVolume` decimal(18,8) DEFAULT NULL,
  `minDeposit` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `winRateBonus` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `description` varchar(255) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `binary_ai_engine_user_tier_engine_id_tier_name` (`engineId`,`tierName`),
  KEY `binary_ai_engine_user_tier_tier_order` (`tierOrder`),
  KEY `binary_ai_engine_user_tier_engine_id` (`engineId`),
  CONSTRAINT `binary_ai_engine_user_tier_ibfk_1` FOREIGN KEY (`engineId`) REFERENCES `binary_ai_engine` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `source` enum('EXCHANGE','ECOSYSTEM') NOT NULL DEFAULT 'EXCHANGE' COMMENT 'Price feed backing this market: EXCHANGE (CCXT) or ECOSYSTEM',
  `minAmount` decimal(16,8) DEFAULT 1.00000000 COMMENT 'Minimum order amount for this market',
  `maxAmount` decimal(16,8) DEFAULT 10000.00000000 COMMENT 'Maximum order amount for this market',
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
  `durationType` enum('TIME','TICKS') NOT NULL DEFAULT 'TIME' COMMENT 'Duration type - time-based or tick-based',
  `barrier` double DEFAULT NULL COMMENT 'Barrier price level for barrier options',
  `strikePrice` double DEFAULT NULL COMMENT 'Strike price for the binary option',
  `payoutPerPoint` double DEFAULT NULL COMMENT 'Payout amount per point movement',
  `profitPercentage` double DEFAULT NULL COMMENT 'Profit percentage for this binary order duration',
  `status` enum('PENDING','WIN','LOSS','DRAW','CANCELED','ERROR') NOT NULL COMMENT 'Current status of the binary option order (ERROR = data fetch failed, needs manual review)',
  `isDemo` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this is a demo/practice order',
  `closedAt` datetime(3) NOT NULL COMMENT 'Date and time when the option expires/closes',
  `closePrice` double DEFAULT NULL COMMENT 'Final price when the option closed',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional metadata (e.g., idempotency key, client info)' CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `binaryOrderUserIdForeign` (`userId`) USING BTREE,
  KEY `idx_binary_order_status_closedAt` (`status`,`closedAt`) USING BTREE,
  KEY `idx_binary_order_user_idempotency` (`userId`,`metadata`(255)) USING BTREE,
  CONSTRAINT `binary_order_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `category` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the blog category',
  `name` varchar(255) NOT NULL COMMENT 'Display name of the blog category',
  `slug` varchar(255) NOT NULL COMMENT 'URL-friendly slug for the category (used in URLs)',
  `image` text DEFAULT NULL COMMENT 'URL path to the category''s featured image',
  `description` text DEFAULT NULL COMMENT 'Description of the blog category',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categorySlugKey` (`slug`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `chart_workspace`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chart_workspace` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Owner of this workspace entry',
  `key` varchar(191) NOT NULL COMMENT 'Client-side storage key, e.g. binary-chart-drawings-BTC/USDT',
  `value` longtext DEFAULT NULL COMMENT 'Opaque JSON written by the chart client',
  `version` int(11) NOT NULL DEFAULT 0 COMMENT 'Monotonic write counter, for last-write detection',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chartWorkspaceUserKeyUnique` (`userId`,`key`) USING BTREE,
  CONSTRAINT `chart_workspace_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `comment` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the blog comment',
  `content` text NOT NULL COMMENT 'Content/text of the comment',
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user who posted this comment',
  `postId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the blog post this comment belongs to',
  `status` enum('APPROVED','PENDING','REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT 'Moderation status of the comment (APPROVED, PENDING, REJECTED)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `commentsPostIdForeign` (`postId`) USING BTREE,
  KEY `commentsUserIdForeign` (`userId`) USING BTREE,
  CONSTRAINT `comment_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `comment_ibfk_2` FOREIGN KEY (`postId`) REFERENCES `post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `content_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `content_reports` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `reporterId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `targetType` enum('BLOG_COMMENT','BLOG_POST','NFT_LISTING','USER_PROFILE','SUPPORT_TICKET') NOT NULL,
  `targetId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `targetOwnerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `reason` enum('SPAM','ABUSIVE_CONDUCT','HATE_SPEECH','SEXUAL_CONTENT','VIOLENCE','SCAM_OR_FRAUD','IMPERSONATION','OTHER') NOT NULL,
  `details` text NOT NULL,
  `status` enum('PENDING','REVIEWING','ACTIONED','DISMISSED') NOT NULL DEFAULT 'PENDING',
  `resolution` text DEFAULT NULL,
  `reviewedById` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `reviewedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `targetOwnerId` (`targetOwnerId`),
  KEY `reviewedById` (`reviewedById`),
  KEY `idx_content_report_status_createdAt` (`status`,`createdAt`) USING BTREE,
  KEY `idx_content_report_target` (`targetType`,`targetId`) USING BTREE,
  KEY `idx_content_report_reporterId_createdAt` (`reporterId`,`createdAt`) USING BTREE,
  CONSTRAINT `content_reports_ibfk_1` FOREIGN KEY (`reporterId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `content_reports_ibfk_2` FOREIGN KEY (`targetOwnerId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `content_reports_ibfk_3` FOREIGN KEY (`reviewedById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `copy_trading_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `copy_trading_audit_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `entityType` varchar(100) NOT NULL,
  `entityId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `action` varchar(100) NOT NULL,
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
  `marketType` enum('SPOT','BINARY') NOT NULL DEFAULT 'SPOT',
  `baseAmount` float NOT NULL DEFAULT 0,
  `baseUsedAmount` float NOT NULL DEFAULT 0,
  `quoteAmount` float NOT NULL DEFAULT 0,
  `quoteUsedAmount` float NOT NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `copy_trading_follower_alloc_unique_v2` (`followerId`,`symbol`,`marketType`),
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
  CONSTRAINT `copy_trading_followers_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `copy_trading_followers_ibfk_2` FOREIGN KEY (`leaderId`) REFERENCES `copy_trading_leaders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `copy_trading_leader_markets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `copy_trading_leader_markets` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `leaderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `symbol` varchar(20) NOT NULL,
  `marketType` enum('SPOT','BINARY') NOT NULL DEFAULT 'SPOT',
  `baseCurrency` varchar(10) NOT NULL,
  `quoteCurrency` varchar(10) NOT NULL,
  `minBase` double NOT NULL DEFAULT 0,
  `minQuote` double NOT NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `copy_trading_leader_markets_unique_v2` (`leaderId`,`symbol`,`marketType`),
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
  `tradingType` enum('SPOT','BINARY','BOTH') NOT NULL DEFAULT 'SPOT',
  `profitSharePercent` float NOT NULL DEFAULT 10,
  `minFollowAmount` float NOT NULL DEFAULT 100,
  `maxFollowers` int(11) NOT NULL DEFAULT 100,
  `status` enum('PENDING','ACTIVE','SUSPENDED','REJECTED','INACTIVE') NOT NULL DEFAULT 'PENDING',
  `isPublic` tinyint(1) NOT NULL DEFAULT 1,
  `applicationNote` text DEFAULT NULL,
  `rejectionReason` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `copy_trading_leaders_user_id_idx` (`userId`),
  KEY `copy_trading_leaders_status_idx` (`status`),
  KEY `copy_trading_leaders_is_public_idx` (`isPublic`),
  KEY `copy_trading_leaders_trading_type_idx` (`tradingType`),
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
  `followerOrderId` varchar(100) DEFAULT NULL,
  `symbol` varchar(20) NOT NULL,
  `marketType` enum('SPOT','BINARY') NOT NULL DEFAULT 'SPOT',
  `side` enum('BUY','SELL','RISE','FALL','HIGHER','LOWER','TOUCH','NO_TOUCH','CALL','PUT','UP','DOWN') NOT NULL,
  `type` enum('MARKET','LIMIT','RISE_FALL','HIGHER_LOWER','TOUCH_NO_TOUCH','CALL_PUT','TURBO') NOT NULL DEFAULT 'MARKET',
  `binaryResult` enum('WIN','LOSS','DRAW') DEFAULT NULL,
  `expiresAt` datetime(3) DEFAULT NULL,
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
  `status` enum('PENDING','PENDING_REPLICATION','REPLICATED','REPLICATION_FAILED','OPEN','CLOSED','PARTIALLY_FILLED','FAILED','CANCELLED','CLOSING') NOT NULL DEFAULT 'PENDING',
  `closeOrderId` varchar(191) DEFAULT NULL,
  `errorMessage` text DEFAULT NULL,
  `isLeaderTrade` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `closedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `copy_trading_trades_leader_id_idx` (`leaderId`),
  KEY `copy_trading_trades_follower_id_idx` (`followerId`),
  KEY `copy_trading_trades_leader_order_id_idx` (`leaderOrderId`),
  KEY `copy_trading_trades_follower_order_id_idx` (`followerOrderId`),
  KEY `copy_trading_trades_market_type_idx` (`marketType`),
  KEY `copy_trading_trades_symbol_idx` (`symbol`),
  KEY `copy_trading_trades_status_idx` (`status`),
  KEY `copy_trading_trades_created_at_idx` (`createdAt`),
  KEY `copy_trading_trades_leader_created_idx` (`leaderId`,`createdAt`),
  KEY `copy_trading_trades_follower_closed_at_idx` (`followerId`,`closedAt`),
  CONSTRAINT `copy_trading_trades_ibfk_1` FOREIGN KEY (`leaderId`) REFERENCES `copy_trading_leaders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `copy_trading_trades_ibfk_2` FOREIGN KEY (`followerId`) REFERENCES `copy_trading_followers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
  CONSTRAINT `copy_trading_transactions_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `copy_trading_transactions_ibfk_2` FOREIGN KEY (`leaderId`) REFERENCES `copy_trading_leaders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `copy_trading_transactions_ibfk_3` FOREIGN KEY (`followerId`) REFERENCES `copy_trading_followers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `copy_trading_transactions_ibfk_4` FOREIGN KEY (`tradeId`) REFERENCES `copy_trading_trades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `currency`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `currency` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL COMMENT 'Full name of the currency (e.g., Bitcoin, US Dollar)',
  `symbol` varchar(191) NOT NULL COMMENT 'Currency symbol/ticker (e.g., BTC, USD, ETH)',
  `precision` decimal(30,15) NOT NULL COMMENT 'Number of decimal places for this currency',
  `price` decimal(30,15) DEFAULT NULL COMMENT 'Units of this currency per 1 USD (e.g. NGN = 1365 means 1 USD = 1365 NGN). This is the inverse of the currency''s USD price — use getFiatPriceInUSD() to convert.',
  `status` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this currency is active and available for trading',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `id` varchar(191) NOT NULL,
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
  UNIQUE KEY `depositGatewayNameKey` (`name`) USING BTREE,
  UNIQUE KEY `depositGatewayAliasKey` (`alias`) USING BTREE,
  UNIQUE KEY `depositGatewayProductIdKey` (`productId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this deposit method is active and available',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dex_chain`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dex_chain` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chainId` int(11) NOT NULL COMMENT 'Numeric chain id. EIP-155 on EVM; a fitted synthetic id on chains that have none (Solana = 1399811149) because this column is INTEGER and the registry ids in circulation overflow it',
  `vm` varchar(8) NOT NULL DEFAULT 'EVM' COMMENT 'Virtual machine. Decides address encoding, tx-id shape, whether confirmations count, and whether lowercasing an address destroys it',
  `key` varchar(20) DEFAULT NULL COMMENT 'Ecosystem ChainSymbol (ETH, BSC, POLYGON, OPTIMISM, ARBITRUM, BASE) when one exists. NULL is meaningful: it disables the boot cross-check against chainConfigs, which is correct for a chain the ecosystem has no symbol for. A placeholder symbol would make that check compare against nothing',
  `slug` varchar(32) NOT NULL COMMENT 'Aggregator/indexer path segment — "ethereum", "base"',
  `name` varchar(64) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'New chains are off until an operator enables them',
  `rpcUrlOverride` varchar(500) DEFAULT NULL COMMENT 'Server-side RPC. MAY CONTAIN A KEY (Alchemy and Infura embed it in the path) — never serialise this column to a client',
  `publicRpcUrl` varchar(500) DEFAULT NULL COMMENT 'Browser-side RPC, keyless. A separate column on purpose: one field for both is how an operator leaks a keyed URL into a JS bundle',
  `explorerUrl` varchar(255) DEFAULT NULL,
  `requiredConfirmations` int(11) NOT NULL DEFAULT 3,
  `feeRecipient` varchar(64) DEFAULT NULL COMMENT 'Address the integrator fee accrues to on this chain. EVM: lowercase, render with getAddress(). SVM: base58 VERBATIM — lowercasing changes which account it is',
  `zeroFeeAcknowledged` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Operator has explicitly accepted running this chain at 0 bps. Without it, an enabled chain with dexFeeBps > 0 and no feeRecipient REFUSES to quote (see utils/fee.ts)',
  `feeRecipientUpdatedAt` datetime DEFAULT NULL COMMENT 'When feeRecipient last changed. Read by the fee console, never by the quote path',
  `wrappedNative` varchar(64) NOT NULL COMMENT 'EVM: the WETH-equivalent a native swap routes through. SVM: wrapped SOL''s real mint, which aggregators quote directly — not a translation target',
  `nativeSymbol` varchar(16) NOT NULL,
  `nativeDecimals` int(11) NOT NULL DEFAULT 18,
  `aggregatorSupport` text DEFAULT NULL COMMENT 'Per-aggregator availability on this chain, keyed by dexProvider.name: "0x", "1inch", "kyberswap", "lifi", "odos"',
  `odosReferralCode` int(11) DEFAULT NULL COMMENT 'Odos on-chain referral code registered for this chain',
  `odosReferralTxHash` varchar(66) DEFAULT NULL COMMENT 'Registration transaction, verified from its receipt',
  `odosReferralVerifiedAt` datetime DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dexChainChainIdKey` (`chainId`) USING BTREE,
  UNIQUE KEY `dexChainOdosReferralTxKey` (`odosReferralTxHash`) USING BTREE,
  KEY `dexChainStatusIdx` (`status`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dex_fee_accrual`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dex_fee_accrual` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `swapId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Nullable so revenue survives an account deletion',
  `chainId` int(11) NOT NULL,
  `tokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `vm` varchar(8) NOT NULL DEFAULT 'EVM',
  `tokenAddress` varchar(64) NOT NULL COMMENT 'Denormalised — the revenue report must survive a delist',
  `tokenSymbol` varchar(32) NOT NULL COMMENT 'Denormalised — the revenue report must survive a delist',
  `tokenDecimals` int(11) NOT NULL COMMENT 'Denormalised. Without it a swept accrual cannot be re-derived from amountRaw once the token row is gone',
  `feeRecipient` varchar(64) NOT NULL COMMENT 'Where the value actually landed — the platform holds the key, not a wallet row. On SVM this is a TOKEN ACCOUNT for the fee mint, not a wallet: SPL fees can only arrive in an account that already exists for that mint',
  `amountRaw` varchar(79) NOT NULL COMMENT 'The ONLY signed raw column in this addon: a reorg reversal is a negative row rather than a deletion',
  `amountDisplay` decimal(38,18) NOT NULL COMMENT 'display/aggregation only — LOSSY, never authoritative. Signed, like amountRaw',
  `amountUsd` decimal(20,8) DEFAULT NULL COMMENT 'USD snapshot at confirmation — display/aggregation only, LOSSY',
  `feeBps` int(11) NOT NULL,
  `feeSide` varchar(8) NOT NULL,
  `verification` varchar(16) NOT NULL COMMENT 'RECEIPT = proved by a Transfer log; ESTIMATED = arithmetic from the quote; REVERSAL = a negative correction. An operator reading a revenue report has to know which rows are evidence and which are inference',
  `logIndex` int(11) DEFAULT NULL COMMENT 'Which Transfer log in the receipt proved this accrual. NULL for ESTIMATED and REVERSAL rows',
  `usdRateSource` varchar(24) DEFAULT NULL COMMENT 'Where amountUsd came from. NULL means amountUsd is NULL — which means UNPRICED, and is NOT the same as zero',
  `sweepStatus` varchar(20) NOT NULL DEFAULT 'ACCRUED',
  `sweepSubmittedAt` datetime DEFAULT NULL,
  `sweepAttempts` int(11) NOT NULL DEFAULT 0 COMMENT 'collectPlatformFee returns null on failure rather than throwing, so a failed settle must be counted here and retried — never marked SWEPT',
  `creditedTransactionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'The wallet transaction the sweep credited',
  `adminProfitId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'The adminProfit row of type DEX_SWAP this accrual settled into',
  `creditedAmount` decimal(36,18) DEFAULT NULL COMMENT 'What actually reached collectPlatformFee after 8dp rounding. LOSSY BY DEFINITION — the residue is in roundingResidueRaw',
  `roundingResidueRaw` varchar(79) DEFAULT NULL COMMENT 'amountRaw minus creditedAmount re-expanded. The chain and the ledger reconcile only if this is carried; roundToPrecision would otherwise eat it silently',
  `reversalOfId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Set on a REVERSAL row: the accrual it negates. UNIQUE, so one reversal per accrual is a database fact rather than a code convention',
  `sweepFailureReason` varchar(64) DEFAULT NULL COMMENT 'WHY a row is UNRECOVERABLE. A machine code, not prose: the console maps it to an explanation and a remedy, and the operator never has to read a log to learn which of four things went wrong',
  `sweptAt` datetime DEFAULT NULL COMMENT 'Landing zone for the future sweep tool — this addon never moves the funds itself',
  `sweepTxHash` varchar(128) DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dexFeeAccrualSwapLogKey` (`swapId`,`logIndex`) USING BTREE,
  UNIQUE KEY `dexFeeAccrualReversalOfKey` (`reversalOfId`) USING BTREE,
  KEY `tokenId` (`tokenId`),
  KEY `dexFeeAccrualRollupIdx` (`chainId`,`tokenAddress`,`createdAt`) USING BTREE,
  KEY `dexFeeAccrualSweepIdx` (`sweepStatus`,`chainId`,`tokenAddress`) USING BTREE,
  KEY `dexFeeAccrualSweptIdx` (`sweptAt`) USING BTREE,
  KEY `dexFeeAccrualUserIdx` (`userId`) USING BTREE,
  CONSTRAINT `dex_fee_accrual_ibfk_1` FOREIGN KEY (`swapId`) REFERENCES `dex_swap` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `dex_fee_accrual_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `dex_fee_accrual_ibfk_3` FOREIGN KEY (`tokenId`) REFERENCES `dex_token` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dex_pair`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dex_pair` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chainId` int(11) NOT NULL,
  `baseTokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `quoteTokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `currency` varchar(32) NOT NULL COMMENT 'Display base symbol, mirroring fxInstrument.currency',
  `pair` varchar(32) NOT NULL COMMENT 'Display quote symbol',
  `symbol` varchar(96) NOT NULL COMMENT 'Canonical "chainId:CURRENCY/PAIR", e.g. 8453:WETH/USDC. The chain id is embedded on purpose: WETH/USDC exists on six chains, and a bare symbol makes the chart and the websocket subscribe to different markets',
  `poolAddress` varchar(42) DEFAULT NULL COMMENT 'THE INDEXER''S BINDING HINT — what GeckoTerminal calls a pool. NOT the same fact as `poolId`, which is a row we round-tripped through a trusted factory. When a pool is bound this is written FROM dexPool.poolAddress by the same handler and is not independently editable; two fields is the honest shape',
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'The VERIFIED pool this pair may route through. Effectively NOT NULL whenever the effective venue policy can reach a direct venue — enforced in the validate hook below, because auto-sync''s granular alter path has no cross-column CHECK',
  `venuePolicy` varchar(24) NOT NULL DEFAULT 'INHERIT' COMMENT 'DIRECT_ONLY is accepted HERE and rejected at the global settings layer. Per pair it is a legitimate statement ("this is my token, my pool, do not bother asking 0x"); globally it would route every pair including the majors through whatever pool is bound, at a fill no user could see the cause of',
  `restrictedCountries` text DEFAULT NULL COMMENT 'ISO-3166-1 alpha-2 codes this market may not be quoted in. Evaluated at the quote chokepoint, NOT in the sync geo middleware — see the getter note',
  `marketDataSource` varchar(16) NOT NULL DEFAULT 'INDEXER' COMMENT 'ONCHAIN reads the pool''s own Swap logs. A pool created ten minutes ago is in no indexer, and that is exactly the moment an operator most wants a chart',
  `indexerId` varchar(128) DEFAULT NULL COMMENT 'Provider-native pool id, when the indexer does not key on the address',
  `status` varchar(16) NOT NULL DEFAULT 'INACTIVE' COMMENT 'INACTIVE (imported, not enabled) -> ACTIVE -> DELISTED; HIDDEN keeps the market quotable but off the rail',
  `isHot` tinyint(1) NOT NULL DEFAULT 0,
  `isTrending` tinyint(1) NOT NULL DEFAULT 0,
  `pricePrecision` int(11) NOT NULL DEFAULT 8 COMMENT 'Display only — never used to round an amount that is sent to a router',
  `amountPrecision` int(11) NOT NULL DEFAULT 8 COMMENT 'Display only — never used to round an amount that is sent to a router',
  `defaultSlippageBps` int(11) DEFAULT NULL COMMENT 'Per-pair override of the dexDefaultSlippageBps setting',
  `lastPrice` decimal(38,18) DEFAULT NULL COMMENT 'display/aggregation only — LOSSY, never authoritative',
  `change24h` decimal(20,8) DEFAULT NULL COMMENT 'display/aggregation only — LOSSY, never authoritative',
  `volume24hUsd` decimal(20,8) DEFAULT NULL COMMENT 'display/aggregation only — LOSSY, never authoritative',
  `liquidityUsd` decimal(20,8) DEFAULT NULL COMMENT 'display/aggregation only — LOSSY, never authoritative',
  `metadata` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dexPairSymbolKey` (`symbol`) USING BTREE,
  UNIQUE KEY `dexPairChainBaseQuoteKey` (`chainId`,`baseTokenId`,`quoteTokenId`) USING BTREE,
  KEY `baseTokenId` (`baseTokenId`),
  KEY `quoteTokenId` (`quoteTokenId`),
  KEY `dexPairStatusIdx` (`status`) USING BTREE,
  KEY `dexPairChainStatusIdx` (`chainId`,`status`) USING BTREE,
  KEY `dexPairHotIdx` (`isHot`) USING BTREE,
  CONSTRAINT `dex_pair_ibfk_1` FOREIGN KEY (`baseTokenId`) REFERENCES `dex_token` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `dex_pair_ibfk_2` FOREIGN KEY (`quoteTokenId`) REFERENCES `dex_token` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dex_pool`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dex_pool` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chainId` int(11) NOT NULL,
  `venueName` varchar(32) NOT NULL COMMENT 'AmmDeployment.key — ''uniswap-v2'' | ''uniswap-v3'' | ''pancake-v2''',
  `standard` varchar(4) NOT NULL COMMENT 'Decides everything downstream: the maths, the calldata shape, whether fees are bookable at all',
  `factory` varchar(42) NOT NULL COMMENT 'DENORMALISED at create. The row must survive a registry edit — otherwise changing a deployment retroactively changes what an existing pool claims to be',
  `router` varchar(42) NOT NULL COMMENT 'Denormalised at create. The swap `to` AND the ERC20 spender',
  `routerAbi` varchar(24) NOT NULL COMMENT 'The deadline lives in a DIFFERENT PLACE in each shape. Never inferred from the address: SwapRouter02.exactInputSingle called directly encodes and executes with NO DEADLINE AT ALL',
  `quoter` varchar(42) DEFAULT NULL COMMENT 'V3 only: QuoterV2',
  `positionManager` varchar(42) DEFAULT NULL COMMENT 'V3 only: NonfungiblePositionManager',
  `poolAddress` varchar(42) DEFAULT NULL COMMENT 'PRODUCED BY THE FACTORY ROUND-TRIP, never taken from input. NULL only while DRAFT. A CREATE2 prediction is advisory and may not be written here',
  `predictedAddress` varchar(42) DEFAULT NULL COMMENT 'What CREATE2 said. Kept so a disagreement with poolAddress stays forensically visible after the fact',
  `initCodeHash` varchar(66) DEFAULT NULL COMMENT 'V2, INFORMATIONAL ONLY. Never used to derive poolAddress — a wrong value would otherwise predict a stranger''s contract',
  `token0` varchar(42) NOT NULL,
  `token1` varchar(42) NOT NULL,
  `token0Id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Nullable: a pool may be verified before either token is allowlisted. The ADDRESSES are the authority',
  `token1Id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `feeTier` int(11) NOT NULL COMMENT 'uint24, HUNDREDTHS OF A BIP. 3000 = 0.30%. The V3 calldata takes it verbatim. NEVER bps',
  `lpFeeShareBps` int(11) NOT NULL COMMENT 'What the LP ACTUALLY RECEIVES after the pool''s protocol fee — 25 on canonical v2 post-UNIfication, not 30. Never defaulted to feeTier: a break-even projection built on the tier number overstates income by 17-20%',
  `tickSpacing` int(11) DEFAULT NULL COMMENT 'V3; needed for the full-range bounds',
  `state` varchar(16) NOT NULL DEFAULT 'DRAFT' COMMENT 'The LIFECYCLE axis. Orthogonal to verifiedAt — see the file header',
  `verifiedAt` datetime DEFAULT NULL COMMENT 'The TRUST axis. Drives the staleness refusal, mirroring SCREENING_STALE. Orthogonal to state',
  `verifiedAtBlock` bigint(20) DEFAULT NULL,
  `rejectedReason` varchar(64) DEFAULT NULL COMMENT 'The PoolRejectionReason slug from pool-verify.ts',
  `createTxHash` varchar(66) DEFAULT NULL,
  `createBlockNumber` bigint(20) DEFAULT NULL COMMENT 'The log-sweep backfill floor. Known exactly for a receipt-verified pool',
  `reserve0` varchar(78) DEFAULT NULL COMMENT 'V2. CACHE — NEVER QUOTED FROM. A quote reads the chain at a pinned block',
  `reserve1` varchar(78) DEFAULT NULL COMMENT 'V2. CACHE — NEVER QUOTED FROM',
  `totalSupply` varchar(78) DEFAULT NULL COMMENT 'V2 LP token supply. CACHE',
  `sqrtPriceX96` varchar(78) DEFAULT NULL COMMENT 'V3. CACHE. Not an amount but a uint160, and the same STRING rule applies for the same reason: MySQL DECIMAL(65,0) cannot hold a uint256 and mysql2 returns every DECIMAL as a string, so `a + b` concatenates',
  `poolLiquidity` varchar(78) DEFAULT NULL COMMENT 'V3. CACHE',
  `reservesBlock` bigint(20) DEFAULT NULL COMMENT 'The block the cache was read at',
  `reservesUpdatedAt` datetime DEFAULT NULL,
  `liquidityUsd` decimal(20,8) DEFAULT NULL COMMENT 'display/aggregation only — LOSSY, never authoritative. NULL means UNPRICEABLE and never 0: the depth gate REFUSES on null rather than passing',
  `seededByPlatformOperator` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Set from the on-chain Mint log''s RECIPIENT, never from a form field. That provenance is the only reason this flag may appear in a user-facing legal disclosure',
  `seedTxHash` varchar(66) DEFAULT NULL,
  `lastSwapBlock` bigint(20) DEFAULT NULL COMMENT 'The event-indexer cursor',
  `indexedToBlock` bigint(20) DEFAULT NULL COMMENT 'Resumable sweep cursor. Never advanced past head - requiredConfirmations',
  `indexedToBlockHash` varchar(66) DEFAULT NULL COMMENT 'Compared before extending. A mismatch means a reorg deeper than the confirmation depth, which rewinds and RE-DERIVES the affected candles rather than patching them',
  `metadata` text DEFAULT NULL COMMENT 'JSON-in-TEXT: prod MySQL pre-parses a real JSON column',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dexPoolChainPathKey` (`chainId`,`factory`,`token0`,`token1`,`feeTier`) USING BTREE,
  UNIQUE KEY `dexPoolChainAddressKey` (`chainId`,`poolAddress`) USING BTREE,
  KEY `token0Id` (`token0Id`),
  KEY `token1Id` (`token1Id`),
  KEY `dexPoolStateIdx` (`chainId`,`state`) USING BTREE,
  KEY `dexPoolTokensIdx` (`chainId`,`token0`,`token1`) USING BTREE,
  KEY `dexPoolCursorIdx` (`state`,`lastSwapBlock`) USING BTREE,
  CONSTRAINT `dex_pool_ibfk_1` FOREIGN KEY (`token0Id`) REFERENCES `dex_token` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `dex_pool_ibfk_2` FOREIGN KEY (`token1Id`) REFERENCES `dex_token` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dex_pool_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dex_pool_event` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `positionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Null for pool-level events (SWAP, SYNC) that belong to no position',
  `kind` varchar(24) NOT NULL,
  `chainId` int(11) NOT NULL,
  `txHash` varchar(66) NOT NULL,
  `logIndex` int(11) NOT NULL COMMENT 'Which log in the receipt. Together with (chainId, txHash) this is the row''s IDENTITY, which is what makes a re-run of the sweep non-double-counting by construction',
  `blockNumber` bigint(20) NOT NULL,
  `blockTimestamp` datetime DEFAULT NULL COMMENT 'From the CHAIN''s own block, never from a local clock. Block timestamps are seconds; the chart contract is milliseconds',
  `tokenAddress` varchar(42) DEFAULT NULL COMMENT 'Denormalised — the report must survive a delist',
  `tokenSymbol` varchar(32) DEFAULT NULL COMMENT 'Denormalised — the report must survive a delist',
  `tokenDecimals` int(11) DEFAULT NULL COMMENT 'Denormalised. Without it a swept row cannot be re-derived from its raw amount once the token row is gone',
  `amount0Raw` varchar(79) DEFAULT NULL COMMENT 'SIGNED — a burn is negative. 79 not 78 for the sign',
  `amount1Raw` varchar(79) DEFAULT NULL COMMENT 'SIGNED — a burn is negative',
  `grossAmountRaw` varchar(79) DEFAULT NULL COMMENT 'V3: the Collect amount for this token',
  `principalReturnedRaw` varchar(79) DEFAULT NULL COMMENT 'V3: the sum of DecreaseLiquidity amounts since the last Collect. Subtracted from gross to leave the bookable fee',
  `feeAmountRaw` varchar(79) DEFAULT NULL COMMENT 'NULL on every V2 row, permanently: there is no on-chain fact separating fee from principal on a V2 burn',
  `amountUsd` decimal(20,8) DEFAULT NULL COMMENT 'display/aggregation only — LOSSY. A NULL means NO PRICE, never zero',
  `usdRateSource` varchar(24) DEFAULT NULL,
  `sweepStatus` varchar(16) NOT NULL DEFAULT 'NONE' COMMENT 'NONE on every V2 row and on pool-level events. UNRECOVERABLE is expected rather than anomalous on this path: the operator''s own token is precisely the symbol that is not in exchangeCurrency, and the sweep refuses by name rather than creating a wallet in a currency nothing can spend',
  `sweepAttempts` int(11) NOT NULL DEFAULT 0 COMMENT 'collectPlatformFee NEVER THROWS and returns null on failure. A null must not mark the group SWEPT — it stays ACCRUED, this increments, and at 5 the row goes UNRECOVERABLE',
  `creditedTransactionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `adminProfitId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `creditedAmount` decimal(36,18) DEFAULT NULL COMMENT 'What actually reached the wallet, after the 8-dp conversion',
  `roundingResidueRaw` varchar(79) DEFAULT NULL COMMENT 'The base units dropped by that conversion. Recorded rather than discarded — the wallet service speaks in 8-dp Numbers and an 18-decimal amount does not fit',
  `sweepFailureReason` varchar(255) DEFAULT NULL,
  `metadata` text DEFAULT NULL COMMENT 'JSON-in-TEXT: prod MySQL pre-parses a real JSON column',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dexPoolEventTxLogKey` (`chainId`,`txHash`,`logIndex`) USING BTREE,
  KEY `positionId` (`positionId`),
  KEY `dexPoolEventSweepIdx` (`sweepStatus`,`chainId`) USING BTREE,
  KEY `dexPoolEventPoolKindIdx` (`poolId`,`kind`,`blockNumber`) USING BTREE,
  CONSTRAINT `dex_pool_event_ibfk_1` FOREIGN KEY (`poolId`) REFERENCES `dex_pool` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `dex_pool_event_ibfk_2` FOREIGN KEY (`positionId`) REFERENCES `dex_pool_position` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dex_pool_position`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dex_pool_position` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chainId` int(11) NOT NULL,
  `ownerAddress` varchar(42) NOT NULL COMMENT 'THE OPERATOR''S OWN ADDRESS. The platform never holds this key and cannot move or recover this position',
  `riskAckId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'NOT NULL + RESTRICT makes the acknowledgement gate A SCHEMA FACT rather than a handler convention. There is no code path that can produce a position without one',
  `openedAt` datetime NOT NULL,
  `openTxHash` varchar(66) NOT NULL,
  `seeded0Raw` varchar(79) NOT NULL COMMENT 'COST BASIS in base units. Signed so a top-up appends rather than overwriting — 79 not 78 for the sign, same discipline as dexFeeAccrual.amountRaw',
  `seeded1Raw` varchar(79) NOT NULL COMMENT 'COST BASIS in base units. Signed',
  `seeded0Usd` decimal(20,8) DEFAULT NULL COMMENT 'STAMPED AT SEED TIME AND NEVER RE-PRICED — the same rule priceDexTokenUsd follows. display/aggregation only, LOSSY. NULL means unpriceable, never 0',
  `seeded1Usd` decimal(20,8) DEFAULT NULL COMMENT 'Stamped at seed time and never re-priced. LOSSY. NULL means unpriceable, never 0',
  `usdRateSource` varchar(24) DEFAULT NULL COMMENT 'Which price source stamped the cost basis. A position priced only by its OWN pool is a self-referential mark and must never be headlined',
  `lpBalanceRaw` varchar(78) DEFAULT NULL COMMENT 'V2 LP token balance',
  `nftTokenId` varchar(78) DEFAULT NULL COMMENT 'V3. A uint256, therefore a STRING — Number() would lose it above 2^53',
  `tickLower` int(11) DEFAULT NULL COMMENT 'V3. v1 is FULL RANGE ONLY: a concentrated range the price leaves becomes 100% one-sided, the pool stops quoting entirely, and the market reads as an outage with no error anywhere',
  `tickUpper` int(11) DEFAULT NULL,
  `state` varchar(16) NOT NULL DEFAULT 'OPEN' COMMENT 'ORPHANED is a real state: a position whose opening receipt disappeared in a reorg is neither open nor closed, and saying so beats guessing',
  `closedAt` datetime DEFAULT NULL,
  `realized0Raw` varchar(79) DEFAULT NULL COMMENT 'Signed: a withdrawal is negative against the seeded basis',
  `realized1Raw` varchar(79) DEFAULT NULL,
  `realizedUsd` decimal(20,8) DEFAULT NULL COMMENT 'display/aggregation only — LOSSY, never authoritative',
  `metadata` text DEFAULT NULL COMMENT 'JSON-in-TEXT: prod MySQL pre-parses a real JSON column',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dexPoolPositionOpenTxKey` (`poolId`,`openTxHash`) USING BTREE,
  KEY `dexPoolPositionStateIdx` (`state`,`chainId`) USING BTREE,
  KEY `dexPoolPositionAckIdx` (`riskAckId`) USING BTREE,
  CONSTRAINT `dex_pool_position_ibfk_1` FOREIGN KEY (`poolId`) REFERENCES `dex_pool` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `dex_pool_position_ibfk_2` FOREIGN KEY (`riskAckId`) REFERENCES `dex_pool_risk_ack` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dex_pool_risk_ack`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dex_pool_risk_ack` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chainId` int(11) NOT NULL COMMENT 'Denormalised — the evidence must outlive the pool row',
  `poolAddress` varchar(42) NOT NULL COMMENT 'Denormalised — the evidence must outlive the pool row',
  `adminUserId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'NO FOREIGN KEY, deliberately. Same reasoning adminAuditLog gives: an FK would let deleting an admin cascade away the evidence, and would make this INSERT take a shared lock on a `user` row the in-flight request may already hold',
  `adminEmail` varchar(191) NOT NULL COMMENT 'Denormalised at sign time — must remain readable after the account is gone',
  `adminName` varchar(191) NOT NULL COMMENT 'Denormalised at sign time',
  `clauseVersion` varchar(16) NOT NULL COMMENT '"1.0", or "waived" on an attributed Super-Admin waiver row',
  `clauseHash` varchar(66) NOT NULL COMMENT 'sha256 of the exact rendered prose. Change one character of the copy and every prior acknowledgement is stale and seeding re-blocks — which is the point, not a bug',
  `clausesAccepted` text NOT NULL COMMENT 'JSON-in-TEXT array of the individually-ticked clause ids. Empty on a waiver row, which is itself the record',
  `typedConfirmation` varchar(128) NOT NULL COMMENT 'EXACTLY what they typed. Stored so a dispute is answerable from the row rather than reconstructed',
  `feeTierBps` int(11) NOT NULL COMMENT 'One of the two numbers the typed string encodes. Stored separately so the confirmation can be re-derived and checked',
  `initialPriceQuotePerBase` varchar(78) NOT NULL COMMENT 'The other. On an empty pair the first addLiquidity SETS the price — there is no market to correct a mistyped ratio, and the first arbitrageur takes the difference in the first block',
  `ipAddress` varchar(64) DEFAULT NULL,
  `userAgent` varchar(255) DEFAULT NULL,
  `acknowledgedAt` datetime NOT NULL,
  `waivedByUserId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Non-null only on a clauseVersion "waived" row. Turning dexPoolRiskAckRequired off removes the DIALOG, never the RECORD — riskAckId is NOT NULL at the database, so an attributed waiver row is strictly more forensically useful than a gap, and "who allowed this" stays answerable from the position itself',
  `revokedAt` datetime DEFAULT NULL COMMENT 'A full withdrawal revokes the acknowledgement',
  `revokedReason` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dexPoolRiskAckPoolClauseKey` (`poolId`,`clauseHash`) USING BTREE,
  KEY `dexPoolRiskAckAdminIdx` (`adminUserId`) USING BTREE,
  CONSTRAINT `dex_pool_risk_ack_ibfk_1` FOREIGN KEY (`poolId`) REFERENCES `dex_pool` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dex_provider`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dex_provider` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(32) NOT NULL COMMENT 'Adapter registry key — the vendor''s own spelling, e.g. 0x',
  `title` varchar(64) NOT NULL,
  `description` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Operator activation — an adapter that exists in code is still off until this is true',
  `priority` int(11) NOT NULL DEFAULT 100 COMMENT 'Lower wins when two providers return an equivalent route',
  `version` varchar(32) DEFAULT NULL,
  `supportedChainIds` text NOT NULL COMMENT 'JSON array of numeric EVM chain ids this adapter can quote',
  `apiKeyEnvVar` varchar(64) DEFAULT NULL COMMENT 'The env var NAME, never the key. The value is read from process.env at call time and never persisted or serialised',
  `baseUrl` varchar(255) DEFAULT NULL,
  `feeMode` varchar(16) DEFAULT NULL COMMENT 'Which side of the trade this router can take a fee on. ONCHAIN_REFERRAL means the fee is registered on chain, not passed per quote',
  `lastVerifiedAt` datetime DEFAULT NULL COMMENT 'Last successful probe from the setup console',
  `lastError` text DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dexProviderNameKey` (`name`) USING BTREE,
  KEY `dexProviderStatusPriorityIdx` (`status`,`priority`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dex_quote`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dex_quote` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chainId` int(11) NOT NULL,
  `pairId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'NULL for an ad-hoc token combination that is not a curated market',
  `sellTokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `buyTokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `vm` varchar(8) NOT NULL DEFAULT 'EVM' COMMENT 'Decides address encoding and whether lowercasing an address destroys it. Denormalised because a validator runs inside the model, where the chain registry is a boot-time import cycle',
  `sellTokenAddress` varchar(64) NOT NULL COMMENT 'Denormalised so the row still reads correctly if the token row is removed. EVM: lowercase. SVM/TVM/TON: VERBATIM — case is data',
  `buyTokenAddress` varchar(64) NOT NULL COMMENT 'Denormalised so the row still reads correctly if the token row is removed',
  `sellAmountRaw` varchar(78) NOT NULL COMMENT 'Base units as a decimal string — uint256 needs 78 digits, DECIMAL caps at 65',
  `buyAmountRaw` varchar(78) NOT NULL,
  `minBuyAmountRaw` varchar(78) NOT NULL COMMENT 'What the router itself will enforce — the slippage floor encoded in the calldata',
  `sellAmountDisplay` decimal(38,18) NOT NULL COMMENT 'display/aggregation only — LOSSY, never authoritative',
  `buyAmountDisplay` decimal(38,18) NOT NULL COMMENT 'display/aggregation only — LOSSY, never authoritative',
  `sellUsd` decimal(20,8) DEFAULT NULL COMMENT 'USD snapshot at quote time — display/aggregation only, LOSSY',
  `buyUsd` decimal(20,8) DEFAULT NULL COMMENT 'USD snapshot at quote time — display/aggregation only, LOSSY',
  `takerAddress` varchar(64) NOT NULL,
  `takerVerified` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether takerAddress was a PROVED wallet link at quote time - a providerUser row with provider WALLET, which is what the SIWE and non-EVM link proofs write. Stored rather than joined because a later verification must not retroactively make an unverified quote look verified. It said dexWalletLink until that table turned out to have no writer anywhere in the product',
  `aggregator` varchar(32) NOT NULL COMMENT 'dexProvider.name that produced this route. A DIRECT_POOL route writes "direct" here so Phase 4''s analytics grouping does not break — but EVERY NEW CONSUMER READS venueKind',
  `venueKind` varchar(16) NOT NULL DEFAULT 'AGGREGATOR' COMMENT 'NOT NULL with a default, so every existing row stays valid with no compensating script — there is no migration system here and no `down`',
  `venueName` varchar(32) DEFAULT NULL COMMENT 'The AMM deployment key on a direct route, distinct from the `aggregator` column above',
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Which pool the calldata targets. SET NULL — the quote outlives a pool archive',
  `router` varchar(64) DEFAULT NULL COMMENT 'The transaction `to` the user will sign against. On SVM this is the aggregator''s PROGRAM id, on TON the router contract — the same role, a different encoding',
  `allowanceTarget` varchar(64) DEFAULT NULL COMMENT 'Spender for the ERC20/TRC20 approval — often NOT the router. Always NULL on SVM and TON: neither has an allowance model, so a value here would be a nonsense the client would then ask the user to sign',
  `value` varchar(78) NOT NULL DEFAULT '0' COMMENT 'Native value in wei attached to the transaction — non-zero only when selling the native asset',
  `calldata` longtext DEFAULT NULL COMMENT 'The exact payload the user signs, and it is NOT hex on every VM: EVM hex calldata, SVM a base64 v0 transaction, TVM the JSON `triggersmartcontract` object, TON a base64 message BOC. LONGTEXT because multi-hop routes exceed 64 KB',
  `calldataHash` varchar(66) DEFAULT NULL COMMENT 'Hash of `calldata` — the binding key the execute path verifies against. keccak256 on EVM, sha256 of the stored payload on every other VM; always rendered 0x + 64 hex',
  `quoteKey` varchar(64) NOT NULL COMMENT 'sha256 of the normalised request — the dedup key for the quote-spam guard',
  `feeBps` int(11) NOT NULL,
  `feeRecipient` varchar(64) DEFAULT NULL COMMENT 'Where the integrator fee accrues. On SVM this is a TOKEN ACCOUNT for the fee mint, not a wallet — SPL fees can only arrive in an account that already exists for that mint',
  `feeSide` varchar(8) DEFAULT NULL,
  `estimatedFeeAmountRaw` varchar(78) DEFAULT NULL,
  `slippageBps` int(11) NOT NULL,
  `priceImpactBps` int(11) DEFAULT NULL,
  `estimatedGas` varchar(78) DEFAULT NULL,
  `latencyMs` int(11) DEFAULT NULL COMMENT 'Provider round-trip, fed to the quote-log analytics',
  `outcome` varchar(20) NOT NULL DEFAULT 'OK' COMMENT 'Why there is or is not a route. Failed attempts are persisted too — a user complaining they could never get a quote is unanswerable otherwise',
  `routeSummary` text DEFAULT NULL COMMENT 'Normalised hop list, with the untouched vendor payload preserved under .raw',
  `complianceSnapshot` text NOT NULL COMMENT 'Resolved country and the signal that produced it, KYC feature state, geo list version, token risk levels at quote time, settings version. A SNAPSHOT, never a join',
  `status` varchar(16) NOT NULL DEFAULT 'OPEN',
  `expiresAt` datetime NOT NULL,
  `ipAddress` varchar(64) DEFAULT NULL COMMENT 'Sized for IPv6 — the geo decision recorded in complianceSnapshot derives from it',
  `userAgent` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dexQuoteCalldataHashKey` (`chainId`,`calldataHash`) USING BTREE,
  KEY `pairId` (`pairId`),
  KEY `sellTokenId` (`sellTokenId`),
  KEY `buyTokenId` (`buyTokenId`),
  KEY `dexQuoteUserCreatedIdx` (`userId`,`createdAt`) USING BTREE,
  KEY `dexQuoteDedupIdx` (`userId`,`quoteKey`,`createdAt`) USING BTREE,
  KEY `dexQuoteExpiryIdx` (`status`,`expiresAt`) USING BTREE,
  KEY `dexQuoteChainCreatedIdx` (`chainId`,`createdAt`) USING BTREE,
  CONSTRAINT `dex_quote_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `dex_quote_ibfk_2` FOREIGN KEY (`pairId`) REFERENCES `dex_pair` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `dex_quote_ibfk_3` FOREIGN KEY (`sellTokenId`) REFERENCES `dex_token` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `dex_quote_ibfk_4` FOREIGN KEY (`buyTokenId`) REFERENCES `dex_token` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dex_swap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dex_swap` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `quoteId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'NULL for an APPROVAL, which is not quoted',
  `pairId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `kind` varchar(16) NOT NULL DEFAULT 'SWAP',
  `chainId` int(11) NOT NULL,
  `vm` varchar(8) NOT NULL DEFAULT 'EVM' COMMENT 'Decides what a transaction id and an address ARE on this row, and whether lowercasing either destroys it',
  `txHash` varchar(128) NOT NULL COMMENT 'EVM: 0x + 64 hex. SVM: an 87-88 char base58 SIGNATURE. TVM: 64 bare hex. TON: the external MESSAGE hash, which is what toncenter''s msg_hash index is keyed by — TON has no single transaction hash',
  `nonce` int(11) DEFAULT NULL COMMENT 'Sender nonce, persisted on first sighting. Required by the DROPPED rule: a pending tx whose nonce has already been consumed by a different hash was replaced, not lost. EVM ONLY — null on every other VM, which is why the drop rule falls back to elapsed time there',
  `fromAddress` varchar(64) NOT NULL COMMENT 'The sender AS READ FROM THE CHAIN, never as claimed by the client — this is what ties an on-chain fact to a user',
  `toAddress` varchar(64) DEFAULT NULL,
  `sellTokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `buyTokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `sellAmountRaw` varchar(78) DEFAULT NULL COMMENT 'As quoted',
  `buyAmountRaw` varchar(78) DEFAULT NULL COMMENT 'As quoted',
  `realizedBuyAmountRaw` varchar(78) DEFAULT NULL COMMENT 'Decoded from the receipt Transfer logs — what actually arrived',
  `sellAmountDisplay` decimal(38,18) DEFAULT NULL COMMENT 'display/aggregation only — LOSSY, never authoritative',
  `buyAmountDisplay` decimal(38,18) DEFAULT NULL COMMENT 'display/aggregation only — LOSSY, never authoritative',
  `realizedBuyAmountDisplay` decimal(38,18) DEFAULT NULL COMMENT 'display/aggregation only — LOSSY, never authoritative',
  `sellUsd` decimal(20,8) DEFAULT NULL COMMENT 'USD snapshot at confirmation — display/aggregation only, LOSSY',
  `buyUsd` decimal(20,8) DEFAULT NULL COMMENT 'USD snapshot at confirmation — display/aggregation only, LOSSY',
  `executionPrice` decimal(38,18) DEFAULT NULL COMMENT 'display/aggregation only — LOSSY, never authoritative',
  `slippageRealizedBps` int(11) DEFAULT NULL COMMENT 'Signed: negative means the fill beat the quote',
  `status` varchar(16) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING (broadcast, unmined) -> MINED (in a block) -> CONFIRMED (past requiredConfirmations); REVERTED, DROPPED (nonce consumed elsewhere), REPLACED (the user''s wallet sped it up or cancelled it) and REORGED are terminal and each needs a different user-facing message',
  `statusReason` varchar(64) DEFAULT NULL COMMENT 'Short machine slug, translated for display — never a raw provider string',
  `statusHistory` text DEFAULT NULL COMMENT 'Append-only JSON array of "status", "at", "reason" entries. A "my swap says dropped" ticket is unanswerable without it, because status alone has already been overwritten',
  `statusChangedAt` datetime DEFAULT NULL,
  `replacedByTxHash` varchar(128) DEFAULT NULL COMMENT 'Set with status=REPLACED: the id of the speed-up/cancel the user''s wallet broadcast in this one''s place. Client-reported (viem''s onReplaced) and verified server-side by (fromAddress, nonce) — no RPC can be asked which transaction consumed a nonce. EVM ONLY in practice: replacement is a nonce mechanic, and no other VM here has one',
  `blockNumber` bigint(20) DEFAULT NULL,
  `blockHash` varchar(128) DEFAULT NULL COMMENT 'Reorg detection: a confirmed swap whose block hash no longer matches the chain at that height was reorged out. Empty string on TRON means NOT COMPARED — the API does not return one',
  `blockTimestamp` datetime DEFAULT NULL,
  `confirmations` int(11) NOT NULL DEFAULT 0,
  `gasUsed` varchar(78) DEFAULT NULL,
  `effectiveGasPrice` varchar(78) DEFAULT NULL COMMENT 'Wei per gas unit',
  `gasCostNativeRaw` varchar(78) DEFAULT NULL COMMENT 'gasUsed * effectiveGasPrice, in wei',
  `gasCostUsd` decimal(20,8) DEFAULT NULL COMMENT 'display/aggregation only — LOSSY, never authoritative',
  `aggregator` varchar(32) DEFAULT NULL COMMENT 'dexProvider.name, copied from the quote so the row survives a provider delete. A direct route writes "direct" — every NEW consumer reads venueKind',
  `venueKind` varchar(16) NOT NULL DEFAULT 'AGGREGATOR' COMMENT 'NOT NULL with a default, so every existing row stays valid with no compensating script',
  `venueName` varchar(32) DEFAULT NULL COMMENT 'The AMM deployment key on a direct route',
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Which pool filled this. SET NULL rather than RESTRICT: the swap record must outlive a pool archive',
  `feeBps` int(11) DEFAULT NULL COMMENT 'Copied from the quote — the settings value may have moved since',
  `feeRecipient` varchar(64) DEFAULT NULL,
  `feeSide` varchar(8) DEFAULT NULL,
  `lastCheckedAt` datetime DEFAULT NULL COMMENT 'Poller cursor',
  `checkAttempts` int(11) NOT NULL DEFAULT 0 COMMENT 'Drives the poller backoff, so one dead RPC does not pin the sweep',
  `reorgCheckedAt` datetime DEFAULT NULL,
  `confirmedAt` datetime DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dexSwapChainTxKey` (`chainId`,`txHash`) USING BTREE,
  KEY `sellTokenId` (`sellTokenId`),
  KEY `buyTokenId` (`buyTokenId`),
  KEY `dexSwapUserCreatedIdx` (`userId`,`createdAt`) USING BTREE,
  KEY `dexSwapPollerIdx` (`status`,`lastCheckedAt`) USING BTREE,
  KEY `dexSwapReorgIdx` (`status`,`reorgCheckedAt`,`confirmedAt`) USING BTREE,
  KEY `dexSwapChainStatusIdx` (`chainId`,`status`) USING BTREE,
  KEY `dexSwapVenueIdx` (`venueKind`,`status`) USING BTREE,
  KEY `dexSwapQuoteIdx` (`quoteId`) USING BTREE,
  KEY `dexSwapPairTapeIdx` (`pairId`,`status`,`confirmedAt`) USING BTREE,
  CONSTRAINT `dex_swap_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `dex_swap_ibfk_2` FOREIGN KEY (`quoteId`) REFERENCES `dex_quote` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `dex_swap_ibfk_3` FOREIGN KEY (`pairId`) REFERENCES `dex_pair` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `dex_swap_ibfk_4` FOREIGN KEY (`sellTokenId`) REFERENCES `dex_token` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `dex_swap_ibfk_5` FOREIGN KEY (`buyTokenId`) REFERENCES `dex_token` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dex_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dex_token` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chainId` int(11) NOT NULL,
  `vm` varchar(8) NOT NULL DEFAULT 'EVM' COMMENT 'Decides address encoding. Denormalised because a validator runs inside the model, where the chain registry is a boot-time import cycle',
  `address` varchar(64) NOT NULL COMMENT 'Contract address. EVM: lowercase, and the native asset uses the aggregator sentinel 0xeeee...eeee so it is a real value and the chain+address unique index still holds. SVM: the MINT, base58 verbatim. TVM/TON: base58/base64 verbatim — case is data',
  `symbol` varchar(32) NOT NULL,
  `name` varchar(128) NOT NULL,
  `decimals` int(11) NOT NULL COMMENT 'Load-bearing and silently wrong when wrong: every raw<->display conversion scales by it, so an off-by-one moves the decimal point on a real transfer. Validated against an on-chain decimals() call before a token is allowlisted',
  `isNative` tinyint(1) NOT NULL DEFAULT 0,
  `logoUrl` varchar(1000) DEFAULT NULL,
  `coingeckoId` varchar(64) DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Operator on/off switch — axis 1 of 3',
  `listing` varchar(16) NOT NULL DEFAULT 'PENDING' COMMENT 'The curation decision, made by a human — axis 2 of 3',
  `origin` varchar(16) NOT NULL DEFAULT 'EXTERNAL' COMMENT 'OPERATOR_ISSUED drives the mandatory conflict disclosure. Issuer, market maker and interface operator in one entity, on a token whose supply that entity can increase, is a configuration that should be reached deliberately rather than by ticking three unrelated switches on three pages',
  `issuerUserId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Who deployed it, when we know. SET NULL — the token outlives the account',
  `mintable` tinyint(1) DEFAULT NULL COMMENT 'NULL = NOT YET PROBED, and null is a third value rather than a soft false. PROBED FROM BYTECODE, never from operator input. A PROXY records null with probeReason PROXY_UNDECIDABLE: selector-presence is positive evidence, but selector-ABSENCE is evidence of absence only for a non-proxy contract, and a confident `false` on a contract whose implementation can be swapped is worse than an honest unknown',
  `directPoolOnly` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Unquotable while dexDirectPoolsEnabled is off, with its own refusal reason rather than folded into a generic one',
  `riskLevel` varchar(16) DEFAULT NULL COMMENT 'The machine verdict from screening — axis 3 of 3',
  `riskScore` int(11) DEFAULT NULL,
  `riskSource` varchar(32) DEFAULT NULL COMMENT 'Screening provider that produced riskLevel/riskScore',
  `riskFlags` text DEFAULT NULL COMMENT 'JSON array of slugs: "honeypot", "high_sell_tax", "proxy_upgradeable", "low_liquidity"',
  `riskCheckedAt` datetime DEFAULT NULL COMMENT 'Drives the staleness refusal — a token whose screening is older than the configured window is not quotable',
  `verifiedSource` varchar(16) NOT NULL DEFAULT 'MANUAL' COMMENT 'How this row entered the catalog',
  `ecosystemTokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Soft link to the custodial catalog for operators who list the same asset in both. Never used to resolve a wallet',
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dexTokenChainAddressKey` (`chainId`,`address`) USING BTREE,
  KEY `ecosystemTokenId` (`ecosystemTokenId`),
  KEY `dexTokenPickerIdx` (`chainId`,`status`,`listing`) USING BTREE,
  KEY `dexTokenSymbolIdx` (`symbol`) USING BTREE,
  KEY `dexTokenRiskCheckedAtIdx` (`riskCheckedAt`) USING BTREE,
  CONSTRAINT `dex_token_ibfk_1` FOREIGN KEY (`ecosystemTokenId`) REFERENCES `ecosystem_token` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dex_user_wallet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dex_user_wallet` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `vault` text NOT NULL,
  `vaultVersion` int(11) NOT NULL DEFAULT 1,
  `label` varchar(64) DEFAULT NULL,
  `backedUpAt` datetime DEFAULT NULL,
  `lastUnlockedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dexUserWalletUserKey` (`userId`) USING BTREE,
  CONSTRAINT `dex_user_wallet_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dex_wallet_link`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dex_wallet_link` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `vm` varchar(8) NOT NULL DEFAULT 'EVM',
  `address` varchar(64) NOT NULL COMMENT 'The self-custody address the user proved control of. EVM: lowercase. SVM/TVM/TON: verbatim — folding base58 or base64 names a different account, and this column is compared against a signer read from the chain',
  `label` varchar(64) DEFAULT NULL COMMENT 'Operator- or user-supplied name, display only',
  `verifiedAt` datetime DEFAULT NULL COMMENT 'NULL means the address was seen but never proven — treat it as unverified',
  `verificationMethod` varchar(16) DEFAULT NULL,
  `chainId` int(11) DEFAULT NULL COMMENT 'The chain the SIWE message named — part of what was signed, so it is recorded as signed',
  `lastUsedAt` datetime DEFAULT NULL,
  `nonce` varchar(64) DEFAULT NULL COMMENT 'In-flight SIWE challenge, cleared on verification',
  `nonceExpiresAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dexWalletLinkAddressKey` (`address`) USING BTREE,
  KEY `dexWalletLinkUserIdx` (`userId`) USING BTREE,
  CONSTRAINT `dex_wallet_link_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_category` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` varchar(191) NOT NULL,
  `image` varchar(191) DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_discount`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_discount` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `code` varchar(191) NOT NULL,
  `type` enum('PERCENTAGE','FIXED','FREE_SHIPPING') NOT NULL DEFAULT 'PERCENTAGE',
  `percentage` int(11) DEFAULT 0,
  `amount` double DEFAULT 0,
  `maxUses` int(11) DEFAULT NULL,
  `validFrom` datetime(3) DEFAULT NULL,
  `validUntil` datetime(3) NOT NULL,
  `productId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecommerceDiscountCodeKey` (`code`) USING BTREE,
  KEY `ecommerceDiscountProductIdFkey` (`productId`) USING BTREE,
  CONSTRAINT `ecommerce_discount_ibfk_1` FOREIGN KEY (`productId`) REFERENCES `ecommerce_product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_order` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` enum('PENDING','COMPLETED','CANCELLED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `shippingId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `subtotal` double DEFAULT NULL,
  `discount` double DEFAULT 0,
  `shippingCost` double DEFAULT 0,
  `tax` double DEFAULT 0,
  `total` double DEFAULT NULL,
  `currency` varchar(191) DEFAULT NULL,
  `walletType` varchar(50) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `productId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecommerce_order_shippingId_productId_unique` (`shippingId`,`productId`),
  KEY `productId` (`productId`),
  KEY `ecommerceOrderUserIdFkey` (`userId`) USING BTREE,
  KEY `ecommerceOrderShippingIdFkey` (`shippingId`) USING BTREE,
  CONSTRAINT `ecommerce_order_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_order_ibfk_2` FOREIGN KEY (`shippingId`) REFERENCES `ecommerce_shipping` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_order_ibfk_3` FOREIGN KEY (`productId`) REFERENCES `ecommerce_product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  CONSTRAINT `ecommerce_order_item_ibfk_1` FOREIGN KEY (`orderId`) REFERENCES `ecommerce_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_order_item_ibfk_2` FOREIGN KEY (`productId`) REFERENCES `ecommerce_product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_product` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` longtext NOT NULL,
  `shortDescription` varchar(191) DEFAULT NULL,
  `type` enum('DOWNLOADABLE','PHYSICAL') NOT NULL,
  `price` double NOT NULL,
  `categoryId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `inventoryQuantity` int(11) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `image` varchar(191) DEFAULT NULL,
  `gallery` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`gallery`)),
  `currency` varchar(191) NOT NULL DEFAULT 'USD',
  `walletType` enum('FIAT','SPOT','ECO') NOT NULL DEFAULT 'SPOT',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecommerceProductSlugUnique` (`slug`) USING BTREE,
  KEY `ecommerceProductCategoryIdFkey` (`categoryId`) USING BTREE,
  CONSTRAINT `ecommerce_product_ibfk_1` FOREIGN KEY (`categoryId`) REFERENCES `ecommerce_category` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  CONSTRAINT `ecommerce_review_ibfk_1` FOREIGN KEY (`productId`) REFERENCES `ecommerce_product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_review_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `cost` float DEFAULT NULL,
  `tax` float DEFAULT NULL,
  `deliveryDate` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecommerce_shipping_address`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecommerce_shipping_address` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `orderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL DEFAULT '',
  `phone` varchar(255) NOT NULL,
  `street` varchar(255) NOT NULL,
  `city` varchar(255) NOT NULL,
  `state` varchar(255) NOT NULL,
  `postalCode` varchar(255) NOT NULL,
  `country` varchar(255) NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `orderId` (`orderId`),
  CONSTRAINT `ecommerce_shipping_address_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_shipping_address_ibfk_2` FOREIGN KEY (`orderId`) REFERENCES `ecommerce_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
  CONSTRAINT `ecommerce_user_discount_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_user_discount_ibfk_2` FOREIGN KEY (`discountId`) REFERENCES `ecommerce_discount` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  UNIQUE KEY `ecommerce_wishlist_item_wishlistId_productId_unique` (`wishlistId`,`productId`),
  UNIQUE KEY `ecommerceWishlistItemWishlistIdProductId` (`wishlistId`,`productId`) USING BTREE,
  KEY `productId` (`productId`),
  CONSTRAINT `ecommerce_wishlist_item_ibfk_1` FOREIGN KEY (`wishlistId`) REFERENCES `ecommerce_wishlist` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ecommerce_wishlist_item_ibfk_2` FOREIGN KEY (`productId`) REFERENCES `ecommerce_product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecosystem_blockchain`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecosystem_blockchain` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `productId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `chain` varchar(191) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `link` varchar(191) DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `version` varchar(191) DEFAULT '0.0.1',
  `image` varchar(1000) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecosystemBlockchainProductIdKey` (`productId`) USING BTREE,
  UNIQUE KEY `ecosystemBlockchainNameKey` (`name`) USING BTREE
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
  UNIQUE KEY `ecosystemCustodialWalletAddressKey` (`address`) USING BTREE,
  KEY `custodialWalletMasterWalletIdIdx` (`masterWalletId`) USING BTREE,
  CONSTRAINT `ecosystem_custodial_wallet_ibfk_1` FOREIGN KEY (`masterWalletId`) REFERENCES `ecosystem_master_wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecosystem_custom_chain`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecosystem_custom_chain` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chain` varchar(50) NOT NULL,
  `name` varchar(191) NOT NULL,
  `chainId` int(11) NOT NULL,
  `currency` varchar(50) NOT NULL,
  `decimals` int(11) NOT NULL DEFAULT 18,
  `network` varchar(50) NOT NULL DEFAULT 'mainnet',
  `rpcUrl` varchar(512) NOT NULL,
  `rpcWssUrl` varchar(512) DEFAULT NULL,
  `explorerUrl` varchar(512) DEFAULT NULL,
  `explorerApiUrl` varchar(512) DEFAULT NULL,
  `explorerApiKey` varchar(512) DEFAULT NULL,
  `confirmations` int(11) NOT NULL DEFAULT 12,
  `precision` int(11) NOT NULL DEFAULT 8,
  `icon` varchar(1000) DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecosystemCustomChainChainKey` (`chain`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ecosystem_market`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ecosystem_market` (
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
  UNIQUE KEY `ecosystemMarketCurrencyPairKey` (`currency`,`pair`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  UNIQUE KEY `ecosystemMasterWalletChainCurrencyKey` (`chain`,`currency`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `fee` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`fee`)),
  `icon` varchar(1000) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ecosystemTokenContractChainKey` (`contract`,`chain`) USING BTREE,
  KEY `idx_ecosystem_token_currency` (`currency`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `script` varchar(1000) NOT NULL DEFAULT 'N/A',
  `status` enum('UNSPENT','LOCKED','SPENT') NOT NULL DEFAULT 'UNSPENT' COMMENT 'UNSPENT=available, LOCKED=reserved for in-flight withdrawal, SPENT=confirmed on-chain',
  `lockedTxId` varchar(191) DEFAULT NULL COMMENT 'ECOSYS-06: the broadcast txid that reserved (LOCKED) this UTXO for an in-flight withdrawal; lets LOCKED->SPENT promotion be scoped to a single withdrawal so concurrent same-wallet withdrawals cannot promote each other''s inputs.',
  `origin` enum('DEPOSIT','CHANGE','CONSOLIDATION','SYNC') NOT NULL DEFAULT 'DEPOSIT' COMMENT 'How this UTXO row was recorded. CHANGE/CONSOLIDATION rows are platform-produced outputs (withdrawal change, consolidation output) and must never be credited as user deposits by the deposit flow.',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ecosystemUtxoWalletIdIdx` (`walletId`) USING BTREE,
  KEY `idx_status_wallet_locked` (`status`,`walletId`) USING BTREE,
  CONSTRAINT `ecosystem_utxo_ibfk_1` FOREIGN KEY (`walletId`) REFERENCES `wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `engine_lease`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `engine_lease` (
  `id` varchar(64) NOT NULL,
  `instanceId` varchar(64) NOT NULL,
  `hostname` varchar(255) DEFAULT NULL,
  `pid` int(11) DEFAULT NULL,
  `expiresAt` datetime NOT NULL,
  `epoch` int(11) NOT NULL DEFAULT 0 COMMENT 'Fencing token for ledger batches: read FOR UPDATE inside every tick, incremented on promotion',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `exchange`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchange` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL COMMENT 'Internal name identifier for the exchange',
  `title` varchar(191) NOT NULL COMMENT 'Display title of the exchange',
  `description` text DEFAULT NULL COMMENT 'Description of the exchange provider',
  `status` tinyint(1) DEFAULT 0 COMMENT 'Exchange connection status (active/inactive)',
  `username` varchar(191) DEFAULT NULL COMMENT 'Exchange API username/identifier',
  `licenseStatus` tinyint(1) DEFAULT 0 COMMENT 'Exchange license validation status',
  `version` varchar(191) DEFAULT '0.0.1' COMMENT 'Exchange integration version',
  `productId` varchar(191) DEFAULT NULL COMMENT 'Unique product identifier for the exchange',
  `type` varchar(191) DEFAULT 'spot' COMMENT 'Type of exchange (spot, futures, etc.)',
  `link` varchar(500) DEFAULT NULL COMMENT 'Envato product URL for this exchange provider',
  `proxyUrl` varchar(500) DEFAULT NULL COMMENT 'Proxy URL for exchange API requests (e.g., http://user:pass@host:port or socks5://host:port)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `exchangeProductIdKey` (`productId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `fee` double DEFAULT 0 COMMENT 'Trading fee percentage for this currency',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Currency availability status (active/inactive)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `exchangeCurrencyCurrencyKey` (`currency`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `exchange_market`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchange_market` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `currency` varchar(191) NOT NULL COMMENT 'Base currency symbol (e.g., BTC, ETH)',
  `pair` varchar(191) NOT NULL COMMENT 'Quote currency symbol (e.g., USDT, USD)',
  `isTrending` tinyint(1) DEFAULT 0 COMMENT 'Whether this market is currently trending',
  `isHot` tinyint(1) DEFAULT 0 COMMENT 'Whether this market is marked as hot/popular',
  `metadata` text DEFAULT NULL COMMENT 'Additional market configuration and precision settings',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Market availability status (active/inactive)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `exchangeMarketCurrencyPairKey` (`currency`,`pair`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Arbitrary per-order metadata (e.g. holdMode flag for HOLD-model settlement)' CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exchangeOrderReferenceIdKey` (`referenceId`) USING BTREE,
  KEY `exchangeOrderUserIdForeign` (`userId`) USING BTREE,
  KEY `exchangeOrderStatusIndex` (`status`,`deletedAt`) USING BTREE,
  CONSTRAINT `exchange_order_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `exchange_price_alert`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchange_price_alert` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user who armed this alert',
  `symbol` varchar(191) NOT NULL COMMENT 'Trading symbol being watched, e.g. BTC/USDT',
  `type` enum('SPOT','ECO','FUTURES') NOT NULL DEFAULT 'SPOT' COMMENT 'Which market family the symbol belongs to',
  `condition` enum('CROSSES_ABOVE','CROSSES_BELOW','CROSSES') NOT NULL DEFAULT 'CROSSES_ABOVE' COMMENT 'Direction of crossing that fires the alert',
  `targetPrice` double NOT NULL COMMENT 'The price level being watched',
  `status` enum('ACTIVE','TRIGGERED','EXPIRED','DISABLED') NOT NULL DEFAULT 'ACTIVE' COMMENT 'Only ACTIVE alerts are evaluated',
  `isRepeating` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Re-arms after firing instead of retiring',
  `note` varchar(255) DEFAULT NULL COMMENT 'Optional user note shown with the notification',
  `armedPrice` double DEFAULT NULL COMMENT 'Market price at the moment the alert was created',
  `lastPrice` double DEFAULT NULL COMMENT 'Previous observed price; the baseline a crossing is measured from',
  `triggeredPrice` double DEFAULT NULL COMMENT 'Price that fired the alert',
  `triggeredAt` datetime DEFAULT NULL COMMENT 'When the alert last fired; also gates the re-arm cooldown',
  `expiresAt` datetime DEFAULT NULL COMMENT 'Optional moment after which the alert stops watching',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `exchangePriceAlertUserIdForeign` (`userId`) USING BTREE,
  KEY `exchangePriceAlertStatusTypeIdx` (`status`,`type`) USING BTREE,
  CONSTRAINT `exchange_price_alert_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `exchange_watchlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchange_watchlist` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user who added this symbol to watchlist',
  `symbol` varchar(191) NOT NULL COMMENT 'Trading symbol/pair being watched',
  `type` enum('SPOT','ECO','FUTURES') NOT NULL DEFAULT 'SPOT' COMMENT 'Which market family the symbol belongs to',
  PRIMARY KEY (`id`),
  UNIQUE KEY `exchangeWatchlistUserSymbolTypeKey` (`userId`,`symbol`,`type`) USING BTREE,
  KEY `exchangeWatchlistUserIdForeign` (`userId`) USING BTREE,
  CONSTRAINT `exchange_watchlist_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  UNIQUE KEY `extensionProductIdKey` (`productId`) USING BTREE,
  UNIQUE KEY `extensionNameKey` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `faqId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `isHelpful` tinyint(1) NOT NULL,
  `comment` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `faq_feedbacks_unique_user_faq` (`userId`,`faqId`),
  KEY `faq_feedbacks_faqId_idx` (`faqId`),
  KEY `faq_feedbacks_userId_idx` (`userId`),
  CONSTRAINT `faq_feedbacks_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `faq_feedbacks_ibfk_2` FOREIGN KEY (`faqId`) REFERENCES `faqs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `query` text NOT NULL,
  `resultCount` int(11) NOT NULL DEFAULT 0,
  `category` varchar(191) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `faq_searches_query_idx` (`query`(255)),
  KEY `faq_searches_userId_idx` (`userId`),
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
  `image` varchar(191) DEFAULT NULL,
  `category` varchar(191) NOT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `order` int(11) NOT NULL DEFAULT 0,
  `pagePath` varchar(191) NOT NULL,
  `relatedFaqIds` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`relatedFaqIds`)),
  `views` int(11) DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `faqs_category_idx` (`category`),
  KEY `faqs_pagePath_idx` (`pagePath`),
  KEY `faqs_order_idx` (`order`),
  KEY `faqs_status_idx` (`status`)
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
  `currency` varchar(191) DEFAULT NULL,
  `walletType` varchar(191) DEFAULT NULL,
  `leverage` int(11) DEFAULT 1,
  `type` enum('DEMO','LIVE') NOT NULL DEFAULT 'DEMO',
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `dailyWithdrawLimit` double DEFAULT 5000,
  `monthlyWithdrawLimit` double DEFAULT 50000,
  `dailyWithdrawn` double DEFAULT 0,
  `monthlyWithdrawn` double DEFAULT 0,
  `lastWithdrawReset` datetime(3) DEFAULT NULL,
  `lastMonthlyWithdrawReset` datetime(3) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `forexAccountUserIdFkey` (`userId`) USING BTREE,
  KEY `forexAccountUserIdTypeIdx` (`userId`,`type`) USING BTREE,
  KEY `forexAccountStatusIdx` (`status`) USING BTREE,
  KEY `forexAccountCreatedAtIdx` (`createdAt`) USING BTREE,
  CONSTRAINT `forex_account_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `forex_duration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `forex_duration` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `duration` int(11) NOT NULL,
  `timeframe` enum('HOUR','DAY','WEEK','MONTH') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `profit` double DEFAULT NULL COMMENT 'DEPRECATED: use roiPercentage. Stored for backward compat only.',
  `roiPercentage` double DEFAULT NULL COMMENT 'Profit as percentage of amount (e.g., 5 = 5%)',
  `result` enum('WIN','LOSS','DRAW') DEFAULT NULL,
  `status` enum('ACTIVE','COMPLETED','CANCELLED','REJECTED') NOT NULL DEFAULT 'ACTIVE',
  `endDate` datetime(3) DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  `termsAcceptedAt` datetime(3) DEFAULT NULL,
  `termsVersion` varchar(50) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `forexInvestmentUserIdFkey` (`userId`) USING BTREE,
  KEY `forexInvestmentPlanIdFkey` (`planId`) USING BTREE,
  KEY `forexInvestmentDurationIdFkey` (`durationId`) USING BTREE,
  KEY `forexInvestmentStatusIndex` (`userId`,`planId`,`status`) USING BTREE,
  KEY `forexInvestmentUserIdStatusIdx` (`userId`,`status`) USING BTREE,
  KEY `forexInvestmentCreatedAtIdx` (`createdAt`) USING BTREE,
  KEY `forexInvestmentEndDateIdx` (`endDate`) USING BTREE,
  CONSTRAINT `forex_investment_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `forex_investment_ibfk_2` FOREIGN KEY (`planId`) REFERENCES `forex_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `forex_investment_ibfk_3` FOREIGN KEY (`durationId`) REFERENCES `forex_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `currency` varchar(191) NOT NULL,
  `walletType` varchar(191) NOT NULL,
  `minProfit` double NOT NULL,
  `maxProfit` double NOT NULL,
  `minAmount` double DEFAULT 0,
  `maxAmount` double DEFAULT NULL,
  `profitPercentage` double NOT NULL DEFAULT 0,
  `status` tinyint(1) DEFAULT 0,
  `defaultProfit` double NOT NULL DEFAULT 0,
  `defaultResult` enum('WIN','LOSS','DRAW') NOT NULL,
  `trending` tinyint(1) DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `forexPlanNameKey` (`name`) USING BTREE,
  KEY `forexPlanStatusIdx` (`status`) USING BTREE,
  KEY `forexPlanCurrencyIdx` (`currency`) USING BTREE,
  KEY `forexPlanTrendingIdx` (`trending`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `forex_plan_duration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `forex_plan_duration` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `planId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `durationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `forex_plan_duration_planId_durationId_unique` (`planId`,`durationId`),
  KEY `idxPlanId` (`planId`) USING BTREE,
  KEY `idxDurationId` (`durationId`) USING BTREE,
  CONSTRAINT `forex_plan_duration_ibfk_1` FOREIGN KEY (`planId`) REFERENCES `forex_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `forex_plan_duration_ibfk_2` FOREIGN KEY (`durationId`) REFERENCES `forex_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `futures_fee_reversal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `futures_fee_reversal` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `referenceId` varchar(191) NOT NULL COMMENT 'Cancelled order id — the same reference withholdFeeShare used at placement',
  `symbol` varchar(191) NOT NULL COMMENT 'Market the cancelled order belonged to',
  `currency` varchar(191) NOT NULL COMMENT 'Quote currency the fee was taken in',
  `refundedFee` double NOT NULL COMMENT 'Fee actually handed back — the unfilled share of the original',
  `originalFee` double NOT NULL COMMENT 'The order''s whole fee. releaseFeeShare re-derives the withheld slice from this, so passing the refunded amount would release a slice of a slice',
  `creditKey` varchar(191) NOT NULL COMMENT 'Wallet idempotency key of the refund this reverses; the sweep verifies it landed before touching the treasury',
  `status` enum('PENDING','COMPLETED','ABANDONED') NOT NULL DEFAULT 'PENDING' COMMENT 'ABANDONED: the refund never reached a wallet, so nothing is owed. Kept rather than deleted — it is the record of a cancel that half-happened',
  `attempts` int(11) NOT NULL DEFAULT 0 COMMENT 'Sweep attempts, so a permanently failing row can be found',
  `note` varchar(255) DEFAULT NULL COMMENT 'Why a row was abandoned, or the last failure',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referenceId` (`referenceId`),
  UNIQUE KEY `futures_fee_reversal_reference_unique` (`referenceId`),
  KEY `futures_fee_reversal_status_created` (`status`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `futures_funding_payment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `futures_funding_payment` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Holder of the position that was funded',
  `symbol` varchar(191) NOT NULL COMMENT 'Perpetual market, e.g. BTC/USDT',
  `positionId` varchar(191) NOT NULL COMMENT 'Scylla position id — not a foreign key; positions are not in MySQL',
  `side` enum('BUY','SELL') NOT NULL COMMENT 'Position side at settlement',
  `fundingTime` datetime NOT NULL COMMENT 'The window boundary this settlement belongs to',
  `rate` double NOT NULL COMMENT 'Fraction per interval; positive means longs paid shorts',
  `markPrice` double NOT NULL COMMENT 'Mark price the notional was measured at',
  `notional` double NOT NULL COMMENT 'markPrice x position size, in the quote currency',
  `amount` double NOT NULL COMMENT 'Signed quote amount: negative was paid, positive was received',
  `currency` varchar(191) NOT NULL COMMENT 'Quote currency the payment moved in',
  `status` enum('SETTLED','UNPAID','SKIPPED') NOT NULL DEFAULT 'SETTLED' COMMENT 'UNPAID: the wallet could not cover it. SKIPPED: below the currency''s smallest unit',
  `note` varchar(255) DEFAULT NULL COMMENT 'Why a settlement was not SETTLED',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `futuresFundingPositionWindowKey` (`positionId`,`fundingTime`) USING BTREE,
  KEY `futuresFundingSymbolWindowIdx` (`symbol`,`fundingTime`) USING BTREE,
  KEY `futuresFundingUserIdIdx` (`userId`) USING BTREE,
  CONSTRAINT `futures_funding_payment_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `futures_insurance_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `futures_insurance_ledger` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `currency` varchar(32) NOT NULL,
  `amount` decimal(30,8) NOT NULL,
  `type` enum('CLEARING','FEE_SHARE','LIQUIDATION_SURPLUS','DEFICIT','ADL','ADJUSTMENT') NOT NULL,
  `shortfall` decimal(30,8) DEFAULT NULL,
  `symbol` varchar(64) DEFAULT NULL,
  `positionId` varchar(64) DEFAULT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `markPrice` decimal(30,8) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `sliceKey` varchar(191) NOT NULL DEFAULT '',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `futures_insurance_ledger_slice_once` (`positionId`,`type`,`sliceKey`) USING BTREE,
  KEY `futures_insurance_ledger_currency` (`currency`) USING BTREE,
  KEY `futures_insurance_ledger_symbol` (`symbol`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
DROP TABLE IF EXISTS `fx_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fx_account` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Owner — accounts are ALWAYS created bound to a verified user (no claim-from-pool)',
  `type` enum('DEMO','LIVE') NOT NULL DEFAULT 'DEMO',
  `accountCurrency` varchar(10) NOT NULL DEFAULT 'USD' COMMENT 'FIXED at creation — never changes afterwards or the deals ledger re-denominates',
  `balance` double NOT NULL DEFAULT 0 COMMENT 'Cash balance in accountCurrency. Reservation model: opening positions never moves it except commission; swaps settle daily; closes book realizedPnl',
  `equity` double NOT NULL DEFAULT 0 COMMENT 'Denormalized balance + floating PnL (engine sweep refresh; ledger is truth)',
  `usedMargin` double NOT NULL DEFAULT 0 COMMENT 'Denormalized hedged-netting margin reservation (engine sweep refresh)',
  `leverage` int(11) NOT NULL DEFAULT 100 COMMENT 'Account leverage knob (effectiveLeverage = min with group/instrument caps)',
  `marginMode` varchar(10) NOT NULL DEFAULT 'HEDGING' COMMENT 'HEDGING default (multiple independent positions per symbol); NETTING reserved',
  `groupId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Account tier (margin call/stop-out thresholds, NBP, leverage cap)',
  `swapFree` tinyint(1) DEFAULT 0 COMMENT 'Islamic account — swaps skipped where the symbol group allows',
  `tradingEnabled` tinyint(1) DEFAULT 1 COMMENT 'Admin kill-switch: false blocks new orders (closes still allowed)',
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `dailyWithdrawLimit` double DEFAULT 5000,
  `monthlyWithdrawLimit` double DEFAULT 50000,
  `dailyWithdrawn` double DEFAULT 0,
  `monthlyWithdrawn` double DEFAULT 0,
  `lastWithdrawReset` datetime(3) DEFAULT NULL,
  `metadata` text DEFAULT NULL COMMENT 'Guarded TEXT-JSON side-channel (never money fields). Known keys: riskAckAt — ISO timestamp of the per-account leveraged-trading risk-disclosure acknowledgment (fxTradingRiskWarningEnabled)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fxAccountUserIdIdx` (`userId`) USING BTREE,
  KEY `fxAccountUserIdTypeIdx` (`userId`,`type`) USING BTREE,
  KEY `fxAccountGroupIdIdx` (`groupId`) USING BTREE,
  CONSTRAINT `fx_account_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fx_account_ibfk_2` FOREIGN KEY (`groupId`) REFERENCES `fx_account_group` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fx_account_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fx_account_group` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL COMMENT 'Account tier name (e.g. Standard, Pro, ESMA Retail)',
  `marginCallLevel` double NOT NULL DEFAULT 100 COMMENT 'Margin level % below which margin call fires (notify + block margin-increasing orders and withdrawals)',
  `stopOutLevel` double NOT NULL DEFAULT 50 COMMENT 'Margin level % below which forced liquidation runs (largest-losing open-session position first). ESMA preset 50, offshore presets 20-30',
  `negativeBalanceProtection` tinyint(1) DEFAULT 1 COMMENT 'Zero negative balances after full liquidation via NBP_CORRECTION deal against operator P&L',
  `maxLeverage` int(11) NOT NULL DEFAULT 100 COMMENT 'Account-tier leverage cap (effectiveLeverage = min of all caps)',
  `defaultForType` varchar(10) DEFAULT NULL COMMENT 'Auto-assign this group to newly created accounts of this type',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fxAccountGroupNameKey` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fx_deal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fx_deal` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `accountId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `positionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `orderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `kind` varchar(20) NOT NULL,
  `amount` double NOT NULL DEFAULT 0 COMMENT 'Base units for trade deals; money amount for balance deals',
  `price` double DEFAULT NULL COMMENT 'EXECUTED price for trade deals (marked-up)',
  `rawFeedBid` double DEFAULT NULL COMMENT 'Raw provider bid at execution — audit/dispute defense',
  `rawFeedAsk` double DEFAULT NULL COMMENT 'Raw provider ask at execution — audit/dispute defense',
  `rateUsed` double DEFAULT NULL COMMENT 'Swap points / dividend rate / ccy conversion rate used',
  `pnl` double NOT NULL DEFAULT 0 COMMENT 'Balance impact in account ccy. INVARIANT: Σ pnl over an account''s deals == balance (integrity cron)',
  `balanceAfter` double NOT NULL COMMENT 'Account balance immediately after this deal (chain check)',
  `idempotencyKey` varchar(191) NOT NULL COMMENT 'Stable per-operation key — the dedup guard (fx_<action>_<id>)',
  `executionProviderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'fxExecutionProvider of the hedge leg — NULL for internal fills',
  `externalDealId` varchar(64) DEFAULT NULL COMMENT 'OANDA transactionID / MT dealId of the hedge fill',
  `externalPrice` varchar(32) DEFAULT NULL COMMENT 'Broker fill price (decimal STRING); `price` stays the client executed price',
  `metadata` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fxDealIdempotencyKey` (`idempotencyKey`) USING BTREE,
  KEY `fxDealAccountIdCreatedAtIdx` (`accountId`,`createdAt`) USING BTREE,
  KEY `fxDealPositionIdIdx` (`positionId`) USING BTREE,
  CONSTRAINT `fx_deal_ibfk_1` FOREIGN KEY (`accountId`) REFERENCES `fx_account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fx_deal_ibfk_2` FOREIGN KEY (`positionId`) REFERENCES `fx_position` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fx_economic_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fx_economic_event` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `externalId` varchar(191) DEFAULT NULL COMMENT 'Stable provider dedup key (<provider>:<hash>) — NULL for operator-authored MANUAL rows',
  `source` varchar(10) NOT NULL DEFAULT 'PROVIDER',
  `provider` varchar(64) DEFAULT NULL COMMENT 'Data provider name that supplied the row (NULL for MANUAL)',
  `eventTime` datetime NOT NULL COMMENT 'Scheduled release instant (UTC)',
  `country` varchar(8) DEFAULT NULL COMMENT 'ISO country code of the releasing authority',
  `currency` varchar(8) DEFAULT NULL COMMENT 'Currency the release moves — drives the per-symbol filter',
  `title` varchar(191) NOT NULL,
  `impact` varchar(10) NOT NULL DEFAULT 'LOW',
  `actual` varchar(32) DEFAULT NULL COMMENT 'Released value as published (string — units vary)',
  `forecast` varchar(32) DEFAULT NULL,
  `previousValue` varchar(32) DEFAULT NULL COMMENT 'Prior release value (column name avoids Model.previous())',
  `unit` varchar(32) DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1 COMMENT 'Visible to clients — lets an operator hide a bad row',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fxEconomicEventExternalIdKey` (`externalId`) USING BTREE,
  KEY `fxEconomicEventTimeIndex` (`eventTime`) USING BTREE,
  KEY `fxEconomicEventCurrencyTimeIndex` (`currency`,`eventTime`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fx_execution_alert`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fx_execution_alert` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `executionProviderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'fxExecutionProvider the alert concerns — NULL for global alerts',
  `alertKey` varchar(64) NOT NULL COMMENT 'Stable machine key (ledger-drift, hedge-margin, orphan, cursor-stall, …) — throttle dimension',
  `severity` varchar(12) NOT NULL DEFAULT 'warning',
  `title` varchar(191) NOT NULL COMMENT 'Human headline — also the notification/email subject',
  `message` varchar(1000) NOT NULL COMMENT 'Human body — also the notification/email message',
  `payload` text DEFAULT NULL COMMENT 'Structured context for the dashboard inbox (guarded TEXT-JSON)',
  `acknowledgedAt` datetime(3) DEFAULT NULL COMMENT 'Set when an operator acknowledges the alert in the inbox',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fxExecutionAlertThrottleIdx` (`executionProviderId`,`alertKey`,`createdAt`) USING BTREE,
  CONSTRAINT `fx_execution_alert_ibfk_1` FOREIGN KEY (`executionProviderId`) REFERENCES `fx_execution_provider` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fx_execution_provider`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fx_execution_provider` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL COMMENT 'Internal adapter identifier (oanda, metaapi)',
  `title` varchar(191) NOT NULL COMMENT 'Display title of the execution venue',
  `description` text DEFAULT NULL COMMENT 'Description of the execution venue',
  `environment` varchar(12) NOT NULL DEFAULT 'DEMO' COMMENT 'Host pair selector (practice vs live). Two-sided guard: DEMO client accounts route only to DEMO providers, LIVE only to LIVE',
  `status` tinyint(1) DEFAULT 0 COMMENT 'Enabled flag — MULTIPLE rows may be true (unlike fx_provider)',
  `accountRef` varchar(191) DEFAULT NULL COMMENT 'OANDA accountID / MetaApi account UUID',
  `proxyUrl` varchar(500) DEFAULT NULL COMMENT 'Proxy URL for venue API requests',
  `symbolMap` text DEFAULT NULL COMMENT 'Admin symbol-mapping overrides (guarded TEXT-JSON)',
  `maxSlippagePoints` double DEFAULT NULL COMMENT 'Hedge-leg price tolerance → venue priceBound (points)',
  `orderTimeoutMs` int(11) DEFAULT 15000 COMMENT 'Watchdog: reconcile-by-ref starts after this silence',
  `hardTimeoutMs` int(11) DEFAULT 120000 COMMENT 'Watchdog hard cap: ROUTING → REJECTED (''Broker timeout'') after this',
  `marginBufferRatio` double DEFAULT 0.2 COMMENT 'Pre-trade check: hedge marginAvailable − estimate must exceed NAV × this',
  `marginAlertRatio` double DEFAULT 0.5 COMMENT 'Alert when hedge marginUsed/NAV exceeds this (venue closeout at 1.0)',
  `staleSyncAlertSec` int(11) DEFAULT 300 COMMENT 'Alert + routing auto-suspend when hedge sync is older than this',
  `financingAlertDailyDelta` double DEFAULT NULL COMMENT 'Daily financing-basis alert threshold (NULL = off)',
  `disasterStopDistancePoints` double DEFAULT NULL COMMENT 'Optional wide broker-side stop attached to hedge opens (NULL = off)',
  `allowedAssetClasses` varchar(191) DEFAULT NULL COMMENT 'Comma-separated asset-class allowlist for this venue (NULL = all)',
  `hedgeBalance` double DEFAULT NULL COMMENT 'Hedge account balance (broker ccy) — last sync snapshot',
  `hedgeEquity` double DEFAULT NULL COMMENT 'Hedge account NAV — last sync snapshot',
  `hedgeMarginUsed` double DEFAULT NULL,
  `hedgeMarginAvailable` double DEFAULT NULL,
  `hedgeCloseoutPercent` double DEFAULT NULL COMMENT 'Venue margin-closeout percent (force-close at >= 1.0)',
  `hedgeSyncedAt` datetime(3) DEFAULT NULL,
  `syncCursor` text DEFAULT NULL COMMENT 'Reconciler ledger-replay cursor (guarded TEXT-JSON)',
  `externalMeta` text DEFAULT NULL COMMENT 'Provider-level rollups/audit payload (guarded TEXT-JSON)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fxExecutionProviderNameKey` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fx_instrument`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fx_instrument` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `currency` varchar(191) NOT NULL COMMENT 'Base symbol (EUR, AAPL, XAU) — displayed symbol = `${currency}/${pair}`',
  `pair` varchar(191) NOT NULL COMMENT 'Quote currency (USD, EUR, JPY)',
  `assetClass` varchar(20) NOT NULL DEFAULT 'FOREX' COMMENT 'Asset class driving session/swap/margin defaults',
  `groupId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Symbol group (dealing-desk config: leverage, markup, swap policy, sessions)',
  `status` varchar(20) NOT NULL DEFAULT 'INACTIVE' COMMENT 'Lifecycle: INACTIVE (imported, not enabled) -> ACTIVE -> CLOSE_ONLY (no new/margin-increasing orders) -> DELISTED; HALTED = temporary freeze (corporate action / provider outage)',
  `providerSymbols` text DEFAULT NULL COMMENT 'Per-provider symbol mapping: { "twelvedata": "EUR/USD", "tradermade": "EURUSD", "polygon": "C:EURUSD" }',
  `swapLong` double NOT NULL DEFAULT 0 COMMENT 'Overnight swap for long positions, in points (can be negative = charge, positive = credit)',
  `swapShort` double NOT NULL DEFAULT 0 COMMENT 'Overnight swap for short positions, in points (can be negative = charge, positive = credit)',
  `metadata` text DEFAULT NULL COMMENT '{ precision:{price,amount}, digits, limits:{amount:{min,max,step}, cost:{min,max}}, contractSize, pipSize, pointSize, stopsLevel, delayed:boolean } — pipValue/pointValue are NEVER stored (dynamic: pointSize x contractSize in quote ccy, converted at current rate)',
  `isTrending` tinyint(1) DEFAULT 0,
  `isHot` tinyint(1) DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fxInstrumentCurrencyPairKey` (`currency`,`pair`) USING BTREE,
  KEY `fxInstrumentStatusIdx` (`status`) USING BTREE,
  KEY `fxInstrumentAssetClassIdx` (`assetClass`) USING BTREE,
  KEY `fxInstrumentGroupIdIdx` (`groupId`) USING BTREE,
  CONSTRAINT `fx_instrument_ibfk_1` FOREIGN KEY (`groupId`) REFERENCES `fx_symbol_group` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fx_market_news`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fx_market_news` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `externalId` varchar(191) DEFAULT NULL COMMENT 'Stable provider dedup key (<provider>:<id>) — NULL for operator-authored MANUAL rows',
  `source` varchar(10) NOT NULL DEFAULT 'PROVIDER',
  `provider` varchar(64) DEFAULT NULL,
  `publishedAt` datetime NOT NULL,
  `headline` varchar(500) NOT NULL,
  `summary` text DEFAULT NULL,
  `url` varchar(1000) DEFAULT NULL,
  `imageUrl` varchar(1000) DEFAULT NULL,
  `category` varchar(64) DEFAULT NULL COMMENT 'Provider category (forex, crypto, general, merger, ...)',
  `relatedSymbols` text DEFAULT NULL COMMENT 'JSON array of internal symbols this story is tagged with',
  `status` tinyint(1) DEFAULT 1 COMMENT 'Visible to clients — lets an operator pull a story',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fxMarketNewsExternalIdKey` (`externalId`) USING BTREE,
  KEY `fxMarketNewsPublishedAtIndex` (`publishedAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fx_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fx_order` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `accountId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `instrumentId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `side` varchar(4) NOT NULL COMMENT 'Canonicalized UPPERCASE at the endpoint — engine compares strictly',
  `type` varchar(12) NOT NULL,
  `amount` double NOT NULL COMMENT 'Base units (lots × contractSize)',
  `price` double DEFAULT NULL COMMENT 'Limit price (LIMIT / STOP_LIMIT)',
  `stopPrice` double DEFAULT NULL COMMENT 'Trigger price (STOP / STOP_LIMIT)',
  `slPrice` double DEFAULT NULL COMMENT 'Attached stop-loss applied to the resulting position',
  `tpPrice` double DEFAULT NULL COMMENT 'Attached take-profit applied to the resulting position',
  `trailingDistance` double DEFAULT NULL COMMENT 'Attached trailing-stop distance in POINTS (server-side trailing)',
  `timeInForce` varchar(4) NOT NULL DEFAULT 'GTC' COMMENT 'DAY = expires at the instrument''s session close',
  `expiresAt` datetime(3) DEFAULT NULL COMMENT 'GTD expiry, or the computed session close for DAY',
  `status` varchar(12) NOT NULL DEFAULT 'OPEN',
  `routing` varchar(12) NOT NULL DEFAULT 'INTERNAL' COMMENT 'Execution routing decided at placement — INTERNAL (B-book desk) or EXTERNAL (A-book hedge at a broker)',
  `executionProviderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'fxExecutionProvider the order routed to — NULL for INTERNAL',
  `routingRuleId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Audit: fxRoutingRule that matched at placement (NULL = global default)',
  `reservedMargin` double DEFAULT NULL COMMENT 'Margin + commission held while status=ROUTING — counted into every outbound-money gate; released on terminal status',
  `externalRef` varchar(48) DEFAULT NULL COMMENT 'Our idempotent client reference at the venue (abk-o-<base36>)',
  `externalOrderId` varchar(64) DEFAULT NULL COMMENT 'Venue order id',
  `externalFillPrice` varchar(32) DEFAULT NULL COMMENT 'Broker fill price as a DECIMAL STRING (never float-round-tripped)',
  `externalFilledAt` datetime(3) DEFAULT NULL,
  `externalError` varchar(500) DEFAULT NULL COMMENT 'Raw venue reject/error reason (rejectReason stays client-facing)',
  `externalMeta` text DEFAULT NULL COMMENT 'External execution audit payload (guarded TEXT-JSON, house pattern)',
  `filledPositionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Position created/affected by the fill',
  `requestNonce` varchar(128) DEFAULT NULL COMMENT 'Client idempotency nonce — duplicate submissions return the original order',
  `rejectReason` varchar(500) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fxOrderRequestNonceKey` (`requestNonce`) USING BTREE,
  UNIQUE KEY `fxOrderExternalRefKey` (`externalRef`) USING BTREE,
  UNIQUE KEY `fxOrderProviderExternalOrderKey` (`executionProviderId`,`externalOrderId`) USING BTREE,
  KEY `fxOrderAccountIdStatusIdx` (`accountId`,`status`) USING BTREE,
  KEY `fxOrderInstrumentIdStatusIdx` (`instrumentId`,`status`) USING BTREE,
  KEY `fxOrderUserIdIdx` (`userId`) USING BTREE,
  KEY `fxOrderRoutingStatusIdx` (`routing`,`status`) USING BTREE,
  CONSTRAINT `fx_order_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fx_order_ibfk_2` FOREIGN KEY (`accountId`) REFERENCES `fx_account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fx_order_ibfk_3` FOREIGN KEY (`instrumentId`) REFERENCES `fx_instrument` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fx_position`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fx_position` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `accountId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `instrumentId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `side` varchar(4) NOT NULL,
  `amount` double NOT NULL COMMENT 'REMAINING base units (UN-leveraged — the futures ext''s leverage-multiplied storage over-credits and is NOT copied). Partial closes reduce this',
  `entryPrice` double NOT NULL COMMENT 'Executed entry price (ask for BUY, bid for SELL) — raw feed persisted on the OPEN deal',
  `slPrice` double DEFAULT NULL,
  `tpPrice` double DEFAULT NULL,
  `trailingDistance` double DEFAULT NULL COMMENT 'Server-side trailing-stop distance in POINTS',
  `trailingHighWater` double DEFAULT NULL COMMENT 'Best favorable executed price seen since trailing armed (ratchet)',
  `usedMargin` double NOT NULL DEFAULT 0 COMMENT 'Bookkeeping snapshot at open (account ccy) — ACCOUNT margin is computed per symbol with hedged netting, never Σ of these',
  `swapAccrued` double NOT NULL DEFAULT 0 COMMENT 'Display-only running swap total; swaps SETTLE TO BALANCE daily via SWAP deals (already in balance — never settled again at close)',
  `commissionPaid` double NOT NULL DEFAULT 0 COMMENT 'Commission charged at open (account ccy), booked as COMMISSION deal',
  `status` varchar(12) NOT NULL DEFAULT 'OPEN',
  `routing` varchar(12) NOT NULL DEFAULT 'INTERNAL' COMMENT 'CLOSE-FOLLOWS-OPEN: stamped once inside the open booking tx, never updated — every close branches on THIS, never a rule or setting',
  `executionProviderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'fxExecutionProvider hedging this position — NULL for INTERNAL',
  `externalPositionId` varchar(64) DEFAULT NULL COMMENT 'OANDA tradeID / MT positionId',
  `externalEntryPrice` varchar(32) DEFAULT NULL COMMENT 'Broker entry fill (decimal STRING); entryPrice stays the client platform price',
  `externalClosePrice` varchar(32) DEFAULT NULL COMMENT 'Broker close fill (decimal STRING); closePrice stays the client platform price',
  `hedgePnl` double DEFAULT NULL COMMENT 'Broker-realized hedge PnL (reporting only — never client money)',
  `pendingCloseAmount` double DEFAULT NULL COMMENT 'In-flight external close marker — base units requested at the venue',
  `pendingCloseRef` varchar(48) DEFAULT NULL COMMENT 'Per-request close ref (abk-c-<base36>-<seq>) — single-in-flight gate; NEVER cleared on timeout without affirmative venue proof',
  `pendingCloseReason` varchar(20) DEFAULT NULL COMMENT 'Close attribution captured at request time (MANUAL/SL/TP/…)',
  `closeRequestedAt` datetime(3) DEFAULT NULL,
  `externalMeta` text DEFAULT NULL COMMENT 'External execution audit payload (guarded TEXT-JSON, house pattern)',
  `openedAt` datetime(3) NOT NULL,
  `closedAt` datetime(3) DEFAULT NULL,
  `closePrice` double DEFAULT NULL COMMENT 'Executed close price of the final close',
  `realizedPnl` double DEFAULT NULL COMMENT 'Cumulative realized PnL in account ccy (sum of CLOSE/PARTIAL_CLOSE deal pnl)',
  `closeReason` varchar(20) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fxPositionProviderExternalPositionKey` (`executionProviderId`,`externalPositionId`) USING BTREE,
  KEY `fxPositionAccountIdStatusIdx` (`accountId`,`status`) USING BTREE,
  KEY `fxPositionInstrumentIdStatusIdx` (`instrumentId`,`status`) USING BTREE,
  KEY `fxPositionUserIdStatusIdx` (`userId`,`status`) USING BTREE,
  KEY `fxPositionRoutingStatusIdx` (`routing`,`status`) USING BTREE,
  CONSTRAINT `fx_position_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fx_position_ibfk_2` FOREIGN KEY (`accountId`) REFERENCES `fx_account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fx_position_ibfk_3` FOREIGN KEY (`instrumentId`) REFERENCES `fx_instrument` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fx_provider`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fx_provider` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL COMMENT 'Internal adapter identifier (twelvedata, finnhub, tradermade, polygon)',
  `title` varchar(191) NOT NULL COMMENT 'Display title of the market data provider',
  `description` text DEFAULT NULL COMMENT 'Description of the market data provider',
  `status` tinyint(1) DEFAULT 0 COMMENT 'Active provider flag (only one row may be true)',
  `version` varchar(191) DEFAULT '0.0.1' COMMENT 'Adapter integration version',
  `proxyUrl` varchar(500) DEFAULT NULL COMMENT 'Proxy URL for provider API requests (e.g., http://user:pass@host:port or socks5://host:port)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `fxProviderNameKey` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fx_routing_rule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fx_routing_rule` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `priority` int(11) NOT NULL DEFAULT 100 COMMENT 'Evaluation order — ASC, first match wins',
  `enabled` tinyint(1) DEFAULT 1,
  `target` varchar(12) NOT NULL,
  `executionProviderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Required at the app level when target=EXTERNAL',
  `instrumentId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Match dimension — NULL = wildcard',
  `symbolGroupId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Match dimension — NULL = wildcard',
  `assetClass` varchar(20) DEFAULT NULL COMMENT 'Match dimension — NULL = wildcard',
  `accountGroupId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Match dimension — NULL = wildcard',
  `accountId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Match dimension — NULL = wildcard',
  `side` varchar(4) DEFAULT NULL COMMENT 'Match dimension — NULL = wildcard',
  `minAmount` double DEFAULT NULL COMMENT 'Match dimension: amount >= minAmount when set',
  `maxAmount` double DEFAULT NULL COMMENT 'Match dimension: amount <= maxAmount when set',
  `note` varchar(191) DEFAULT NULL COMMENT 'Operator label shown in the rules table',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `executionProviderId` (`executionProviderId`),
  KEY `fxRoutingRuleEnabledPriorityIdx` (`enabled`,`priority`) USING BTREE,
  CONSTRAINT `fx_routing_rule_ibfk_1` FOREIGN KEY (`executionProviderId`) REFERENCES `fx_execution_provider` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fx_session_calendar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fx_session_calendar` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL COMMENT 'Calendar name (e.g. FX 24/5, US Stocks RTH, CME Metals)',
  `timezone` varchar(64) NOT NULL DEFAULT 'America/New_York' COMMENT 'IANA timezone the weekly schedule is expressed in',
  `weeklySchedule` text DEFAULT NULL COMMENT 'JSON array of session windows: [{openDay:0-6, openTime:''HH:mm'', closeDay:0-6, closeTime:''HH:mm'', break?:{start:''HH:mm'', end:''HH:mm''}}] in `timezone` local time. Day 0 = Sunday.',
  `holidays` text DEFAULT NULL COMMENT 'JSON array of holiday entries: [{date:''YYYY-MM-DD'', name?, earlyCloseTime?:''HH:mm''}]',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fxSessionCalendarNameKey` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fx_symbol_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fx_symbol_group` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL COMMENT 'Group name (e.g. FX Majors, US Stocks, Metals, Energy)',
  `leverage` int(11) NOT NULL DEFAULT 100 COMMENT 'Maximum leverage for instruments in this group',
  `spreadMarkupPips` double NOT NULL DEFAULT 0 COMMENT 'Total spread widening in pips: executedAsk = feedAsk + markup/2, executedBid = feedBid - markup/2',
  `hedgedMarginRate` double NOT NULL DEFAULT 0 COMMENT 'Fraction of margin charged on the covered (hedged) volume; account margin per symbol = max(long,short)/leverage + hedgedMarginRate * min(long,short)/leverage',
  `commissionPerLot` double NOT NULL DEFAULT 0 COMMENT 'Commission in account currency per standard lot per side, charged in full at position open (round-turn priced)',
  `swapMarkupPercent` double NOT NULL DEFAULT 0 COMMENT 'Percentage markup applied on top of instrument swap points',
  `tripleSwapDay` varchar(10) NOT NULL DEFAULT 'WED' COMMENT 'Day the 3x swap is charged (WED for FX/metals, FRI for indices/equity CFDs)',
  `swapDays` varchar(10) NOT NULL DEFAULT 'WEEKDAYS' COMMENT 'Which days swap is charged: WEEKDAYS (Mon-Fri, FX/metals/stocks) or ALL (7d/week, crypto CFD financing)',
  `swapFreeAllowed` tinyint(1) DEFAULT 1 COMMENT 'Whether swap-free (Islamic) accounts skip swaps on this group',
  `sessionCalendarId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Trading-hours calendar; null = 24/7 (crypto CFDs)',
  `marginCurrency` varchar(10) NOT NULL DEFAULT 'USD' COMMENT 'RESERVED (no-op): margin is always computed in the instrument quote currency and hub-converted to the account currency; column kept for schema compat, defaulted USD, not accepted by the admin API',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fxSymbolGroupNameKey` (`name`) USING BTREE,
  KEY `fxSymbolGroupSessionCalendarIdIdx` (`sessionCalendarId`) USING BTREE,
  CONSTRAINT `fx_symbol_group_ibfk_1` FOREIGN KEY (`sessionCalendarId`) REFERENCES `fx_session_calendar` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `gas_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gas_history` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chain` varchar(50) NOT NULL,
  `gasPrice` varchar(78) NOT NULL,
  `baseFee` varchar(78) DEFAULT NULL,
  `priorityFee` varchar(78) DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `gas_history_chain_timestamp` (`chain`,`timestamp`),
  KEY `gas_history_timestamp` (`timestamp`)
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
  `allowedWalletTypes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`allowedWalletTypes`)),
  `successUrl` varchar(500) DEFAULT NULL,
  `cancelUrl` varchar(500) DEFAULT NULL,
  `webhookUrl` varchar(500) DEFAULT NULL,
  `lastUsedAt` datetime DEFAULT NULL,
  `lastUsedIp` varchar(45) DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `expiresAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
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
  `businessType` varchar(100) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `postalCode` varchar(20) DEFAULT NULL,
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `gatewayMerchantApiKeyUnique` (`apiKey`) USING BTREE,
  UNIQUE KEY `gatewayMerchantSecretKeyUnique` (`secretKey`) USING BTREE,
  UNIQUE KEY `gatewayMerchantSlugUnique` (`slug`) USING BTREE,
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
  `allocations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of wallet allocations used for this payment' CHECK (json_valid(`allocations`)),
  `testMode` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `gatewayPaymentIntentIdUnique` (`paymentIntentId`) USING BTREE,
  KEY `gatewayPaymentMerchantIdFkey` (`merchantId`) USING BTREE,
  KEY `gatewayPaymentCustomerIdFkey` (`customerId`) USING BTREE,
  KEY `gatewayPaymentTransactionIdFkey` (`transactionId`) USING BTREE,
  KEY `gatewayPaymentStatusIdx` (`status`) USING BTREE,
  KEY `gatewayPaymentMerchantOrderIdx` (`merchantId`,`merchantOrderId`) USING BTREE,
  CONSTRAINT `gateway_payment_ibfk_1` FOREIGN KEY (`merchantId`) REFERENCES `gateway_merchant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `gateway_payment_ibfk_2` FOREIGN KEY (`customerId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `gateway_payment_ibfk_3` FOREIGN KEY (`transactionId`) REFERENCES `transaction` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
  `processedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `gatewayPayoutIdUnique` (`payoutId`) USING BTREE,
  KEY `gatewayPayoutMerchantIdFkey` (`merchantId`) USING BTREE,
  KEY `gatewayPayoutTransactionIdFkey` (`transactionId`) USING BTREE,
  KEY `gatewayPayoutStatusIdx` (`status`) USING BTREE,
  CONSTRAINT `gateway_payout_ibfk_1` FOREIGN KEY (`merchantId`) REFERENCES `gateway_merchant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `gateway_payout_ibfk_2` FOREIGN KEY (`transactionId`) REFERENCES `transaction` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
  UNIQUE KEY `gatewayRefundIdUnique` (`refundId`) USING BTREE,
  KEY `gatewayRefundPaymentIdFkey` (`paymentId`) USING BTREE,
  KEY `gatewayRefundMerchantIdFkey` (`merchantId`) USING BTREE,
  KEY `gatewayRefundTransactionIdFkey` (`transactionId`) USING BTREE,
  KEY `gatewayRefundStatusIdx` (`status`) USING BTREE,
  CONSTRAINT `gateway_refund_ibfk_1` FOREIGN KEY (`paymentId`) REFERENCES `gateway_payment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `gateway_refund_ibfk_2` FOREIGN KEY (`merchantId`) REFERENCES `gateway_merchant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `gateway_refund_ibfk_3` FOREIGN KEY (`transactionId`) REFERENCES `transaction` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
  `signature` varchar(255) DEFAULT NULL,
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
  CONSTRAINT `gateway_webhook_ibfk_1` FOREIGN KEY (`merchantId`) REFERENCES `gateway_merchant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `gateway_webhook_ibfk_2` FOREIGN KEY (`paymentId`) REFERENCES `gateway_payment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `gateway_webhook_ibfk_3` FOREIGN KEY (`refundId`) REFERENCES `gateway_refund` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `geo_access_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `geo_access_log` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ip` varchar(64) NOT NULL,
  `countryCode` varchar(2) DEFAULT NULL,
  `countryName` varchar(128) DEFAULT NULL,
  `region` varchar(128) DEFAULT NULL,
  `city` varchar(128) DEFAULT NULL,
  `source` enum('CDN_HEADER','IP_LOOKUP','KYC','PROFILE','MANUAL','NONE') NOT NULL DEFAULT 'NONE',
  `decision` enum('BLOCKED','ALLOWED','BYPASSED') NOT NULL,
  `reasonCode` varchar(64) NOT NULL,
  `reasonDetail` varchar(512) DEFAULT NULL,
  `restrictionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `action` varchar(32) DEFAULT NULL,
  `path` varchar(512) NOT NULL,
  `method` varchar(10) NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `userAgent` varchar(512) DEFAULT NULL,
  `isProxy` tinyint(1) DEFAULT NULL,
  `isHosting` tinyint(1) DEFAULT NULL,
  `isTor` tinyint(1) DEFAULT NULL,
  `hitCount` int(11) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `geoAccessLogCreatedAtIdx` (`createdAt`) USING BTREE,
  KEY `geoAccessLogDecisionCreatedAtIdx` (`decision`,`createdAt`) USING BTREE,
  KEY `geoAccessLogCountryCodeIdx` (`countryCode`) USING BTREE,
  KEY `geoAccessLogIpIdx` (`ip`) USING BTREE,
  KEY `geoAccessLogUserIdIdx` (`userId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `geo_restriction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `geo_restriction` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `countryCode` varchar(2) NOT NULL,
  `countryName` varchar(128) NOT NULL,
  `type` enum('BLOCK','ALLOW') NOT NULL DEFAULT 'BLOCK',
  `scope` enum('FULL','PARTIAL') NOT NULL DEFAULT 'FULL',
  `restrictedActions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`restrictedActions`)),
  `reason` enum('SANCTIONS','UNLICENSED','REGULATORY','HIGH_RISK','INTERNAL_POLICY','OTHER') NOT NULL DEFAULT 'REGULATORY',
  `legalReference` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `effectiveFrom` datetime DEFAULT NULL,
  `effectiveTo` datetime DEFAULT NULL,
  `createdBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `updatedBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `geoRestrictionCountryCodeIdx` (`countryCode`) USING BTREE,
  KEY `geoRestrictionStatusIdx` (`status`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `hb_instance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hb_instance` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text DEFAULT NULL,
  `installPath` varchar(500) NOT NULL,
  `pythonPath` varchar(500) NOT NULL,
  `presetId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `tradingPair` varchar(40) DEFAULT NULL,
  `controllerConfig` varchar(300) NOT NULL DEFAULT '',
  `apiKeyId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `baseUrl` varchar(300) NOT NULL DEFAULT '',
  `configPassword` text DEFAULT NULL,
  `paperTrade` tinyint(1) NOT NULL DEFAULT 0,
  `paperBalances` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`paperBalances`)),
  `desiredStatus` enum('RUNNING','STOPPED') NOT NULL DEFAULT 'STOPPED',
  `restartRequestedAt` datetime DEFAULT NULL,
  `status` enum('STOPPED','STARTING','RUNNING','STOPPING','CRASHED') NOT NULL DEFAULT 'STOPPED',
  `pid` int(11) DEFAULT NULL,
  `autoRestart` tinyint(1) NOT NULL DEFAULT 0,
  `memoryLimitMb` int(11) NOT NULL DEFAULT 1536,
  `restartCount` int(11) NOT NULL DEFAULT 0,
  `lastStartedAt` datetime DEFAULT NULL,
  `lastStoppedAt` datetime DEFAULT NULL,
  `lastExitCode` int(11) DEFAULT NULL,
  `lastError` text DEFAULT NULL,
  `createdBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `createdBy` (`createdBy`),
  KEY `hbInstanceStatusIdx` (`status`) USING BTREE,
  KEY `hbInstancePresetIdx` (`presetId`) USING BTREE,
  KEY `hbInstanceApiKeyIdx` (`apiKeyId`) USING BTREE,
  CONSTRAINT `hb_instance_ibfk_1` FOREIGN KEY (`presetId`) REFERENCES `hb_strategy_preset` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `hb_instance_ibfk_2` FOREIGN KEY (`apiKeyId`) REFERENCES `api_key` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `hb_instance_ibfk_3` FOREIGN KEY (`createdBy`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `hb_strategy_preset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hb_strategy_preset` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text DEFAULT NULL,
  `family` enum('pmm','xemm') NOT NULL,
  `pair` varchar(40) NOT NULL,
  `makerConnector` varchar(60) NOT NULL DEFAULT 'bicrypto',
  `takerConnector` varchar(60) DEFAULT NULL,
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`config`)),
  `status` enum('draft','published') NOT NULL DEFAULT 'draft',
  `version` int(11) NOT NULL DEFAULT 1,
  `createdBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `hbStrategyPresetStatusIdx` (`status`) USING BTREE,
  KEY `hbStrategyPresetFamilyIdx` (`family`) USING BTREE,
  KEY `hbStrategyPresetCreatedByIdx` (`createdBy`) USING BTREE,
  CONSTRAINT `hb_strategy_preset_ibfk_1` FOREIGN KEY (`createdBy`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
  `details` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `icoAdminActivityOfferingIdIdx` (`offeringId`),
  KEY `icoAdminActivityAdminIdIdx` (`adminId`),
  KEY `icoAdminActivityTypeIdx` (`type`),
  CONSTRAINT `ico_admin_activity_ibfk_1` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_admin_activity_ibfk_2` FOREIGN KEY (`adminId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_admin_activity_ibfk_3` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `icoBlockchainNameKey` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_launch_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_launch_plan` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `price` decimal(18,2) NOT NULL,
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
  KEY `icoRoadmapItemOfferingIdIdx` (`offeringId`),
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
  KEY `icoTeamMemberOfferingIdIdx` (`offeringId`),
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
  `totalSupply` decimal(36,8) NOT NULL,
  `tokensForSale` decimal(36,8) NOT NULL,
  `salePercentage` decimal(5,2) NOT NULL,
  `blockchain` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `useOfFunds` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`useOfFunds`)),
  `links` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`links`)),
  `vestingEnabled` tinyint(1) NOT NULL DEFAULT 0,
  `vestingType` enum('LINEAR','CLIFF','MILESTONE') DEFAULT NULL COMMENT 'LINEAR: equal monthly tranches. CLIFF: nothing until the cliff, then the accrued portion, then monthly. MILESTONE: explicit dated percentages.',
  `vestingDurationMonths` int(11) DEFAULT NULL COMMENT 'Total vesting length in months (LINEAR and CLIFF only)',
  `vestingCliffMonths` int(11) DEFAULT NULL COMMENT 'Months before the first tranche unlocks (CLIFF only)',
  `vestingMilestones` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'MILESTONE only: [{ monthsAfterPurchase, percentage }] summing to 100' CHECK (json_valid(`vestingMilestones`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `icoTokenDetailOfferingIdKey` (`offeringId`),
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
  `typeId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `symbol` varchar(10) NOT NULL,
  `icon` varchar(191) NOT NULL,
  `status` enum('ACTIVE','SUCCESS','FAILED','UPCOMING','PENDING','REJECTED','DISABLED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `purchaseWalletCurrency` varchar(10) NOT NULL,
  `purchaseWalletType` varchar(191) NOT NULL,
  `tokenPrice` decimal(36,8) NOT NULL,
  `targetAmount` decimal(36,8) NOT NULL,
  `startDate` datetime NOT NULL,
  `endDate` datetime NOT NULL,
  `participants` int(11) NOT NULL DEFAULT 0,
  `currentPrice` decimal(36,8) DEFAULT NULL,
  `priceChange` decimal(36,8) DEFAULT NULL,
  `submittedAt` datetime DEFAULT NULL,
  `approvedAt` datetime DEFAULT NULL,
  `rejectedAt` datetime DEFAULT NULL,
  `reviewNotes` text DEFAULT NULL,
  `isPaused` tinyint(1) NOT NULL DEFAULT 0,
  `isFlagged` tinyint(1) NOT NULL DEFAULT 0,
  `featured` tinyint(1) DEFAULT 0,
  `website` varchar(191) DEFAULT NULL,
  `cancelledAt` datetime DEFAULT NULL,
  `cancelledBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `cancellationReason` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `icoTokenOfferingSymbolKey` (`symbol`),
  KEY `icoTokenOfferingUserIdIdx` (`userId`),
  KEY `icoTokenOfferingPlanIdIdx` (`planId`),
  KEY `icoTokenOfferingTypeIdIdx` (`typeId`),
  KEY `icoTokenOfferingStatusIdx` (`status`),
  CONSTRAINT `ico_token_offering_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_token_offering_ibfk_2` FOREIGN KEY (`planId`) REFERENCES `ico_launch_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_token_offering_ibfk_3` FOREIGN KEY (`typeId`) REFERENCES `ico_token_type` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_token_offering_phase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_token_offering_phase` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `offeringId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `tokenPrice` decimal(36,8) NOT NULL,
  `allocation` decimal(36,8) NOT NULL,
  `remaining` decimal(36,8) NOT NULL,
  `duration` int(11) NOT NULL,
  `sequence` int(11) NOT NULL DEFAULT 0,
  `startDate` datetime DEFAULT NULL,
  `endDate` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
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
  KEY `icoTokenOfferingUpdateOfferingIdIdx` (`offeringId`),
  KEY `icoTokenOfferingUpdateUserIdIdx` (`userId`),
  CONSTRAINT `ico_token_offering_update_ibfk_1` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_token_offering_update_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `icoTokenTypeNameKey` (`name`)
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
  `totalAmount` decimal(36,8) NOT NULL,
  `releasedAmount` decimal(36,8) NOT NULL DEFAULT 0.00000000,
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
  CONSTRAINT `ico_token_vesting_ibfk_1` FOREIGN KEY (`transactionId`) REFERENCES `ico_transaction` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_token_vesting_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_token_vesting_ibfk_3` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ico_token_vesting_release`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ico_token_vesting_release` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `vestingId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Reference to the parent vesting record',
  `releaseDate` datetime NOT NULL COMMENT 'Date when tokens should be released',
  `releaseAmount` decimal(36,8) NOT NULL COMMENT 'Amount of tokens to release',
  `percentage` decimal(5,2) NOT NULL COMMENT 'Percentage of total vesting amount',
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
  `phaseId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(36,8) NOT NULL,
  `price` decimal(36,8) NOT NULL,
  `status` enum('PENDING','VERIFICATION','RELEASED','REJECTED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `releaseUrl` varchar(191) DEFAULT NULL,
  `walletAddress` varchar(191) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `phaseId` (`phaseId`),
  KEY `icoTransactionOfferingIdUserIdKey` (`offeringId`,`userId`),
  KEY `icoTransactionStatusIdx` (`status`),
  CONSTRAINT `ico_transaction_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_transaction_ibfk_2` FOREIGN KEY (`offeringId`) REFERENCES `ico_token_offering` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ico_transaction_ibfk_3` FOREIGN KEY (`phaseId`) REFERENCES `ico_token_offering_phase` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `investment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `investment` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the investment record',
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user who made this investment',
  `planId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the investment plan being invested in',
  `durationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the duration period for this investment',
  `amount` double NOT NULL COMMENT 'Amount invested by the user',
  `profit` double DEFAULT NULL COMMENT 'DEPRECATED: use roiPercentage. Profit earned from this investment (if completed); kept for backward compat',
  `roiPercentage` double DEFAULT NULL COMMENT 'Profit as percentage of amount (e.g., 5 = 5%)',
  `result` enum('WIN','LOSS','DRAW') DEFAULT NULL COMMENT 'Final result of the investment (WIN, LOSS, or DRAW)',
  `status` enum('ACTIVE','COMPLETED','CANCELLED','REJECTED') NOT NULL DEFAULT 'ACTIVE' COMMENT 'Current status of the investment',
  `endDate` datetime(3) DEFAULT NULL COMMENT 'Date when the investment period ends',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `investmentUserIdFkey` (`userId`) USING BTREE,
  KEY `investmentPlanIdFkey` (`planId`) USING BTREE,
  KEY `investmentDurationIdFkey` (`durationId`) USING BTREE,
  KEY `investmentUserIdPlanIdStatusIdx` (`userId`,`planId`,`status`) USING BTREE,
  CONSTRAINT `investment_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `investment_ibfk_2` FOREIGN KEY (`planId`) REFERENCES `investment_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `investment_ibfk_3` FOREIGN KEY (`durationId`) REFERENCES `investment_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `investment_duration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `investment_duration` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the investment duration option',
  `duration` int(11) NOT NULL COMMENT 'Duration value (number of timeframe units)',
  `timeframe` enum('HOUR','DAY','WEEK','MONTH') NOT NULL COMMENT 'Time unit for the duration (HOUR, DAY, WEEK, MONTH)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `investment_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `investment_plan` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the investment plan',
  `name` varchar(191) NOT NULL COMMENT 'Unique name identifier for the investment plan',
  `title` varchar(191) NOT NULL COMMENT 'Display title of the investment plan shown to users',
  `image` varchar(191) DEFAULT NULL COMMENT 'URL path to the plan''s image/logo',
  `description` text NOT NULL COMMENT 'Detailed description of the investment plan',
  `currency` varchar(191) NOT NULL COMMENT 'Currency code that this plan accepts for investment',
  `walletType` varchar(191) NOT NULL COMMENT 'Type of wallet (e.g., ''crypto'', ''fiat'') that this plan uses',
  `minAmount` double NOT NULL COMMENT 'Minimum amount of investment required for this plan',
  `maxAmount` double NOT NULL COMMENT 'Maximum amount of investment allowed for this plan',
  `invested` int(11) NOT NULL DEFAULT 0 COMMENT 'Total amount of money invested in this plan',
  `profitPercentage` double NOT NULL DEFAULT 0 COMMENT 'Expected profit percentage for this plan',
  `minProfit` double NOT NULL COMMENT 'Minimum profit amount for this plan',
  `maxProfit` double NOT NULL COMMENT 'Maximum profit amount for this plan',
  `defaultProfit` int(11) NOT NULL DEFAULT 0 COMMENT 'Default profit amount for this plan',
  `defaultResult` enum('WIN','LOSS','DRAW') NOT NULL COMMENT 'Default outcome for this plan (WIN, LOSS, DRAW)',
  `trending` tinyint(1) DEFAULT 0 COMMENT 'Indicates if this plan is currently trending or popular',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Indicates if this investment plan is active or inactive',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `investmentPlanNameKey` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `investment_plan_duration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `investment_plan_duration` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the plan-duration relationship',
  `planId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the investment plan',
  `durationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the duration option available for this plan',
  PRIMARY KEY (`id`),
  UNIQUE KEY `investment_plan_duration_planId_durationId_unique` (`planId`,`durationId`),
  KEY `idxPlanId` (`planId`) USING BTREE,
  KEY `idxDurationId` (`durationId`) USING BTREE,
  CONSTRAINT `investment_plan_duration_ibfk_1` FOREIGN KEY (`planId`) REFERENCES `investment_plan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `investment_plan_duration_ibfk_2` FOREIGN KEY (`durationId`) REFERENCES `investment_duration` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `kyc_application`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kyc_application` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the KYC application',
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user submitting the KYC application',
  `levelId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the KYC level being applied for',
  `status` enum('PENDING','APPROVED','REJECTED','ADDITIONAL_INFO_REQUIRED') NOT NULL DEFAULT 'PENDING' COMMENT 'Current status of the KYC application review process',
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'KYC application data including documents and personal information' CHECK (json_valid(`data`)),
  `adminNotes` text DEFAULT NULL COMMENT 'Notes added by admin during KYC review process',
  `reviewedAt` datetime DEFAULT NULL COMMENT 'Date and time when the application was reviewed by admin',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQUE_kyc_application_userId_levelId` (`userId`,`levelId`) USING BTREE,
  KEY `levelId` (`levelId`),
  CONSTRAINT `kyc_application_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `kyc_application_ibfk_2` FOREIGN KEY (`levelId`) REFERENCES `kyc_level` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `kyc_level`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kyc_level` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the KYC verification level',
  `serviceId` varchar(255) DEFAULT NULL COMMENT 'ID of the external verification service used for this level',
  `name` varchar(191) NOT NULL COMMENT 'Name of the KYC level (e.g., ''Basic'', ''Intermediate'', ''Advanced'')',
  `description` text DEFAULT NULL COMMENT 'Detailed description of the KYC level requirements',
  `level` int(11) NOT NULL COMMENT 'Numeric level indicating the verification tier (1, 2, 3, etc.)',
  `fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Required fields and documents for this KYC level' CHECK (json_valid(`fields`)),
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Features and benefits unlocked at this KYC level' CHECK (json_valid(`features`)),
  `status` enum('ACTIVE','DRAFT','INACTIVE') NOT NULL DEFAULT 'ACTIVE' COMMENT 'Current status of this KYC level configuration',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `serviceId` (`serviceId`),
  CONSTRAINT `kyc_level_ibfk_1` FOREIGN KEY (`serviceId`) REFERENCES `kyc_verification_service` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `kyc_verification_result`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kyc_verification_result` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the verification result',
  `applicationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the KYC application this result belongs to',
  `serviceId` varchar(191) NOT NULL COMMENT 'ID of the verification service that generated this result',
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
  CONSTRAINT `kyc_verification_result_ibfk_1` FOREIGN KEY (`applicationId`) REFERENCES `kyc_application` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `kyc_verification_result_ibfk_2` FOREIGN KEY (`serviceId`) REFERENCES `kyc_verification_service` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `kyc_verification_service`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kyc_verification_service` (
  `id` varchar(255) NOT NULL COMMENT 'Unique identifier for the verification service provider',
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
  `category` varchar(64) DEFAULT NULL,
  `design` longtext NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `market_news`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `market_news` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `externalId` varchar(191) DEFAULT NULL COMMENT 'Stable provider dedup key (<provider>:<id>) — NULL for operator-authored MANUAL rows',
  `source` varchar(10) NOT NULL DEFAULT 'PROVIDER',
  `provider` varchar(64) DEFAULT NULL,
  `publishedAt` datetime NOT NULL,
  `headline` varchar(500) NOT NULL,
  `summary` text DEFAULT NULL COMMENT 'PLAIN TEXT only — vendors ship the publisher''s HTML here, so every write door converts it first',
  `url` varchar(1000) DEFAULT NULL,
  `imageUrl` varchar(1000) DEFAULT NULL,
  `category` varchar(64) DEFAULT NULL COMMENT 'Provider category (crypto, general, merger, ...)',
  `relatedSymbols` text DEFAULT NULL COMMENT 'JSON array of base/quote assets this story is tagged with',
  `status` tinyint(1) DEFAULT 1 COMMENT 'Visible to clients — lets an operator pull a story',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `marketNewsExternalIdKey` (`externalId`) USING BTREE,
  KEY `marketNewsPublishedAtIndex` (`publishedAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `market_news_provider`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `market_news_provider` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(64) NOT NULL COMMENT 'Adapter identifier (finnhub, cryptocompare, cryptopanic, rss) — the join key to the code, never renamed',
  `title` varchar(191) NOT NULL,
  `description` text DEFAULT NULL COMMENT 'What the adapter can actually do — re-synced from the catalogue on every list call so an upgraded install never shows stale claims',
  `status` tinyint(1) DEFAULT 0 COMMENT 'Enabled — any number of rows may hold this, unlike fx_provider',
  `apiKey` varchar(500) DEFAULT NULL COMMENT 'Operator-supplied vendor credential. Takes precedence over the env var. NEVER returned by any endpoint - the admin console reports only whether one is stored.',
  `categories` text DEFAULT NULL COMMENT 'JSON array of what to ask this provider for; each adapter decides what a category means to its own vendor',
  `fetchLimit` int(11) DEFAULT 60 COMMENT 'Stories pulled per category, per run',
  `retentionDays` int(11) DEFAULT 30 COMMENT 'Age at which this provider''s own rows are pruned; MANUAL rows are exempt and stay the operator''s to remove',
  `config` text DEFAULT NULL COMMENT 'JSON object of adapter-specific settings (rss feed list, cryptopanic filter, ...)',
  `lastSyncAt` datetime DEFAULT NULL,
  `lastSyncStatus` varchar(16) DEFAULT NULL COMMENT 'Outcome of the last run. EMPTY is not ERROR — a vendor with no new stories is a normal Sunday',
  `lastSyncCount` int(11) DEFAULT 0 COMMENT 'Rows INSERTED on the last run, not rows returned',
  `lastSyncMessage` text DEFAULT NULL COMMENT 'Operator-readable detail. Never holds a credential — the adapters redact before they report',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `marketNewsProviderNameKey` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  CONSTRAINT `mlm_binary_node_ibfk_1` FOREIGN KEY (`referralId`) REFERENCES `mlm_referral` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_binary_node_ibfk_2` FOREIGN KEY (`parentId`) REFERENCES `mlm_binary_node` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_binary_node_ibfk_3` FOREIGN KEY (`leftChildId`) REFERENCES `mlm_binary_node` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_binary_node_ibfk_4` FOREIGN KEY (`rightChildId`) REFERENCES `mlm_binary_node` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `mlm_referral_condition`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mlm_referral_condition` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) NOT NULL,
  `type` enum('DEPOSIT','TRADE','SPOT_TRADE','BINARY_WIN','INVESTMENT','AI_INVESTMENT','FOREX_INVESTMENT','FOREX_TRADING','ICO_CONTRIBUTION','STAKING','ECOMMERCE_PURCHASE','P2P_TRADE','NFT_TRADE','COPY_TRADING','FUTURES_TRADE','TOKEN_PURCHASE') NOT NULL,
  `reward` double NOT NULL,
  `rewardType` enum('PERCENTAGE','FIXED') NOT NULL,
  `rewardWalletType` enum('FIAT','SPOT','ECO') NOT NULL,
  `rewardCurrency` varchar(191) NOT NULL,
  `rewardChain` varchar(191) DEFAULT NULL,
  `image` varchar(191) DEFAULT NULL,
  `minAmount` double NOT NULL DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `period` enum('DAILY','WEEKLY','MONTHLY') NOT NULL DEFAULT 'DAILY',
  PRIMARY KEY (`id`),
  UNIQUE KEY `mlmReferralConditionNameKey` (`name`) USING BTREE,
  KEY `mlmReferralConditionStatusIndex` (`status`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `sourceId` varchar(191) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mlmReferralRewardSourceIdUnique` (`sourceId`) USING BTREE,
  KEY `mlmReferralRewardConditionIdFkey` (`conditionId`) USING BTREE,
  KEY `mlmReferralRewardReferrerIdFkey` (`referrerId`) USING BTREE,
  CONSTRAINT `mlm_referral_reward_ibfk_1` FOREIGN KEY (`conditionId`) REFERENCES `mlm_referral_condition` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_referral_reward_ibfk_2` FOREIGN KEY (`referrerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  CONSTRAINT `mlm_unilevel_node_ibfk_1` FOREIGN KEY (`referralId`) REFERENCES `mlm_referral` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mlm_unilevel_node_ibfk_2` FOREIGN KEY (`parentId`) REFERENCES `mlm_unilevel_node` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `mobile_device`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mobile_device` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `deviceId` varchar(191) NOT NULL,
  `platform` enum('ios','android') NOT NULL,
  `pushToken` text NOT NULL,
  `appVersion` varchar(32) DEFAULT NULL,
  `locale` varchar(16) DEFAULT NULL,
  `lastSeenAt` datetime NOT NULL,
  `revokedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mobileDeviceUserDeviceIdx` (`userId`,`deviceId`) USING BTREE,
  CONSTRAINT `mobile_device_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `offerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `bidId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
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
  PRIMARY KEY (`id`),
  KEY `listingId` (`listingId`),
  KEY `nftActivityTokenIdx` (`tokenId`) USING BTREE,
  KEY `nftActivityCollectionIdx` (`collectionId`) USING BTREE,
  KEY `nftActivityTypeIdx` (`type`) USING BTREE,
  KEY `nftActivityFromUserIdx` (`fromUserId`) USING BTREE,
  KEY `nftActivityToUserIdx` (`toUserId`) USING BTREE,
  KEY `nftActivityOfferIdx` (`offerId`) USING BTREE,
  KEY `nftActivityBidIdx` (`bidId`) USING BTREE,
  KEY `nftActivityCreatedAtIdx` (`createdAt`) USING BTREE,
  CONSTRAINT `nft_activity_ibfk_1` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_2` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_3` FOREIGN KEY (`listingId`) REFERENCES `nft_listing` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_4` FOREIGN KEY (`offerId`) REFERENCES `nft_offer` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_5` FOREIGN KEY (`bidId`) REFERENCES `nft_bid` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_6` FOREIGN KEY (`fromUserId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_activity_ibfk_7` FOREIGN KEY (`toUserId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_bid`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_bid` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `listingId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tokenId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` decimal(36,18) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'ETH',
  `transactionHash` varchar(255) DEFAULT NULL,
  `expiresAt` datetime DEFAULT NULL,
  `status` enum('ACTIVE','ACCEPTED','REJECTED','EXPIRED','CANCELLED','OUTBID') NOT NULL DEFAULT 'ACTIVE',
  `acceptedAt` datetime DEFAULT NULL,
  `rejectedAt` datetime DEFAULT NULL,
  `outbidAt` datetime DEFAULT NULL,
  `cancelledAt` datetime DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `nftBidListingIdx` (`listingId`) USING BTREE,
  KEY `nftBidUserIdx` (`userId`) USING BTREE,
  KEY `nftBidTokenIdx` (`tokenId`) USING BTREE,
  KEY `nftBidStatusIdx` (`status`) USING BTREE,
  KEY `nftBidAmountIdx` (`amount`) USING BTREE,
  KEY `nftBidExpiresAtIdx` (`expiresAt`) USING BTREE,
  CONSTRAINT `nft_bid_ibfk_1` FOREIGN KEY (`listingId`) REFERENCES `nft_listing` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_bid_ibfk_2` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_bid_ibfk_3` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
  UNIQUE KEY `nftCategoryNameKey` (`name`) USING BTREE,
  UNIQUE KEY `nftCategorySlugKey` (`slug`) USING BTREE,
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
  UNIQUE KEY `nftCollectionSlugKey` (`slug`) USING BTREE,
  KEY `categoryId` (`categoryId`),
  KEY `nftCollectionCreatorIdx` (`creatorId`) USING BTREE,
  KEY `nftCollectionChainIdx` (`chain`) USING BTREE,
  KEY `nftCollectionStatusIdx` (`status`) USING BTREE,
  CONSTRAINT `nft_collection_ibfk_1` FOREIGN KEY (`creatorId`) REFERENCES `nft_creator` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_collection_ibfk_2` FOREIGN KEY (`categoryId`) REFERENCES `nft_category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
  CONSTRAINT `nft_comment_ibfk_1` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_comment_ibfk_2` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_comment_ibfk_3` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `nft_comment_ibfk_4` FOREIGN KEY (`parentId`) REFERENCES `nft_comment` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
  `profilePublic` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nftCreatorUserKey` (`userId`) USING BTREE,
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
  KEY `resolvedById` (`resolvedById`),
  KEY `idx_nft_dispute_status` (`status`),
  KEY `idx_nft_dispute_priority` (`priority`),
  KEY `idx_nft_dispute_reporter` (`reporterId`),
  KEY `idx_nft_dispute_respondent` (`respondentId`),
  KEY `idx_nft_dispute_assigned` (`assignedToId`),
  KEY `idx_nft_dispute_listing` (`listingId`),
  KEY `idx_nft_dispute_token` (`tokenId`),
  KEY `idx_nft_dispute_created` (`createdAt`),
  CONSTRAINT `nft_dispute_ibfk_1` FOREIGN KEY (`listingId`) REFERENCES `nft_listing` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_dispute_ibfk_2` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_dispute_ibfk_3` FOREIGN KEY (`reporterId`) REFERENCES `user` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `nft_dispute_ibfk_4` FOREIGN KEY (`respondentId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_dispute_ibfk_5` FOREIGN KEY (`assignedToId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_dispute_ibfk_6` FOREIGN KEY (`resolvedById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
  CONSTRAINT `nft_dispute_message_ibfk_1` FOREIGN KEY (`disputeId`) REFERENCES `nft_dispute` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_dispute_message_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
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
  CONSTRAINT `nft_favorite_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_favorite_ibfk_2` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_favorite_ibfk_3` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
  UNIQUE KEY `idx_nft_fractional_token` (`tokenId`),
  KEY `idx_nft_fractional_status` (`status`),
  KEY `idx_nft_fractional_creator` (`createdById`),
  KEY `idx_nft_fractional_vault` (`vaultAddress`),
  CONSTRAINT `nft_fractional_ibfk_1` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `nft_fractional_ibfk_2` FOREIGN KEY (`createdById`) REFERENCES `user` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
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
  `currentBid` decimal(36,18) DEFAULT NULL,
  `startingBid` decimal(36,18) DEFAULT NULL,
  `reservePrice` decimal(36,18) DEFAULT NULL,
  `minBidIncrement` decimal(36,18) DEFAULT NULL,
  `buyNowPrice` decimal(36,18) DEFAULT NULL,
  `auctionContractAddress` varchar(255) DEFAULT NULL,
  `bundleTokenIds` text DEFAULT NULL,
  `startTime` datetime DEFAULT NULL,
  `endTime` datetime DEFAULT NULL,
  `status` enum('ACTIVE','SOLD','CANCELLED','EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  `soldAt` datetime DEFAULT NULL,
  `cancelledAt` datetime DEFAULT NULL,
  `endedAt` datetime DEFAULT NULL,
  `settlementBlockedAt` datetime DEFAULT NULL,
  `views` int(11) NOT NULL DEFAULT 0,
  `likes` int(11) NOT NULL DEFAULT 0,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `nftListingTokenIdx` (`tokenId`) USING BTREE,
  KEY `nftListingSellerIdx` (`sellerId`) USING BTREE,
  KEY `nftListingStatusIdx` (`status`) USING BTREE,
  KEY `nftListingTypeIdx` (`type`) USING BTREE,
  KEY `nftListingPriceIdx` (`price`) USING BTREE,
  CONSTRAINT `nft_listing_ibfk_1` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_listing_ibfk_2` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
  KEY `pausedBy` (`pausedBy`),
  KEY `nftMarketplaceContractIdx` (`contractAddress`) USING BTREE,
  KEY `nftMarketplaceStatusIdx` (`status`) USING BTREE,
  KEY `nftMarketplaceDeployedByIdx` (`deployedBy`) USING BTREE,
  CONSTRAINT `nft_marketplace_ibfk_1` FOREIGN KEY (`deployedBy`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_marketplace_ibfk_2` FOREIGN KEY (`pausedBy`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_metadata_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_metadata_backup` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `backupId` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL,
  `size` bigint(20) NOT NULL DEFAULT 0,
  `checksum` varchar(255) NOT NULL,
  `locations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`locations`)),
  `encrypted` tinyint(1) NOT NULL DEFAULT 0,
  `compressed` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nft_metadata_backup_backup_id` (`backupId`),
  KEY `nft_metadata_backup_type` (`type`),
  KEY `nft_metadata_backup_created_at` (`createdAt`)
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
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sellerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(36,18) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'ETH',
  `expiresAt` datetime DEFAULT NULL,
  `status` enum('ACTIVE','ACCEPTED','REJECTED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `type` enum('TOKEN','COLLECTION') DEFAULT NULL,
  `message` text DEFAULT NULL,
  `acceptedAt` datetime DEFAULT NULL,
  `rejectedAt` datetime DEFAULT NULL,
  `cancelledAt` datetime DEFAULT NULL,
  `expiredAt` datetime DEFAULT NULL,
  `flaggedAt` datetime DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `nftOfferTokenIdx` (`tokenId`) USING BTREE,
  KEY `nftOfferCollectionIdx` (`collectionId`) USING BTREE,
  KEY `nftOfferListingIdx` (`listingId`) USING BTREE,
  KEY `nftOfferUserIdx` (`userId`) USING BTREE,
  KEY `nftOfferSellerIdx` (`sellerId`) USING BTREE,
  KEY `nftOfferStatusIdx` (`status`) USING BTREE,
  KEY `nftOfferAmountIdx` (`amount`) USING BTREE,
  KEY `nftOfferExpiresAtIdx` (`expiresAt`) USING BTREE,
  CONSTRAINT `nft_offer_ibfk_1` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_offer_ibfk_2` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_offer_ibfk_3` FOREIGN KEY (`listingId`) REFERENCES `nft_listing` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_offer_ibfk_4` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_offer_ibfk_5` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
  KEY `buyerId` (`buyerId`),
  KEY `sellerId` (`sellerId`),
  KEY `nftPriceHistoryTokenIdIdx` (`tokenId`) USING BTREE,
  KEY `nftPriceHistoryCollectionIdIdx` (`collectionId`) USING BTREE,
  KEY `nftPriceHistoryCreatedAtIdx` (`createdAt`) USING BTREE,
  CONSTRAINT `nft_price_history_ibfk_1` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_price_history_ibfk_2` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_price_history_ibfk_3` FOREIGN KEY (`buyerId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_price_history_ibfk_4` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
  CONSTRAINT `nft_review_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_review_ibfk_2` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_review_ibfk_3` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_review_ibfk_4` FOREIGN KEY (`creatorId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
  CONSTRAINT `nft_royalty_ibfk_1` FOREIGN KEY (`saleId`) REFERENCES `nft_sale` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_royalty_ibfk_2` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_royalty_ibfk_3` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_royalty_ibfk_4` FOREIGN KEY (`recipientId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
  UNIQUE KEY `nftSaleTransactionHashIdx` (`transactionHash`) USING BTREE,
  KEY `nftSaleTokenIdx` (`tokenId`) USING BTREE,
  KEY `nftSaleListingIdx` (`listingId`) USING BTREE,
  KEY `nftSaleSellerIdx` (`sellerId`) USING BTREE,
  KEY `nftSaleBuyerIdx` (`buyerId`) USING BTREE,
  KEY `nftSaleStatusIdx` (`status`) USING BTREE,
  KEY `nftSalePriceIdx` (`price`) USING BTREE,
  KEY `nftSaleCreatedAtIdx` (`createdAt`) USING BTREE,
  CONSTRAINT `nft_sale_ibfk_1` FOREIGN KEY (`tokenId`) REFERENCES `nft_token` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_sale_ibfk_2` FOREIGN KEY (`listingId`) REFERENCES `nft_listing` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_sale_ibfk_3` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_sale_ibfk_4` FOREIGN KEY (`buyerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nft_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nft_token` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `collectionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tokenId` varchar(255) NOT NULL,
  `blockchainTokenId` varchar(255) DEFAULT NULL COMMENT 'On-chain token ID, set after minting on blockchain',
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(1000) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `metadataUri` varchar(1000) DEFAULT NULL,
  `metadataHash` varchar(255) DEFAULT NULL,
  `ownerWalletAddress` varchar(255) DEFAULT NULL,
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `nftTokenCollectionTokenKey` (`collectionId`,`tokenId`) USING BTREE,
  KEY `nftTokenCollectionIdx` (`collectionId`) USING BTREE,
  KEY `nftTokenOwnerIdx` (`ownerId`) USING BTREE,
  KEY `nftTokenCreatorIdx` (`creatorId`) USING BTREE,
  KEY `nftTokenStatusIdx` (`status`) USING BTREE,
  KEY `nftTokenListedIdx` (`isListed`) USING BTREE,
  CONSTRAINT `nft_token_ibfk_1` FOREIGN KEY (`collectionId`) REFERENCES `nft_collection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `nft_token_ibfk_2` FOREIGN KEY (`ownerId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `nft_token_ibfk_3` FOREIGN KEY (`creatorId`) REFERENCES `nft_creator` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notification` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `relatedId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL,
  `message` varchar(255) NOT NULL,
  `details` text DEFAULT NULL,
  `link` varchar(255) DEFAULT NULL,
  `actions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`actions`)),
  `read` tinyint(1) NOT NULL DEFAULT 0,
  `idempotency_key` varchar(255) DEFAULT NULL,
  `channels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`channels`)),
  `priority` enum('LOW','NORMAL','HIGH','URGENT') DEFAULT 'NORMAL',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId_index` (`userId`),
  KEY `type_index` (`type`),
  KEY `idempotency_key_index` (`idempotency_key`),
  KEY `notification_user_created` (`userId`,`createdAt`),
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
  UNIQUE KEY `notificationTemplateNameKey` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  UNIQUE KEY `tokenId` (`tokenId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `operator_attestations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `operator_attestations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `moduleId` varchar(64) NOT NULL,
  `countryCode` varchar(2) NOT NULL,
  `entityName` varchar(255) NOT NULL,
  `regulator` varchar(255) NOT NULL,
  `licenceNumber` varchar(255) NOT NULL,
  `expiresAt` datetime NOT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_attestation_module_country` (`moduleId`,`countryCode`) USING BTREE,
  KEY `idx_attestation_expiresAt` (`expiresAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `p2p_activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `p2p_activity_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `details` text DEFAULT NULL,
  `relatedEntity` varchar(50) DEFAULT NULL,
  `relatedEntityId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `p2p_activity_log_user_type_action_created` (`userId`,`type`,`action`,`createdAt`) USING BTREE,
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
  CONSTRAINT `p2p_commissions_ibfk_1` FOREIGN KEY (`adminId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_commissions_ibfk_2` FOREIGN KEY (`tradeId`) REFERENCES `p2p_trades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `p2p_commissions_ibfk_3` FOREIGN KEY (`offerId`) REFERENCES `p2p_offers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
  `activityLog` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`activityLog`)),
  `appealedAt` datetime DEFAULT NULL COMMENT 'When the trader this dispute was filed against formally contested it. Null means uncontested, which is not the same as agreed.',
  `appealedById` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Who appealed. Always equal to againstId today; stored explicitly so the record does not depend on that staying true.',
  `appealStatement` text DEFAULT NULL COMMENT 'The respondent''s account of what happened, in their own words.',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tradeId` (`tradeId`),
  KEY `reportedById` (`reportedById`),
  KEY `againstId` (`againstId`),
  KEY `appealedById` (`appealedById`),
  KEY `idx_p2p_dispute_status_appealedAt` (`status`,`appealedAt`) USING BTREE,
  CONSTRAINT `p2p_disputes_ibfk_1` FOREIGN KEY (`tradeId`) REFERENCES `p2p_trades` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_disputes_ibfk_2` FOREIGN KEY (`reportedById`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_disputes_ibfk_3` FOREIGN KEY (`againstId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_disputes_ibfk_4` FOREIGN KEY (`appealedById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
  CONSTRAINT `p2p_offer_flags_ibfk_1` FOREIGN KEY (`offerId`) REFERENCES `p2p_offers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_offer_flags_ibfk_2` FOREIGN KEY (`flaggedById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
  `priceCurrency` varchar(10) DEFAULT NULL COMMENT 'Currency used for pricing (USD, EUR, GBP, etc.)',
  `amountConfig` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`amountConfig`)),
  `priceConfig` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`priceConfig`)),
  `tradeSettings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`tradeSettings`)),
  `locationSettings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`locationSettings`)),
  `userRequirements` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`userRequirements`)),
  `status` enum('DRAFT','PENDING_APPROVAL','ACTIVE','PAUSED','COMPLETED','CANCELLED','REJECTED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  `escrowAmount` double NOT NULL DEFAULT 0,
  `views` int(11) NOT NULL DEFAULT 0,
  `systemTags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`systemTags`)),
  `adminNotes` text DEFAULT NULL,
  `activityLog` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`activityLog`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `idx_p2p_offer_status_type` (`status`,`type`) USING BTREE,
  KEY `idx_p2p_offer_status_currency` (`status`,`currency`,`priceCurrency`) USING BTREE,
  KEY `idx_p2p_offer_status_createdAt` (`status`,`createdAt`) USING BTREE,
  KEY `idx_p2p_offer_status_updatedAt` (`status`,`updatedAt`) USING BTREE,
  CONSTRAINT `p2p_offers_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `p2p_payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `p2p_payment_methods` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `railId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'The shared rail this account belongs to. Null for rows created before rails existed, and for a rail that has since been deleted.',
  `name` varchar(100) NOT NULL,
  `icon` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `instructions` longtext DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Flexible key-value pairs for payment details (e.g., PayPal Email, Bank Account, etc.)' CHECK (json_valid(`metadata`)),
  `processingTime` varchar(50) DEFAULT NULL,
  `fees` varchar(50) DEFAULT NULL,
  `available` tinyint(1) NOT NULL DEFAULT 1,
  `isGlobal` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'If true, this payment method is available to all users (created by admin)',
  `popularityRank` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `railId` (`railId`),
  CONSTRAINT `p2p_payment_methods_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_payment_methods_ibfk_2` FOREIGN KEY (`railId`) REFERENCES `p2p_payment_rails` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `p2p_payment_rails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `p2p_payment_rails` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `icon` varchar(191) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Ordered field definitions: [{key,label,required,placeholder,help}]. An account stores its values against these keys.' CHECK (json_valid(`fields`)),
  `isCustom` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'True when a trader defined this rail rather than it shipping in the catalogue.',
  `createdByUserId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Null for catalogue rails. The author of a custom rail.',
  `listed` tinyint(1) NOT NULL DEFAULT 0,
  `available` tinyint(1) NOT NULL DEFAULT 1,
  `popularityRank` int(11) NOT NULL DEFAULT 0,
  `processingTime` varchar(50) DEFAULT NULL COMMENT 'Default clearing time, which an account may override.',
  `fees` varchar(50) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `p2p_payment_rails_slug_unique` (`slug`),
  KEY `createdByUserId` (`createdByUserId`),
  KEY `p2p_payment_rails_listed` (`listed`,`available`),
  CONSTRAINT `p2p_payment_rails_ibfk_1` FOREIGN KEY (`createdByUserId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
  `communicationRating` float NOT NULL,
  `speedRating` float NOT NULL,
  `trustRating` float NOT NULL,
  `comment` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `reviewerId` (`reviewerId`),
  KEY `revieweeId` (`revieweeId`),
  KEY `tradeId` (`tradeId`),
  KEY `userId` (`userId`),
  CONSTRAINT `p2p_reviews_ibfk_1` FOREIGN KEY (`reviewerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_reviews_ibfk_2` FOREIGN KEY (`revieweeId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_reviews_ibfk_3` FOREIGN KEY (`tradeId`) REFERENCES `p2p_trades` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_reviews_ibfk_4` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `p2p_trader_relations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `p2p_trader_relations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `traderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` enum('FOLLOW','BLOCK') NOT NULL,
  `note` varchar(500) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_p2p_relation_user_trader_type` (`userId`,`traderId`,`type`) USING BTREE,
  KEY `idx_p2p_relation_user_type` (`userId`,`type`) USING BTREE,
  KEY `idx_p2p_relation_trader_type` (`traderId`,`type`) USING BTREE,
  CONSTRAINT `p2p_trader_relations_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_trader_relations_ibfk_2` FOREIGN KEY (`traderId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
  `escrowAmount` double DEFAULT NULL,
  `escrowStatus` enum('NONE','HELD','RELEASED','REFUNDED') NOT NULL DEFAULT 'NONE',
  `completedAt` datetime DEFAULT NULL,
  `cancelledAt` datetime DEFAULT NULL,
  `disputedAt` datetime DEFAULT NULL,
  `cancelledBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `cancellationReason` varchar(500) DEFAULT NULL,
  `resolution` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`resolution`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `offerId` (`offerId`),
  KEY `paymentMethod` (`paymentMethod`),
  KEY `userId` (`userId`),
  KEY `idx_p2p_trade_status` (`status`) USING BTREE,
  KEY `idx_p2p_trade_buyerId_status` (`buyerId`,`status`) USING BTREE,
  KEY `idx_p2p_trade_sellerId_status` (`sellerId`,`status`) USING BTREE,
  KEY `idx_p2p_trade_createdAt` (`createdAt`) USING BTREE,
  KEY `idx_p2p_trade_escrowStatus` (`escrowStatus`) USING BTREE,
  CONSTRAINT `p2p_trades_ibfk_1` FOREIGN KEY (`offerId`) REFERENCES `p2p_offers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_trades_ibfk_2` FOREIGN KEY (`buyerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_trades_ibfk_3` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_trades_ibfk_4` FOREIGN KEY (`paymentMethod`) REFERENCES `p2p_payment_methods` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_trades_ibfk_5` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `p2p_user_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `p2p_user_reports` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `reporterId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `reportedId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tradeId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `reason` enum('PAYMENT_OUTSIDE_PLATFORM','THIRD_PARTY_PAYMENT','ABUSIVE_CONDUCT','CONTACT_DETAILS_IN_ADVERT','SUSPECTED_FRAUD','IMPERSONATION','OTHER') NOT NULL,
  `details` text NOT NULL,
  `status` enum('PENDING','REVIEWING','ACTIONED','DISMISSED') NOT NULL DEFAULT 'PENDING',
  `resolution` text DEFAULT NULL,
  `reviewedById` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `reviewedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tradeId` (`tradeId`),
  KEY `reviewedById` (`reviewedById`),
  KEY `idx_p2p_report_status_createdAt` (`status`,`createdAt`) USING BTREE,
  KEY `idx_p2p_report_reportedId` (`reportedId`) USING BTREE,
  KEY `idx_p2p_report_reporterId_createdAt` (`reporterId`,`createdAt`) USING BTREE,
  CONSTRAINT `p2p_user_reports_ibfk_1` FOREIGN KEY (`reporterId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_user_reports_ibfk_2` FOREIGN KEY (`reportedId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `p2p_user_reports_ibfk_3` FOREIGN KEY (`tradeId`) REFERENCES `p2p_trades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `p2p_user_reports_ibfk_4` FOREIGN KEY (`reviewedById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `page`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `page` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the page',
  `slug` varchar(255) NOT NULL COMMENT 'URL-friendly slug for the page (used in the page URL)',
  `path` varchar(255) NOT NULL DEFAULT '' COMMENT 'Full path/route for the page in the website structure',
  `title` varchar(255) NOT NULL COMMENT 'Title of the page displayed to users and in browser tabs',
  `content` longtext NOT NULL DEFAULT '' COMMENT 'Main content/body of the page (HTML or Markdown)',
  `description` text DEFAULT NULL COMMENT 'Brief description of the page content',
  `image` text DEFAULT NULL COMMENT 'URL path to the page''s featured image',
  `order` int(11) NOT NULL DEFAULT 0 COMMENT 'Display order for page sorting and navigation',
  `visits` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of times this page has been visited',
  `status` enum('PUBLISHED','DRAFT') NOT NULL DEFAULT 'DRAFT' COMMENT 'Publication status of the page (PUBLISHED or DRAFT)',
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
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pageSlugKey` (`slug`) USING BTREE,
  KEY `pageStatusIndex` (`status`) USING BTREE,
  KEY `pageIsHomeIndex` (`isHome`) USING BTREE,
  KEY `pageIsBuilderIndex` (`isBuilderPage`) USING BTREE,
  KEY `pageOrderIndex` (`order`) USING BTREE,
  KEY `pagePublishedAtIndex` (`publishedAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Unique permission name (e.g., access.users, create.posts)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pool_backing_currency`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pool_backing_currency` (
  `currency` varchar(191) NOT NULL,
  `capUsd` decimal(36,18) DEFAULT NULL COMMENT 'Per-currency override of poolBackingCapUsd: the most the open transfer obligations may reach, in USD, before an ECO -> SPOT transfer is refused',
  `thresholdUsd` decimal(36,18) DEFAULT NULL COMMENT 'Per-currency override of poolBackingThresholdUsd',
  `networkMap` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'ecosystem chain id -> the active exchange''s network id, validated at reconciliation' CHECK (json_valid(`networkMap`)),
  `lastResidual` decimal(36,18) DEFAULT NULL COMMENT 'The residual the last reconciliation saw, to measure the streak',
  `residualStreak` int(11) NOT NULL DEFAULT 0 COMMENT 'Consecutive runs the residual held the same sign above tolerance',
  `drift` decimal(36,18) DEFAULT NULL COMMENT 'The persisted drift for this currency, once the streak was reached',
  `driftFirstSeenAt` datetime DEFAULT NULL,
  `driftAcknowledgedAt` datetime DEFAULT NULL,
  `driftAcknowledgedBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `driftAcknowledgedAmount` decimal(36,18) DEFAULT NULL COMMENT 'The drift as it stood when acknowledged; a drift that has since grown past it counts as unacknowledged again',
  `notes` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`currency`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pool_backing_custody_read`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pool_backing_custody_read` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `currency` varchar(191) NOT NULL,
  `chain` varchar(50) NOT NULL,
  `address` varchar(191) NOT NULL COMMENT 'The on-chain address (or, for Monero, the wallet file''s primary address)',
  `walletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'The ECO wallet that owns the address; NULL for the master and custodial contracts',
  `kind` enum('treasury','master','custodial','customer') NOT NULL COMMENT 'treasury and master are read every run; custodial every run; customers in a rotating slice',
  `balance` decimal(36,18) DEFAULT NULL COMMENT 'The last successful figure in the currency''s unit; NULL = never read. A failed read never writes 0',
  `readAt` datetime DEFAULT NULL COMMENT 'When `balance` was read; the rotation picks the oldest (NULL first)',
  `error` text DEFAULT NULL COMMENT 'The last attempt''s failure, cleared by the next success',
  `attemptedAt` datetime DEFAULT NULL COMMENT 'When the address was last READ OR TRIED; the rotation orders on this (NULL first, then oldest), so an address that fails every run still yields its turn instead of holding the whole slice',
  `source` enum('chain','utxo_pool','mirror') NOT NULL DEFAULT 'chain' COMMENT 'chain = RPC read; utxo_pool = Σ UNSPENT ecosystemUtxo; mirror = the wallet''s own map figure (not an on-chain fact)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pool_backing_custody_read_address` (`currency`,`chain`,`address`) USING BTREE,
  KEY `idx_pool_backing_custody_read_readAt` (`currency`,`chain`,`readAt`) USING BTREE,
  KEY `idx_pool_backing_custody_read_attemptedAt` (`currency`,`chain`,`attemptedAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pool_backing_obligation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pool_backing_obligation` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `currency` varchar(191) NOT NULL COMMENT 'Currency the amount is denominated in',
  `side` enum('both','exchange','ecosystem') NOT NULL DEFAULT 'both' COMMENT 'Which pool the row describes: both (a same-currency transfer), exchange only, or ecosystem only',
  `chain` varchar(50) DEFAULT NULL COMMENT 'Ecosystem chain the coins sit on, when the ecosystem side is involved; null when the transfer''s chain map could not attribute it',
  `amount` decimal(36,18) NOT NULL COMMENT 'Signed. Positive: the exchange pool is short by this much. Negative: the exchange holds this much more than it owes',
  `source` enum('transfer','conversion','fiat_transfer','admin','minted','exchange_fee') NOT NULL,
  `status` enum('OPEN','CLAIMED','SETTLED','WAIVED','CANCELLED') NOT NULL DEFAULT 'OPEN',
  `nettable` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether the settlement engine may net this row against others of its currency and settle it. Only transfer legs are',
  `sourceRef` varchar(191) DEFAULT NULL COMMENT 'The transaction row that created it: the INCOMING leg of a transfer, the adjustment row of an admin credit. Deliberately not a foreign key — the row must survive a deleted transaction',
  `legs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Both transaction ids of a transfer and the per-chain attribution the ledger recorded' CHECK (json_valid(`legs`)),
  `evidence` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'What proved the row unbacked or backed: exchange deposit id and status, the fetch time' CHECK (json_valid(`evidence`)),
  `settlementId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'The poolBackingSettlement that claimed or settled this row',
  `createdBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'The admin who caused an admin row; null for customer-driven rows',
  `waivedBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `waiveReason` text DEFAULT NULL,
  `waivedAt` datetime DEFAULT NULL,
  `settledAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pool_backing_obligation_sourceRef_side` (`sourceRef`,`side`) USING BTREE,
  KEY `idx_pool_backing_obligation_currency_status` (`currency`,`status`) USING BTREE,
  KEY `idx_pool_backing_obligation_currency_chain_status` (`currency`,`chain`,`status`) USING BTREE,
  KEY `idx_pool_backing_obligation_settlementId` (`settlementId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pool_backing_reconciliation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pool_backing_reconciliation` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `runId` varchar(64) NOT NULL COMMENT 'Groups every currency''s row of one run',
  `currency` varchar(191) NOT NULL,
  `at` datetime NOT NULL,
  `status` enum('ok','h_unknown') NOT NULL DEFAULT 'ok',
  `liabilities` decimal(36,18) NOT NULL COMMENT 'L: what the pooled exchange account must be able to pay',
  `liabilitiesSplit` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'customers, superAdmin, pendingWithdrawals' CHECK (json_valid(`liabilitiesSplit`)),
  `holdings` decimal(36,18) DEFAULT NULL COMMENT 'H: the exchange account total over every account type; null when unreadable',
  `holdingsSplit` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'per account type: total, fetchedAt, error' CHECK (json_valid(`holdingsSplit`)),
  `ecosystemSplit` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Phase 3, per chain: le, leTreasury, leUnattributed, he (null unless every address has a figure), heByKind, read coverage and ages, status ok|partial|unknown, gapE, open ecosystem rows, mirror. NULL when the currency has no ECO wallets, or when the ecosystem side could not be read (then ecosystemError says why)' CHECK (json_valid(`ecosystemSplit`)),
  `ecosystemError` text DEFAULT NULL COMMENT 'Why the ecosystem side was NOT read this run (the custody walk threw, the ECO currency list could not be read). NULL when it was read, or when the currency has no ecosystem side at all — the two cases a bare NULL ecosystemSplit could not tell apart',
  `inFlight` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000 COMMENT 'A: settlements under way, subtracted from the gap',
  `gap` decimal(36,18) DEFAULT NULL COMMENT 'G = L - H - A; null when H is unknown',
  `openObligations` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000 COMMENT 'Signed sum of OPEN and CLAIMED obligations on the exchange side',
  `residual` decimal(36,18) DEFAULT NULL COMMENT 'G minus open obligations — the part no row explains, this run',
  `drift` decimal(36,18) DEFAULT NULL COMMENT 'The residual once it has survived the streak; null until then',
  `driftRunStreak` int(11) NOT NULL DEFAULT 0,
  `holdingsStale` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pool_backing_reconciliation_currency_at` (`currency`,`at`) USING BTREE,
  KEY `idx_pool_backing_reconciliation_runId` (`runId`) USING BTREE,
  KEY `idx_pool_backing_reconciliation_at` (`at`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pool_backing_settlement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pool_backing_settlement` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `currency` varchar(191) NOT NULL,
  `direction` enum('eco_to_exchange','exchange_to_eco','external','exchange_convert') NOT NULL,
  `chain` varchar(50) DEFAULT NULL COMMENT 'Ecosystem chain the coins move on, when the platform moved them',
  `network` varchar(100) DEFAULT NULL COMMENT 'The exchange''s own network id for that chain, as sent to it',
  `amountRequested` decimal(36,18) NOT NULL COMMENT 'What the obligations are settled by',
  `amountSent` decimal(36,18) DEFAULT NULL,
  `amountReceived` decimal(36,18) DEFAULT NULL COMMENT 'What the receiving side confirmed; the difference to requested is fees',
  `status` enum('PLANNED','DISPATCHED','CONFIRMED','SETTLED','NEEDS_REVIEW','FAILED','RECORDED') NOT NULL DEFAULT 'PLANNED',
  `activeKey` varchar(191) DEFAULT NULL COMMENT '<currency>|<direction> while in flight, NULL when terminal. UNIQUE: the in-flight lock every process shares',
  `txid` varchar(191) DEFAULT NULL COMMENT 'The on-chain hash the front-run guard checks: reserved before the movement is visible (the expected UTXO txid before broadcast, the exchange''s txid once it publishes one), so the spot deposit claim route and both spot verifiers can refuse it. Also inside proof; this column is the indexed copy',
  `proof` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'txid, exchange withdrawal/deposit ids, from/to address and tag, broadcast and confirmation times, receipts' CHECK (json_valid(`proof`)),
  `fees` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'gas in the chain''s native asset, the venue''s fee, and the shortfall booked as loss' CHECK (json_valid(`fees`)),
  `initiatedBy` varchar(191) DEFAULT NULL COMMENT '''auto'' for the cron, otherwise the admin''s user id',
  `note` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pool_backing_settlement_activeKey` (`activeKey`) USING BTREE,
  KEY `idx_pool_backing_settlement_currency_status` (`currency`,`status`) USING BTREE,
  KEY `idx_pool_backing_settlement_txid` (`txid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `post`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the blog post',
  `title` varchar(255) NOT NULL COMMENT 'Title of the blog post',
  `content` text NOT NULL COMMENT 'Full content/body of the blog post',
  `categoryId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the category this post belongs to',
  `authorId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the author who wrote this post',
  `slug` varchar(255) NOT NULL COMMENT 'URL-friendly slug for the post (used in URLs)',
  `description` longtext DEFAULT NULL COMMENT 'Brief description or excerpt of the post',
  `status` enum('PUBLISHED','DRAFT') NOT NULL DEFAULT 'DRAFT' COMMENT 'Publication status of the post (PUBLISHED or DRAFT)',
  `image` text DEFAULT NULL COMMENT 'URL path to the featured image for the post',
  `views` int(11) DEFAULT 0 COMMENT 'Number of times this post has been viewed',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `postSlugKey` (`slug`) USING BTREE,
  KEY `postsCategoryIdForeign` (`categoryId`) USING BTREE,
  KEY `postsAuthorIdForeign` (`authorId`) USING BTREE,
  CONSTRAINT `post_ibfk_1` FOREIGN KEY (`categoryId`) REFERENCES `category` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `post_ibfk_2` FOREIGN KEY (`authorId`) REFERENCES `author` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `post_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_tag` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the post-tag relationship',
  `postId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the blog post',
  `tagId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the tag associated with the post',
  PRIMARY KEY (`id`),
  UNIQUE KEY `post_tag_tagId_postId_unique` (`postId`,`tagId`),
  KEY `postTagPostIdForeign` (`postId`) USING BTREE,
  KEY `postTagTagIdForeign` (`tagId`) USING BTREE,
  CONSTRAINT `post_tag_ibfk_1` FOREIGN KEY (`postId`) REFERENCES `post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `post_tag_ibfk_2` FOREIGN KEY (`tagId`) REFERENCES `tag` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `provider_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `provider_user` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `providerUserId` varchar(255) NOT NULL,
  `provider` enum('GOOGLE','WALLET') NOT NULL,
  `isPrimary` tinyint(1) DEFAULT NULL COMMENT 'TRUE for the one link mirrored into user.walletAddress; NULL otherwise. Never FALSE.',
  `chainId` int(11) DEFAULT NULL COMMENT 'EIP-155 chain id the SIWE signature was proven on',
  `verifiedAt` datetime DEFAULT NULL COMMENT 'When the SIWE signature for this link was verified',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `providerUserId` (`providerUserId`) USING BTREE,
  UNIQUE KEY `providerUserPrimaryPerProvider` (`userId`,`provider`,`isPrimary`) USING BTREE,
  KEY `ProviderUserUserIdFkey` (`userId`) USING BTREE,
  CONSTRAINT `provider_user_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Unique name of the role (e.g., Admin, User, Moderator)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `roleNameKey` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `role_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role_permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `roleId` int(11) NOT NULL,
  `permissionId` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permission_roleId_permissionId_unique` (`roleId`,`permissionId`),
  KEY `RolePermissionPermissionIdFkey` (`permissionId`) USING BTREE,
  KEY `RolePermissionRoleIdFkey` (`roleId`) USING BTREE,
  CONSTRAINT `role_permission_ibfk_1` FOREIGN KEY (`roleId`) REFERENCES `role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permission_ibfk_2` FOREIGN KEY (`permissionId`) REFERENCES `permission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `key` varchar(255) NOT NULL COMMENT 'Unique setting key identifier',
  `value` longtext DEFAULT NULL COMMENT 'Setting value in JSON format or plain text',
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `site_chrome`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `site_chrome` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the site chrome row (singleton)',
  `navbarVariant` varchar(64) NOT NULL DEFAULT 'classic' COMMENT 'Id of the navbar layout variant, matching the chrome variant registry',
  `footerVariant` varchar(64) NOT NULL DEFAULT 'columns' COMMENT 'Id of the footer layout variant, matching the chrome variant registry',
  `menuOverrides` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Menu override patches keyed by scope (admin, user, ext_*). Patch, never a snapshot - see frontend/lib/chrome/menu-overrides.ts' CHECK (json_valid(`menuOverrides`)),
  `footerContent` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Footer brand text, link override patch and social links. null socials = derive from settings; [] = show none' CHECK (json_valid(`footerContent`)),
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `slider`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slider` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the slider item',
  `image` varchar(255) NOT NULL COMMENT 'URL path to the slider image',
  `link` varchar(255) DEFAULT NULL COMMENT 'Optional URL that the slider image should link to when clicked',
  `status` tinyint(1) DEFAULT 1 COMMENT 'Whether this slider item is active and should be displayed',
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `spot_deposit_intent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `spot_deposit_intent` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'The customer who declared the deposit',
  `walletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'The wallet the deposit lands in first: SPOT for hash_claim/amount_match, ECO for ecosystem_custody',
  `currency` varchar(191) NOT NULL,
  `network` varchar(100) NOT NULL COMMENT 'The exchange''s network id for the rail (TRC20, ERC20, BEP20, ...), upper-cased',
  `chain` varchar(50) DEFAULT NULL COMMENT 'The ecosystem chain the customer''s own address is on (ecosystem_custody only)',
  `mode` enum('hash_claim','amount_match','ecosystem_custody') NOT NULL COMMENT 'Decided at creation from the spotDepositMode setting and eligibility; never changes',
  `declaredAmount` decimal(36,18) DEFAULT NULL COMMENT 'What the customer said they would send (hash_claim, amount_match)',
  `expectedAmount` decimal(36,18) DEFAULT NULL COMMENT 'The exact amount to send: declared plus the uniqueness nudge (amount_match), declared (hash_claim), NULL (ecosystem_custody)',
  `address` varchar(255) DEFAULT NULL COMMENT 'The address the customer was shown: the exchange''s for hash_claim/amount_match, their own for ecosystem_custody',
  `tag` varchar(191) DEFAULT NULL COMMENT 'Memo/tag shown with the address, if the rail needs one',
  `status` enum('OPEN','MATCHED','SWEEPING','CREDITED','EXPIRED','CANCELLED','FAILED','REVIEW') NOT NULL DEFAULT 'OPEN',
  `activeAmountKey` varchar(191) DEFAULT NULL COMMENT '<currency>|<expectedAmount> while OPEN under amount_match, NULL otherwise. UNIQUE: the nudge''s guarantee, enforced by the database and nowhere else. No rail in the key — the matcher searches per currency',
  `claimedTxid` varchar(191) DEFAULT NULL COMMENT 'The hash: pasted (hash_claim), found on the exchange (amount_match), or produced by the sweep (ecosystem_custody)',
  `matchedDepositId` varchar(191) DEFAULT NULL COMMENT 'The exchange''s own id/txid for the deposit once matched',
  `sweepTransactionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'The platform-initiated ECO WITHDRAW row that moves the coins to the exchange (ecosystem_custody)',
  `spotTransactionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'The SPOT DEPOSIT transaction row the intent was credited through',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'review reason, exchange network id and address, sweep attempts and resweepAt, amounts seen, hash submissions' CHECK (json_valid(`metadata`)),
  `expiresAt` datetime NOT NULL COMMENT 'OPEN past this instant becomes EXPIRED (60 minutes after creation); matching keeps running for 7 days',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_spot_deposit_intent_activeAmountKey` (`activeAmountKey`) USING BTREE,
  KEY `idx_spot_deposit_intent_user_status` (`userId`,`status`) USING BTREE,
  KEY `idx_spot_deposit_intent_currency_network_status` (`currency`,`network`,`status`) USING BTREE,
  KEY `idx_spot_deposit_intent_wallet_chain_status` (`walletId`,`chain`,`status`) USING BTREE,
  CONSTRAINT `spot_deposit_intent_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `spot_deposit_intent_ibfk_2` FOREIGN KEY (`walletId`) REFERENCES `wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_admin_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_admin_activities` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `action` enum('create','update','delete','approve','reject','distribute') NOT NULL,
  `type` enum('pool','position','earnings','settings','withdrawal') NOT NULL,
  `relatedId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `staking_admin_activities_action_idx` (`action`),
  KEY `staking_admin_activities_type_idx` (`type`),
  KEY `staking_admin_activities_relatedId_idx` (`relatedId`),
  CONSTRAINT `staking_admin_activities_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_admin_earnings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_admin_earnings` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` double NOT NULL,
  `isClaimed` tinyint(1) NOT NULL DEFAULT 0,
  `type` enum('PLATFORM_FEE','EARLY_WITHDRAWAL_FEE','PERFORMANCE_FEE','OTHER','STAKING_COMMISSION') NOT NULL,
  `currency` varchar(10) NOT NULL,
  `periodBucket` varchar(100) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `staking_admin_earnings_period_idx` (`poolId`,`type`,`periodBucket`),
  KEY `staking_admin_earnings_pool_idx` (`poolId`),
  KEY `staking_admin_earnings_claimed_idx` (`isClaimed`),
  CONSTRAINT `staking_admin_earnings_ibfk_1` FOREIGN KEY (`poolId`) REFERENCES `staking_pools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_batches` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `chain` varchar(50) NOT NULL,
  `network` varchar(32) NOT NULL,
  `kind` enum('GATHER','DELEGATE','EXIT','CLAIM','RETURN','REFUND','COMMISSION_EXIT','SWEEP','LIQUID_EXIT') NOT NULL,
  `status` enum('PENDING','BROADCAST','CONFIRMED','RETRYING','FAILED') NOT NULL DEFAULT 'PENDING',
  `stakingWalletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `intentDigest` varchar(128) DEFAULT NULL,
  `intent` longtext DEFAULT NULL,
  `txHash` varchar(191) DEFAULT NULL,
  `broadcastMeta` text DEFAULT NULL,
  `metadata` longtext DEFAULT NULL,
  `networkFee` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `amount` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `lastError` text DEFAULT NULL,
  `broadcastAt` datetime DEFAULT NULL,
  `confirmedAt` datetime DEFAULT NULL,
  `createdBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `staking_batches_tx_hash_key` (`txHash`),
  KEY `stakingWalletId` (`stakingWalletId`),
  KEY `staking_batches_status_kind_idx` (`status`,`kind`),
  KEY `staking_batches_pool_idx` (`poolId`),
  CONSTRAINT `staking_batches_ibfk_1` FOREIGN KEY (`poolId`) REFERENCES `staking_pools` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `staking_batches_ibfk_2` FOREIGN KEY (`stakingWalletId`) REFERENCES `staking_chain_wallets` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_chain_activations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_chain_activations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chain` varchar(50) NOT NULL,
  `network` varchar(32) NOT NULL,
  `venue` enum('SOLANA_NATIVE','LIDO_STETH') NOT NULL,
  `status` enum('DRAFT','ACTIVE','PAUSED','RETIRED') NOT NULL DEFAULT 'DRAFT',
  `stakingWalletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `validatorSetId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `defaultCommissionPercent` decimal(10,8) NOT NULL DEFAULT 0.00000000,
  `commissionNoticeDays` int(11) NOT NULL DEFAULT 30,
  `slashingPolicy` enum('PASS_THROUGH','REIMBURSE_CAPPED') NOT NULL DEFAULT 'PASS_THROUGH',
  `slashingReimburseCap` decimal(36,18) DEFAULT NULL,
  `licensed` tinyint(1) NOT NULL DEFAULT 0,
  `regulator` varchar(191) DEFAULT NULL,
  `licenceReference` varchar(191) DEFAULT NULL,
  `jurisdictionsServed` text DEFAULT NULL,
  `ringFenceAcknowledged` tinyint(1) NOT NULL DEFAULT 0,
  `noGuaranteeAcknowledged` tinyint(1) NOT NULL DEFAULT 0,
  `validatorDueDiligence` text DEFAULT NULL,
  `sfcAttestation` tinyint(1) NOT NULL DEFAULT 0,
  `disclosureVersion` varchar(64) DEFAULT NULL,
  `disclosureHash` varchar(128) DEFAULT NULL,
  `disclosureText` longtext DEFAULT NULL,
  `acceptedBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `acceptedAt` datetime DEFAULT NULL,
  `acceptedIp` varchar(64) DEFAULT NULL,
  `acceptedUserAgent` varchar(512) DEFAULT NULL,
  `activatedAt` datetime DEFAULT NULL,
  `pausedAt` datetime DEFAULT NULL,
  `pausedBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `pausedReason` text DEFAULT NULL,
  `retiredAt` datetime DEFAULT NULL,
  `createdBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `staking_chain_activations_chain_network_key` (`chain`,`network`),
  KEY `stakingWalletId` (`stakingWalletId`),
  KEY `validatorSetId` (`validatorSetId`),
  KEY `staking_chain_activations_status_idx` (`status`),
  CONSTRAINT `staking_chain_activations_ibfk_1` FOREIGN KEY (`stakingWalletId`) REFERENCES `staking_chain_wallets` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `staking_chain_activations_ibfk_2` FOREIGN KEY (`validatorSetId`) REFERENCES `staking_validator_sets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_chain_wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_chain_wallets` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chain` varchar(50) NOT NULL,
  `network` varchar(32) NOT NULL,
  `currency` varchar(50) NOT NULL,
  `address` varchar(255) NOT NULL,
  `data` text NOT NULL,
  `role` enum('STAKING') NOT NULL DEFAULT 'STAKING',
  `status` enum('ACTIVE','FROZEN') NOT NULL DEFAULT 'ACTIVE',
  `balance` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `gasReserveFloor` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `lastObservedAt` datetime DEFAULT NULL,
  `frozenAt` datetime DEFAULT NULL,
  `frozenBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `frozenReason` text DEFAULT NULL,
  `createdBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `staking_chain_wallets_chain_network_key` (`chain`,`network`),
  KEY `staking_chain_wallets_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_commission_exits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_commission_exits` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chain` varchar(50) NOT NULL,
  `network` varchar(32) NOT NULL,
  `status` enum('QUEUED','UNBONDING','SETTLED','PAID','FAILED') NOT NULL DEFAULT 'QUEUED',
  `shares` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `requestSharePrice` decimal(36,18) NOT NULL DEFAULT 1.000000000000000000,
  `requestedValue` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `settledAmount` decimal(36,18) DEFAULT NULL,
  `settledAt` datetime DEFAULT NULL,
  `destination` varchar(191) DEFAULT NULL,
  `exitBatchId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `payoutBatchId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `txHash` varchar(191) DEFAULT NULL,
  `networkFee` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `failureReason` text DEFAULT NULL,
  `requestedBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `requestedAt` datetime NOT NULL,
  `paidAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `staking_commission_exits_pool_status_idx` (`poolId`,`status`),
  KEY `staking_commission_exits_payout_idx` (`payoutBatchId`),
  CONSTRAINT `staking_commission_exits_ibfk_1` FOREIGN KEY (`poolId`) REFERENCES `staking_pools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_consents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_consents` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `activationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `version` varchar(64) NOT NULL,
  `hash` varchar(128) NOT NULL,
  `text` longtext NOT NULL,
  `acknowledgements` text DEFAULT NULL,
  `acceptedAt` datetime NOT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `userAgent` varchar(512) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `activationId` (`activationId`),
  KEY `staking_consents_user_idx` (`userId`),
  KEY `staking_consents_pool_idx` (`poolId`),
  KEY `staking_consents_version_idx` (`version`),
  CONSTRAINT `staking_consents_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `staking_consents_ibfk_2` FOREIGN KEY (`poolId`) REFERENCES `staking_pools` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `staking_consents_ibfk_3` FOREIGN KEY (`activationId`) REFERENCES `staking_chain_activations` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_durations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_durations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `lockPeriod` int(11) NOT NULL,
  `apr` decimal(10,8) NOT NULL,
  `earningFrequency` enum('DAILY','WEEKLY','MONTHLY','END_OF_TERM') NOT NULL DEFAULT 'DAILY',
  `autoCompound` tinyint(1) DEFAULT NULL,
  `minStake` decimal(36,18) DEFAULT NULL,
  `maxStake` decimal(36,18) DEFAULT NULL,
  `adminFeePercentage` decimal(10,8) DEFAULT NULL,
  `earlyWithdrawalFee` decimal(10,8) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `isFeatured` tinyint(1) NOT NULL DEFAULT 0,
  `order` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `staking_durations_pool_idx` (`poolId`),
  KEY `staking_durations_pool_status_idx` (`poolId`,`status`),
  KEY `staking_durations_pool_lock_idx` (`poolId`,`lockPeriod`),
  KEY `staking_durations_order_idx` (`order`),
  CONSTRAINT `staking_durations_ibfk_1` FOREIGN KEY (`poolId`) REFERENCES `staking_pools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_earning_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_earning_records` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `positionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` double NOT NULL,
  `type` enum('REGULAR','BONUS','REFERRAL') NOT NULL DEFAULT 'REGULAR',
  `description` varchar(191) NOT NULL,
  `isClaimed` tinyint(1) NOT NULL DEFAULT 0,
  `claimedAt` datetime DEFAULT NULL,
  `periodBucket` varchar(100) DEFAULT NULL,
  `settlement` enum('CLAIMABLE','COMPOUNDED') DEFAULT NULL,
  `observationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `staking_earning_records_period_idx` (`positionId`,`type`,`periodBucket`),
  KEY `staking_earning_records_position_idx` (`positionId`),
  KEY `staking_earning_records_type_idx` (`type`),
  KEY `staking_earning_records_claimed_idx` (`isClaimed`),
  KEY `staking_earning_records_position_claimed_idx` (`positionId`,`isClaimed`),
  KEY `staking_earning_records_claimed_at_idx` (`claimedAt`),
  KEY `staking_earning_records_observation_idx` (`observationId`),
  KEY `staking_earning_records_period_idx2` (`periodBucket`,`positionId`) USING BTREE,
  CONSTRAINT `staking_earning_records_ibfk_1` FOREIGN KEY (`positionId`) REFERENCES `staking_positions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `staking_earning_records_ibfk_2` FOREIGN KEY (`observationId`) REFERENCES `staking_observations` (`id`) ON UPDATE CASCADE
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
  `totalStaked` double NOT NULL,
  `profit` double NOT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `staking_external_pool_performances_pool_idx` (`poolId`),
  KEY `staking_external_pool_performances_date_idx` (`date`),
  CONSTRAINT `staking_external_pool_performances_ibfk_1` FOREIGN KEY (`poolId`) REFERENCES `staking_pools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_incidents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_incidents` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `chain` varchar(50) DEFAULT NULL,
  `kind` enum('SLASHING','DRIFT','LOW_GAS','VALIDATOR_BREACH','BATCH_STUCK','OBSERVER_LAG','UNBONDING_OVERDUE','DELEGATION_STALE','COMMISSION','OTHER') NOT NULL,
  `severity` enum('INFO','WARNING','CRITICAL') NOT NULL DEFAULT 'WARNING',
  `status` enum('OPEN','ACKNOWLEDGED','RESOLVED') NOT NULL DEFAULT 'OPEN',
  `title` varchar(191) NOT NULL,
  `detail` longtext DEFAULT NULL,
  `lossAmount` decimal(36,18) DEFAULT NULL,
  `reimbursedAmount` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `dedupeKey` varchar(191) NOT NULL,
  `occurrences` int(11) NOT NULL DEFAULT 1,
  `firstSeenAt` datetime NOT NULL,
  `lastSeenAt` datetime NOT NULL,
  `acknowledgedBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `acknowledgedAt` datetime DEFAULT NULL,
  `resolvedBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `resolvedAt` datetime DEFAULT NULL,
  `resolution` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `staking_incidents_status_severity_idx` (`status`,`severity`),
  KEY `staking_incidents_dedupe_idx` (`dedupeKey`,`status`),
  KEY `staking_incidents_pool_idx` (`poolId`),
  CONSTRAINT `staking_incidents_ibfk_1` FOREIGN KEY (`poolId`) REFERENCES `staking_pools` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_observations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_observations` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chain` varchar(50) NOT NULL,
  `window` varchar(64) NOT NULL,
  `epoch` int(11) DEFAULT NULL,
  `observedAt` datetime NOT NULL,
  `valueBefore` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `valueAfter` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `grossReward` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `commissionAmount` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `commissionShares` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `netReward` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `sharePriceBefore` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `sharePriceAfter` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `totalShares` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `positionsCredited` int(11) NOT NULL DEFAULT 0,
  `detail` longtext DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `staking_observations_pool_window_key` (`poolId`,`window`),
  KEY `staking_observations_observed_at_idx` (`observedAt`),
  CONSTRAINT `staking_observations_ibfk_1` FOREIGN KEY (`poolId`) REFERENCES `staking_pools` (`id`) ON UPDATE CASCADE
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
  `walletType` enum('FIAT','SPOT','ECO') NOT NULL DEFAULT 'SPOT',
  `walletChain` varchar(191) DEFAULT NULL,
  `mode` enum('SYNTHETIC','REAL') NOT NULL DEFAULT 'SYNTHETIC',
  `apr` decimal(10,8) DEFAULT NULL,
  `lockPeriod` int(11) DEFAULT NULL,
  `minStake` decimal(36,18) NOT NULL,
  `maxStake` decimal(36,18) DEFAULT NULL,
  `availableToStake` decimal(36,18) DEFAULT 0.000000000000000000,
  `earlyWithdrawalFee` decimal(10,8) DEFAULT 0.00000000,
  `adminFeePercentage` decimal(10,8) NOT NULL DEFAULT 0.00000000,
  `status` enum('ACTIVE','INACTIVE','COMING_SOON') NOT NULL DEFAULT 'INACTIVE',
  `isPromoted` tinyint(1) NOT NULL DEFAULT 0,
  `order` int(11) NOT NULL DEFAULT 0,
  `earningFrequency` enum('DAILY','WEEKLY','MONTHLY','END_OF_TERM') DEFAULT 'DAILY',
  `autoCompound` tinyint(1) DEFAULT 0,
  `externalPoolUrl` varchar(191) DEFAULT NULL,
  `profitSource` text DEFAULT NULL,
  `fundAllocation` text DEFAULT NULL,
  `risks` text NOT NULL,
  `rewards` text NOT NULL,
  `venue` enum('SOLANA_NATIVE','LIDO_STETH') DEFAULT NULL,
  `activationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `stakingWalletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `validatorSetId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `totalShares` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `sharePrice` decimal(36,18) NOT NULL DEFAULT 1.000000000000000000,
  `onchainValue` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `unallocatedValue` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `treasuryShares` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `lastObservedAt` datetime DEFAULT NULL,
  `lastObservedEpoch` int(11) DEFAULT NULL,
  `trailingRewardRateBps` int(11) DEFAULT NULL,
  `activationDelaySeconds` int(11) DEFAULT NULL,
  `unbondingEstimateSeconds` int(11) DEFAULT NULL,
  `unbondingBoundSeconds` int(11) DEFAULT NULL,
  `disclosureVersion` varchar(64) DEFAULT NULL,
  `commissionEffectiveAt` datetime DEFAULT NULL,
  `pendingAdminFeePercentage` decimal(10,8) DEFAULT NULL,
  `slashingPolicy` enum('PASS_THROUGH','REIMBURSE_CAPPED') DEFAULT NULL,
  `slashingReimburseCap` decimal(36,18) DEFAULT NULL,
  `liquidExitEnabled` tinyint(1) NOT NULL DEFAULT 0,
  `liquidExitMaxSlippageBps` int(11) NOT NULL DEFAULT 100,
  `intakeStatus` enum('OPEN','PAUSED') NOT NULL DEFAULT 'OPEN',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stakingWalletId` (`stakingWalletId`),
  KEY `validatorSetId` (`validatorSetId`),
  KEY `staking_pools_token_idx` (`token`),
  KEY `staking_pools_status_idx` (`status`),
  KEY `staking_pools_order_idx` (`order`),
  KEY `staking_pools_mode_idx` (`mode`),
  KEY `staking_pools_intake_idx` (`intakeStatus`),
  KEY `staking_pools_activation_idx` (`activationId`),
  CONSTRAINT `staking_pools_ibfk_1` FOREIGN KEY (`activationId`) REFERENCES `staking_chain_activations` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `staking_pools_ibfk_2` FOREIGN KEY (`stakingWalletId`) REFERENCES `staking_chain_wallets` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `staking_pools_ibfk_3` FOREIGN KEY (`validatorSetId`) REFERENCES `staking_validator_sets` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_positions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_positions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `durationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` decimal(36,18) NOT NULL,
  `startDate` datetime NOT NULL,
  `endDate` datetime DEFAULT NULL,
  `mode` enum('SYNTHETIC','REAL') NOT NULL DEFAULT 'SYNTHETIC',
  `status` enum('ACTIVE','COMPLETED','CANCELLED','PENDING_WITHDRAWAL','PENDING_DELEGATION','UNSTAKE_REQUESTED','UNBONDING','WITHDRAWABLE','FAILED') NOT NULL DEFAULT 'ACTIVE',
  `withdrawalRequested` tinyint(1) NOT NULL DEFAULT 0,
  `withdrawalRequestDate` datetime DEFAULT NULL,
  `adminNotes` text DEFAULT NULL,
  `completedAt` datetime DEFAULT NULL,
  `apr` decimal(16,8) DEFAULT NULL,
  `adminFeePercentage` decimal(16,8) DEFAULT NULL,
  `earlyWithdrawalFee` decimal(16,8) DEFAULT NULL,
  `earningFrequency` enum('DAILY','WEEKLY','MONTHLY','END_OF_TERM') DEFAULT NULL,
  `autoCompound` tinyint(1) DEFAULT NULL,
  `lockPeriod` int(11) DEFAULT NULL,
  `lastDistributionDate` datetime DEFAULT NULL,
  `consentId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `shares` decimal(36,18) DEFAULT NULL,
  `entrySharePrice` decimal(36,18) DEFAULT NULL,
  `principalOnchain` decimal(36,18) DEFAULT NULL,
  `gatherTxHash` varchar(191) DEFAULT NULL,
  `returnTxHash` varchar(191) DEFAULT NULL,
  `gatherNetworkFee` decimal(36,18) DEFAULT NULL,
  `returnNetworkFee` decimal(36,18) DEFAULT NULL,
  `unstakeRequestedAt` datetime DEFAULT NULL,
  `unstakeShares` decimal(36,18) DEFAULT NULL,
  `unstakeSharePrice` decimal(36,18) DEFAULT NULL,
  `unbondingEndsAt` datetime DEFAULT NULL,
  `unbondingBoundAt` datetime DEFAULT NULL,
  `settledAmount` decimal(36,18) DEFAULT NULL,
  `settledAt` datetime DEFAULT NULL,
  `failureReason` text DEFAULT NULL,
  `forceUnstakedBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `forceUnstakeReason` text DEFAULT NULL,
  `gatherBatchId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `exitBatchId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `returnBatchId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `consentId` (`consentId`),
  KEY `staking_positions_user_idx` (`userId`),
  KEY `staking_positions_pool_idx` (`poolId`),
  KEY `staking_positions_status_idx` (`status`),
  KEY `staking_positions_withdrawal_idx` (`withdrawalRequested`),
  KEY `staking_positions_user_status_idx` (`userId`,`status`),
  KEY `staking_positions_end_date_idx` (`endDate`),
  KEY `staking_positions_created_idx` (`createdAt`),
  KEY `staking_positions_accrual_idx` (`status`,`lastDistributionDate`),
  KEY `staking_positions_duration_idx` (`durationId`),
  KEY `staking_positions_mode_status_idx` (`mode`,`status`),
  KEY `staking_positions_unbonding_idx` (`status`,`unbondingEndsAt`),
  KEY `staking_positions_unstake_requested_idx` (`poolId`,`unstakeRequestedAt`),
  CONSTRAINT `staking_positions_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `staking_positions_ibfk_2` FOREIGN KEY (`poolId`) REFERENCES `staking_pools` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `staking_positions_ibfk_3` FOREIGN KEY (`durationId`) REFERENCES `staking_durations` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `staking_positions_ibfk_4` FOREIGN KEY (`consentId`) REFERENCES `staking_consents` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_statements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_statements` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `period` varchar(32) NOT NULL,
  `periodStart` datetime NOT NULL,
  `periodEnd` datetime NOT NULL,
  `format` enum('CSV') NOT NULL DEFAULT 'CSV',
  `content` longtext NOT NULL,
  `hash` varchar(128) NOT NULL,
  `totalStaked` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `totalRewards` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `totalCommission` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `summary` longtext DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `staking_statements_user_period_key` (`userId`,`period`),
  CONSTRAINT `staking_statements_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_tranches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_tranches` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `poolId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chain` varchar(50) NOT NULL,
  `network` varchar(32) NOT NULL,
  `kind` enum('SOLANA_STAKE_ACCOUNT','LIDO_SHARES') NOT NULL,
  `stakeAccount` varchar(64) DEFAULT NULL,
  `seed` varchar(64) DEFAULT NULL,
  `validatorId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `status` enum('CREATING','ACTIVATING','ACTIVE','DEACTIVATING','INACTIVE','WITHDRAWN','FAILED') NOT NULL DEFAULT 'CREATING',
  `amount` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `observedValue` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000,
  `activationEpoch` int(11) DEFAULT NULL,
  `deactivationEpoch` int(11) DEFAULT NULL,
  `lastObservedEpoch` int(11) DEFAULT NULL,
  `lastObservedAt` datetime DEFAULT NULL,
  `createBatchId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `exitBatchId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `withdrawBatchId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `failureReason` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `staking_tranches_pool_status_idx` (`poolId`,`status`),
  KEY `staking_tranches_stake_account_idx` (`stakeAccount`),
  KEY `staking_tranches_validator_idx` (`validatorId`),
  CONSTRAINT `staking_tranches_ibfk_1` FOREIGN KEY (`poolId`) REFERENCES `staking_pools` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `staking_tranches_ibfk_2` FOREIGN KEY (`validatorId`) REFERENCES `staking_validators` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_validator_sets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_validator_sets` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chain` varchar(50) NOT NULL,
  `network` varchar(32) NOT NULL,
  `name` varchar(191) NOT NULL,
  `status` enum('ACTIVE','RETIRED') NOT NULL DEFAULT 'ACTIVE',
  `policy` text DEFAULT NULL,
  `lastEvaluatedAt` datetime DEFAULT NULL,
  `lastEvaluation` longtext DEFAULT NULL,
  `healthy` tinyint(1) NOT NULL DEFAULT 0,
  `createdBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `staking_validator_sets_chain_network_idx` (`chain`,`network`),
  KEY `staking_validator_sets_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staking_validators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staking_validators` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `validatorSetId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chain` varchar(50) NOT NULL,
  `voteAccount` varchar(64) NOT NULL,
  `identity` varchar(64) DEFAULT NULL,
  `name` varchar(191) DEFAULT NULL,
  `weight` int(11) NOT NULL DEFAULT 1,
  `commissionPercent` decimal(10,8) DEFAULT NULL,
  `mevCommissionPercent` decimal(10,8) DEFAULT NULL,
  `asn` varchar(32) DEFAULT NULL,
  `status` enum('ACTIVE','SUSPENDED','REMOVED') NOT NULL DEFAULT 'ACTIVE',
  `lastHealth` text DEFAULT NULL,
  `lastHealthAt` datetime DEFAULT NULL,
  `breach` varchar(191) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `staking_validators_set_vote_key` (`validatorSetId`,`voteAccount`),
  KEY `staking_validators_status_idx` (`status`),
  CONSTRAINT `staking_validators_ibfk_1` FOREIGN KEY (`validatorSetId`) REFERENCES `staking_validator_sets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `support_ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `support_ticket` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user who created this support ticket',
  `agentId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'ID of the support agent assigned to this ticket',
  `agentName` varchar(191) DEFAULT NULL COMMENT 'Agent display name for faster lookup',
  `subject` varchar(191) NOT NULL COMMENT 'Subject/title of the support ticket',
  `importance` enum('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'LOW' COMMENT 'Priority level of the support ticket',
  `messages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of chat messages between user and support agent' CHECK (json_valid(`messages`)),
  `status` enum('PENDING','OPEN','REPLIED','CLOSED') NOT NULL DEFAULT 'PENDING' COMMENT 'Current status of the support ticket',
  `type` enum('LIVE','TICKET') NOT NULL DEFAULT 'TICKET' COMMENT 'Type of support - live chat or ticket system',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Tags for search/filter (string array)' CHECK (json_valid(`tags`)),
  `responseTime` int(11) DEFAULT NULL COMMENT 'Minutes from creation to first agent reply',
  `satisfaction` float DEFAULT NULL COMMENT 'Rating 1-5 from user',
  `lastMessageAt` datetime(3) DEFAULT NULL COMMENT 'Time of the last non-system message. Derived from messages; the queue''s sort key',
  `lastMessageFrom` varchar(8) DEFAULT NULL COMMENT 'Sender of the last non-system message: client or agent. Null when the thread has none',
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `agentId` (`agentId`),
  KEY `supportTicketUserIdForeign` (`userId`) USING BTREE,
  KEY `tags_idx` (`tags`(255)) USING BTREE,
  KEY `support_ticket_queue_idx` (`status`,`lastMessageAt`) USING BTREE,
  CONSTRAINT `support_ticket_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `support_ticket_ibfk_2` FOREIGN KEY (`agentId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tag` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Unique identifier for the blog tag',
  `name` varchar(255) NOT NULL COMMENT 'Display name of the tag',
  `slug` varchar(255) NOT NULL COMMENT 'URL-friendly slug for the tag (used in URLs)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tagSlugKey` (`slug`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `trading_bot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trading_bot` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `symbol` varchar(20) NOT NULL,
  `type` enum('DCA','GRID','INDICATOR','TRAILING_STOP','CUSTOM') NOT NULL DEFAULT 'DCA',
  `mode` enum('LIVE','PAPER') NOT NULL DEFAULT 'LIVE',
  `status` enum('DRAFT','RUNNING','PAUSED','STOPPED','ERROR','LIMIT_REACHED') NOT NULL DEFAULT 'DRAFT',
  `strategyConfig` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`strategyConfig`)),
  `maxPositionSize` decimal(18,8) NOT NULL DEFAULT 100.00000000,
  `maxConcurrentTrades` int(11) NOT NULL DEFAULT 5,
  `dailyLossLimit` decimal(18,8) DEFAULT NULL,
  `dailyLossLimitPercent` decimal(5,2) DEFAULT NULL,
  `maxDrawdownPercent` decimal(5,2) DEFAULT NULL,
  `cooldownSeconds` int(11) NOT NULL DEFAULT 60,
  `stopLossPercent` decimal(5,2) DEFAULT NULL,
  `takeProfitPercent` decimal(5,2) DEFAULT NULL,
  `allocatedAmount` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `usedAmount` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `totalTrades` int(11) NOT NULL DEFAULT 0,
  `winningTrades` int(11) NOT NULL DEFAULT 0,
  `losingTrades` int(11) NOT NULL DEFAULT 0,
  `totalProfit` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `totalVolume` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `totalFees` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `dailyTrades` int(11) NOT NULL DEFAULT 0,
  `dailyProfit` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `dailyVolume` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `dailyResetAt` datetime DEFAULT NULL,
  `peakEquity` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `currentDrawdown` decimal(5,2) NOT NULL DEFAULT 0.00,
  `purchaseId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `lastTickAt` datetime DEFAULT NULL,
  `lastTradeAt` datetime DEFAULT NULL,
  `lastErrorAt` datetime DEFAULT NULL,
  `lastError` text DEFAULT NULL,
  `errorCount` int(11) NOT NULL DEFAULT 0,
  `startedAt` datetime DEFAULT NULL,
  `stoppedAt` datetime DEFAULT NULL,
  `pausedAt` datetime DEFAULT NULL,
  `flattenRequestedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchaseId` (`purchaseId`),
  KEY `tradingBotUserIdIdx` (`userId`) USING BTREE,
  KEY `tradingBotStatusIdx` (`status`) USING BTREE,
  KEY `tradingBotTypeIdx` (`type`) USING BTREE,
  KEY `tradingBotModeIdx` (`mode`) USING BTREE,
  KEY `tradingBotSymbolIdx` (`symbol`) USING BTREE,
  KEY `tradingBotUserStatusIdx` (`userId`,`status`) USING BTREE,
  KEY `tradingBotModeFlattenRequestedAtIdx` (`mode`,`flattenRequestedAt`) USING BTREE,
  CONSTRAINT `trading_bot_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `trading_bot_ibfk_2` FOREIGN KEY (`purchaseId`) REFERENCES `trading_bot_purchase` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `trading_bot_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trading_bot_audit_log` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `entityType` enum('BOT','TRADE','ORDER','STRATEGY','PURCHASE') NOT NULL,
  `entityId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `botId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `action` enum('BOT_CREATED','BOT_UPDATED','BOT_STARTED','BOT_STOPPED','BOT_PAUSED','BOT_RESUMED','BOT_DELETED','BOT_ERROR','TRADE_OPENED','TRADE_CLOSED','TRADE_FAILED','ORDER_PLACED','ORDER_CANCELLED','ORDER_FILLED','DAILY_LIMIT_REACHED','DRAWDOWN_LIMIT_REACHED','STOP_LOSS_TRIGGERED','TAKE_PROFIT_TRIGGERED','KILL_SWITCH_ACTIVATED','FUNDS_ALLOCATED','FUNDS_DEALLOCATED','STRATEGY_PURCHASED','STRATEGY_SUBMITTED','STRATEGY_APPROVED','STRATEGY_REJECTED','ADMIN_FORCE_STOP','ADMIN_CONFIG_CHANGE') NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `adminId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `isSystem` tinyint(1) NOT NULL DEFAULT 0,
  `oldValue` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`oldValue`)),
  `newValue` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`newValue`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `reason` text DEFAULT NULL,
  `ipAddress` varchar(45) DEFAULT NULL,
  `userAgent` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `adminId` (`adminId`),
  KEY `tradingBotAuditLogEntityIdx` (`entityType`,`entityId`) USING BTREE,
  KEY `tradingBotAuditLogBotIdIdx` (`botId`) USING BTREE,
  KEY `tradingBotAuditLogUserIdIdx` (`userId`) USING BTREE,
  KEY `tradingBotAuditLogActionIdx` (`action`) USING BTREE,
  KEY `tradingBotAuditLogCreatedAtIdx` (`createdAt`) USING BTREE,
  CONSTRAINT `trading_bot_audit_log_ibfk_1` FOREIGN KEY (`botId`) REFERENCES `trading_bot` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `trading_bot_audit_log_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `trading_bot_audit_log_ibfk_3` FOREIGN KEY (`adminId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `trading_bot_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trading_bot_order` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `botId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tradeId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `ecosystemOrderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `symbol` varchar(20) NOT NULL,
  `side` enum('BUY','SELL') NOT NULL,
  `type` enum('MARKET','LIMIT','STOP_LIMIT') NOT NULL,
  `status` enum('PENDING','OPEN','PARTIAL','FILLED','CANCELLED','EXPIRED','FAILED') NOT NULL DEFAULT 'PENDING',
  `amount` decimal(18,8) NOT NULL,
  `price` decimal(18,8) NOT NULL,
  `stopPrice` decimal(18,8) DEFAULT NULL,
  `filledAmount` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `remainingAmount` decimal(18,8) NOT NULL,
  `purpose` enum('ENTRY','EXIT','STOP_LOSS','TAKE_PROFIT','GRID_BUY','GRID_SELL','DCA') NOT NULL,
  `gridLevel` int(11) DEFAULT NULL,
  `isPaper` tinyint(1) NOT NULL DEFAULT 0,
  `expiresAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tradeId` (`tradeId`),
  KEY `tradingBotOrderBotIdIdx` (`botId`) USING BTREE,
  KEY `tradingBotOrderBotStatusIdx` (`botId`,`status`) USING BTREE,
  KEY `tradingBotOrderUserIdIdx` (`userId`) USING BTREE,
  KEY `tradingBotOrderStatusIdx` (`status`) USING BTREE,
  KEY `tradingBotOrderSymbolStatusIdx` (`symbol`,`status`) USING BTREE,
  KEY `tradingBotOrderExpiresAtIdx` (`expiresAt`) USING BTREE,
  CONSTRAINT `trading_bot_order_ibfk_1` FOREIGN KEY (`botId`) REFERENCES `trading_bot` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `trading_bot_order_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `trading_bot_order_ibfk_3` FOREIGN KEY (`tradeId`) REFERENCES `trading_bot_trade` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `trading_bot_paper_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trading_bot_paper_account` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'USDT',
  `balance` decimal(18,8) NOT NULL,
  `initialBalance` decimal(18,8) NOT NULL,
  `totalTrades` int(11) NOT NULL DEFAULT 0,
  `winningTrades` int(11) NOT NULL DEFAULT 0,
  `losingTrades` int(11) NOT NULL DEFAULT 0,
  `totalProfit` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `totalVolume` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `highWaterMark` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `maxDrawdown` decimal(5,2) NOT NULL DEFAULT 0.00,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `lastResetAt` datetime DEFAULT NULL,
  `resetCount` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tradingBotPaperAccountUserCurrencyIdx` (`userId`,`currency`) USING BTREE,
  KEY `tradingBotPaperAccountUserIdIdx` (`userId`) USING BTREE,
  CONSTRAINT `trading_bot_paper_account_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `trading_bot_purchase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trading_bot_purchase` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `buyerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `strategyId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sellerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` enum('PENDING','COMPLETED','REFUNDED','FAILED') NOT NULL DEFAULT 'PENDING',
  `price` decimal(10,2) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'USDT',
  `platformFee` decimal(10,2) NOT NULL,
  `platformFeePercent` decimal(5,2) NOT NULL,
  `sellerAmount` decimal(10,2) NOT NULL,
  `transactionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `walletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `strategySnapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`strategySnapshot`)),
  `strategyVersion` varchar(20) NOT NULL,
  `timesUsed` int(11) NOT NULL DEFAULT 0,
  `lastUsedAt` datetime DEFAULT NULL,
  `rating` int(11) DEFAULT NULL,
  `review` text DEFAULT NULL,
  `reviewedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tradingBotPurchaseBuyerStrategyIdx` (`buyerId`,`strategyId`) USING BTREE,
  KEY `tradingBotPurchaseBuyerIdIdx` (`buyerId`) USING BTREE,
  KEY `tradingBotPurchaseStrategyIdIdx` (`strategyId`) USING BTREE,
  KEY `tradingBotPurchaseSellerIdIdx` (`sellerId`) USING BTREE,
  KEY `tradingBotPurchaseStatusIdx` (`status`) USING BTREE,
  CONSTRAINT `trading_bot_purchase_ibfk_1` FOREIGN KEY (`buyerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `trading_bot_purchase_ibfk_2` FOREIGN KEY (`strategyId`) REFERENCES `trading_bot_strategy` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `trading_bot_purchase_ibfk_3` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `trading_bot_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trading_bot_stats` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `botId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `date` date NOT NULL,
  `trades` int(11) NOT NULL DEFAULT 0,
  `winningTrades` int(11) NOT NULL DEFAULT 0,
  `losingTrades` int(11) NOT NULL DEFAULT 0,
  `profit` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `volume` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `fees` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `startEquity` decimal(18,8) DEFAULT NULL,
  `endEquity` decimal(18,8) DEFAULT NULL,
  `highEquity` decimal(18,8) DEFAULT NULL,
  `lowEquity` decimal(18,8) DEFAULT NULL,
  `isPaper` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tradingBotStatsBotDateIdx` (`botId`,`date`) USING BTREE,
  KEY `tradingBotStatsBotIdIdx` (`botId`) USING BTREE,
  KEY `tradingBotStatsUserIdIdx` (`userId`) USING BTREE,
  KEY `tradingBotStatsDateIdx` (`date`) USING BTREE,
  CONSTRAINT `trading_bot_stats_ibfk_1` FOREIGN KEY (`botId`) REFERENCES `trading_bot` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `trading_bot_stats_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `trading_bot_strategy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trading_bot_strategy` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `creatorId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `shortDescription` varchar(255) DEFAULT NULL,
  `icon` varchar(255) DEFAULT NULL,
  `coverImage` varchar(255) DEFAULT NULL,
  `type` enum('DCA','GRID','INDICATOR','TRAILING_STOP','CUSTOM') NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`tags`)),
  `defaultConfig` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`defaultConfig`)),
  `customNodes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`customNodes`)),
  `recommendedSymbols` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`recommendedSymbols`)),
  `recommendedTimeframe` varchar(10) DEFAULT NULL,
  `minAllocation` decimal(18,8) DEFAULT 100.00000000,
  `riskLevel` enum('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
  `status` enum('DRAFT','PENDING_REVIEW','APPROVED','REJECTED','SUSPENDED') NOT NULL DEFAULT 'DRAFT',
  `visibility` enum('PRIVATE','PUBLIC') NOT NULL DEFAULT 'PRIVATE',
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(20) NOT NULL DEFAULT 'USDT',
  `isFeatured` tinyint(1) NOT NULL DEFAULT 0,
  `featuredOrder` int(11) DEFAULT NULL,
  `totalPurchases` int(11) NOT NULL DEFAULT 0,
  `totalUsers` int(11) NOT NULL DEFAULT 0,
  `avgRating` decimal(3,2) DEFAULT NULL,
  `totalRatings` int(11) NOT NULL DEFAULT 0,
  `totalRevenue` decimal(18,2) NOT NULL DEFAULT 0.00,
  `creatorRevenue` decimal(18,2) NOT NULL DEFAULT 0.00,
  `platformRevenue` decimal(18,2) NOT NULL DEFAULT 0.00,
  `reviewedAt` datetime DEFAULT NULL,
  `reviewedBy` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `rejectionReason` text DEFAULT NULL,
  `version` varchar(20) NOT NULL DEFAULT '1.0.0',
  `changelog` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tradingBotStrategySlugIdx` (`slug`) USING BTREE,
  KEY `tradingBotStrategyCreatorIdIdx` (`creatorId`) USING BTREE,
  KEY `tradingBotStrategyStatusIdx` (`status`) USING BTREE,
  KEY `tradingBotStrategyVisibilityIdx` (`visibility`) USING BTREE,
  KEY `tradingBotStrategyTypeIdx` (`type`) USING BTREE,
  KEY `tradingBotStrategyFeaturedIdx` (`isFeatured`) USING BTREE,
  CONSTRAINT `trading_bot_strategy_ibfk_1` FOREIGN KEY (`creatorId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `trading_bot_strategy_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trading_bot_strategy_review` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `strategyId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `rating` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` text NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `adminNote` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tradingBotStrategyReviewUserStrategyIdx` (`userId`,`strategyId`) USING BTREE,
  KEY `tradingBotStrategyReviewStrategyStatusIdx` (`strategyId`,`status`) USING BTREE,
  CONSTRAINT `trading_bot_strategy_review_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `trading_bot_strategy_review_ibfk_2` FOREIGN KEY (`strategyId`) REFERENCES `trading_bot_strategy` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `trading_bot_trade`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trading_bot_trade` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `botId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ecosystemOrderId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `symbol` varchar(20) NOT NULL,
  `side` enum('BUY','SELL') NOT NULL,
  `type` enum('MARKET','LIMIT') NOT NULL DEFAULT 'MARKET',
  `status` enum('PENDING','OPEN','CLOSED','CANCELLED','FAILED') NOT NULL DEFAULT 'PENDING',
  `amount` decimal(18,8) NOT NULL,
  `price` decimal(18,8) NOT NULL,
  `cost` decimal(18,8) NOT NULL,
  `fee` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `feeCurrency` varchar(10) DEFAULT NULL,
  `executedAmount` decimal(18,8) DEFAULT NULL,
  `executedPrice` decimal(18,8) DEFAULT NULL,
  `executedCost` decimal(18,8) DEFAULT NULL,
  `entryPrice` decimal(18,8) DEFAULT NULL,
  `exitPrice` decimal(18,8) DEFAULT NULL,
  `profit` decimal(18,8) DEFAULT NULL,
  `profitPercent` decimal(8,4) DEFAULT NULL,
  `stopLossPrice` decimal(18,8) DEFAULT NULL,
  `takeProfitPrice` decimal(18,8) DEFAULT NULL,
  `stopLossTriggered` tinyint(1) NOT NULL DEFAULT 0,
  `takeProfitTriggered` tinyint(1) NOT NULL DEFAULT 0,
  `strategySignal` varchar(50) DEFAULT NULL,
  `strategyContext` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`strategyContext`)),
  `isPaper` tinyint(1) NOT NULL DEFAULT 0,
  `openedAt` datetime DEFAULT NULL,
  `closedAt` datetime DEFAULT NULL,
  `errorMessage` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tradingBotTradeBotIdIdx` (`botId`) USING BTREE,
  KEY `tradingBotTradeUserIdIdx` (`userId`) USING BTREE,
  KEY `tradingBotTradeStatusIdx` (`status`) USING BTREE,
  KEY `tradingBotTradeSymbolIdx` (`symbol`) USING BTREE,
  KEY `tradingBotTradeIsPaperIdx` (`isPaper`) USING BTREE,
  KEY `tradingBotTradeBotStatusIdx` (`botId`,`status`) USING BTREE,
  KEY `tradingBotTradeUserPaperIdx` (`userId`,`isPaper`) USING BTREE,
  KEY `tradingBotTradeCreatedAtIdx` (`createdAt`) USING BTREE,
  CONSTRAINT `trading_bot_trade_ibfk_1` FOREIGN KEY (`botId`) REFERENCES `trading_bot` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `trading_bot_trade_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `transaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transaction` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user associated with this transaction',
  `walletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the wallet involved in this transaction',
  `type` enum('FAILED','DEPOSIT','WITHDRAW','OUTGOING_TRANSFER','INCOMING_TRANSFER','PAYMENT','REFUND','BINARY_ORDER','EXCHANGE_ORDER','FUTURES_ORDER','INVESTMENT','INVESTMENT_ROI','AI_INVESTMENT','AI_INVESTMENT_ROI','INVOICE','FOREX_DEPOSIT','FOREX_WITHDRAW','FX_TRADING_DEPOSIT','FX_TRADING_WITHDRAW','FOREX_INVESTMENT','FOREX_INVESTMENT_ROI','ICO_CONTRIBUTION','REFERRAL_REWARD','STAKING','STAKING_REWARD','P2P_OFFER_TRANSFER','P2P_TRADE','NFT_PURCHASE','NFT_SALE','NFT_MINT','NFT_BURN','NFT_TRANSFER','NFT_AUCTION_BID','NFT_AUCTION_SETTLE','NFT_OFFER','ECOMMERCE_PURCHASE','TRADING_FEE','PLATFORM_FEE','PLATFORM_LOSS','ORDER_PASSTHROUGH','GATEWAY_PAYMENT','MARKETPLACE_PURCHASE','MARKETPLACE_SALE','ADJUSTMENT_ANCHOR') NOT NULL COMMENT 'Type of transaction (deposit, withdrawal, transfer, trading, NFT, etc.)',
  `status` enum('PENDING','COMPLETED','FAILED','CANCELLED','EXPIRED','REJECTED','REFUNDED','FROZEN','PROCESSING','TIMEOUT') NOT NULL DEFAULT 'PENDING' COMMENT 'Current status of the transaction',
  `amount` decimal(36,18) NOT NULL COMMENT 'Transaction amount in the wallet''s currency',
  `fee` decimal(36,18) DEFAULT 0.000000000000000000 COMMENT 'Fee charged for this transaction',
  `description` text DEFAULT NULL COMMENT 'Human-readable description of the transaction',
  `metadata` text DEFAULT NULL COMMENT 'Additional transaction data in JSON format',
  `referenceId` varchar(191) DEFAULT NULL COMMENT 'External reference ID from payment processor or exchange',
  `trxId` varchar(191) DEFAULT NULL COMMENT 'Blockchain transaction hash or ID',
  `idempotencyKey` varchar(191) DEFAULT NULL COMMENT 'Idempotency key for deduplication; nullable to allow non-idempotent operations',
  `txHashPending` varchar(191) DEFAULT NULL COMMENT 'Pre-broadcast / in-flight on-chain hash persisted before confirmation for crash recovery',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transactionReferenceIdKey` (`referenceId`) USING BTREE,
  UNIQUE KEY `transaction_idempotency_key` (`idempotencyKey`) USING BTREE,
  KEY `transactionWalletIdForeign` (`walletId`) USING BTREE,
  KEY `transactionUserIdFkey` (`userId`) USING BTREE,
  KEY `idx_txn_processing` (`type`,`status`,`createdAt`) USING BTREE,
  KEY `idx_status_trxid_recovery` (`status`,`trxId`,`createdAt`) USING BTREE,
  KEY `idx_transaction_deletedAt_createdAt` (`deletedAt`,`createdAt`) USING BTREE,
  KEY `idx_txn_user_created` (`userId`,`deletedAt`,`createdAt`) USING BTREE,
  CONSTRAINT `transaction_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `transaction_ibfk_2` FOREIGN KEY (`walletId`) REFERENCES `wallet` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `transaction_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transaction_archive` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user associated with this transaction',
  `walletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the wallet involved in this transaction',
  `type` enum('FAILED','DEPOSIT','WITHDRAW','OUTGOING_TRANSFER','INCOMING_TRANSFER','PAYMENT','REFUND','BINARY_ORDER','EXCHANGE_ORDER','FUTURES_ORDER','INVESTMENT','INVESTMENT_ROI','AI_INVESTMENT','AI_INVESTMENT_ROI','INVOICE','FOREX_DEPOSIT','FOREX_WITHDRAW','FX_TRADING_DEPOSIT','FX_TRADING_WITHDRAW','FOREX_INVESTMENT','FOREX_INVESTMENT_ROI','ICO_CONTRIBUTION','REFERRAL_REWARD','STAKING','STAKING_REWARD','P2P_OFFER_TRANSFER','P2P_TRADE','NFT_PURCHASE','NFT_SALE','NFT_MINT','NFT_BURN','NFT_TRANSFER','NFT_AUCTION_BID','NFT_AUCTION_SETTLE','NFT_OFFER','ECOMMERCE_PURCHASE','TRADING_FEE','PLATFORM_FEE','PLATFORM_LOSS','ORDER_PASSTHROUGH','GATEWAY_PAYMENT','MARKETPLACE_PURCHASE','MARKETPLACE_SALE','ADJUSTMENT_ANCHOR') NOT NULL COMMENT 'Type of transaction (deposit, withdrawal, transfer, trading, NFT, etc.)',
  `status` enum('PENDING','COMPLETED','FAILED','CANCELLED','EXPIRED','REJECTED','REFUNDED','FROZEN','PROCESSING','TIMEOUT') NOT NULL DEFAULT 'PENDING' COMMENT 'Current status of the transaction',
  `amount` decimal(36,18) NOT NULL COMMENT 'Transaction amount in the wallet''s currency',
  `fee` decimal(36,18) DEFAULT 0.000000000000000000 COMMENT 'Fee charged for this transaction',
  `description` text DEFAULT NULL COMMENT 'Human-readable description of the transaction',
  `metadata` text DEFAULT NULL COMMENT 'Additional transaction data in JSON format',
  `referenceId` varchar(191) DEFAULT NULL COMMENT 'External reference ID from payment processor or exchange',
  `trxId` varchar(191) DEFAULT NULL COMMENT 'Blockchain transaction hash or ID',
  `idempotencyKey` varchar(191) DEFAULT NULL COMMENT 'Idempotency key for deduplication; nullable to allow non-idempotent operations',
  `txHashPending` varchar(191) DEFAULT NULL COMMENT 'Pre-broadcast / in-flight on-chain hash persisted before confirmation for crash recovery',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_transaction_archive_createdAt` (`createdAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `transfer_pin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transfer_pin` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `pinHash` varchar(255) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `failedAttempts` int(11) NOT NULL DEFAULT 0,
  `lockoutCount` int(11) NOT NULL DEFAULT 0,
  `lockedUntil` datetime DEFAULT NULL,
  `lastVerifiedAt` datetime DEFAULT NULL,
  `lastChangedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transferPinUserIdKey` (`userId`) USING BTREE,
  CONSTRAINT `transfer_pin_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `transfi_iban`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transfi_iban` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ibId` varchar(64) NOT NULL,
  `transfiUserId` varchar(64) NOT NULL,
  `currency` varchar(10) NOT NULL,
  `iban` varchar(64) NOT NULL,
  `bic` varchar(32) DEFAULT NULL,
  `accountNumber` varchar(64) DEFAULT NULL,
  `bankName` varchar(191) DEFAULT NULL,
  `bankAddress` varchar(500) DEFAULT NULL,
  `accountHolderName` varchar(191) DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'ACTIVE',
  `lastSyncedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transfiIbanIbIdKey` (`ibId`),
  UNIQUE KEY `transfiIbanIbanKey` (`iban`),
  UNIQUE KEY `transfiIbanUserCurrencyKey` (`userId`,`currency`),
  CONSTRAINT `transfi_iban_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `transfi_recipient`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transfi_recipient` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `transfiRecipientId` varchar(64) NOT NULL,
  `firstName` varchar(191) NOT NULL,
  `lastName` varchar(191) NOT NULL,
  `country` varchar(2) NOT NULL,
  `accountType` enum('bank_account','iban','e_wallet','mobile_wallet') NOT NULL,
  `accountValue` varchar(191) NOT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `label` varchar(191) DEFAULT NULL,
  `fingerprint` varchar(64) NOT NULL COMMENT 'sha256 of the identifying fields; unique per user',
  `lastUsedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transfiRecipientUserFingerprintKey` (`userId`,`fingerprint`),
  UNIQUE KEY `transfiRecipientIdKey` (`transfiRecipientId`),
  KEY `transfiRecipientUserIdIdx` (`userId`),
  CONSTRAINT `transfi_recipient_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `transfi_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transfi_user` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Platform user this TransFi identity belongs to',
  `transfiUserId` varchar(64) NOT NULL COMMENT 'TransFi identity id (UX-...)',
  `status` varchar(64) NOT NULL DEFAULT 'unknown' COMMENT 'TransFi top-level user status, verbatim',
  `basicKycStatus` varchar(64) DEFAULT NULL COMMENT 'TransFi basicKycStatus, verbatim',
  `standardKycStatus` varchar(64) DEFAULT NULL COMMENT 'TransFi standardKycStatus, verbatim',
  `advancedKycStatus` varchar(64) DEFAULT NULL COMMENT 'TransFi advancedKycStatus, verbatim',
  `email` varchar(255) DEFAULT NULL COMMENT 'Email registered with TransFi for this identity',
  `failureMessage` text DEFAULT NULL COMMENT 'TransFi rejection/failure reason, when supplied',
  `lastSyncedAt` datetime DEFAULT NULL COMMENT 'Last reconciliation against TransFi',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transfiUserUserIdKey` (`userId`),
  UNIQUE KEY `transfiUserTransfiUserIdKey` (`transfiUserId`),
  KEY `transfiUserStatusIdx` (`status`),
  CONSTRAINT `transfi_user_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `recoveryCodes` longtext DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `twoFactorUserIdKey` (`userId`) USING BTREE,
  KEY `twoFactorUserIdForeign` (`userId`) USING BTREE,
  CONSTRAINT `two_factor_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `email` varchar(255) DEFAULT NULL COMMENT 'User''s email address (unique identifier)',
  `password` varchar(255) DEFAULT NULL COMMENT 'Hashed password for authentication',
  `avatar` varchar(1000) DEFAULT NULL COMMENT 'URL path to user''s profile picture',
  `username` varchar(32) DEFAULT NULL COMMENT 'Public handle shown to other users in place of the real name. Unique, case-insensitive.',
  `firstName` varchar(255) DEFAULT NULL COMMENT 'User''s first name',
  `lastName` varchar(255) DEFAULT NULL COMMENT 'User''s last name',
  `emailVerified` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether the user''s email address has been verified',
  `phone` varchar(255) DEFAULT NULL COMMENT 'User''s phone number in E.164 format (e.g. +254711972926)',
  `phoneVerified` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether the user''s phone number has been verified',
  `roleId` int(11) DEFAULT NULL COMMENT 'ID of the role assigned to this user',
  `profile` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional user profile information in JSON format' CHECK (json_valid(`profile`)),
  `walletAddress` varchar(255) DEFAULT NULL COMMENT 'User''s self-custody on-chain wallet address (e.g. from WalletConnect/SIWE)',
  `walletProvider` varchar(255) DEFAULT NULL COMMENT 'Which wallet provider supplied walletAddress (e.g. metamask, walletconnect)',
  `lastLogin` datetime DEFAULT NULL COMMENT 'Timestamp of the user''s last successful login',
  `lastFailedLogin` datetime DEFAULT NULL COMMENT 'Timestamp of the user''s last failed login attempt',
  `failedLoginAttempts` int(11) DEFAULT 0 COMMENT 'Number of consecutive failed login attempts',
  `status` enum('ACTIVE','INACTIVE','SUSPENDED','BANNED') DEFAULT 'ACTIVE' COMMENT 'Current status of the user account',
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'User notification and preference settings' CHECK (json_valid(`settings`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`) USING BTREE,
  UNIQUE KEY `uq_user_username` (`username`) USING BTREE,
  KEY `UserRoleIdFkey` (`roleId`) USING BTREE,
  KEY `idx_user_deletedAt_createdAt` (`deletedAt`,`createdAt`) USING BTREE,
  CONSTRAINT `user_ibfk_1` FOREIGN KEY (`roleId`) REFERENCES `role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_activity` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` varchar(64) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `severity` enum('success','warning','info') NOT NULL DEFAULT 'info',
  `ip` varchar(64) DEFAULT NULL,
  `userAgent` varchar(512) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userActivityUserIdCreatedAtIdx` (`userId`,`createdAt`) USING BTREE,
  KEY `userActivityTypeIdx` (`type`) USING BTREE,
  CONSTRAINT `user_activity_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user who owns this wallet',
  `type` enum('FIAT','SPOT','ECO','FUTURES','COPY_TRADING') NOT NULL COMMENT 'Type of wallet (FIAT for fiat currencies, SPOT for spot trading, ECO for ecosystem, FUTURES for futures trading)',
  `currency` varchar(255) NOT NULL COMMENT 'Currency symbol for this wallet (e.g., BTC, USD, ETH)',
  `balance` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000 COMMENT 'Available balance in this wallet',
  `inOrder` decimal(36,18) DEFAULT 0.000000000000000000 COMMENT 'Amount currently locked in open orders',
  `address` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Blockchain addresses associated with this wallet' CHECK (json_valid(`address`)),
  `addressLookupKey` varchar(64) DEFAULT NULL COMMENT 'SHA256 hash of primary blockchain address for O(1) lookup',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this wallet is active and usable',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `walletUserIdCurrencyTypeKey` (`userId`,`currency`,`type`) USING BTREE,
  KEY `walletAddressLookupKey` (`addressLookupKey`) USING BTREE,
  KEY `idx_wallet_deletedAt_createdAt` (`deletedAt`,`createdAt`) USING BTREE,
  CONSTRAINT `wallet_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `wallet_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallet_audit_log` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'User ID performing the operation',
  `walletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Wallet ID affected by the operation',
  `operation` enum('WALLET_CREATED','CREDIT','DEBIT','HOLD','RELEASE','TRANSFER_OUT','TRANSFER_IN','EXECUTE_FROM_HOLD') NOT NULL COMMENT 'Type of wallet operation',
  `amount` decimal(30,18) NOT NULL COMMENT 'Amount involved in the operation',
  `previousBalance` decimal(30,18) DEFAULT NULL COMMENT 'Balance before the operation',
  `newBalance` decimal(30,18) DEFAULT NULL COMMENT 'Balance after the operation',
  `previousInOrder` decimal(30,18) DEFAULT NULL COMMENT 'In-order amount before the operation (for HOLD/RELEASE)',
  `newInOrder` decimal(30,18) DEFAULT NULL COMMENT 'In-order amount after the operation (for HOLD/RELEASE)',
  `transactionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Optional reference to a transaction record. Intentionally NOT a foreign key: this is an immutable, append-only audit log that must accept events with no transaction yet (e.g. WALLET_CREATED) and must never fail or cascade on a missing/deleted transaction.',
  `idempotencyKey` varchar(255) NOT NULL COMMENT 'Idempotency key for deduplication',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional operation metadata (operationType, fee, referenceId, etc.)' CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL COMMENT 'Timestamp of the audit entry',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_wallet_audit_log_idempotencyKey` (`idempotencyKey`) USING BTREE,
  KEY `idx_wallet_audit_log_userId_createdAt` (`userId`,`createdAt`) USING BTREE,
  KEY `idx_wallet_audit_log_walletId_createdAt` (`walletId`,`createdAt`) USING BTREE,
  KEY `idx_wallet_audit_log_transactionId` (`transactionId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `wallet_audit_log_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallet_audit_log_archive` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'User ID performing the operation',
  `walletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Wallet ID affected by the operation',
  `operation` enum('WALLET_CREATED','CREDIT','DEBIT','HOLD','RELEASE','TRANSFER_OUT','TRANSFER_IN','EXECUTE_FROM_HOLD') NOT NULL COMMENT 'Type of wallet operation',
  `amount` decimal(30,18) NOT NULL COMMENT 'Amount involved in the operation',
  `previousBalance` decimal(30,18) DEFAULT NULL COMMENT 'Balance before the operation',
  `newBalance` decimal(30,18) DEFAULT NULL COMMENT 'Balance after the operation',
  `previousInOrder` decimal(30,18) DEFAULT NULL COMMENT 'In-order amount before the operation (for HOLD/RELEASE)',
  `newInOrder` decimal(30,18) DEFAULT NULL COMMENT 'In-order amount after the operation (for HOLD/RELEASE)',
  `transactionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Optional reference to a transaction record. Intentionally NOT a foreign key: this is an immutable, append-only audit log that must accept events with no transaction yet (e.g. WALLET_CREATED) and must never fail or cascade on a missing/deleted transaction.',
  `idempotencyKey` varchar(255) NOT NULL COMMENT 'Idempotency key for deduplication',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional operation metadata (operationType, fee, referenceId, etc.)' CHECK (json_valid(`metadata`)),
  `createdAt` datetime NOT NULL COMMENT 'Timestamp of the audit entry',
  PRIMARY KEY (`id`),
  KEY `idx_wallet_audit_log_archive_createdAt` (`createdAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `wallet_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallet_data` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `walletId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the wallet this data belongs to',
  `currency` varchar(255) NOT NULL COMMENT 'Currency symbol for this wallet data',
  `chain` varchar(255) NOT NULL COMMENT 'Blockchain network name (e.g., ETH, BSC, TRX)',
  `balance` decimal(36,18) NOT NULL DEFAULT 0.000000000000000000 COMMENT 'Current balance for this currency on this chain',
  `index` int(11) DEFAULT NULL COMMENT 'Derivation index for HD wallet generation',
  `data` text NOT NULL COMMENT 'Encrypted wallet data (private keys, addresses, etc.)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `walletDataWalletIdCurrencyChainKey` (`walletId`,`currency`,`chain`) USING BTREE,
  CONSTRAINT `wallet_data_ibfk_1` FOREIGN KEY (`walletId`) REFERENCES `wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `wallet_pnl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallet_pnl` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID of the user whose P&L is tracked',
  `balances` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Profit and loss balances for different wallet types (FIAT, SPOT, ECO)' CHECK (json_valid(`balances`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `wallet_pnl_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `withdraw_gateway`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `withdraw_gateway` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(1000) DEFAULT NULL,
  `alias` varchar(191) NOT NULL COMMENT 'Stable identifier used to resolve the adapter',
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `version` varchar(191) DEFAULT '0.0.1',
  `currencies` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`currencies`)),
  `fixedFee` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`fixedFee`)),
  `percentageFee` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`percentageFee`)),
  `minAmount` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`minAmount`)),
  `maxAmount` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`maxAmount`)),
  `type` varchar(191) NOT NULL DEFAULT 'FIAT',
  `autoDispatch` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Dispatch on request instead of waiting for admin approval. Default OFF.',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `withdrawGatewayNameKey` (`name`),
  UNIQUE KEY `withdrawGatewayAliasKey` (`alias`),
  KEY `withdrawGatewayStatusIdx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `gatewayAlias` varchar(191) DEFAULT NULL COMMENT 'withdrawGateway.alias that executes this method; NULL = manual',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this withdrawal method is active and available',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
