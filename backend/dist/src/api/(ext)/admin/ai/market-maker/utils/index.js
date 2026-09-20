"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.phaseStatusSchema = exports.forcePhaseSchema = exports.volatilityConfigUpdateSchema = exports.priceModeUpdateSchema = exports.biasUpdateSchema = exports.targetPriceUpdateSchema = exports.statusChangeSchema = exports.aiMarketMakerPoolStoreSchema = exports.aiMarketMakerStoreSchema = exports.pnlReportSchema = exports.marketPerformanceSchema = exports.analyticsOverviewSchema = exports.aiMarketMakerHistorySchema = exports.aiMarketMakerSettingsUpdateSchema = exports.aiMarketMakerSettingsSchema = exports.aiBotUpdateSchema = exports.aiBotSchema = exports.poolWithdrawSchema = exports.poolDepositSchema = exports.aiMarketMakerPoolSchema = exports.aiMarketMakerUpdateSchema = exports.aiMarketMakerCreateSchema = exports.aiMarketMakerSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the AI Market Maker");
const marketId = (0, schema_1.baseStringSchema)("ID of the market being made — a row in ecosystem_market or futures_market, decided by marketType");
const marketType = (0, schema_1.baseEnumSchema)("Trading venue the market lives on", [
    "ECO",
    "FUTURES",
]);
const status = (0, schema_1.baseEnumSchema)("Current status", ["ACTIVE", "PAUSED", "STOPPED"]);
const targetPrice = (0, schema_1.baseNumberSchema)("Target price for the market");
const priceRangeLow = (0, schema_1.baseNumberSchema)("Lower bound of price range");
const priceRangeHigh = (0, schema_1.baseNumberSchema)("Upper bound of price range");
const aggressionLevel = (0, schema_1.baseEnumSchema)("Aggression level", [
    "CONSERVATIVE",
    "MODERATE",
    "AGGRESSIVE",
]);
const maxDailyVolume = (0, schema_1.baseNumberSchema)("Maximum daily trading volume");
const currentDailyVolume = (0, schema_1.baseNumberSchema)("Current daily trading volume");
const volatilityThreshold = (0, schema_1.baseNumberSchema)("Volatility threshold for auto-pause");
const pauseOnHighVolatility = (0, schema_1.baseBooleanSchema)("Whether to pause on high volatility");
const realLiquidityPercent = (0, schema_1.baseNumberSchema)("Percentage of orders placed as real ecosystem orders (0-100)");
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation timestamp");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update timestamp");
exports.aiMarketMakerSchema = {
    id,
    marketId,
    marketType,
    futuresLeverage: (0, schema_1.baseNumberSchema)("Leverage used for FUTURES orders"),
    status,
    targetPrice,
    priceRangeLow,
    priceRangeHigh,
    aggressionLevel,
    maxDailyVolume,
    currentDailyVolume,
    volatilityThreshold,
    pauseOnHighVolatility,
    realLiquidityPercent,
    createdAt,
    updatedAt,
};
exports.aiMarketMakerCreateSchema = {
    type: "object",
    properties: {
        marketId: (0, schema_1.baseStringSchema)("ID of the market to enable AI for"),
        marketType: (0, schema_1.baseEnumSchema)("Venue the market lives on. Omitted means ECO, which is what every maker created before futures support was one.", ["ECO", "FUTURES"]),
        targetPrice: (0, schema_1.baseNumberSchema)("Initial target price"),
        priceRangeLow: (0, schema_1.baseNumberSchema)("Lower bound of price range"),
        priceRangeHigh: (0, schema_1.baseNumberSchema)("Upper bound of price range"),
        aggressionLevel: (0, schema_1.baseEnumSchema)("Aggression level", [
            "CONSERVATIVE",
            "MODERATE",
            "AGGRESSIVE",
        ]),
        maxDailyVolume: (0, schema_1.baseNumberSchema)("Maximum daily trading volume"),
        volatilityThreshold: (0, schema_1.baseNumberSchema)("Volatility threshold (0-100)"),
        pauseOnHighVolatility: (0, schema_1.baseBooleanSchema)("Pause on high volatility"),
        realLiquidityPercent: (0, schema_1.baseNumberSchema)("Real liquidity percentage (0-100)"),
        futuresLeverage: (0, schema_1.baseNumberSchema)("Leverage a FUTURES maker posts its orders at (1-125). Refused on an ECO market, which funds orders from the pool rather than margining them. Defaults to 1."),
    },
    required: [
        "marketId",
        "targetPrice",
        "priceRangeLow",
        "priceRangeHigh",
    ],
};
exports.aiMarketMakerUpdateSchema = {
    type: "object",
    properties: {
        targetPrice: (0, schema_1.baseNumberSchema)("Target price"),
        priceRangeLow: (0, schema_1.baseNumberSchema)("Lower bound of price range"),
        priceRangeHigh: (0, schema_1.baseNumberSchema)("Upper bound of price range"),
        aggressionLevel: (0, schema_1.baseEnumSchema)("Aggression level", [
            "CONSERVATIVE",
            "MODERATE",
            "AGGRESSIVE",
        ]),
        maxDailyVolume: (0, schema_1.baseNumberSchema)("Maximum daily trading volume"),
        volatilityThreshold: (0, schema_1.baseNumberSchema)("Volatility threshold"),
        pauseOnHighVolatility: (0, schema_1.baseBooleanSchema)("Pause on high volatility"),
        realLiquidityPercent: (0, schema_1.baseNumberSchema)("Real liquidity percentage"),
        futuresLeverage: (0, schema_1.baseNumberSchema)("Leverage the maker posts FUTURES orders at (1-125). Rejected on ECO markets."),
    },
};
const baseCurrencyBalance = (0, schema_1.baseNumberSchema)("Base currency balance");
const quoteCurrencyBalance = (0, schema_1.baseNumberSchema)("Quote currency balance");
const initialBaseBalance = (0, schema_1.baseNumberSchema)("Initial base currency balance");
const initialQuoteBalance = (0, schema_1.baseNumberSchema)("Initial quote currency balance");
const totalValueLocked = (0, schema_1.baseNumberSchema)("Total value locked in the pool");
const unrealizedPnL = (0, schema_1.baseNumberSchema)("Unrealized profit/loss");
const realizedPnL = (0, schema_1.baseNumberSchema)("Realized profit/loss");
const lastRebalanceAt = (0, schema_1.baseDateTimeSchema)("Last rebalance timestamp");
exports.aiMarketMakerPoolSchema = {
    id,
    marketMakerId: (0, schema_1.baseStringSchema)("ID of the market maker"),
    baseCurrencyBalance,
    quoteCurrencyBalance,
    initialBaseBalance,
    initialQuoteBalance,
    totalValueLocked,
    unrealizedPnL,
    realizedPnL,
    lastRebalanceAt,
    createdAt,
    updatedAt,
};
const idempotencyToken = (0, schema_1.baseStringSchema)("Client-generated token that makes a retry of THIS request idempotent", 64, 8, true);
exports.poolDepositSchema = {
    type: "object",
    properties: {
        currency: (0, schema_1.baseEnumSchema)("Currency to deposit", ["BASE", "QUOTE"]),
        amount: (0, schema_1.baseNumberSchema)("Amount to deposit"),
        idempotencyKey: idempotencyToken,
    },
    required: ["currency", "amount"],
};
exports.poolWithdrawSchema = {
    type: "object",
    properties: {
        currency: (0, schema_1.baseEnumSchema)("Currency to withdraw", ["BASE", "QUOTE"]),
        amount: (0, schema_1.baseNumberSchema)("Amount to withdraw"),
        idempotencyKey: idempotencyToken,
    },
    required: ["currency", "amount"],
};
const botId = (0, schema_1.baseStringSchema)("ID of the bot");
const botName = (0, schema_1.baseStringSchema)("Name of the bot");
const personality = (0, schema_1.baseEnumSchema)("Bot personality type", [
    "SCALPER",
    "SWING",
    "ACCUMULATOR",
    "DISTRIBUTOR",
    "MARKET_MAKER",
]);
const riskTolerance = (0, schema_1.baseNumberSchema)("Risk tolerance (0-1)");
const tradeFrequency = (0, schema_1.baseEnumSchema)("Trade frequency", [
    "HIGH",
    "MEDIUM",
    "LOW",
]);
const avgOrderSize = (0, schema_1.baseNumberSchema)("Average order size");
const orderSizeVariance = (0, schema_1.baseNumberSchema)("Order size variance (0-1)");
const preferredSpread = (0, schema_1.baseNumberSchema)("Preferred spread");
const botStatus = (0, schema_1.baseEnumSchema)("Bot status", ["ACTIVE", "PAUSED", "COOLDOWN"]);
const lastTradeAt = (0, schema_1.baseDateTimeSchema)("Last trade timestamp");
const dailyTradeCount = (0, schema_1.baseNumberSchema)("Daily trade count");
const maxDailyTrades = (0, schema_1.baseNumberSchema)("Maximum daily trades");
exports.aiBotSchema = {
    id: botId,
    marketMakerId: (0, schema_1.baseStringSchema)("ID of the market maker"),
    name: botName,
    personality,
    riskTolerance,
    tradeFrequency,
    avgOrderSize,
    orderSizeVariance,
    preferredSpread,
    status: botStatus,
    lastTradeAt,
    dailyTradeCount,
    maxDailyTrades,
    createdAt,
    updatedAt,
};
exports.aiBotUpdateSchema = {
    type: "object",
    properties: {
        riskTolerance: (0, schema_1.baseNumberSchema)("Risk tolerance (0-1)"),
        tradeFrequency: (0, schema_1.baseEnumSchema)("Trade frequency", [
            "HIGH",
            "MEDIUM",
            "LOW",
        ]),
        avgOrderSize: (0, schema_1.baseNumberSchema)("Average order size"),
        orderSizeVariance: (0, schema_1.baseNumberSchema)("Order size variance"),
        preferredSpread: (0, schema_1.baseNumberSchema)("Preferred spread"),
        maxDailyTrades: (0, schema_1.baseNumberSchema)("Maximum daily trades"),
    },
};
const maxConcurrentBots = (0, schema_1.baseNumberSchema)("Maximum concurrent bots");
const globalPauseEnabled = (0, schema_1.baseBooleanSchema)("Global pause enabled");
const maintenanceMode = (0, schema_1.baseBooleanSchema)("Maintenance mode enabled");
const minLiquidity = (0, schema_1.baseNumberSchema)("Minimum liquidity in quote currency");
const maxDailyLossPercent = (0, schema_1.baseNumberSchema)("Maximum daily loss percentage");
const defaultVolatilityThreshold = (0, schema_1.baseNumberSchema)("Default volatility threshold");
const tradingEnabled = (0, schema_1.baseBooleanSchema)("Global trading enabled");
const stopLossEnabled = (0, schema_1.baseBooleanSchema)("Stop loss protection enabled");
exports.aiMarketMakerSettingsSchema = {
    id,
    maxConcurrentBots,
    globalPauseEnabled,
    maintenanceMode,
    minLiquidity,
    maxDailyLossPercent,
    defaultVolatilityThreshold,
    tradingEnabled,
    stopLossEnabled,
    createdAt,
    updatedAt,
};
exports.aiMarketMakerSettingsUpdateSchema = {
    type: "object",
    properties: {
        maxConcurrentBots,
        globalPauseEnabled,
        maintenanceMode,
        minLiquidity,
        maxDailyLossPercent,
        defaultVolatilityThreshold,
        tradingEnabled,
        stopLossEnabled,
    },
};
const action = (0, schema_1.baseEnumSchema)("Action type", [
    "TRADE",
    "PAUSE",
    "RESUME",
    "REBALANCE",
    "TARGET_CHANGE",
    "DEPOSIT",
    "WITHDRAW",
    "START",
    "STOP",
    "CONFIG_CHANGE",
    "EMERGENCY_STOP",
    "AUTO_PAUSE",
]);
const details = {
    type: "object",
    description: "Action details",
};
const priceAtAction = (0, schema_1.baseNumberSchema)("Price at the time of action");
const poolValueAtAction = (0, schema_1.baseNumberSchema)("Pool value at the time of action");
exports.aiMarketMakerHistorySchema = {
    id,
    marketMakerId: (0, schema_1.baseStringSchema)("ID of the market maker"),
    action,
    details,
    priceAtAction,
    poolValueAtAction,
    createdAt,
};
exports.analyticsOverviewSchema = {
    type: "object",
    properties: {
        currency: (0, schema_1.baseStringSchema)("The unit of every priced total on this payload. Always USD."),
        unpriced: {
            type: "array",
            items: { type: "string" },
            description: "Denominations this addon holds that have no USD rate, plus the sentinel UNKNOWN for a market maker whose ecosystem market row has been deleted. While this is non-empty every total below is a LOWER BOUND and the UI must say so — those amounts are omitted, never counted as zero.",
        },
        totalTVL: (0, schema_1.baseNumberSchema)("USD value of every pool's total value locked, priced per market's QUOTE asset before it is summed."),
        total24hVolume: (0, schema_1.baseNumberSchema)("USD value of volume booked today by ACTIVE markets only. Not a rolling 24 hours: currentDailyVolume is a counter zeroed at the daily reset. Priced per market's BASE asset — the counter is incremented by trade amount, not by trade value."),
        volumeToday: (0, schema_1.baseNumberSchema)("USD value of volume booked today across EVERY market, whatever its status. Priced per market's BASE asset."),
        volumeBudgetToday: (0, schema_1.baseNumberSchema)("USD value of maxDailyVolume across every market, priced per market's BASE asset. A market that reaches its own share of this stops quoting until the daily reset."),
        totalPnL: (0, schema_1.baseNumberSchema)("USD value of realised plus unrealised P&L, priced per market's QUOTE asset before it is summed."),
        pnlPercent: {
            ...(0, schema_1.baseNumberSchema)("totalPnL as a percentage of totalTVL, or null when there is no pool capital to measure it against. Never 0 for a missing denominator: that would claim the desk is flat."),
            nullable: true,
        },
        quoteCurrency: (0, schema_1.baseStringSchema)("The quote asset every market shares, or null when they disagree. It describes the per-market rows in `markets[]`, whose pool figures are reported in their own market's quote asset — NOT the USD totals above.", 255, 0, true),
        activeMarkets: (0, schema_1.baseNumberSchema)("Number of active markets"),
        totalMarkets: (0, schema_1.baseNumberSchema)("Every market maker on the platform. This is the population `markets[]` is a capped ranking OF."),
        totalBots: (0, schema_1.baseNumberSchema)("Total number of bots"),
        activeBots: (0, schema_1.baseNumberSchema)("Number of active bots"),
        recentTradeCount: (0, schema_1.baseNumberSchema)("TRADE history rows written in the last 24 hours, counted in SQL over the whole table."),
        marketsByStatus: {
            type: "object",
            description: "Every market maker, counted by its configured status.",
            properties: {
                active: (0, schema_1.baseNumberSchema)("Markets with status ACTIVE"),
                paused: (0, schema_1.baseNumberSchema)("Markets with status PAUSED"),
                stopped: (0, schema_1.baseNumberSchema)("Markets with status STOPPED"),
            },
        },
        blockers: {
            type: "object",
            description: "Why the ACTIVE-but-silent markets are silent, counted over EVERY market rather than over the capped list. These do NOT partition `quoting.notQuoting`: one market can fail several gates at once.",
            properties: {
                bots: (0, schema_1.baseNumberSchema)("Silent markets with fewer than two ACTIVE bots"),
                pool: (0, schema_1.baseNumberSchema)("Silent markets with real liquidity enabled and an unfunded pool"),
                budget: (0, schema_1.baseNumberSchema)("Silent markets that have spent their daily volume budget"),
            },
        },
        marketsCap: (0, schema_1.baseNumberSchema)("The maximum number of rows `markets[]` can contain. `markets` is a ranked head, not the population — compare against `totalMarkets`."),
        markets: {
            type: "array",
            description: "Market makers ranked worst-first, capped at `marketsCap`. Money on these rows is NATIVE to each market (pool figures in its quote asset, volume figures in its base asset), not USD.",
            items: { type: "object", additionalProperties: true },
        },
        marketIndex: {
            type: "array",
            description: "Every market maker's id, status and symbol, in the same ranked order — the complete population, for a picker. Carries no pool and no metrics.",
            items: {
                type: "object",
                properties: {
                    id: (0, schema_1.baseStringSchema)("ID of the AI Market Maker"),
                    status: (0, schema_1.baseEnumSchema)("Current status", ["ACTIVE", "PAUSED", "STOPPED"]),
                    market: {
                        type: "object",
                        nullable: true,
                        description: "The ecosystem market, or null when its row has been deleted",
                        additionalProperties: true,
                    },
                },
            },
        },
        lastUpdated: (0, schema_1.baseDateTimeSchema)("When this overview was computed"),
        quoting: {
            type: "object",
            description: "ACTIVE markets classified by whether the engine's own database-derived trade gates let them quote, and where their last known price sits inside the configured range. The five counts partition `active`.",
            properties: {
                active: (0, schema_1.baseNumberSchema)("Markets with status ACTIVE"),
                inBand: (0, schema_1.baseNumberSchema)("Quoting, price comfortably inside its range"),
                atEdge: (0, schema_1.baseNumberSchema)("Quoting, but in the outer 20% of its range where the containment leash engages"),
                outsideBand: (0, schema_1.baseNumberSchema)("Quoting, but price has left the configured range entirely"),
                unpriced: (0, schema_1.baseNumberSchema)("Quoting, but no last known price has been persisted yet, so band position is unknown. Unrelated to the payload's top-level `unpriced`, which names denominations with no USD rate."),
                notQuoting: (0, schema_1.baseNumberSchema)("ACTIVE but failing a hard trade gate: fewer than two active bots, an unfunded pool with real liquidity enabled, or the daily volume budget spent"),
            },
        },
        engine: {
            type: "object",
            nullable: true,
            description: "Live status of the market-maker engine in THIS process, including which store arbitrated its leadership. Null when the engine has not booted.",
            properties: {
                status: (0, schema_1.baseStringSchema)("Engine status"),
                isLeader: (0, schema_1.baseBooleanSchema)("Whether this process is the one making markets"),
                instanceId: (0, schema_1.baseStringSchema)("Identifies this engine instance"),
                leaderArbitratedBy: (0, schema_1.baseStringSchema)("redis | database | none — 'none' means the leadership is unarbitrated fail-open"),
                uptime: {
                    ...(0, schema_1.baseNumberSchema)("Milliseconds since this engine last reached RUNNING, or null when it is not running"),
                    nullable: true,
                },
                tickCount: (0, schema_1.baseNumberSchema)("Ticks since the engine started"),
                config: {
                    type: "object",
                    description: "The engine configuration currently in force",
                    properties: {
                        tickIntervalMs: (0, schema_1.baseNumberSchema)("How often the main loop runs"),
                        maxConcurrentMarkets: (0, schema_1.baseNumberSchema)("Most markets this engine will load at once"),
                        enableRealLiquidity: (0, schema_1.baseBooleanSchema)("Global toggle for real ecosystem orders"),
                        emergencyStopEnabled: (0, schema_1.baseBooleanSchema)("Whether a run of tick errors may trigger an emergency stop"),
                    },
                },
                activeMarkets: (0, schema_1.baseNumberSchema)("Markets this engine has loaded"),
                errorCount: (0, schema_1.baseNumberSchema)("Errors since the engine started"),
                errorPausedMarkets: {
                    type: "array",
                    description: "Markets this engine has paused itself on after consecutive failed ticks. Each entry carries the market maker id, its symbol, when it paused, when it will retry and the last error. The database row for these still reads ACTIVE: an error pause is in-process state and is never persisted.",
                    items: {
                        type: "object",
                        properties: {
                            marketMakerId: (0, schema_1.baseStringSchema)("Which market maker paused itself"),
                            symbol: (0, schema_1.baseStringSchema)("Its trading pair"),
                            errorPaused: (0, schema_1.baseBooleanSchema)("Always true for entries in this array"),
                            pausedAt: (0, schema_1.baseStringSchema)("When the pause began", 255, 0, true),
                            retryAt: (0, schema_1.baseStringSchema)("When the backoff lapses and it retries", 255, 0, true),
                            lastError: (0, schema_1.baseStringSchema)("The error that caused it", 255, 0, true),
                        },
                    },
                },
                pausedMarkets: {
                    type: "array",
                    description: "Markets this engine has loaded but is NOT ticking because their status is PAUSED — an operator's pause, or an automatic one from the volatility / daily-loss risk guards. Disjoint from `errorPausedMarkets`, which covers the pauses an instance applies to itself; together the two account for every loaded market the engine skips. No reason is carried: the instance holds none, and the market's history feed carries the AUTO_PAUSE row that names it. A market whose row was already PAUSED when this engine started is not loaded at all and appears only in `marketsByStatus.paused`.",
                    items: {
                        type: "object",
                        properties: {
                            marketMakerId: (0, schema_1.baseStringSchema)("Which market maker is paused"),
                            symbol: (0, schema_1.baseStringSchema)("Its trading pair"),
                        },
                    },
                },
            },
        },
    },
};
exports.marketPerformanceSchema = {
    type: "object",
    properties: {
        marketId: (0, schema_1.baseStringSchema)("ID of the AI Market Maker"),
        period: (0, schema_1.baseStringSchema)("The requested window: 1h, 24h, 7d or 30d"),
        market: {
            type: "object",
            nullable: true,
            description: "The ecosystem market this maker quotes, or null when its row has been deleted",
            additionalProperties: true,
        },
        status: (0, schema_1.baseEnumSchema)("Current status", ["ACTIVE", "PAUSED", "STOPPED"]),
        currentPrice: (0, schema_1.baseNumberSchema)("The price the market REACHED, not the one it was asked for: the running engine instance, else the persisted checkpoint, else the target. 0 only when none of the three is a usable price."),
        targetPrice: (0, schema_1.baseNumberSchema)("The target as it stands NOW. It can have moved inside the period — see the TARGET_CHANGE points in priceHistory."),
        priceHistory: {
            type: "array",
            description: "One series carrying four different kinds of point, distinguished by `source`. Ordered oldest first and closed by a single CURRENT point.",
            items: {
                type: "object",
                properties: {
                    timestamp: (0, schema_1.baseDateTimeSchema)("Timestamp"),
                    price: (0, schema_1.baseNumberSchema)("Price at this point"),
                    targetPrice: {
                        ...(0, schema_1.baseNumberSchema)("The target, and ONLY where one is genuinely recorded: TARGET_CHANGE points and the closing CURRENT point. Null on a trade print — neither store records the target that was in force at the moment of a fill, and restating the execution price there was a claim nothing supports."),
                        nullable: true,
                    },
                    source: (0, schema_1.baseEnumSchema)("Where this point came from", [
                        "AI_ONLY",
                        "REAL",
                        "TARGET_CHANGE",
                        "START",
                        "CURRENT",
                    ]),
                },
            },
        },
        volumeHistory: {
            type: "array",
            description: "BASE-asset volume per UTC hour, both stores, split by store. Hours with no print are absent rather than zero.",
            items: {
                type: "object",
                properties: {
                    timestamp: (0, schema_1.baseDateTimeSchema)("Start of the UTC hour"),
                    volume: (0, schema_1.baseNumberSchema)("Total BASE volume in the hour"),
                    aiOnlyVolume: (0, schema_1.baseNumberSchema)("The AI-to-AI share of it"),
                    realVolume: (0, schema_1.baseNumberSchema)("The share filled against real customers"),
                },
            },
        },
        targetAchievementRate: {
            ...(0, schema_1.baseNumberSchema)("targetAchievement.rate, repeated as a bare number for existing clients. Null when nothing was sampled — never a stand-in figure; this was once a hardcoded 85 rendered as a measurement."),
            nullable: true,
        },
        targetAchievement: {
            type: "object",
            description: "What share of the period's prints sit within `tolerancePercent` of the CURRENT target. Read `caveat` before rendering it: it is not a measure of how well the market tracked its target through the period.",
            properties: {
                rate: {
                    ...(0, schema_1.baseNumberSchema)("Percentage of sampled prints inside the tolerance, or null when none were sampled"),
                    nullable: true,
                },
                withinTolerance: (0, schema_1.baseNumberSchema)("Sampled prints inside the tolerance"),
                sampled: (0, schema_1.baseNumberSchema)("Prints that carried a usable price. A print with no price is counted in metrics.totalTrades but cannot be sampled here."),
                tolerancePercent: (0, schema_1.baseNumberSchema)("How far from the target a print may land and still count, as a percentage"),
                target: {
                    ...(0, schema_1.baseNumberSchema)("The target the rate was measured against"),
                    nullable: true,
                },
                measuredAgainst: (0, schema_1.baseStringSchema)("Always CURRENT_TARGET. Names the one target every print was compared with."),
                caveat: (0, schema_1.baseStringSchema)("Plain statement of what this figure does and does not mean. A client that renders the rate must render this too."),
            },
        },
        truncated: (0, schema_1.baseBooleanSchema)("True when the period held more history rows than the endpoint will read. See sources.aiOnly."),
        metrics: {
            type: "object",
            properties: {
                totalTrades: (0, schema_1.baseNumberSchema)("Every print in the period across BOTH stores — AI-to-AI history rows and fills against real customers"),
                aiOnlyTrades: (0, schema_1.baseNumberSchema)("The AI-to-AI share of totalTrades"),
                realTrades: (0, schema_1.baseNumberSchema)("The share filled against real customers"),
                avgTradeSize: {
                    ...(0, schema_1.baseNumberSchema)("Mean BASE size across every counted print, or null when there are none. Null rather than 0: a market that has not traded has no average size, and 0 is a size a market could genuinely average towards."),
                    nullable: true,
                },
                periodVolume: (0, schema_1.baseNumberSchema)("BASE volume over the whole period, both stores. This is the merged figure; totalVolume below is not."),
                totalVolume: (0, schema_1.baseNumberSchema)("The market's currentDailyVolume counter, which is AI-ONLY and NOT a rolling 24 hours: only TradeExecutor increments it, and it is zeroed at the daily reset. Reported as it stands because it is the figure the maxDailyVolume trade gate is measured against."),
                tvl: (0, schema_1.baseNumberSchema)("Pool total value locked, in the market's quote asset"),
                unrealizedPnL: (0, schema_1.baseNumberSchema)("Pool unrealised P&L, in the quote asset"),
                realizedPnL: (0, schema_1.baseNumberSchema)("Pool realised P&L, in the quote asset"),
            },
        },
        sources: {
            type: "object",
            description: "Where every merged figure above came from, and whether either half fell short. Without this a quiet market and a partly unreadable one are the same payload.",
            properties: {
                aiOnly: {
                    type: "object",
                    properties: {
                        store: (0, schema_1.baseStringSchema)("Always aiMarketMakerHistory"),
                        trades: (0, schema_1.baseNumberSchema)("Prints this store contributed"),
                        complete: (0, schema_1.baseBooleanSchema)("False when the row cap dropped the oldest part of the period"),
                        reason: {
                            ...(0, schema_1.baseStringSchema)("What was left out, or null"),
                            nullable: true,
                        },
                    },
                },
                real: {
                    type: "object",
                    properties: {
                        store: (0, schema_1.baseStringSchema)("Always ai_bot_real_trades"),
                        trades: (0, schema_1.baseNumberSchema)("Fills this store contributed"),
                        windowDays: (0, schema_1.baseNumberSchema)("UTC days the ledger read fanned over"),
                        windowStart: (0, schema_1.baseDateTimeSchema)("Midnight UTC of the oldest day read"),
                        ledgerBeginsAt: {
                            ...(0, schema_1.baseDateTimeSchema)("First fill ever recorded for this market. Null means none ever has been — which must NOT be drawn the same as a market that had none in this period."),
                            nullable: true,
                        },
                        botsQueried: (0, schema_1.baseNumberSchema)("Bots whose partitions were asked for"),
                        unreadableBots: (0, schema_1.baseNumberSchema)("Bots whose partitions could not be read. Non-zero means real fills are MISSING, which is a different fact from a market that had none."),
                        complete: (0, schema_1.baseBooleanSchema)("True only when the ledger was fully readable AND already being written at the start of the period"),
                        reason: {
                            ...(0, schema_1.baseStringSchema)("What the real half cannot account for, or null"),
                            nullable: true,
                        },
                    },
                },
                undatedPrints: (0, schema_1.baseNumberSchema)("Prints whose timestamp would not parse. Counted in metrics.totalTrades and metrics.periodVolume, but absent from both charts."),
                complete: (0, schema_1.baseBooleanSchema)("True only when both halves are complete and no print was undated. The single flag a UI should branch on."),
                reason: {
                    ...(0, schema_1.baseStringSchema)("Every shortfall above in one sentence, or null when there is none. Render this rather than re-deriving which of the cases happened."),
                    nullable: true,
                },
            },
        },
    },
};
exports.pnlReportSchema = {
    type: "object",
    properties: {
        marketId: (0, schema_1.baseStringSchema)("ID of the AI Market Maker"),
        market: {
            type: "object",
            description: "The ecosystem market this P&L belongs to",
            additionalProperties: true,
        },
        summary: {
            type: "object",
            properties: {
                daily: (0, schema_1.baseNumberSchema)("Realised P&L over the last 24h, from the per-trade ledger"),
                weekly: (0, schema_1.baseNumberSchema)("Realised P&L over the last 7 days, from the per-trade ledger"),
                monthly: (0, schema_1.baseNumberSchema)("Realised P&L over the last 30 days, from the per-trade ledger"),
                allTime: (0, schema_1.baseNumberSchema)("Lifetime realised P&L, from the per-bot accumulator"),
                unrealized: (0, schema_1.baseNumberSchema)("Unrealised P&L from the pool's mark-to-market sweep"),
                realized: (0, schema_1.baseNumberSchema)("Lifetime realised P&L"),
                total: (0, schema_1.baseNumberSchema)("Realised + unrealised"),
            },
        },
        roi: {
            type: "object",
            properties: {
                percent: (0, schema_1.baseStringSchema)("Return on initial investment, as a fixed-2 string"),
                initialInvestment: (0, schema_1.baseNumberSchema)("Initial pool value in quote currency"),
                currentValue: (0, schema_1.baseNumberSchema)("Current total value locked"),
            },
        },
        history: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    date: (0, schema_1.baseDateTimeSchema)("Date"),
                    pnl: (0, schema_1.baseNumberSchema)("P&L for the day"),
                    cumulativePnl: (0, schema_1.baseNumberSchema)("Cumulative P&L"),
                },
            },
        },
        breakdown: {
            type: "object",
            properties: {
                tradeCount: (0, schema_1.baseNumberSchema)("Lifetime count of fills against real users"),
                winningTrades: (0, schema_1.baseNumberSchema)("Lifetime profitable fills"),
                losingTrades: (0, schema_1.baseNumberSchema)("Lifetime unprofitable fills"),
                avgWin: (0, schema_1.baseNumberSchema)("Average winning fill over the ledger window"),
                avgLoss: (0, schema_1.baseNumberSchema)("Average losing fill over the ledger window"),
                windowDays: (0, schema_1.baseNumberSchema)("Length of the per-trade ledger window in days"),
                windowTradeCount: (0, schema_1.baseNumberSchema)("Fills inside the ledger window"),
                windowFees: (0, schema_1.baseNumberSchema)("Fees the bots paid inside the ledger window"),
                makerFillCount: (0, schema_1.baseNumberSchema)("Fills where the bot's order was resting"),
                takerFillCount: (0, schema_1.baseNumberSchema)("Fills where the bot's order crossed"),
                makerRatio: {
                    ...(0, schema_1.baseNumberSchema)("Maker share of window fills, or null when there are none"),
                    nullable: true,
                },
            },
        },
        ledger: {
            type: "object",
            description: "Provenance of the figures above. The all-time total covers the whole lifetime; the period figures cannot predate beginsAt.",
            properties: {
                source: (0, schema_1.baseStringSchema)("Table the period figures are computed from"),
                beginsAt: {
                    ...(0, schema_1.baseDateTimeSchema)("First fill ever recorded in the per-trade ledger"),
                    nullable: true,
                },
                windowDays: (0, schema_1.baseNumberSchema)("Length of the ledger window in days"),
                windowTradeCount: (0, schema_1.baseNumberSchema)("Fills inside the ledger window"),
                allTimeSource: (0, schema_1.baseStringSchema)("Where the all-time figure comes from"),
                periodSource: (0, schema_1.baseStringSchema)("Where the daily/weekly/monthly figures come from"),
            },
        },
        lastUpdated: (0, schema_1.baseDateTimeSchema)("When this report was computed"),
    },
};
exports.aiMarketMakerStoreSchema = {
    description: "AI Market Maker created or updated successfully",
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.aiMarketMakerSchema,
            },
        },
    },
};
exports.aiMarketMakerPoolStoreSchema = {
    description: "AI Market Maker Pool updated successfully",
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.aiMarketMakerPoolSchema,
            },
        },
    },
};
exports.statusChangeSchema = {
    type: "object",
    properties: {
        action: (0, schema_1.baseEnumSchema)("Status action", ["START", "PAUSE", "STOP", "RESUME"]),
    },
    required: ["action"],
};
exports.targetPriceUpdateSchema = {
    type: "object",
    properties: {
        targetPrice: (0, schema_1.baseNumberSchema)("New target price"),
    },
    required: ["targetPrice"],
};
exports.biasUpdateSchema = {
    type: "object",
    properties: {
        marketBias: (0, schema_1.baseEnumSchema)("Market bias direction", [
            "BULLISH",
            "BEARISH",
            "NEUTRAL",
        ]),
        biasStrength: (0, schema_1.baseNumberSchema)("Bias strength (0-100)"),
    },
    required: ["marketBias", "biasStrength"],
};
exports.priceModeUpdateSchema = {
    type: "object",
    properties: {
        priceMode: (0, schema_1.baseEnumSchema)("Price mode", [
            "AUTONOMOUS",
            "FOLLOW_EXTERNAL",
            "HYBRID",
        ]),
        externalSymbol: (0, schema_1.baseStringSchema)("External symbol to follow (e.g., BTC/USDT)"),
        correlationStrength: (0, schema_1.baseNumberSchema)("Correlation strength with external price (0-100)"),
    },
    required: ["priceMode"],
};
exports.volatilityConfigUpdateSchema = {
    type: "object",
    properties: {
        baseVolatility: (0, schema_1.baseNumberSchema)("Base daily volatility percentage (e.g., 2.0 for 2%)"),
        volatilityMultiplier: (0, schema_1.baseNumberSchema)("Volatility multiplier (0.5-2.0)"),
        momentumDecay: (0, schema_1.baseNumberSchema)("Momentum decay rate (0.8-0.999)"),
    },
};
exports.forcePhaseSchema = {
    type: "object",
    properties: {
        targetPhase: (0, schema_1.baseEnumSchema)("Target phase to transition to", [
            "ACCUMULATION",
            "MARKUP",
            "DISTRIBUTION",
            "MARKDOWN",
        ]),
    },
    required: ["targetPhase"],
};
exports.phaseStatusSchema = {
    type: "object",
    properties: {
        currentPhase: (0, schema_1.baseEnumSchema)("Current market phase", [
            "ACCUMULATION",
            "MARKUP",
            "DISTRIBUTION",
            "MARKDOWN",
        ]),
        phaseStartedAt: (0, schema_1.baseDateTimeSchema)("When the current phase started"),
        nextPhaseChangeAt: (0, schema_1.baseDateTimeSchema)("When the next phase change will occur"),
        phaseTargetPrice: (0, schema_1.baseNumberSchema)("Target price for the current phase"),
        progress: (0, schema_1.baseNumberSchema)("Progress through current phase (0-1)"),
        marketBias: (0, schema_1.baseEnumSchema)("Current market bias", [
            "BULLISH",
            "BEARISH",
            "NEUTRAL",
        ]),
        biasStrength: (0, schema_1.baseNumberSchema)("Current bias strength (0-100)"),
        trendMomentum: (0, schema_1.baseNumberSchema)("Current trend momentum (-1 to 1)"),
    },
};
