import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { createUserCacheHooks } from "../init";

export default class kycApplication
  extends Model<kycApplicationAttributes, kycApplicationCreationAttributes>
  implements kycApplicationAttributes
{
  id!: string;
  userId!: string;
  levelId!: string;
  status!: "PENDING" | "APPROVED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED";
  data!: any;
  adminNotes?: string;
  reviewedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof kycApplication {
    return kycApplication.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: "Unique identifier for the KYC application",
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
          },
          comment: "ID of the user submitting the KYC application",
        },
        levelId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "levelId: Level ID cannot be null" },
          },
          comment: "ID of the KYC level being applied for",
        },
        status: {
          type: DataTypes.ENUM(
            "PENDING",
            "APPROVED",
            "REJECTED",
            "ADDITIONAL_INFO_REQUIRED"
          ),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [
                ["PENDING", "APPROVED", "REJECTED", "ADDITIONAL_INFO_REQUIRED"],
              ],
              msg: "status: Invalid status value",
            },
          },
          comment: "Current status of the KYC application review process",
        },
        data: {
          type: DataTypes.JSON,
          allowNull: false,
          comment: "KYC application data including documents and personal information",
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
          get(this: kycApplication) {
            const value = this.getDataValue("data") as unknown;
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
        adminNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Notes added by admin during KYC review process",
        },
        reviewedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Date and time when the application was reviewed by admin",
        },
      },
      {
        sequelize,
        modelName: "kycApplication",
        tableName: "kyc_application",
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
            name: "UNIQUE_kyc_application_userId_levelId",
            unique: true,
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "levelId" }],
          },
        ],
        hooks: {
          ...createUserCacheHooks(),
        },
      }
    );
  }

  public static associate(models: any) {
    // An application belongs to a level
    kycApplication.belongsTo(models.kycLevel, {
      as: "level",
      foreignKey: "levelId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    // An application belongs to a user
    kycApplication.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    // An application can have one verification result
    kycApplication.hasOne(models.kycVerificationResult, {
      as: "verificationResult",
      foreignKey: "applicationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
