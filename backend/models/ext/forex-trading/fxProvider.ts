import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class fxProvider
  extends Model<fxProviderAttributes, fxProviderCreationAttributes>
  implements fxProviderAttributes
{
  id!: string;
  name!: string;
  title!: string;
  description?: string;
  status?: boolean;
  version?: string;
  proxyUrl?: string;

  public static initModel(sequelize: Sequelize.Sequelize): typeof fxProvider {
    return fxProvider.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
          comment: "Internal adapter identifier (twelvedata, finnhub, tradermade, polygon)",
        },
        title: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title must not be empty" },
          },
          comment: "Display title of the market data provider",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Description of the market data provider",
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
          comment: "Active provider flag (only one row may be true)",
        },
        version: {
          type: DataTypes.STRING(191),
          allowNull: true,
          defaultValue: "0.0.1",
          validate: {
            notEmpty: { msg: "version: Version must not be empty" },
          },
          comment: "Adapter integration version",
        },
        proxyUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
          comment:
            "Proxy URL for provider API requests (e.g., http://user:pass@host:port or socks5://host:port)",
        },
      },
      {
        sequelize,
        modelName: "fxProvider",
        tableName: "fx_provider",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "fxProviderNameKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "name" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {}
}
