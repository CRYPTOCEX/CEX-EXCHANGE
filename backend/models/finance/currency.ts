import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class currency
  extends Model<currencyAttributes, currencyCreationAttributes>
  implements currencyAttributes
{
  id!: string;
  name!: string;
  symbol!: string;
  precision!: number;
  price?: number | null;
  status!: boolean;

  public static initModel(sequelize: Sequelize.Sequelize): typeof currency {
    return currency.init(
      {
        id: {
          type: DataTypes.STRING(191),
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
          comment: "Full name of the currency (e.g., Bitcoin, US Dollar)",
        },
        symbol: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Symbol must not be empty" },
          },
          comment: "Currency symbol/ticker (e.g., BTC, USD, ETH)",
        },
        precision: {
          type: DataTypes.DECIMAL(30, 15),
          allowNull: false,
          validate: {
            isFloat: { msg: "precision: Precision must be a valid number" },
            min: { args: [0], msg: "precision: Precision cannot be negative" },
          },
          comment: "Number of decimal places for this currency",
        },
        price: {
          type: DataTypes.DECIMAL(30, 15),
          allowNull: true,
          validate: {
            isFloat: { msg: "price: Price must be a valid number" },
            min: { args: [0], msg: "price: Price cannot be negative" },
          },
          comment:
            "Units of this currency per 1 USD (e.g. NGN = 1365 means 1 USD = 1365 NGN). This is the inverse of the currency's USD price — use getFiatPriceInUSD() to convert.",
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          validate: {
            notNull: { msg: "status: Status cannot be null" },
          },
          comment: "Whether this currency is active and available for trading",
        },
      },
      {
        sequelize,
        modelName: "currency",
        tableName: "currency",
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
  public static associate(models: any) {}
}
