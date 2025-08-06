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
    number
  >;
  addPermission!: Sequelize.BelongsToManyAddAssociationMixin<
    permission,
    number
  >;
  addPermissions!: Sequelize.BelongsToManyAddAssociationsMixin<
    permission,
    number
  >;
  createPermission!: Sequelize.BelongsToManyCreateAssociationMixin<permission>;
  removePermission!: Sequelize.BelongsToManyRemoveAssociationMixin<
    permission,
    number
  >;
  removePermissions!: Sequelize.BelongsToManyRemoveAssociationsMixin<
    permission,
    number
  >;
  hasPermission!: Sequelize.BelongsToManyHasAssociationMixin<
    permission,
    number
  >;
  hasPermissions!: Sequelize.BelongsToManyHasAssociationsMixin<
    permission,
    number
  >;
  countPermissions!: Sequelize.BelongsToManyCountAssociationsMixin;

  // role hasMany user via roleId
  users!: user[];
  getUsers!: Sequelize.HasManyGetAssociationsMixin<user>;
  setUsers!: Sequelize.HasManySetAssociationsMixin<user, userId>;
  addUser!: Sequelize.HasManyAddAssociationMixin<user, userId>;
  addUsers!: Sequelize.HasManyAddAssociationsMixin<user, userId>;
  createUser!: Sequelize.HasManyCreateAssociationMixin<user>;
  removeUser!: Sequelize.HasManyRemoveAssociationMixin<user, userId>;
  removeUsers!: Sequelize.HasManyRemoveAssociationsMixin<user, userId>;
  hasUser!: Sequelize.HasManyHasAssociationMixin<user, userId>;
  hasUsers!: Sequelize.HasManyHasAssociationsMixin<user, userId>;
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
