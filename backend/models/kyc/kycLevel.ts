import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { RedisSingleton } from "@b/utils/redis";

export default class kycLevel
  extends Model<kycLevelAttributes, kycLevelCreationAttributes>
  implements kycLevelAttributes
{
  id!: string;
  serviceId?: string;
  name!: string;
  description?: string;
  level!: number;
  fields?: any;
  features?: any;
  status!: "ACTIVE" | "DRAFT" | "INACTIVE";
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof kycLevel {
    return kycLevel.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: "Unique identifier for the KYC verification level",
        },
        serviceId: {
          type: DataTypes.STRING,
          allowNull: true,
          comment: "ID of the external verification service used for this level",
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name cannot be empty" },
          },
          comment: "Name of the KYC level (e.g., 'Basic', 'Intermediate', 'Advanced')",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Detailed description of the KYC level requirements",
        },
        level: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            isInt: { msg: "level: Level must be an integer" },
          },
          comment: "Numeric level indicating the verification tier (1, 2, 3, etc.)",
        },
        fields: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: "Required fields and documents for this KYC level",
        },
        features: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: "Features and benefits unlocked at this KYC level",
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "DRAFT", "INACTIVE"),
          allowNull: false,
          defaultValue: "ACTIVE",
          validate: {
            isIn: {
              args: [["ACTIVE", "DRAFT", "INACTIVE"]],
              msg: "status: Status must be either ACTIVE, DRAFT, or INACTIVE",
            },
          },
          comment: "Current status of this KYC level configuration",
        },
      },
      {
        sequelize,
        modelName: "kycLevel",
        tableName: "kyc_level",
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
        hooks: {
          // Clear cache for all users with this KYC level when level is updated
          afterUpdate: async (instance: any) => {
            try {
              const redis = RedisSingleton.getInstance();
              // Get all users with this KYC level
              const applications = await sequelize.models.kycApplication.findAll({
                where: { 
                  levelId: instance.id,
                  status: 'APPROVED'
                },
                attributes: ['userId']
              });
              
              // Clear cache for all affected users
              for (const app of applications) {
                const appData = app.get({ plain: true }) as any;
                await redis.del(`user:${appData.userId}:profile`);
              }
            } catch (error) {
              console.error("Error clearing user caches after KYC level update:", error);
              // Don't fail the request if cache clearing fails
            }
          },
          
          // Clear cache for all users when level status changes
          afterBulkUpdate: async (options: any) => {
            try {
              const redis = RedisSingleton.getInstance();
              
              // Find all affected levels
              const levels = await kycLevel.findAll({ 
                where: options.where,
                attributes: ['id']
              });
              
              for (const level of levels) {
                // Get all users with each affected KYC level
                const applications = await sequelize.models.kycApplication.findAll({
                  where: { 
                    levelId: level.id,
                    status: 'APPROVED'
                  },
                  attributes: ['userId']
                });
                
                // Clear cache for all affected users
                for (const app of applications) {
                  const appData = app.get({ plain: true }) as any;
                  await redis.del(`user:${appData.userId}:profile`);
                }
              }
            } catch (error) {
              console.error("Error clearing user caches after bulk KYC level update:", error);
              // Don't fail the request if cache clearing fails
            }
          }
        }
      }
    );
  }

  public static associate(models: any) {
    // A level can have many applications.
    kycLevel.hasMany(models.kycApplication, {
      as: "applications",
      foreignKey: "levelId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    kycLevel.belongsTo(models.kycVerificationService, {
      as: "verificationService",
      foreignKey: "serviceId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
