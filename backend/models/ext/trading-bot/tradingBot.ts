import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

// Bot status types
export type TradingBotStatus =
  | "DRAFT"
  | "RUNNING"
  | "PAUSED"
  | "STOPPED"
  | "ERROR"
  | "LIMIT_REACHED";

// Bot type
export type TradingBotType =
  | "DCA"
  | "GRID"
  | "INDICATOR"
  | "TRAILING_STOP"
  | "CUSTOM";

// Bot mode
export type TradingBotMode = "LIVE" | "PAPER";

export interface tradingBotAttributes {
  id: string;
  userId: string;

  // Basic Info
  name: string;
  description?: string;
  symbol: string;

  // Type & Mode
  type: TradingBotType;
  mode: TradingBotMode;
  status: TradingBotStatus;

  // Strategy Configuration
  strategyConfig: Record<string, any>;

  // Risk Management
  maxPositionSize: number;
  maxConcurrentTrades: number;
  dailyLossLimit?: number;
  dailyLossLimitPercent?: number;
  maxDrawdownPercent?: number;
  cooldownSeconds: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;

  // Allocation
  allocatedAmount: number;
  usedAmount: number;

  // Performance Tracking
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalVolume: number;
  totalFees: number;

  // Daily Tracking
  dailyTrades: number;
  dailyProfit: number;
  dailyVolume: number;
  dailyResetAt?: Date;

  // Drawdown Tracking
  peakEquity: number;
  currentDrawdown: number;

  // Marketplace Reference
  purchaseId?: string;

  // Engine State
  lastTickAt?: Date;
  lastTradeAt?: Date;
  lastErrorAt?: Date;
  lastError?: string;
  errorCount: number;

  // Lifecycle
  startedAt?: Date;
  stoppedAt?: Date;
  pausedAt?: Date;

  /**
   * When someone asked this bot to go flat and the request could not be
   * completed on the spot. Null means nothing is owed.
   *
   * A live exit is a real market SELL, and it can only be placed once the
   * inventory is free — which means the bot's resting rungs have to be cancelled
   * first. Cancellation is only immediate on the process holding the matching
   * lease, and an HTTP request is almost never served there, so a kill switch
   * typically leaves the cancels queued and has nothing it can sell yet. Without
   * a durable record of the request that bot simply stayed open forever: the
   * kill switch reported a failure, nothing retried, and the position outlived
   * the stop.
   *
   * The engine host drains this — it IS the leaseholder, so cancels take effect
   * there — and clears it once the position is out or an exit is working.
   */
  flattenRequestedAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface tradingBotCreationAttributes
  extends Omit<
    tradingBotAttributes,
    | "id"
    | "status"
    | "strategyConfig"
    | "maxPositionSize"
    | "maxConcurrentTrades"
    | "cooldownSeconds"
    | "allocatedAmount"
    | "usedAmount"
    | "totalTrades"
    | "winningTrades"
    | "losingTrades"
    | "totalProfit"
    | "totalVolume"
    | "totalFees"
    | "dailyTrades"
    | "dailyProfit"
    | "dailyVolume"
    | "peakEquity"
    | "currentDrawdown"
    | "errorCount"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
  > {}

export default class tradingBot
  extends Model<tradingBotAttributes, tradingBotCreationAttributes>
  implements tradingBotAttributes
{
  id!: string;
  userId!: string;
  name!: string;
  description?: string;
  symbol!: string;
  type!: TradingBotType;
  mode!: TradingBotMode;
  status!: TradingBotStatus;
  strategyConfig!: Record<string, any>;
  maxPositionSize!: number;
  maxConcurrentTrades!: number;
  dailyLossLimit?: number;
  dailyLossLimitPercent?: number;
  maxDrawdownPercent?: number;
  cooldownSeconds!: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  allocatedAmount!: number;
  usedAmount!: number;
  totalTrades!: number;
  winningTrades!: number;
  losingTrades!: number;
  totalProfit!: number;
  totalVolume!: number;
  totalFees!: number;
  dailyTrades!: number;
  dailyProfit!: number;
  dailyVolume!: number;
  dailyResetAt?: Date;
  peakEquity!: number;
  currentDrawdown!: number;
  purchaseId?: string;
  lastTickAt?: Date;
  lastTradeAt?: Date;
  lastErrorAt?: Date;
  lastError?: string;
  errorCount!: number;
  startedAt?: Date;
  stoppedAt?: Date;
  pausedAt?: Date;
  flattenRequestedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof tradingBot {
    return tradingBot.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "userId: User ID must not be empty" },
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: Must be a valid UUID" },
          },
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Bot name must not be empty" },
            len: {
              args: [1, 100],
              msg: "name: Bot name must be between 1 and 100 characters",
            },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        symbol: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Symbol must not be empty" },
          },
        },
        type: {
          type: DataTypes.ENUM("DCA", "GRID", "INDICATOR", "TRAILING_STOP", "CUSTOM"),
          allowNull: false,
          defaultValue: "DCA",
          validate: {
            isIn: {
              args: [["DCA", "GRID", "INDICATOR", "TRAILING_STOP", "CUSTOM"]],
              msg: "type: Must be a valid bot type",
            },
          },
        },
        mode: {
          type: DataTypes.ENUM("LIVE", "PAPER"),
          allowNull: false,
          defaultValue: "LIVE",
          validate: {
            isIn: {
              args: [["LIVE", "PAPER"]],
              msg: "mode: Must be LIVE or PAPER",
            },
          },
        },
        status: {
          type: DataTypes.ENUM("DRAFT", "RUNNING", "PAUSED", "STOPPED", "ERROR", "LIMIT_REACHED"),
          allowNull: false,
          defaultValue: "DRAFT",
          validate: {
            isIn: {
              args: [["DRAFT", "RUNNING", "PAUSED", "STOPPED", "ERROR", "LIMIT_REACHED"]],
              msg: "status: Must be a valid status",
            },
          },
        },
        strategyConfig: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: {},
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: tradingBot) {
            const value = this.getDataValue("strategyConfig") as unknown;
            if (value == null) return {};
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return {};
              }
            }
            return value;
          },
        },
        maxPositionSize: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 100,
          get() {
            const value = this.getDataValue("maxPositionSize");
            return value ? parseFloat(value.toString()) : 100;
          },
        },
        maxConcurrentTrades: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 5,
          validate: {
            min: { args: [1], msg: "maxConcurrentTrades: Must be at least 1" },
          },
        },
        dailyLossLimit: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("dailyLossLimit");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        dailyLossLimitPercent: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          get() {
            const value = this.getDataValue("dailyLossLimitPercent");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        maxDrawdownPercent: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          get() {
            const value = this.getDataValue("maxDrawdownPercent");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        cooldownSeconds: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 60,
          validate: {
            min: { args: [0], msg: "cooldownSeconds: Must be at least 0" },
          },
        },
        stopLossPercent: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          get() {
            const value = this.getDataValue("stopLossPercent");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        takeProfitPercent: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          get() {
            const value = this.getDataValue("takeProfitPercent");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        allocatedAmount: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("allocatedAmount");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        usedAmount: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("usedAmount");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        totalTrades: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        winningTrades: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        losingTrades: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        totalProfit: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("totalProfit");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        totalVolume: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("totalVolume");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        totalFees: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("totalFees");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        dailyTrades: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        dailyProfit: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("dailyProfit");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        dailyVolume: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("dailyVolume");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        dailyResetAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        peakEquity: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("peakEquity");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        currentDrawdown: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("currentDrawdown");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        purchaseId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        lastTickAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        lastTradeAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        lastErrorAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        lastError: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        errorCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        startedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        stoppedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        pausedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        flattenRequestedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "tradingBot",
        tableName: "trading_bot",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "tradingBotUserIdIdx",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "tradingBotStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "tradingBotTypeIdx",
            using: "BTREE",
            fields: [{ name: "type" }],
          },
          {
            name: "tradingBotModeIdx",
            using: "BTREE",
            fields: [{ name: "mode" }],
          },
          {
            name: "tradingBotSymbolIdx",
            using: "BTREE",
            fields: [{ name: "symbol" }],
          },
          {
            name: "tradingBotUserStatusIdx",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "status" }],
          },
          /**
           * The pending-flatten drain runs every 30 seconds and looks for bots
           * that still owe an exit. Composite, not a lone flattenRequestedAt:
           * that query orders by id and takes 100, and on a single-column index
           * over a nullable column MySQL routinely abandons the range scan and
           * walks the PRIMARY key to dodge the filesort — quietly restoring the
           * full table pass. The mode equality prefix turns it into a seek to
           * (LIVE, first non-NULL) and also carries the gating count().
           */
          {
            name: "tradingBotModeFlattenRequestedAtIdx",
            using: "BTREE",
            fields: [{ name: "mode" }, { name: "flattenRequestedAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    tradingBot.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    tradingBot.belongsTo(models.tradingBotPurchase, {
      as: "purchase",
      foreignKey: "purchaseId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    tradingBot.hasMany(models.tradingBotTrade, {
      as: "trades",
      foreignKey: "botId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    tradingBot.hasMany(models.tradingBotOrder, {
      as: "orders",
      foreignKey: "botId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    tradingBot.hasMany(models.tradingBotStats, {
      as: "stats",
      foreignKey: "botId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    tradingBot.hasMany(models.tradingBotAuditLog, {
      as: "auditLogs",
      foreignKey: "botId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
