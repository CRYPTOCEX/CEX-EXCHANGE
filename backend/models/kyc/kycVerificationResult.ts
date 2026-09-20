import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class kycVerificationResult
  extends Model<
    kycVerificationResultAttributes,
    kycVerificationResultCreationAttributes
  >
  implements kycVerificationResultAttributes
{
  id!: string;
  applicationId!: string;
  serviceId!: string;
  status!: "VERIFIED" | "FAILED" | "PENDING" | "NOT_STARTED";
  score?: number;
  checks?: any;
  documentVerifications?: any;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof kycVerificationResult {
    return kycVerificationResult.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: "Unique identifier for the verification result",
        },
        applicationId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "applicationId: Application ID cannot be null" },
          },
          comment: "ID of the KYC application this result belongs to",
        },
        serviceId: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "serviceId: Service ID cannot be empty" },
          },
          comment: "ID of the verification service that generated this result",
        },
        status: {
          type: DataTypes.ENUM("VERIFIED", "FAILED", "PENDING", "NOT_STARTED"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["VERIFIED", "FAILED", "PENDING", "NOT_STARTED"]],
              msg: "status: Invalid status value",
            },
          },
          comment: "Status of the verification process for this service",
        },
        score: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          validate: {
            isFloat: { msg: "score: Must be a valid number" },
            min: { args: [0], msg: "score: Cannot be negative" },
          },
          comment: "Verification confidence score provided by the service",
        },
        checks: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: "Detailed verification checks and their results",
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
          get(this: kycVerificationResult) {
            const value = this.getDataValue("checks") as unknown;
            if (value == null) return null;
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
        documentVerifications: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: "Results of document verification checks",
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
          get(this: kycVerificationResult) {
            const value = this.getDataValue("documentVerifications") as unknown;
            if (value == null) return null;
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
      },
      {
        sequelize,
        modelName: "kycVerificationResult",
        tableName: "kyc_verification_result",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    // A verification result belongs to a KYC application.
    kycVerificationResult.belongsTo(models.kycApplication, {
      as: "application",
      foreignKey: "applicationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    // A verification result belongs to a verification service.
    kycVerificationResult.belongsTo(models.kycVerificationService, {
      as: "service",
      foreignKey: "serviceId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
