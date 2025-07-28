import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class apiKey
  extends Model<apiKeyAttributes, apiKeyCreationAttributes>
  implements apiKeyAttributes
{
  id!: string;
  userId?: string;
  name!: string;
  key!: string;
  type!: string; // Added type
  permissions!: string[];
  ipRestriction!: boolean;
  ipWhitelist!: string[];
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof apiKey {
    return apiKey.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
          },
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: API key name must not be empty" },
          },
        },
        key: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "key: API key must not be empty" },
          },
        },
        type: {
          type: DataTypes.ENUM("plugin", "user"),
          allowNull: false,
          defaultValue: "user",
          validate: {
            isIn: {
              args: [["plugin", "user"]],
              msg: "type: Must be either 'plugin' or 'user'",
            },
          },
        },
        permissions: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
        },
        ipRestriction: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        ipWhitelist: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
        },
      },
      {
        sequelize,
        modelName: "apiKey",
        tableName: "api_key",
        timestamps: true,
        paranoid: true,
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
    apiKey.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
