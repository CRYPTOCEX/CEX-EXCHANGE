import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class p2pActivityLog
  extends Model<p2pActivityLogAttributes, p2pActivityLogCreationAttributes>
  implements p2pActivityLogAttributes
{
  id!: string;
  userId!: string;
  type!: string;
  action!: string;
  details?: string;
  relatedEntity?: string;
  relatedEntityId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof p2pActivityLog {
    return p2pActivityLog.init(
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
            notNull: { msg: "userId cannot be null" },
            isUUID: { args: 4, msg: "Invalid UUID" },
          },
        },
        type: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: { notEmpty: { msg: "Type must not be empty" } },
        },
        action: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: { notEmpty: { msg: "Action must not be empty" } },
        },
        details: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        relatedEntity: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        relatedEntityId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "Invalid UUID for relatedEntityId" },
          },
        },
      },
      {
        sequelize,
        modelName: "p2pActivityLog",
        tableName: "p2p_activity_logs",
        timestamps: true,
        paranoid: true,
      }
    );
  }

  public static associate(models: any) {
    p2pActivityLog.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
