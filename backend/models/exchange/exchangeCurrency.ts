import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class exchangeCurrency
  extends Model<exchangeCurrencyAttributes, exchangeCurrencyCreationAttributes>
  implements exchangeCurrencyAttributes
{
  id!: string;
  currency!: string;
  name!: string;
  precision!: number;
  price?: number;
  fee?: number;
  status!: boolean;

  public static initModel(sequelize: Sequelize.Sequelize): typeof exchangeCurrency {
    return exchangeCurrency.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        currency: {
          type: DataTypes.STRING(191),
          allowNull: false,
          unique: "exchangeCurrencyCurrencyKey",
          validate: {
            notEmpty: { msg: "currency: Currency must not be empty" },
          },
          comment: "Currency symbol (e.g., BTC, ETH, USDT)",
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
          comment: "Full name of the currency (e.g., Bitcoin, Ethereum)",
        },
        precision: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isNumeric: { msg: "precision: Precision must be a number" },
          },
          comment: "Number of decimal places for this currency",
        },
        price: {
          type: DataTypes.DECIMAL(30, 15), // Updated data type for high precision
          allowNull: true,
          validate: {
            isDecimal: { msg: "price: Price must be a decimal number" }, // Updated validation
          },
          comment: "Current price of the currency",
        },
        fee: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          defaultValue: 0,
          validate: {
            isNumeric: { msg: "fee: Fee must be a number" },
          },
          comment: "Trading fee percentage for this currency",
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
          comment: "Currency availability status (active/inactive)",
        },
      },
      {
        sequelize,
        modelName: "exchangeCurrency",
        tableName: "exchange_currency",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "exchangeCurrencyCurrencyKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "currency" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {}
}
