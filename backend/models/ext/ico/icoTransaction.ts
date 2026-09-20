// models/icoTransaction.ts
import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class icoTransaction
  extends Model<icoTransactionAttributes, icoTransactionCreationAttributes>
  implements icoTransactionAttributes
{
  id!: string;
  userId!: string;
  offeringId!: string;
  phaseId?: string;
  amount!: number;
  price!: number;
  // Updated status values: now include PENDING, VERIFICATION, RELEASED, REJECTED
  status!: "PENDING" | "VERIFICATION" | "RELEASED" | "REJECTED" | "REFUNDED";
  // releaseUrl is used to store the transaction URL when tokens are released
  releaseUrl?: string;
  // walletAddress holds the investor wallet address
  walletAddress?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof icoTransaction {
    return icoTransaction.init(
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
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
          },
        },
        offeringId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "offeringId: Offering ID cannot be null" },
            isUUID: { args: ANY_UUID_VERSION,
              msg: "offeringId: Offering ID must be a valid UUID",
            },
          },
        },
        phaseId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "phaseId: Phase ID must be a valid UUID" },
          },
        },
        amount: {
          type: DataTypes.DECIMAL(36, 8),
          // mysql2 returns DECIMAL as a STRING. `*` and `-` coerce, but `<`
          // and `>` between two of them compare LEXICOGRAPHICALLY, so every
          // balance/threshold check silently used string order. Hand back a
          // number so comparisons mean what they read as.
          get(this: any) {
            const value = this.getDataValue("amount");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          validate: {
            isFloat: { msg: "amount: Must be a valid number" },
            min: { args: [0], msg: "amount: Cannot be negative" },
          },
        },
        price: {
          type: DataTypes.DECIMAL(36, 8),
          // mysql2 returns DECIMAL as a STRING. `*` and `-` coerce, but `<`
          // and `>` between two of them compare LEXICOGRAPHICALLY, so every
          // balance/threshold check silently used string order. Hand back a
          // number so comparisons mean what they read as.
          get(this: any) {
            const value = this.getDataValue("price");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          validate: {
            isFloat: { msg: "price: Must be a valid number" },
            min: { args: [0], msg: "price: Cannot be negative" },
          },
        },
        status: {
          type: DataTypes.ENUM(
            "PENDING",
            "VERIFICATION",
            "RELEASED",
            "REJECTED",
            "REFUNDED"
          ),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "VERIFICATION", "RELEASED", "REJECTED", "REFUNDED"]],
              msg: "status: Must be 'PENDING', 'VERIFICATION', 'RELEASED', 'REJECTED' or 'REFUNDED'",
            },
          },
        },
        releaseUrl: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        walletAddress: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "icoTransaction",
        tableName: "ico_transaction",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "icoTransactionOfferingIdUserIdKey",
            fields: [{ name: "offeringId" }, { name: "userId" }],
          },
          {
            name: "icoTransactionStatusIdx",
            fields: [{ name: "status" }],
          },
        ],
        hooks: {
          // Issue P1 #28 - Vesting snapshot drift. Once an icoTokenVesting row
          // references this transaction, its `amount` becomes immutable: any
          // further edit would silently desync the vesting schedule from the
          // adjusted principal. Block such edits at the model layer so every
          // code path (admin endpoints, scripts, future refactors) is covered.
          beforeUpdate: async (instance: any, options: any) => {
            if (!instance.changed || !instance.changed("amount")) return;
            const vestingModel = (sequelize.models as any).icoTokenVesting;
            if (!vestingModel) return;
            const existing = await vestingModel.count({
              where: { transactionId: instance.id },
              transaction: options?.transaction,
            });
            if (existing > 0) {
              const err: any = new Error(
                "cannot modify amount after vesting scheduled"
              );
              err.statusCode = 400;
              throw err;
            }
          },
        },
      }
    );
  }

  public static associate(models: any) {
    icoTransaction.belongsTo(models.icoTokenOffering, {
      as: "offering",
      foreignKey: "offeringId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoTransaction.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoTransaction.belongsTo(models.icoTokenOfferingPhase, {
      as: "phase",
      foreignKey: "phaseId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
