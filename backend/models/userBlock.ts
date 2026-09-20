import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class userBlock
  extends Model<userBlockAttributes, userBlockCreationAttributes>
  implements userBlockAttributes
{
  id!: string;
  userId!: string;
  adminId!: string;
  reason!: string;
  isTemporary!: boolean;
  duration?: number; // Duration in hours
  blockedUntil?: Date;
  isActive!: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof userBlock {
    return userBlock.init(
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
          comment: "ID of the user being blocked",
        },
        adminId: {
          type: DataTypes.UUID,
          allowNull: false,
          comment: "ID of the admin who created this block",
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            len: {
              args: [1, 1000],
              msg: "reason: Reason must be between 1 and 1000 characters",
            },
          },
          comment: "Reason for blocking the user",
        },
        isTemporary: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: "Whether this is a temporary or permanent block",
        },
        duration: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: {
            min: {
              args: [1],
              msg: "duration: Duration must be at least 1 hour",
            },
            max: {
              args: [8760], // 1 year in hours
              msg: "duration: Duration cannot exceed 1 year",
            },
          },
          comment: "Block duration in hours (for temporary blocks)",
        },
        blockedUntil: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Date and time when the block expires",
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: "Whether this block is currently active",
        },
      },
      {
        sequelize,
        modelName: "userBlock",
        tableName: "user_blocks", // Changed to follow snake_case convention
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "user_blocks_userId_idx",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "user_blocks_adminId_idx",
            using: "BTREE",
            fields: [{ name: "adminId" }],
          },
          {
            name: "user_blocks_isActive_idx",
            using: "BTREE",
            fields: [{ name: "isActive" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    userBlock.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      constraints: false, // Disable foreign key constraints to avoid conflicts
    });

    userBlock.belongsTo(models.user, {
      as: "admin",
      foreignKey: "adminId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      constraints: false, // Disable foreign key constraints to avoid conflicts
    });
  }
}

export interface userBlockAttributes {
  id: string;
  userId: string;
  adminId: string;
  reason: string;
  isTemporary: boolean;
  duration?: number;
  blockedUntil?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface userBlockCreationAttributes
  extends Omit<userBlockAttributes, "id" | "createdAt" | "updatedAt"> {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
} 