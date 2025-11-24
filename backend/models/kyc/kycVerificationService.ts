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
