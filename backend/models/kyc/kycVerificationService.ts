import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class kycVerificationService
  extends Model<
    kycVerificationServiceAttributes,
    kycVerificationServiceCreationAttributes
  >
  implements kycVerificationServiceAttributes
{
  id!: string;
  name!: string;
  description!: string;
  type!: string;
  integrationDetails!: any;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof kycVerificationService {
    return kycVerificationService.init(
      {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
          allowNull: false,
          comment: "Unique identifier for the verification service provider",
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name cannot be empty" },
          },
          comment: "Display name of the verification service provider",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description cannot be empty" },
          },
          comment: "Description of the verification service and its capabilities",
        },
        type: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: { msg: "type: Type cannot be empty" },
          },
          comment: "Type of verification service (e.g., 'document', 'identity', 'address')",
        },
        integrationDetails: {
          type: DataTypes.JSON,
          allowNull: false,
          comment: "Configuration and API details for integrating with the service",
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
          get(this: kycVerificationService) {
            const value = this.getDataValue("integrationDetails") as unknown;
            if (value == null) return [];
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return [];
              }
            }
            return value;
          },
        },
      },
      {
        sequelize,
        modelName: "kycVerificationService",
        tableName: "kyc_verification_service",
        timestamps: true,
        paranoid: false,
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
    // A verification service has many verification results.
    kycVerificationService.hasMany(models.kycVerificationResult, {
      as: "verificationResults",
      foreignKey: "serviceId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    kycVerificationService.hasMany(models.kycLevel, {
      as: "levels",
      foreignKey: "serviceId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
