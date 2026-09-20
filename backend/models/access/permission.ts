import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

interface permissionAttributes {
  id: number;
  name: string;
}

interface permissionCreationAttributes extends Omit<permissionAttributes, 'id'> {}

export default class permission
  extends Model<permissionAttributes, permissionCreationAttributes>
  implements permissionAttributes
{
  id!: number;
  name!: string;

  public static initModel(sequelize: Sequelize.Sequelize): typeof permission {
    return permission.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name cannot be empty" },
          },
          comment: "Unique permission name (e.g., access.users, create.posts)",
        },
      },
      {
        sequelize,
        modelName: "permission",
        tableName: "permission",
        timestamps: false,
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
    this.belongsToMany(models.role, {
      through: models.rolePermission,
      as: "roles",
      foreignKey: "permissionId",
      otherKey: "roleId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
