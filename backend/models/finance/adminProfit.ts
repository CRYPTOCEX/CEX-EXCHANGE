import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class adminProfit
  extends Model<adminProfitAttributes, adminProfitCreationAttributes>
  implements adminProfitAttributes
{
  id!: string;
  transactionId!: string;
  type!:
    | "DEPOSIT"
    | "WITHDRAW"
    | "TRANSFER"
    | "BINARY_ORDER"
    | "EXCHANGE_ORDER"
    | "INVESTMENT"
    | "AI_INVESTMENT"
    | "FOREX_DEPOSIT"
    | "FOREX_WITHDRAW"
    | "FOREX_INVESTMENT"
    | "ICO_CONTRIBUTION"
    | "STAKING"
    | "P2P_TRADE";
  amount!: number;
  currency!: string;
  chain?: string | null;
  description?: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof adminProfit {
    return adminProfit.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        transactionId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "transactionId: Transaction ID cannot be null" },
            isUUID: {
              args: 4,
              msg: "transactionId: Transaction ID must be a valid UUID",
            },
          },
          comment: "ID of the transaction that generated this profit",
        },
        type: {
          type: DataTypes.ENUM(
            "DEPOSIT",
            "WITHDRAW",
            "TRANSFER",
            "BINARY_ORDER",
            "EXCHANGE_ORDER",
            "INVESTMENT",
            "AI_INVESTMENT",
            "FOREX_DEPOSIT",
            "FOREX_WITHDRAW",
            "FOREX_INVESTMENT",
            "ICO_CONTRIBUTION",
            "STAKING",
            "P2P_TRADE"
          ),
          allowNull: false,
          validate: {
            isIn: {
              args: [
                [
                  "DEPOSIT",
                  "WITHDRAW",
                  "TRANSFER",
                  "BINARY_ORDER",
                  "EXCHANGE_ORDER",
                  "INVESTMENT",
                  "AI_INVESTMENT",
                  "FOREX_DEPOSIT",
                  "FOREX_WITHDRAW",
                  "FOREX_INVESTMENT",
                  "ICO_CONTRIBUTION",
                  "STAKING",
                  "P2P_TRADE",
                ],
              ],
              msg: "type: Type must be one of the defined transaction types",
            },
          },
          comment: "Type of transaction that generated the admin profit",
        },
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "amount: Amount must be a number" },
          },
          comment: "Profit amount earned by admin from this transaction",
        },
        currency: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "currency: Currency cannot be empty" },
          },
          comment: "Currency of the profit amount",
        },
        chain: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: "Blockchain network if applicable",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Additional description of the profit source",
        },
      },
      {
        sequelize,
        modelName: "adminProfit",
        tableName: "admin_profit",
        timestamps: true,
        paranoid: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "adminProfitTransactionIdForeign",
            using: "BTREE",
            fields: [{ name: "transactionId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    adminProfit.belongsTo(models.transaction, {
      as: "transaction",
      foreignKey: "transactionId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
