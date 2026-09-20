import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class fxAccount
  extends Model<fxAccountAttributes, fxAccountCreationAttributes>
  implements fxAccountAttributes
{
  id!: string;
  userId!: string;
  type!: "DEMO" | "LIVE";
  accountCurrency!: string;
  balance!: number;
  equity!: number;
  usedMargin!: number;
  leverage!: number;
  marginMode!: string;
  groupId?: string;
  swapFree?: boolean;
  tradingEnabled?: boolean;
  status?: boolean;
  dailyWithdrawLimit?: number;
  monthlyWithdrawLimit?: number;
  dailyWithdrawn?: number;
  monthlyWithdrawn?: number;
  lastWithdrawReset?: Date;
  metadata?: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof fxAccount {
    return fxAccount.init(
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
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
          },
          comment:
            "Owner — accounts are ALWAYS created bound to a verified user (no claim-from-pool)",
        },
        type: {
          type: DataTypes.ENUM("DEMO", "LIVE"),
          allowNull: false,
          defaultValue: "DEMO",
          validate: {
            isIn: {
              args: [["DEMO", "LIVE"]],
              msg: "type: Type must be either 'DEMO' or 'LIVE'",
            },
          },
        },
        accountCurrency: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "USD",
          validate: {
            notEmpty: { msg: "accountCurrency: Account currency must not be empty" },
          },
          comment:
            "FIXED at creation — never changes afterwards or the deals ledger re-denominates",
        },
        balance: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "balance: Balance must be a number" },
          },
          comment:
            "Cash balance in accountCurrency. Reservation model: opening positions never moves it except commission; swaps settle daily; closes book realizedPnl",
        },
        equity: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          comment: "Denormalized balance + floating PnL (engine sweep refresh; ledger is truth)",
        },
        usedMargin: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          comment: "Denormalized hedged-netting margin reservation (engine sweep refresh)",
        },
        leverage: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 100,
          validate: {
            isInt: { msg: "leverage: Leverage must be an integer" },
            min: { args: [1], msg: "leverage: Leverage must be >= 1" },
          },
          comment: "Account leverage knob (effectiveLeverage = min with group/instrument caps)",
        },
        marginMode: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "HEDGING",
          validate: {
            isIn: {
              args: [["HEDGING", "NETTING"]],
              msg: "marginMode: Must be HEDGING or NETTING",
            },
          },
          comment: "HEDGING default (multiple independent positions per symbol); NETTING reserved",
        },
        groupId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "groupId: Must be a valid UUID" },
          },
          comment: "Account tier (margin call/stop-out thresholds, NBP, leverage cap)",
        },
        swapFree: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: "Islamic account — swaps skipped where the symbol group allows",
        },
        tradingEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: true,
          comment: "Admin kill-switch: false blocks new orders (closes still allowed)",
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        dailyWithdrawLimit: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          defaultValue: 5000,
          validate: {
            isFloat: { msg: "dailyWithdrawLimit: Must be a number" },
            min: { args: [0], msg: "dailyWithdrawLimit: Must be positive" },
          },
        },
        monthlyWithdrawLimit: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          defaultValue: 50000,
          validate: {
            isFloat: { msg: "monthlyWithdrawLimit: Must be a number" },
            min: { args: [0], msg: "monthlyWithdrawLimit: Must be positive" },
          },
        },
        dailyWithdrawn: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "dailyWithdrawn: Must be a number" },
            min: { args: [0], msg: "dailyWithdrawn: Must be positive" },
          },
        },
        monthlyWithdrawn: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "monthlyWithdrawn: Must be a number" },
            min: { args: [0], msg: "monthlyWithdrawn: Must be positive" },
          },
        },
        lastWithdrawReset: {
          type: DataTypes.DATE(3),
          allowNull: true,
          defaultValue: DataTypes.NOW,
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
          comment:
            "Guarded TEXT-JSON side-channel (never money fields). Known keys: riskAckAt — ISO timestamp of the per-account leveraged-trading risk-disclosure acknowledgment (fxTradingRiskWarningEnabled)",
        },
      },
      {
        sequelize,
        modelName: "fxAccount",
        tableName: "fx_account",
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
            name: "fxAccountUserIdIdx",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "fxAccountUserIdTypeIdx",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "type" }],
          },
          {
            name: "fxAccountGroupIdIdx",
            using: "BTREE",
            fields: [{ name: "groupId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    fxAccount.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    fxAccount.belongsTo(models.fxAccountGroup, {
      as: "group",
      foreignKey: "groupId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    fxAccount.hasMany(models.fxOrder, {
      as: "orders",
      foreignKey: "accountId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    fxAccount.hasMany(models.fxPosition, {
      as: "positions",
      foreignKey: "accountId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    fxAccount.hasMany(models.fxDeal, {
      as: "deals",
      foreignKey: "accountId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
