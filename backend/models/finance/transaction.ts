import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class transaction
  extends Model<transactionAttributes, transactionCreationAttributes>
  implements transactionAttributes
{
  id!: string;
  userId!: string;
  walletId!: string;
  type!:
    | "FAILED"
    | "DEPOSIT"
    | "WITHDRAW"
    | "OUTGOING_TRANSFER"
    | "INCOMING_TRANSFER"
    | "PAYMENT"
    | "REFUND"
    | "BINARY_ORDER"
    | "EXCHANGE_ORDER"
    | "INVESTMENT"
    | "INVESTMENT_ROI"
    | "AI_INVESTMENT"
    | "AI_INVESTMENT_ROI"
    | "INVOICE"
    | "FOREX_DEPOSIT"
    | "FOREX_WITHDRAW"
    | "FOREX_INVESTMENT"
    | "FOREX_INVESTMENT_ROI"
    | "ICO_CONTRIBUTION"
    | "REFERRAL_REWARD"
    | "STAKING"
    | "STAKING_REWARD"
    | "P2P_OFFER_TRANSFER"
    | "P2P_TRADE";
  status!:
    | "PENDING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED"
    | "REJECTED"
    | "REFUNDED"
    | "FROZEN"
    | "PROCESSING"
    | "TIMEOUT";
  amount!: number;
  fee?: number;
  description?: string;
  metadata?: any;
  referenceId?: string | null;
  trxId?: string | null;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof transaction {
    return transaction.init(
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
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
          },
          comment: "ID of the user associated with this transaction",
        },
        walletId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "walletId: Wallet ID cannot be null" },
          },
          comment: "ID of the wallet involved in this transaction",
        },
        type: {
          type: DataTypes.ENUM(
            "FAILED",
            "DEPOSIT",
            "WITHDRAW",
            "OUTGOING_TRANSFER",
            "INCOMING_TRANSFER",
            "PAYMENT",
            "REFUND",
            "BINARY_ORDER",
            "EXCHANGE_ORDER",
            "INVESTMENT",
            "INVESTMENT_ROI",
            "AI_INVESTMENT",
            "AI_INVESTMENT_ROI",
            "INVOICE",
            "FOREX_DEPOSIT",
            "FOREX_WITHDRAW",
            "FOREX_INVESTMENT",
            "FOREX_INVESTMENT_ROI",
            "ICO_CONTRIBUTION",
            "REFERRAL_REWARD",
            "STAKING",
            "STAKING_REWARD",
            "P2P_OFFER_TRANSFER",
            "P2P_TRADE"
          ),
          allowNull: false,
          validate: {
            isIn: {
              args: [
                [
                  "FAILED",
                  "DEPOSIT",
                  "WITHDRAW",
                  "OUTGOING_TRANSFER",
                  "INCOMING_TRANSFER",
                  "PAYMENT",
                  "REFUND",
                  "BINARY_ORDER",
                  "EXCHANGE_ORDER",
                  "INVESTMENT",
                  "INVESTMENT_ROI",
                  "AI_INVESTMENT",
                  "AI_INVESTMENT_ROI",
                  "INVOICE",
                  "FOREX_DEPOSIT",
                  "FOREX_WITHDRAW",
                  "FOREX_INVESTMENT",
                  "FOREX_INVESTMENT_ROI",
                  "ICO_CONTRIBUTION",
                  "REFERRAL_REWARD",
                  "STAKING",
                  "STAKING_REWARD",
                  "P2P_OFFER_TRANSFER",
                  "P2P_TRADE",
                ],
              ],
              msg: "type: Type must be one of ['FAILED', 'DEPOSIT', 'WITHDRAW', 'OUTGOING_TRANSFER', 'INCOMING_TRANSFER', 'PAYMENT', 'REFUND', 'BINARY_ORDER', 'EXCHANGE_ORDER', 'INVESTMENT', 'INVESTMENT_ROI', 'AI_INVESTMENT', 'AI_INVESTMENT_ROI', 'INVOICE', 'FOREX_DEPOSIT', 'FOREX_WITHDRAW', 'FOREX_INVESTMENT', 'FOREX_INVESTMENT_ROI', 'ICO_CONTRIBUTION', 'REFERRAL_REWARD', 'STAKING', 'STAKING_REWARD', 'P2P_OFFER_TRANSFER', 'P2P_TRADE']",
            },
          },
          comment: "Type of transaction (deposit, withdrawal, transfer, trading, etc.)",
        },
        status: {
          type: DataTypes.ENUM(
            "PENDING",
            "COMPLETED",
            "FAILED",
            "CANCELLED",
            "EXPIRED",
            "REJECTED",
            "REFUNDED",
            "FROZEN",
            "PROCESSING",
            "TIMEOUT"
          ),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [
                [
                  "PENDING",
                  "COMPLETED",
                  "FAILED",
                  "CANCELLED",
                  "EXPIRED",
                  "REJECTED",
                  "REFUNDED",
                  "FROZEN",
                  "PROCESSING",
                  "TIMEOUT",
                ],
              ],
              msg: "status: Status must be one of ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REJECTED', 'REFUNDED','FROZEN', 'PROCESSING', 'TIMEOUT']",
            },
          },
          comment: "Current status of the transaction",
        },
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "amount: Amount must be a number" },
          },
          comment: "Transaction amount in the wallet's currency",
        },
        fee: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          defaultValue: 0,
          comment: "Fee charged for this transaction",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Human-readable description of the transaction",
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Additional transaction data in JSON format",
        },
        referenceId: {
          type: DataTypes.STRING(191),
          allowNull: true,
          unique: "transactionReferenceIdKey",
          comment: "External reference ID from payment processor or exchange",
        },
        trxId: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment: "Blockchain transaction hash or ID",
        },
      },
      {
        sequelize,
        modelName: "transaction",
        tableName: "transaction",
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
            name: "transactionIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "transactionReferenceIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "referenceId" }],
          },
          {
            name: "transactionWalletIdForeign",
            using: "BTREE",
            fields: [{ name: "walletId" }],
          },
          {
            name: "transactionUserIdFkey",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    transaction.hasOne(models.adminProfit, {
      as: "adminProfit",
      foreignKey: "transactionId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    transaction.belongsTo(models.wallet, {
      as: "wallet",
      foreignKey: "walletId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    transaction.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
