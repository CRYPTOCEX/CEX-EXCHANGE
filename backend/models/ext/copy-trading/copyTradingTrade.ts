import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

// Type definitions
export type TradeStatus =
  | "PENDING"
  | "PENDING_REPLICATION"
  | "REPLICATED"
  | "REPLICATION_FAILED"
  | "OPEN"
  | "CLOSED"
  | "PARTIALLY_FILLED"
  | "FAILED"
  | "CANCELLED"
  // Exit order submitted, waiting for it to fill. A position is no longer settled
  // instantly: closing places a real opposite order, so there is now an interval between
  // "asked to exit" and "exited".
  | "CLOSING";
// SPOT sides are BUY/SELL; the remaining values are binary-option sides
// (paired to the binary order types). UI/logic must branch on marketType.
export type TradeSide =
  | "BUY"
  | "SELL"
  | "RISE"
  | "FALL"
  | "HIGHER"
  | "LOWER"
  | "TOUCH"
  | "NO_TOUCH"
  | "CALL"
  | "PUT"
  | "UP"
  | "DOWN";
// MARKET/LIMIT are spot order types; the rest are binary order types.
export type TradeType =
  | "MARKET"
  | "LIMIT"
  | "RISE_FALL"
  | "HIGHER_LOWER"
  | "TOUCH_NO_TOUCH"
  | "CALL_PUT"
  | "TURBO";
export type TradeMarketType = "SPOT" | "BINARY";
export type BinaryTradeResult = "WIN" | "LOSS" | "DRAW";

export interface copyTradingTradeAttributes {
  id: string;
  leaderId: string;
  followerId?: string;
  leaderOrderId?: string;
  // The follower's OWN order id. For SPOT trades this is the ecosystem order
  // id (Scylla orders.id); for BINARY trades it is the follower's binaryOrder
  // id. Required to find/cancel/sync the follower's order and to release its
  // COPY_TRADING wallet hold. Null for leader-trade rows.
  followerOrderId?: string;
  /** Ecosystem order placed to EXIT this position (distinct from the entry order). */
  closeOrderId?: string;

  // Trade Details
  symbol: string;
  marketType: TradeMarketType;
  side: TradeSide;
  type: TradeType;
  amount: number;
  price: number;
  cost: number;
  fee: number;
  feeCurrency: string;

  // Binary-only fields (null for SPOT rows)
  binaryResult?: BinaryTradeResult;
  expiresAt?: Date;

  // Execution
  executedAmount: number;
  executedPrice: number;
  slippage?: number;
  latencyMs?: number;

  // P&L (for closed trades)
  profit?: number;
  profitPercent?: number;
  profitCurrency?: string; // Currency the profit is denominated in (quote currency)

  // Status
  status: TradeStatus;
  errorMessage?: string;

  // Metadata
  isLeaderTrade: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

export interface copyTradingTradeCreationAttributes
  extends Omit<
    copyTradingTradeAttributes,
    "id" | "createdAt" | "updatedAt" | "closedAt" | "executedAmount" | "executedPrice"
  > {}

export default class copyTradingTrade
  extends Model<copyTradingTradeAttributes, copyTradingTradeCreationAttributes>
  implements copyTradingTradeAttributes
{
  id!: string;
  leaderId!: string;
  followerId?: string;
  leaderOrderId?: string;
  followerOrderId?: string;
  /** Ecosystem order placed to EXIT this position (distinct from the entry order). */
  closeOrderId?: string;

  symbol!: string;
  marketType!: TradeMarketType;
  side!: TradeSide;
  type!: TradeType;
  amount!: number;
  price!: number;
  cost!: number;
  fee!: number;
  feeCurrency!: string;

  binaryResult?: BinaryTradeResult;
  expiresAt?: Date;

  executedAmount!: number;
  executedPrice!: number;
  slippage?: number;
  latencyMs?: number;

  profit?: number;
  profitPercent?: number;
  profitCurrency?: string;

  status!: TradeStatus;
  errorMessage?: string;

  isLeaderTrade!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
  closedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof copyTradingTrade {
    return copyTradingTrade.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        leaderId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "leaderId: Leader ID is required" },
          },
        },
        followerId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        leaderOrderId: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        followerOrderId: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },

        // Trade Details
        symbol: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Symbol is required" },
          },
        },
        marketType: {
          type: DataTypes.ENUM("SPOT", "BINARY"),
          allowNull: false,
          defaultValue: "SPOT",
        },
        // Additive ENUM widening only (safe under prod strict mode): the
        // original BUY/SELL and MARKET/LIMIT values keep their positions.
        side: {
          type: DataTypes.ENUM(
            "BUY",
            "SELL",
            "RISE",
            "FALL",
            "HIGHER",
            "LOWER",
            "TOUCH",
            "NO_TOUCH",
            "CALL",
            "PUT",
            "UP",
            "DOWN"
          ),
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM(
            "MARKET",
            "LIMIT",
            "RISE_FALL",
            "HIGHER_LOWER",
            "TOUCH_NO_TOUCH",
            "CALL_PUT",
            "TURBO"
          ),
          allowNull: false,
          defaultValue: "MARKET",
        },
        binaryResult: {
          type: DataTypes.ENUM("WIN", "LOSS", "DRAW"),
          allowNull: true,
        },
        // Binary option expiry (binaryOrder.closedAt). Distinct from closedAt
        // below, which records when the copy trade row was settled.
        expiresAt: {
          type: DataTypes.DATE(3),
          allowNull: true,
        },
        amount: {
          type: DataTypes.FLOAT,
          allowNull: false,
          validate: {
            min: { args: [0], msg: "amount: Cannot be negative" },
          },
        },
        price: {
          type: DataTypes.FLOAT,
          allowNull: false,
          validate: {
            min: { args: [0], msg: "price: Cannot be negative" },
          },
        },
        cost: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        fee: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        feeCurrency: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "USDT",
        },

        // Execution
        executedAmount: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        executedPrice: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        slippage: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        latencyMs: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },

        // P&L
        profit: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        profitPercent: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        profitCurrency: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },

        // Status
        status: {
          // CLOSING is APPENDED, never inserted - widening an ENUM in place is only
          // safe at the end (see the note on this file's other enums).
          //
          // A position no longer jumps straight to CLOSED. Closing now places a real
          // opposite order and waits for it to fill, because the previous behaviour
          // credited the follower's wallet with no counterparty and no order at all.
          // CLOSING is the interval between "we asked to exit" and "the exit filled".
          type: DataTypes.ENUM(
            "PENDING",
            "PENDING_REPLICATION",
            "REPLICATED",
            "REPLICATION_FAILED",
            "OPEN",
            "CLOSED",
            "PARTIALLY_FILLED",
            "FAILED",
            "CANCELLED",
            "CLOSING"
          ),
          allowNull: false,
          defaultValue: "PENDING",
        },
        /**
         * The ecosystem order placed to EXIT this position.
         *
         * Distinct from `followerOrderId`, which is the entry. The fill monitor matches
         * incoming fills against both: an entry fill opens the position, a close fill
         * settles it and is the only thing that may compute realised profit.
         */
        closeOrderId: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        errorMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        // Metadata
        isLeaderTrade: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },

        // Timestamps
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        closedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "copyTradingTrade",
        tableName: "copy_trading_trades",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "copy_trading_trades_leader_id_idx",
            fields: [{ name: "leaderId" }],
          },
          {
            name: "copy_trading_trades_follower_id_idx",
            fields: [{ name: "followerId" }],
          },
          {
            name: "copy_trading_trades_leader_order_id_idx",
            fields: [{ name: "leaderOrderId" }],
          },
          {
            name: "copy_trading_trades_follower_order_id_idx",
            fields: [{ name: "followerOrderId" }],
          },
          {
            name: "copy_trading_trades_market_type_idx",
            fields: [{ name: "marketType" }],
          },
          {
            name: "copy_trading_trades_symbol_idx",
            fields: [{ name: "symbol" }],
          },
          {
            name: "copy_trading_trades_status_idx",
            fields: [{ name: "status" }],
          },
          {
            name: "copy_trading_trades_created_at_idx",
            fields: [{ name: "createdAt" }],
          },
          // The two cron ticks read this table by owner + time window, so they need
          // the owner column to LEAD and the time column to follow: that turns a scan
          // of one owner's whole lifetime history into a range read on the window.
          // updateLeaderDailyStats reads today's rows for one leader.
          {
            name: "copy_trading_trades_leader_created_idx",
            fields: [{ name: "leaderId" }, { name: "createdAt" }],
          },
          // checkDailyLossLimits filters one follower's rows by closedAt; this
          // subsumes the followerId-only index above.
          {
            name: "copy_trading_trades_follower_closed_at_idx",
            fields: [{ name: "followerId" }, { name: "closedAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    copyTradingTrade.belongsTo(models.copyTradingLeader, {
      foreignKey: "leaderId",
      as: "leader",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    copyTradingTrade.belongsTo(models.copyTradingFollower, {
      foreignKey: "followerId",
      as: "follower",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
