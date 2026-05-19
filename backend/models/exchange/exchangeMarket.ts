import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class exchangeMarket
  extends Model<exchangeMarketAttributes, exchangeMarketCreationAttributes>
  implements exchangeMarketAttributes
{
  id!: string;
  currency!: string;
  pair!: string;
  isTrending?: boolean;
  isHot?: boolean;
  metadata?: string;
  status!: boolean;

  public static initModel(sequelize: Sequelize.Sequelize): typeof exchangeMarket {
    return exchangeMarket.init(
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
          validate: {
            notEmpty: { msg: "currency: Currency must not be empty" },
          },
          comment: "Base currency symbol (e.g., BTC, ETH)",
        },
        pair: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "pair: Pair must not be empty" },
          },
          comment: "Quote currency symbol (e.g., USDT, USD)",
        },
        isTrending: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: "Whether this market is currently trending",
        },
        isHot: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: "Whether this market is marked as hot/popular",
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
          validate: {
            isJSON(value) {
              try {
                const json = JSON.parse(value);
                // Here, you can add specific validations for each property if necessary.
                if (typeof json !== "object" || json === null) {
                  throw new Error("Metadata must be a valid JSON object.");
                }
                if (typeof json.precision !== "object")
                  throw new Error("Invalid precision.");
                // Continue with other validations as needed
              } catch (err) {
                throw new Error(
                  "Metadata must be a valid JSON object: " + err.message
                );
              }
            },
          },
          set(value) {
            this.setDataValue("metadata", JSON.stringify(value));
          },
          get() {
            const value = this.getDataValue("metadata");
            return value ? JSON.parse(value) : null;
          },
          comment: "Additional market configuration and precision settings",
        },

        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
          comment: "Market availability status (active/inactive)",
        },
      },
      {
        sequelize,
        modelName: "exchangeMarket",
        tableName: "exchange_market",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "exchangeMarketCurrencyPairKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "currency" }, { name: "pair" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {}
}
