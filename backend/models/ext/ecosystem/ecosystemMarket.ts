import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class ecosystemMarket
  extends Model<ecosystemMarketAttributes, ecosystemMarketCreationAttributes>
  implements ecosystemMarketAttributes
{
  id!: string;
  currency!: string;
  pair!: string;
  isTrending?: boolean;
  isHot?: boolean;
  metadata?: string;
  status!: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof ecosystemMarket {
    return ecosystemMarket.init(
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
        },
        pair: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "pair: Pair must not be empty" },
          },
        },
        isTrending: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
        },
        isHot: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
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
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
        },
      },
      {
        sequelize,
        modelName: "ecosystemMarket",
        tableName: "ecosystem_market",
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
            name: "ecosystemMarketCurrencyPairKey",
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
