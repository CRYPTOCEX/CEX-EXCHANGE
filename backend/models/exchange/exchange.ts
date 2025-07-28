import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class exchange
  extends Model<exchangeAttributes, exchangeCreationAttributes>
  implements exchangeAttributes
{
  id!: string;
  name!: string;
  title!: string;
  status?: boolean;
  username?: string;
  licenseStatus?: boolean;
  version?: string;
  productId?: string;
  type?: string;

  public static initModel(sequelize: Sequelize.Sequelize): typeof exchange {
    return exchange.init(
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
          comment: "Internal name identifier for the exchange",
        },
        title: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title must not be empty" },
          },
          comment: "Display title of the exchange",
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
          comment: "Exchange connection status (active/inactive)",
        },
        username: {
          type: DataTypes.STRING(191),
          allowNull: true,
          validate: {
            notEmpty: { msg: "username: Username must not be empty" },
          },
          comment: "Exchange API username/identifier",
        },
        licenseStatus: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          validate: {
            isBoolean: {
              msg: "licenseStatus: License Status must be a boolean value",
            },
          },
          comment: "Exchange license validation status",
        },
        version: {
          type: DataTypes.STRING(191),
          allowNull: true,
          defaultValue: "0.0.1",
          validate: {
            notEmpty: { msg: "version: Version must not be empty" },
          },
          comment: "Exchange integration version",
        },
        productId: {
          type: DataTypes.STRING(191),
          allowNull: true,
          unique: "exchangeProductIdKey",
          validate: {
            notEmpty: { msg: "productId: Product ID must not be empty" },
          },
          comment: "Unique product identifier for the exchange",
        },
        type: {
          type: DataTypes.STRING(191),
          allowNull: true,
          defaultValue: "spot",
          validate: {
            notEmpty: { msg: "type: Type must not be empty" },
          },
          comment: "Type of exchange (spot, futures, etc.)",
        },
      },
      {
        sequelize,
        modelName: "exchange",
        tableName: "exchange",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "exchangeProductIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "productId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {}
}
