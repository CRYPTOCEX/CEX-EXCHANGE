import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import user from "../user";
import { createUserCacheHooks } from "../init";

export default class twoFactor
  extends Model<twoFactorAttributes, twoFactorCreationAttributes>
  implements twoFactorAttributes
{
  id!: string;
  userId!: string;
  secret!: string;
  type!: "EMAIL" | "SMS" | "APP";
  enabled!: boolean;
  recoveryCodes?: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // twoFactor belongsTo user via userId
  user!: user;
  getUser!: Sequelize.BelongsToGetAssociationMixin<user>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<user, string>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<user>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof twoFactor {
    return twoFactor.init(
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
        secret: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "secret: Secret cannot be empty" },
          },
        },
        type: {
          type: DataTypes.ENUM("EMAIL", "SMS", "APP"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["EMAIL", "SMS", "APP"]],
              msg: "type: Type must be one of ['EMAIL', 'SMS', 'APP']",
            },
          },
        },
        enabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        recoveryCodes: {
          type: DataTypes.TEXT("long"),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "twoFactor",
        tableName: "two_factor",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "twoFactorUserIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "twoFactorUserIdForeign",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
        ],
        hooks: {
          ...createUserCacheHooks(),
        },
      }
    );
  }

  public static associate(models: any) {
    twoFactor.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
