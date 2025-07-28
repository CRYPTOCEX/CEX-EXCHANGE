// models/icoTransaction.ts
import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class icoTransaction
  extends Model<icoTransactionAttributes, icoTransactionCreationAttributes>
  implements icoTransactionAttributes
{
  id!: string;
  userId!: string;
  offeringId!: string;
  amount!: number;
  price!: number;
  // Updated status values: now include PENDING, VERIFICATION, RELEASED, REJECTED
  status!: "PENDING" | "VERIFICATION" | "RELEASED" | "REJECTED";
  // releaseUrl is now used to store the full URL provided by the user
  releaseUrl!: string;
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
            isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
          },
        },
        offeringId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "offeringId: Offering ID cannot be null" },
            isUUID: {
              args: 4,
              msg: "offeringId: Offering ID must be a valid UUID",
            },
          },
        },
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "amount: Must be a valid number" },
            min: { args: [0], msg: "amount: Cannot be negative" },
          },
        },
        price: {
          type: DataTypes.DOUBLE,
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
            "REJECTED"
          ),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "VERIFICATION", "RELEASED", "REJECTED"]],
              msg: "status: Must be 'PENDING', 'VERIFICATION', 'RELEASED' or 'REJECTED'",
            },
          },
        },
        releaseUrl: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: "releaseUrl: Transaction URL must not be empty",
            },
          },
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
        ],
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
  }
}
