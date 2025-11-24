import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class p2pAdminActivity
  extends Model<p2pAdminActivityAttributes, p2pAdminActivityCreationAttributes>
  implements p2pAdminActivityAttributes
{
  id!: string;
  type!: string;
  relatedEntityId!: string;
  relatedEntityName!: string;
  adminId!: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof p2pAdminActivity {
    return p2pAdminActivity.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        type: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: { msg: "type: Activity type must not be empty" },
          },
        },
        relatedEntityId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "relatedEntityId cannot be null" },
            isUUID: { args: 4, msg: "relatedEntityId must be a valid UUID" },
          },
        },
        relatedEntityName: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "relatedEntityName must not be empty" },
          },
        },
        adminId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "adminId cannot be null" },
            isUUID: { args: 4, msg: "adminId must be a valid UUID" },
          },
        },
      },
      {
        sequelize,
        modelName: "p2pAdminActivity",
        tableName: "p2p_admin_activity",
        timestamps: true,
        paranoid: true,
      }
    );
  }

  public static associate(models: any) {
    p2pAdminActivity.belongsTo(models.user, {
      as: "admin",
      foreignKey: "adminId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    // For polymorphic associations, relatedEntityId may refer to multiple models.
  }
}
