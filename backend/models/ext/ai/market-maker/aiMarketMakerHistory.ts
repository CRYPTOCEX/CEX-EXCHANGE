import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

// History action types
export type AiMarketMakerHistoryAction =
  | "TRADE"
  | "PAUSE"
  | "RESUME"
  | "REBALANCE"
  | "TARGET_CHANGE"
  | "DEPOSIT"
  | "WITHDRAW"
  | "START"
  | "STOP"
  | "CONFIG_CHANGE"
  | "EMERGENCY_STOP"
  | "AUTO_PAUSE";

export interface AiMarketMakerHistoryDetails {
  // For TRADE actions
  botId?: string;
  botName?: string;
  side?: "BUY" | "SELL";
  amount?: number;
  price?: number;
  orderId?: string;

  // For DEPOSIT/WITHDRAW actions
  currency?: string;
  depositAmount?: number;
  withdrawAmount?: number;
  balanceBefore?: number;
  balanceAfter?: number;

  // For TARGET_CHANGE actions
  previousTarget?: number;
  newTarget?: number;

  // For CONFIG_CHANGE actions
  field?: string;
  previousValue?: any;
  newValue?: any;

  // For PAUSE/AUTO_PAUSE actions
  reason?: string;
  volatility?: number;

  // General
  triggeredBy?: "ADMIN" | "SYSTEM" | "BOT";
  adminId?: string;
  note?: string;
}

export default class aiMarketMakerHistory
  extends Model<
    aiMarketMakerHistoryAttributes,
    aiMarketMakerHistoryCreationAttributes
  >
  implements aiMarketMakerHistoryAttributes
{
  id!: string;
  marketMakerId!: string;
  action!: AiMarketMakerHistoryAction;
  details?: AiMarketMakerHistoryDetails;
  priceAtAction!: number;
  poolValueAtAction!: number;
  createdAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiMarketMakerHistory {
    return aiMarketMakerHistory.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        marketMakerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "marketMakerId: Market Maker ID must not be empty" },
            isUUID: { args: 4, msg: "marketMakerId: Must be a valid UUID" },
          },
        },
        action: {
          type: DataTypes.ENUM(
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
            "AUTO_PAUSE"
          ),
          allowNull: false,
          validate: {
            isIn: {
              args: [
                [
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
                ],
              ],
              msg: "action: Must be a valid action type",
            },
          },
        },
        details: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const value = this.getDataValue("details");
            if (!value) return null;
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
        priceAtAction: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            isDecimal: { msg: "priceAtAction: Must be a valid decimal number" },
          },
          get() {
            const value = this.getDataValue("priceAtAction");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        poolValueAtAction: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            isDecimal: { msg: "poolValueAtAction: Must be a valid decimal number" },
          },
          get() {
            const value = this.getDataValue("poolValueAtAction");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
      },
      {
        sequelize,
        modelName: "aiMarketMakerHistory",
        tableName: "ai_market_maker_history",
        timestamps: true,
        updatedAt: false, // History records don't need updatedAt
        hooks: {
          // History records are immutable - prevent updates
          beforeUpdate: () => {
            throw new Error("History records cannot be updated - they are immutable for audit trail integrity");
          },
          // Prevent direct deletion (CASCADE from parent is still allowed)
          beforeDestroy: (_instance: aiMarketMakerHistory, options: any) => {
            // Allow CASCADE deletes from parent market maker deletion
            if (options?.transaction || options?.cascadeDelete) {
              return;
            }
            throw new Error("History records cannot be directly deleted - they are immutable for audit trail integrity");
          },
        },
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "aiMarketMakerHistoryMarketMakerIdIdx",
            using: "BTREE",
            fields: [{ name: "marketMakerId" }],
          },
          {
            name: "aiMarketMakerHistoryActionIdx",
            using: "BTREE",
            fields: [{ name: "action" }],
          },
          {
            name: "aiMarketMakerHistoryCreatedAtIdx",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
          // Composite index for time-range queries per market maker
          {
            name: "aiMarketMakerHistoryMarketCreatedIdx",
            using: "BTREE",
            fields: [{ name: "marketMakerId" }, { name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Belongs to market maker
    aiMarketMakerHistory.belongsTo(models.aiMarketMaker, {
      as: "marketMaker",
      foreignKey: "marketMakerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
