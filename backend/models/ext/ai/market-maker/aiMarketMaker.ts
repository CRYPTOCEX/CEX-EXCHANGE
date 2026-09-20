import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import aiMarketMakerPool from "./aiMarketMakerPool";
import aiBot from "./aiBot";
import aiMarketMakerHistory from "./aiMarketMakerHistory";
import { logger } from "@b/utils/console";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

/**
 * Status of an AI Market Maker
 * - ACTIVE: Trading engine is running and executing trades
 * - PAUSED: Temporarily stopped, can be resumed
 * - STOPPED: Fully stopped, requires start to resume
 */
export type AiMarketMakerStatus = "ACTIVE" | "PAUSED" | "STOPPED";

/**
 * Trading aggression level
 * - CONSERVATIVE: Slower trades, tighter spreads, minimal market impact
 * - MODERATE: Balanced approach
 * - AGGRESSIVE: Faster trades, wider spreads, more market presence
 */
export type AiMarketMakerAggressionLevel =
  | "CONSERVATIVE"
  | "MODERATE"
  | "AGGRESSIVE";

/**
 * Price mode for market maker
 * - AUTONOMOUS: Fully autonomous price discovery with phases
 * - FOLLOW_EXTERNAL: Follow external exchange price closely
 * - HYBRID: Mix of external influence and autonomous movement
 * - MIRROR: The reference price IS this market's price
 *
 * MIRROR IS NOT "FOLLOW_EXTERNAL, BUT MORE".
 *
 * The three modes above all generate their own price series and differ only in how hard
 * something leans on it. Even FOLLOW_EXTERNAL is a lean: its tether closes half of any gap
 * to the reference in about 33 hours at the shipped correlation strength, while the
 * market's own diffusion wanders roughly +/-1.5% a day — so it drifts toward a reference it
 * never arrives at, and there was no mode anywhere in the engine that quoted around the
 * reference itself.
 *
 * MIRROR publishes the reference as the price, quotes real pool liquidity around it, and
 * stops quoting the moment the reference goes stale. It has no random walk, no bias, no
 * narrative phase and no containment band, because it invents nothing for those to act
 * on. It also never prints a bot-to-bot trade: `realLiquidityPercent` is pinned to 100,
 * so every fill on a MIRROR market has a real counterparty on the other side.
 */
export type AiMarketMakerPriceMode =
  | "AUTONOMOUS"
  | "FOLLOW_EXTERNAL"
  | "HYBRID"
  | "MIRROR";

/**
 * Admin bias guidance
 * - BULLISH: Favors upward price movements
 * - BEARISH: Favors downward price movements
 * - NEUTRAL: No directional bias
 */
export type AiMarketMakerBias = "BULLISH" | "BEARISH" | "NEUTRAL";

/**
 * Which trading venue `marketId` points into.
 *
 * - ECO: a row in `ecosystem_market`. Spot. The maker holds base and quote
 *   inventory, and a fill moves both.
 * - FUTURES: a row in `futures_market`. Perpetual. The maker posts margin in
 *   the quote currency only, and a fill opens a POSITION rather than moving
 *   base inventory.
 *
 * The two are different tables, different Scylla keyspaces and different
 * engines, which is why this cannot be inferred from the id — a UUID says
 * nothing about which table it came from. Every venue-specific decision in the
 * maker is taken from this column and nothing else.
 */
export type AiMarketMakerVenue = "ECO" | "FUTURES";

/**
 * Market phase (Wyckoff-style)
 * - ACCUMULATION: Building base, consolidation
 * - MARKUP: Bull run, higher highs
 * - DISTRIBUTION: Topping pattern, choppy
 * - MARKDOWN: Bear market, lower lows
 */
export type AiMarketMakerPhase =
  | "ACCUMULATION"
  | "MARKUP"
  | "DISTRIBUTION"
  | "MARKDOWN";

/**
 * AI Market Maker - Core model for automated market making configuration
 *
 * This model manages automated trading bots that simulate market activity
 * and maintain liquidity for ecosystem trading pairs.
 *
 * Business Rules:
 * - One market maker per market, where a market is (marketType, marketId) — the
 *   id alone is not unique across venues because it names a row in a DIFFERENT
 *   TABLE depending on the type
 * - targetPrice must always be between priceRangeLow and priceRangeHigh
 * - currentDailyVolume resets to 0 at midnight via scheduled cron job
 * - realLiquidityPercent determines % of orders placed in real ecosystem orderbook
 *   (0 = AI-only simulation mode, 100 = all orders go to real orderbook)
 *
 * Related Models:
 * - aiMarketMakerPool (1:1) - Liquidity pool balances and P&L tracking
 * - aiBot (1:N) - Individual trading bot configurations with personalities
 * - aiMarketMakerHistory (1:N) - Immutable audit log of all actions
 * - ecosystemMarket (N:1) - The trading pair being managed
 *
 * @example
 * // Create a new market maker
 * const maker = await aiMarketMaker.create({
 *   marketId: ecosystemMarket.id,
 *   targetPrice: 1.5,
 *   priceRangeLow: 1.0,
 *   priceRangeHigh: 2.0,
 *   aggressionLevel: "MODERATE",
 *   maxDailyVolume: 10000,
 * });
 */
export default class aiMarketMaker
  extends Model<aiMarketMakerAttributes, aiMarketMakerCreationAttributes>
  implements aiMarketMakerAttributes
{
  /** Unique identifier (UUID v4) */
  id!: string;
  /**
   * Reference to the market being managed — a row in `ecosystem_market` or in
   * `futures_market`, decided by `marketType`.
   *
   * NOT a foreign key, and it cannot be one: a polymorphic reference has no
   * single parent table for MySQL to point at. See the association block at the
   * bottom of this file.
   */
  marketId!: string;
  /** Which table `marketId` names. */
  marketType!: AiMarketMakerVenue;
  /**
   * Leverage the maker posts its FUTURES orders at. Ignored on ECO markets,
   * which have no leverage.
   */
  futuresLeverage!: number;
  /** Current operational status */
  status!: AiMarketMakerStatus;
  /** Target price the market maker is steering towards */
  targetPrice!: number;
  /** Minimum price boundary for trading operations */
  priceRangeLow!: number;
  /** Maximum price boundary for trading operations */
  priceRangeHigh!: number;
  /** How aggressively the bots trade */
  aggressionLevel!: AiMarketMakerAggressionLevel;
  /** Maximum trading volume allowed per day (resets at midnight) */
  maxDailyVolume!: number;
  /** Current accumulated volume for today */
  currentDailyVolume!: number;
  /** Volatility percentage threshold that triggers auto-pause (0-100) */
  volatilityThreshold!: number;
  /** Whether to automatically pause when volatility exceeds threshold */
  pauseOnHighVolatility!: boolean;
  /** Percentage of orders to place in real ecosystem orderbook (0-100) */
  realLiquidityPercent!: number;
  /**
   * Real quotes a FOLLOWING market keeps resting on each side of the book (0 = off).
   *
   * A floor, not a depth target: ordinary trade flow still builds above it, and every
   * quote it places is bounded by the same per-side pool budget as any other. It exists
   * because a tethered market's quotes expire after five minutes rather than an hour, and
   * resting depth is trade rate times quote life — so without a floor a market trading
   * less often than every five minutes has an empty real book between trades while its
   * displayed ladder carries on looking full.
   *
   * Ignored on autonomous markets (they keep the one-hour quote life and were never
   * drained) and on futures markets (a futures quote reserves its margin at placement).
   */
  requoteFloorPerSide!: number;
  /**
   * Ceiling on real orders this market may leave resting, or null for the default.
   *
   * A LEAK DETECTOR, not a depth control. A maker showing depth at 20 levels a side needs
   * about 40 resting orders, so the 500 default is generous — reaching it means quotes are
   * not being cancelled, which is a fault an operator should see rather than have worked
   * around. Raise it per market only when that depth is genuinely intended.
   *
   * Nullable on purpose: null means "use `AI_MM_MAX_RESTING_REAL_ORDERS`, else 500", which
   * is a different statement from any number an operator could type.
   */
  maxRestingRealOrders!: number | null;

  // ============================================
  // Multi-Timeframe Volatility System Fields
  // ============================================

  /** Price mode: AUTONOMOUS, FOLLOW_EXTERNAL, or HYBRID */
  priceMode!: AiMarketMakerPriceMode;
  /** External symbol to track (e.g., "BTC/USDT") when following external price */
  externalSymbol!: string | null;
  /** How closely to follow external price (0-100%) */
  correlationStrength!: number;

  /** Admin bias guidance: BULLISH, BEARISH, or NEUTRAL */
  marketBias!: AiMarketMakerBias;
  /** How strongly bias affects phase transitions (0-100%) */
  biasStrength!: number;

  /** Current market phase: ACCUMULATION, MARKUP, DISTRIBUTION, MARKDOWN */
  currentPhase!: AiMarketMakerPhase;
  /** When the current phase started */
  phaseStartedAt!: Date | null;
  /** When the next phase transition is scheduled */
  nextPhaseChangeAt!: Date | null;
  /** Target price for end of current phase */
  phaseTargetPrice!: number | null;

  /** Base daily volatility percentage (e.g., 2.0 for 2%) */
  baseVolatility!: number;
  /** Multiplier for current phase volatility (0.5-2.0) */
  volatilityMultiplier!: number;
  /** How quickly momentum decays per tick (0.8-0.99) */
  momentumDecay!: number;

  /** Last known price for smooth restarts */
  lastKnownPrice!: number | null;
  /** Current trend momentum (-1.0 to 1.0) */
  trendMomentum!: number;
  /** When momentum was last updated */
  lastMomentumUpdate!: Date | null;

  /**
   * Secret 64-bit seed (16 hex chars) driving this market's price randomness.
   *
   * MUST NEVER be exposed through any API response, websocket payload or log line:
   * anyone holding it can compute the market's entire future noise path. Generated with
   * crypto.randomBytes on first use.
   */
  entropySeed!: string | null;
  /**
   * Serialised PriceProcess state (OU factor values, volatility factors, offset,
   * accumulator, last integrated timestamp). Persisted every few minutes so a restart
   * resumes mid-trajectory instead of snapping the chart.
   */
  priceEngineState!: any | null;
  /** When priceEngineState was last written. */
  priceEngineStateAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  pool?: aiMarketMakerPool;
  bots?: aiBot[];
  history?: aiMarketMakerHistory[];

  // Association methods
  getPool!: Sequelize.HasOneGetAssociationMixin<aiMarketMakerPool>;
  createPool!: Sequelize.HasOneCreateAssociationMixin<aiMarketMakerPool>;

  getBots!: Sequelize.HasManyGetAssociationsMixin<aiBot>;
  addBot!: Sequelize.HasManyAddAssociationMixin<aiBot, string>;
  createBot!: Sequelize.HasManyCreateAssociationMixin<aiBot>;
  countBots!: Sequelize.HasManyCountAssociationsMixin;

  getHistory!: Sequelize.HasManyGetAssociationsMixin<aiMarketMakerHistory>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof aiMarketMaker {
    return aiMarketMaker.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        marketId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "marketId: Market ID must not be empty" },
            isUUID: { args: ANY_UUID_VERSION, msg: "marketId: Must be a valid UUID" },
          },
        },
        marketType: {
          type: DataTypes.ENUM("ECO", "FUTURES"),
          allowNull: false,
          /*
           * ECO IS THE RIGHT DEFAULT, AND IT IS ALSO THE RIGHT BACKFILL.
           *
           * Every maker that existed before this column did was an ecosystem
           * maker — the model could not describe anything else, its only
           * association was to `ecosystemMarket`, and the engine wrote to the
           * ecosystem keyspace unconditionally. So a row with no value is not
           * ambiguous: it is ECO, and `sync({alter:true})` filling the column
           * with the default gives every existing install the correct answer
           * without a data migration.
           *
           * The FOREIGN KEY is a different matter and does need one — see the
           * association block below.
           */
          defaultValue: "ECO",
          validate: {
            isIn: {
              args: [["ECO", "FUTURES"]],
              msg: "marketType: Must be ECO or FUTURES",
            },
          },
          comment:
            "Which table marketId names: ecosystem_market (ECO) or futures_market (FUTURES)",
        },
        futuresLeverage: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: false,
          /*
           * 1x, AND THAT IS A RISK DECISION RATHER THAN A PLACEHOLDER.
           *
           * Leverage is how a market maker blows up. It quotes both sides, so
           * it accumulates inventory in whichever direction the market ran, and
           * that inventory is marked to a price it does not control. At 1x the
           * pool posts the full notional and the position cannot be liquidated
           * by any move short of the price reaching zero; at 10x a 10% adverse
           * move takes the whole allocation.
           *
           * An operator who wants capital efficiency can raise it deliberately.
           * Nobody should get it by not reading the field.
           */
          defaultValue: 1,
          validate: {
            isDecimal: { msg: "futuresLeverage: Must be a valid decimal number" },
            min: { args: [1], msg: "futuresLeverage: Must be at least 1" },
            max: { args: [125], msg: "futuresLeverage: Must be at most 125" },
          },
          get() {
            const value = this.getDataValue("futuresLeverage");
            const parsed = value ? parseFloat(value.toString()) : 1;
            // Never below 1: `openingMargin` treats a sub-1 leverage as 1
            // anyway, and a value that reached the engine would silently mean
            // "post more margin than the notional".
            return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
          },
          comment:
            "Leverage the maker posts FUTURES orders at. Ignored on ECO markets.",
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "PAUSED", "STOPPED"),
          allowNull: false,
          defaultValue: "STOPPED",
          validate: {
            isIn: {
              args: [["ACTIVE", "PAUSED", "STOPPED"]],
              msg: "status: Must be ACTIVE, PAUSED, or STOPPED",
            },
          },
        },
        targetPrice: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            isDecimal: { msg: "targetPrice: Must be a valid decimal number" },
            min: { args: [0], msg: "targetPrice: Must be greater than or equal to 0" },
          },
          get() {
            const value = this.getDataValue("targetPrice");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        priceRangeLow: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            isDecimal: { msg: "priceRangeLow: Must be a valid decimal number" },
            min: { args: [0], msg: "priceRangeLow: Must be greater than or equal to 0" },
          },
          get() {
            const value = this.getDataValue("priceRangeLow");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        priceRangeHigh: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            isDecimal: { msg: "priceRangeHigh: Must be a valid decimal number" },
            min: { args: [0], msg: "priceRangeHigh: Must be greater than or equal to 0" },
          },
          get() {
            const value = this.getDataValue("priceRangeHigh");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        aggressionLevel: {
          type: DataTypes.ENUM("CONSERVATIVE", "MODERATE", "AGGRESSIVE"),
          allowNull: false,
          defaultValue: "CONSERVATIVE",
          validate: {
            isIn: {
              args: [["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]],
              msg: "aggressionLevel: Must be CONSERVATIVE, MODERATE, or AGGRESSIVE",
            },
          },
        },
        maxDailyVolume: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            isDecimal: { msg: "maxDailyVolume: Must be a valid decimal number" },
            min: { args: [0], msg: "maxDailyVolume: Must be greater than or equal to 0" },
          },
          get() {
            const value = this.getDataValue("maxDailyVolume");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        currentDailyVolume: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            isDecimal: { msg: "currentDailyVolume: Must be a valid decimal number" },
            min: { args: [0], msg: "currentDailyVolume: Must be greater than or equal to 0" },
          },
          get() {
            const value = this.getDataValue("currentDailyVolume");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        volatilityThreshold: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 5.0,
          validate: {
            isDecimal: { msg: "volatilityThreshold: Must be a valid decimal number" },
            min: { args: [0], msg: "volatilityThreshold: Must be greater than or equal to 0" },
            max: { args: [100], msg: "volatilityThreshold: Must be less than or equal to 100" },
          },
          get() {
            const value = this.getDataValue("volatilityThreshold");
            return value ? parseFloat(value.toString()) : 5.0;
          },
        },
        pauseOnHighVolatility: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        realLiquidityPercent: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0, // 0 = AI-only mode (safest), 100 = all real orders
          validate: {
            isDecimal: { msg: "realLiquidityPercent: Must be a valid decimal number" },
            min: { args: [0], msg: "realLiquidityPercent: Must be at least 0" },
            max: { args: [100], msg: "realLiquidityPercent: Must be at most 100" },
          },
          get() {
            const value = this.getDataValue("realLiquidityPercent");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        requoteFloorPerSide: {
          type: DataTypes.INTEGER,
          allowNull: false,
          /*
           * Three a side is enough that a customer sweeping the top of the book finds
           * something behind it, and few enough that a market sitting at its floor has
           * committed a small fraction of any sane pool.
           *
           * DEFAULTED RATHER THAN OPT-IN, because the alternative is worse: the shortened
           * tethered quote life ships either way, so a market left at 0 would have the
           * thinner book with nothing replacing it. Zero remains available for an operator
           * who wants real depth to come only from trade flow.
           */
          defaultValue: 3,
          validate: {
            isInt: { msg: "requoteFloorPerSide: Must be a whole number" },
            min: { args: [0], msg: "requoteFloorPerSide: Must be at least 0" },
            /*
             * Capped well below `maxRestingRealOrders`. Each quote is an UNRESERVED claim
             * on the pool — an ecosystem quote locks nothing at placement — so a floor an
             * operator can set arbitrarily high is a way to commit the pool many times
             * over without meaning to. Twenty a side is deeper than any market maker
             * showing real depth needs, and the per-side pool budget still bounds it.
             */
            max: { args: [20], msg: "requoteFloorPerSide: Must be at most 20" },
          },
          get() {
            const value = this.getDataValue("requoteFloorPerSide");
            const n = Number(value);
            return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 3;
          },
        },
        maxRestingRealOrders: {
          type: DataTypes.INTEGER,
          allowNull: true,
          /*
           * NULL, not 500. The engine's `maxRestingRealOrders()` already resolves an
           * absent value through `AI_MM_MAX_RESTING_REAL_ORDERS` before falling back to
           * 500, and writing 500 into every row would silently take that environment
           * variable away from every existing market — an operator's incident lever,
           * removed by an upgrade.
           */
          defaultValue: null,
          validate: {
            isInt: { msg: "maxRestingRealOrders: Must be a whole number" },
            /*
             * The floor is 50 rather than 1 because this ceiling is measured against
             * EVERY tracked order and the depth floor can ask for up to 20 a side. A
             * ceiling near that number would starve the top-up while looking like a
             * deliberate limit, so the two settings cannot be configured into silently
             * fighting each other.
             */
            min: { args: [50], msg: "maxRestingRealOrders: Must be at least 50" },
            max: { args: [10000], msg: "maxRestingRealOrders: Must be at most 10000" },
          },
          get() {
            /*
             * Undefined rather than 0 for an absent value, and the distinction matters:
             * `maxRestingRealOrders()` treats a non-positive number as "unset" and falls
             * through to the environment, so 0 would work by accident. Returning
             * undefined says what is meant.
             */
            const value = this.getDataValue("maxRestingRealOrders");
            const n = Number(value);
            return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
          },
        },

        // ============================================
        // Multi-Timeframe Volatility System Fields
        // ============================================

        // Price Mode Configuration
        priceMode: {
          /*
           * MIRROR is appended, never inserted. MySQL stores an ENUM as the ORDINAL of its
           * member, so re-ordering this list rewrites the meaning of every existing row —
           * a market saved as HYBRID would read back as whatever now sits third.
           * `seeders/20260904000002-ai-mm-mirror-price-mode.js` ships the matching ALTER
           * with the members in exactly this order for the same reason; the auto-sync
           * cannot do it (see the seeder's header).
           */
          type: DataTypes.ENUM("AUTONOMOUS", "FOLLOW_EXTERNAL", "HYBRID", "MIRROR"),
          allowNull: false,
          defaultValue: "AUTONOMOUS",
          validate: {
            isIn: {
              args: [["AUTONOMOUS", "FOLLOW_EXTERNAL", "HYBRID", "MIRROR"]],
              msg: "priceMode: Must be AUTONOMOUS, FOLLOW_EXTERNAL, HYBRID, or MIRROR",
            },
          },
        },
        externalSymbol: {
          type: DataTypes.STRING(20),
          allowNull: true,
          defaultValue: null,
          comment: "External symbol to track (e.g., BTC/USDT) when in FOLLOW or HYBRID mode",
        },
        correlationStrength: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 50,
          validate: {
            isDecimal: { msg: "correlationStrength: Must be a valid decimal number" },
            min: { args: [0], msg: "correlationStrength: Must be at least 0" },
            max: { args: [100], msg: "correlationStrength: Must be at most 100" },
          },
          get() {
            const value = this.getDataValue("correlationStrength");
            return value ? parseFloat(value.toString()) : 50;
          },
        },

        // Admin Bias Configuration
        marketBias: {
          type: DataTypes.ENUM("BULLISH", "BEARISH", "NEUTRAL"),
          allowNull: false,
          defaultValue: "NEUTRAL",
          validate: {
            isIn: {
              args: [["BULLISH", "BEARISH", "NEUTRAL"]],
              msg: "marketBias: Must be BULLISH, BEARISH, or NEUTRAL",
            },
          },
        },
        biasStrength: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 50,
          validate: {
            isDecimal: { msg: "biasStrength: Must be a valid decimal number" },
            min: { args: [0], msg: "biasStrength: Must be at least 0" },
            max: { args: [100], msg: "biasStrength: Must be at most 100" },
          },
          get() {
            const value = this.getDataValue("biasStrength");
            return value ? parseFloat(value.toString()) : 50;
          },
        },

        // Phase State (persists across restarts)
        currentPhase: {
          type: DataTypes.ENUM("ACCUMULATION", "MARKUP", "DISTRIBUTION", "MARKDOWN"),
          allowNull: false,
          defaultValue: "ACCUMULATION",
          validate: {
            isIn: {
              args: [["ACCUMULATION", "MARKUP", "DISTRIBUTION", "MARKDOWN"]],
              msg: "currentPhase: Must be ACCUMULATION, MARKUP, DISTRIBUTION, or MARKDOWN",
            },
          },
        },
        phaseStartedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: null,
        },
        nextPhaseChangeAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: null,
        },
        phaseTargetPrice: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: true,
          defaultValue: null,
          get() {
            const value = this.getDataValue("phaseTargetPrice");
            return value ? parseFloat(value.toString()) : null;
          },
        },

        // Volatility Configuration
        baseVolatility: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 2.0, // 2% daily volatility
          validate: {
            isDecimal: { msg: "baseVolatility: Must be a valid decimal number" },
            min: { args: [0.1], msg: "baseVolatility: Must be at least 0.1" },
            max: { args: [50], msg: "baseVolatility: Must be at most 50" },
          },
          get() {
            const value = this.getDataValue("baseVolatility");
            return value ? parseFloat(value.toString()) : 2.0;
          },
        },
        volatilityMultiplier: {
          type: DataTypes.DECIMAL(3, 2),
          allowNull: false,
          defaultValue: 1.0,
          validate: {
            isDecimal: { msg: "volatilityMultiplier: Must be a valid decimal number" },
            min: { args: [0.5], msg: "volatilityMultiplier: Must be at least 0.5" },
            max: { args: [2.0], msg: "volatilityMultiplier: Must be at most 2.0" },
          },
          get() {
            const value = this.getDataValue("volatilityMultiplier");
            return value ? parseFloat(value.toString()) : 1.0;
          },
        },
        momentumDecay: {
          type: DataTypes.DECIMAL(4, 3),
          allowNull: false,
          defaultValue: 0.95, // 5% decay per tick
          validate: {
            isDecimal: { msg: "momentumDecay: Must be a valid decimal number" },
            min: { args: [0.8], msg: "momentumDecay: Must be at least 0.8" },
            max: { args: [0.999], msg: "momentumDecay: Must be at most 0.999" },
          },
          get() {
            const value = this.getDataValue("momentumDecay");
            return value ? parseFloat(value.toString()) : 0.95;
          },
        },

        // State Persistence
        lastKnownPrice: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: true,
          defaultValue: null,
          get() {
            const value = this.getDataValue("lastKnownPrice");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        trendMomentum: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0, // Neutral momentum
          validate: {
            isDecimal: { msg: "trendMomentum: Must be a valid decimal number" },
            min: { args: [-1], msg: "trendMomentum: Must be at least -1" },
            max: { args: [1], msg: "trendMomentum: Must be at most 1" },
          },
          get() {
            const value = this.getDataValue("trendMomentum");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        lastMomentumUpdate: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: null,
        },

        // ============================================
        // Price Engine State (PriceProcess)
        // ============================================

        entropySeed: {
          type: DataTypes.STRING(16),
          allowNull: true,
          defaultValue: null,
          comment:
            "SECRET 64-bit seed (hex) for the price process. Never expose via API/WS.",
        },
        priceEngineState: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: null,
          comment: "Serialised PriceProcess state for restart continuity",
          get() {
            // Production MySQL returns DataTypes.JSON already parsed; local MariaDB
            // returns it as a string. An unguarded JSON.parse here would throw only on
            // production, and returning the raw string would hand callers something that
            // fails on first property access. Handle both shapes.
            const value = this.getDataValue("priceEngineState");
            if (value === null || value === undefined) return null;
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
        },
        priceEngineStateAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: null,
        },
      },
      {
        sequelize,
        modelName: "aiMarketMaker",
        tableName: "ai_market_maker",
        timestamps: true,
        hooks: {
          // Cross-field validation: ensure price range is valid
          beforeValidate: (instance: aiMarketMaker) => {
            const low = Number(instance.priceRangeLow) || 0;
            const high = Number(instance.priceRangeHigh) || 0;
            const target = Number(instance.targetPrice) || 0;

            // Only validate if values are set (non-zero)
            if (low > 0 && high > 0 && low >= high) {
              throw new Error("priceRangeLow must be less than priceRangeHigh");
            }

            if (target > 0 && low > 0 && target < low) {
              throw new Error("targetPrice must be greater than or equal to priceRangeLow");
            }

            if (target > 0 && high > 0 && target > high) {
              throw new Error("targetPrice must be less than or equal to priceRangeHigh");
            }
          },
          // Ensure currentDailyVolume doesn't exceed maxDailyVolume
          beforeSave: (instance: aiMarketMaker) => {
            const current = Number(instance.currentDailyVolume) || 0;
            const max = Number(instance.maxDailyVolume) || 0;

            if (max > 0 && current > max) {
              logger.warn("AI_MM", `currentDailyVolume (${current}) exceeds maxDailyVolume (${max})`);
            }
          },
        },
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          /*
           * ONE MAKER PER MARKET, WHERE A MARKET IS THE PAIR (type, id).
           *
           * This replaces a unique index on `marketId` alone. That one was
           * correct while every maker was an ecosystem maker, and it is merely
           * over-strict now: two UUIDs from two different tables colliding is
           * not a thing that happens, so the old index constrains nothing this
           * one does not — which is why an upgraded install is safe while it
           * still carries both. `sync({alter:true})` never drops an index; the
           * migration script tidies it up, and nothing breaks in the meantime.
           */
          {
            name: "aiMarketMakerMarketKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "marketType" }, { name: "marketId" }],
          },
          {
            name: "aiMarketMakerStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
        ],
      }
    );
  }

  /**
   * Strip server-only fields from every serialised form of this model.
   *
   * `entropySeed` is the secret that generates the market's entire future price path -
   * anyone holding it can compute where the price will be. Several admin endpoints return
   * the whole row (market/[id]/index.get.ts spreads `marketMaker.toJSON()`, and
   * market/index.get.ts goes through getFiltered with no attribute exclusion), so relying
   * on each call site to remember an exclude list is how a secret eventually leaks.
   * Overriding toJSON removes it from every JSON path at once, while the engine's own
   * property access (`this.config.entropySeed`) is unaffected.
   *
   * priceEngineState is stripped too: it is large, meaningless to a client, and reveals
   * the process's internal position.
   */
  public toJSON(): any {
    const values = { ...(super.toJSON() as unknown as Record<string, unknown>) };
    delete values.entropySeed;
    delete values.priceEngineState;
    return values;
  }

  public static associate(models: any) {
    // One-to-one with pool
    aiMarketMaker.hasOne(models.aiMarketMakerPool, {
      as: "pool",
      foreignKey: "marketMakerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // One-to-many with bots
    aiMarketMaker.hasMany(models.aiBot, {
      as: "bots",
      foreignKey: "marketMakerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // One-to-many with history
    aiMarketMaker.hasMany(models.aiMarketMakerHistory, {
      as: "history",
      foreignKey: "marketMakerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    /*
     * ==========================================================================
     * THE MARKET REFERENCE IS POLYMORPHIC, SO IT CARRIES NO FOREIGN KEY.
     * ==========================================================================
     * `marketId` names a row in `ecosystem_market` OR in `futures_market`, and
     * MySQL has no way to express "one of these two parents". Both associations
     * are therefore `constraints: false`: they exist so an `include` can join,
     * and for nothing else.
     *
     * WHAT THAT COSTS, STATED PLAINLY AND CORRECTLY. There is no longer an
     * ON DELETE CASCADE behind the maker, so deleting an ecosystem market no
     * longer deletes its maker row.
     *
     * An earlier draft of this comment said the market-delete routes "already"
     * tore the maker down explicitly. THEY DO NOT — neither
     * `admin/ecosystem/market` nor `admin/futures/market` references
     * `aiMarketMaker` at all. That was wrong and an audit caught it.
     *
     * The cascade is still not worth restoring, for a reason that survives the
     * correction: it removed the ROW ONLY. The pool row, the bots, the history
     * and the AI Scylla tables cascade from the maker, but the running engine
     * instance, the pool's real wallet balance, the resting real orders and the
     * synthetic book levels do not — so a cascade produced a market maker that
     * had been deleted from the database while still quoting, still holding
     * money and still publishing depth, with nothing left to address it by.
     * DELETE /admin/ai/market-maker/market/{id} is the only path that unwinds
     * all of it, and it always was.
     *
     * What the missing cascade leaves is an ORPHANED maker whose market row is
     * gone: recoverable (its pool can still be withdrawn and the maker deleted
     * through its own route) and visible (`market` resolves null). That is a
     * strictly better failure than the silent half-teardown the cascade gave,
     * but it IS a gap, and the honest place for it is here rather than in a
     * claim that the routes handle it.
     *
     * AN UPGRADED INSTALL NEEDS THE OLD FK DROPPED BY HAND.
     * `sync({ alter: true })` will not remove it: sequelize emits
     * `removeConstraint` before `changeColumn` for a column that USED to carry
     * a reference, the drop fails, and `isBenignConstraintError` swallows it as
     * noise. The constraint therefore survives, still pointing at
     * `ecosystem_market`, and the first attempt to create a FUTURES maker fails
     * with a foreign-key violation on a perfectly valid `futures_market.id`.
     * Run `node backend/scripts/ai-mm-polymorphic-market.mjs --apply`.
     *
     * Both sides are declared so `include` works for either venue; exactly one
     * of them resolves for any given row. `utils/venue/market-resolver.ts` is
     * the only thing that should read them.
     */
    aiMarketMaker.belongsTo(models.ecosystemMarket, {
      as: "market",
      foreignKey: "marketId",
      constraints: false,
    });

    // Guarded, unlike the ecosystem side: the maker has always depended on the
    // ecosystem extension (it shares its Scylla client), but Futures is a
    // separate purchase and an install may simply not have the model.
    if (models.futuresMarket) {
      aiMarketMaker.belongsTo(models.futuresMarket, {
        as: "futuresMarket",
        foreignKey: "marketId",
        constraints: false,
      });
    }
  }
}
