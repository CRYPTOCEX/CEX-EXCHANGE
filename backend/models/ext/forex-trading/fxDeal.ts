import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class fxDeal
  extends Model<fxDealAttributes, fxDealCreationAttributes>
  implements fxDealAttributes
{
  id!: string;
  accountId!: string;
  positionId?: string;
  orderId?: string;
  kind!: string;
  amount!: number;
  price?: number;
  rawFeedBid?: number;
  rawFeedAsk?: number;
  rateUsed?: number;
  pnl!: number;
  balanceAfter!: number;
  idempotencyKey!: string;
  executionProviderId?: string;
  externalDealId?: string;
  externalPrice?: string;
  metadata?: string;
  createdAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof fxDeal {
    return fxDeal.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        accountId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "accountId: Must be a valid UUID" },
          },
        },
        positionId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        orderId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        kind: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            isIn: {
              args: [[
                "OPEN", "CLOSE", "PARTIAL_CLOSE", "SWAP", "COMMISSION",
                "DIVIDEND", "ADJUSTMENT", "NBP_CORRECTION",
                "DEPOSIT", "WITHDRAW", "WITHDRAW_REVERSAL",
              ]],
              msg: "kind: Invalid deal kind",
            },
          },
        },
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          comment: "Base units for trade deals; money amount for balance deals",
        },
        price: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          comment: "EXECUTED price for trade deals (marked-up)",
        },
        rawFeedBid: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          comment: "Raw provider bid at execution — audit/dispute defense",
        },
        rawFeedAsk: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          comment: "Raw provider ask at execution — audit/dispute defense",
        },
        rateUsed: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          comment: "Swap points / dividend rate / ccy conversion rate used",
        },
        pnl: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          comment:
            "Balance impact in account ccy. INVARIANT: Σ pnl over an account's deals == balance (integrity cron)",
        },
        balanceAfter: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          comment: "Account balance immediately after this deal (chain check)",
        },
        idempotencyKey: {
          type: DataTypes.STRING(191),
          allowNull: false,
          comment: "Stable per-operation key — the dedup guard (fx_<action>_<id>)",
        },
        executionProviderId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "fxExecutionProvider of the hedge leg — NULL for internal fills",
        },
        externalDealId: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: "OANDA transactionID / MT dealId of the hedge fill",
        },
        externalPrice: {
          type: DataTypes.STRING(32),
          allowNull: true,
          comment: "Broker fill price (decimal STRING); `price` stays the client executed price",
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
          set(value) {
            this.setDataValue(
              "metadata",
              value === null || value === undefined || typeof value === "string"
                ? (value as any)
                : JSON.stringify(value)
            );
          },
          get() {
            const value = this.getDataValue("metadata");
            if (!value) return null;
            try {
              return JSON.parse(value);
            } catch {
              return value;
            }
          },
        },
      },
      {
        sequelize,
        modelName: "fxDeal",
        tableName: "fx_deal",
        timestamps: true,
        updatedAt: false, // immutable ledger — deals are never updated
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "fxDealAccountIdCreatedAtIdx",
            using: "BTREE",
            fields: [{ name: "accountId" }, { name: "createdAt" }],
          },
          {
            name: "fxDealPositionIdIdx",
            using: "BTREE",
            fields: [{ name: "positionId" }],
          },
          {
            name: "fxDealIdempotencyKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "idempotencyKey" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    fxDeal.belongsTo(models.fxAccount, {
      as: "account",
      foreignKey: "accountId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    fxDeal.belongsTo(models.fxPosition, {
      as: "position",
      foreignKey: "positionId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
