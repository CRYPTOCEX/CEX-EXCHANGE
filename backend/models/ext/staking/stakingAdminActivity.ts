import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class stakingAdminActivity
  extends Model<
    stakingAdminActivityAttributes,
    stakingAdminActivityCreationAttributes
  >
  implements stakingAdminActivityAttributes
{
  // Primary key
  id!: string;

  // Foreign key
  userId!: string;

  // Activity action: create, update, delete, approve, reject, distribute
  action!: "create" | "update" | "delete" | "approve" | "reject" | "distribute";

  // Activity type: pool, position, earnings, settings, withdrawal
  type!: "pool" | "position" | "earnings" | "settings" | "withdrawal";

  // Related entity ID (for example, pool or position id)
  relatedId!: string;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  // Model initialization
  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof stakingAdminActivity {
    return stakingAdminActivity.init(
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
        action: {
          type: DataTypes.ENUM(
            "create",
            "update",
            "delete",
            "approve",
            "reject",
            "distribute"
          ),
          allowNull: false,
          validate: {
            notEmpty: { msg: "action: Action is required" },
          },
        },
        type: {
          type: DataTypes.ENUM(
            "pool",
            "position",
            "earnings",
            "settings",
            "withdrawal"
          ),
          allowNull: false,
          validate: {
            notEmpty: { msg: "type: Type is required" },
          },
        },
        relatedId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "relatedId: Related ID is required" },
            isUUID: { args: 4, msg: "relatedId: Must be a valid UUID" },
          },
        },
      },
      {
        sequelize,
        modelName: "stakingAdminActivity",
        tableName: "staking_admin_activities",
        paranoid: true, // Enable soft deletes
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "staking_admin_activities_action_idx",
            fields: [{ name: "action" }],
          },
          {
            name: "staking_admin_activities_type_idx",
            fields: [{ name: "type" }],
          },
          {
            name: "staking_admin_activities_relatedId_idx",
            fields: [{ name: "relatedId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    this.belongsTo(models.user, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
