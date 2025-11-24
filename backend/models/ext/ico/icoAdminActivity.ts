import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class icoAdminActivity
  extends Model<icoAdminActivityAttributes, icoAdminActivityCreationAttributes>
  implements icoAdminActivityAttributes
{
  id!: string;
  type!: string;
  offeringId!: string;
  offeringName!: string;
  adminId!: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof icoAdminActivity {
    return icoAdminActivity.init(
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
        offeringName: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "offeringName: Offering name must not be empty" },
          },
        },
        adminId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "adminId: Admin ID cannot be null" },
            isUUID: { args: 4, msg: "adminId: Admin ID must be a valid UUID" },
          },
        },
      },
      {
        sequelize,
        modelName: "icoAdminActivity",
        tableName: "ico_admin_activity",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    icoAdminActivity.belongsTo(models.icoTokenOffering, {
      as: "offering",
      foreignKey: "offeringId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoAdminActivity.belongsTo(models.user, {
      as: "admin",
      foreignKey: "adminId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
