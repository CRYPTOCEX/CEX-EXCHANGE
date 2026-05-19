import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import user from "../user";
import permission from "./permission";

interface roleAttributes {
  id: number;
  name: string;
}

interface roleCreationAttributes extends Omit<roleAttributes, 'id'> {}

type userId = any; // Define this based on your user model

export default class role
  extends Model<roleAttributes, roleCreationAttributes>
  implements roleAttributes
{
  id!: number;
  name!: string;

  // Methods for the belongsToMany association "permissions"
  getPermissions!: Sequelize.BelongsToManyGetAssociationsMixin<permission>;
  setPermissions!: Sequelize.BelongsToManySetAssociationsMixin<
    permission,
    string
  >;
  addPermission!: Sequelize.BelongsToManyAddAssociationMixin<
    permission,
    string
  >;
  addPermissions!: Sequelize.BelongsToManyAddAssociationsMixin<
    permission,
    string
  >;
  createPermission!: Sequelize.BelongsToManyCreateAssociationMixin<permission>;
  removePermission!: Sequelize.BelongsToManyRemoveAssociationMixin<
    permission,
    string
  >;
  removePermissions!: Sequelize.BelongsToManyRemoveAssociationsMixin<
    permission,
    string
  >;
  hasPermission!: Sequelize.BelongsToManyHasAssociationMixin<
    permission,
    string
  >;
  hasPermissions!: Sequelize.BelongsToManyHasAssociationsMixin<
    permission,
    string
  >;
  countPermissions!: Sequelize.BelongsToManyCountAssociationsMixin;

  // role hasMany user via roleId
  users!: user[];
  getUsers!: Sequelize.HasManyGetAssociationsMixin<user>;
  setUsers!: Sequelize.HasManySetAssociationsMixin<user, string>;
  addUser!: Sequelize.HasManyAddAssociationMixin<user, string>;
  addUsers!: Sequelize.HasManyAddAssociationsMixin<user, string>;
  createUser!: Sequelize.HasManyCreateAssociationMixin<user>;
  removeUser!: Sequelize.HasManyRemoveAssociationMixin<user, string>;
  removeUsers!: Sequelize.HasManyRemoveAssociationsMixin<user, string>;
  hasUser!: Sequelize.HasManyHasAssociationMixin<user, string>;
  hasUsers!: Sequelize.HasManyHasAssociationsMixin<user, string>;
  countUsers!: Sequelize.HasManyCountAssociationsMixin;

  public static initModel(sequelize: Sequelize.Sequelize): typeof role {
    return role.init(
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
          unique: "roleNameKey",
          validate: {
            notEmpty: { msg: "name: Name cannot be empty" },
          },
          comment: "Unique name of the role (e.g., Admin, User, Moderator)",
        },
      },
      {
        sequelize,
        modelName: "role",
        tableName: "role",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "roleNameKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "name" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    this.belongsToMany(models.permission, {
      through: models.rolePermission,
      as: "permissions",
      foreignKey: "roleId",
      otherKey: "permissionId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.user, {
      as: "users",
      foreignKey: "roleId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
