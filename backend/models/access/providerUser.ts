import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import user from "../user";
import { createUserCacheHooks } from "../init";

export default class providerUser
  extends Model<providerUserAttributes, providerUserCreationAttributes>
  implements providerUserAttributes
{
  id!: string;
  provider!: "GOOGLE" | "WALLET";
  providerUserId!: string;
  userId!: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // providerUser belongsTo user via userId
  user!: user;
  getUser!: Sequelize.BelongsToGetAssociationMixin<user>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<user, userId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<user>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof providerUser {
    return providerUser.init(
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
        providerUserId: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: "providerUserId",
          validate: {
            notNull: {
              msg: "providerUserId: Provider user ID cannot be null",
            },
            len: {
              args: [1, 255],
              msg: "providerUserId: Provider user ID must be between 1 and 255 characters",
            },
          },
        },
        provider: {
          type: DataTypes.ENUM("GOOGLE", "WALLET"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["GOOGLE", "WALLET"]],
              msg: "provider: Provider must be 'GOOGLE' or 'WALLET'",
            },
          },
        },
      },
      {
        sequelize,
        modelName: "providerUser",
        tableName: "provider_user",
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
            name: "providerUserId",
            unique: true,
            using: "BTREE",
            fields: [{ name: "providerUserId" }],
          },
          {
            name: "ProviderUserUserIdFkey",
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
    providerUser.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
