import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import permission from "./permission";
import role from "./role";

interface rolePermissionAttributes {
  id: number;
  roleId: number;
  permissionId: number;
}

interface rolePermissionCreationAttributes extends Omit<rolePermissionAttributes, 'id'> {}

export default class rolePermission
  extends Model<rolePermissionAttributes, rolePermissionCreationAttributes>
  implements rolePermissionAttributes
{
  id!: number;
  roleId!: number;
  permissionId!: number;

  // rolePermission belongsTo permission via permissionId
  permission!: permission;
  getPermission!: Sequelize.BelongsToGetAssociationMixin<permission>;
  setPermission!: Sequelize.BelongsToSetAssociationMixin<permission, number>;
  createPermission!: Sequelize.BelongsToCreateAssociationMixin<permission>;
  // rolePermission belongsTo role via roleId
  role!: role;
  getRole!: Sequelize.BelongsToGetAssociationMixin<role>;
  setRole!: Sequelize.BelongsToSetAssociationMixin<role, number>;
  createRole!: Sequelize.BelongsToCreateAssociationMixin<role>;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof rolePermission {
    return rolePermission.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        roleId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          // Explicitly reference the "role" table's primary key
          references: { model: "role", key: "id" },
        },
        permissionId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          // Explicitly reference the "permission" table's primary key
          references: { model: "permission", key: "id" },
        },
      },
      {
        sequelize,
        modelName: "rolePermission",
        tableName: "role_permission",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "RolePermissionPermissionIdFkey",
            using: "BTREE",
            fields: [{ name: "permissionId" }],
          },
          {
            name: "RolePermissionRoleIdFkey",
            using: "BTREE",
            fields: [{ name: "roleId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    this.belongsTo(models.role, {
      as: "role",
      foreignKey: "roleId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.belongsTo(models.permission, {
      as: "permission",
      foreignKey: "permissionId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
