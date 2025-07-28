import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class depositGateway
  extends Model<depositGatewayAttributes, depositGatewayCreationAttributes>
  implements depositGatewayAttributes
{
  id!: string;
  name!: string;
  title!: string;
  description!: string;
  image?: string;
  alias?: string;
  currencies?: string[];
  fixedFee?: number | Record<string, number>;
  percentageFee?: number | Record<string, number>;
  minAmount?: number | Record<string, number>;
  maxAmount?: number | Record<string, number>;
  type!: "FIAT" | "CRYPTO";
  status?: boolean;
  version?: string;
  productId?: string;

  public static initModel(sequelize: Sequelize.Sequelize): typeof depositGateway {
    return depositGateway.init(
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
          unique: "depositGatewayNameKey",
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
        },
        title: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title must not be empty" },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description must not be empty" },
          },
        },
        image: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            is: {
              args: ["^/(uploads|img)/.*$", "i"],
              msg: "image: Image must be a valid URL",
            },
          },
        },
        alias: {
          type: DataTypes.STRING(191),
          allowNull: true,
          unique: "depositGatewayAliasKey",
        },
        currencies: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        fixedFee: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: 0,
          get() {
            const rawData = this.getDataValue("fixedFee");
            if (rawData === null || rawData === undefined) return 0;
            if (typeof rawData === 'string') {
              try {
                return JSON.parse(rawData);
              } catch {
                return parseFloat(rawData) || 0;
              }
            }
            return rawData;
          },
          set(value) {
            if (typeof value === 'number') {
              this.setDataValue("fixedFee", value as any);
            } else if (typeof value === 'object' && value !== null) {
              this.setDataValue("fixedFee", value as any);
            } else if (typeof value === 'string') {
              const parsed = parseFloat(value);
              this.setDataValue("fixedFee", isNaN(parsed) ? 0 : parsed as any);
            } else {
              this.setDataValue("fixedFee", 0 as any);
            }
          },
        },
        percentageFee: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: 0,
          get() {
            const rawData = this.getDataValue("percentageFee");
            if (rawData === null || rawData === undefined) return 0;
            if (typeof rawData === 'string') {
              try {
                return JSON.parse(rawData);
              } catch {
                return parseFloat(rawData) || 0;
              }
            }
            return rawData;
          },
          set(value) {
            if (typeof value === 'number') {
              this.setDataValue("percentageFee", value as any);
            } else if (typeof value === 'object' && value !== null) {
              this.setDataValue("percentageFee", value as any);
            } else if (typeof value === 'string') {
              const parsed = parseFloat(value);
              this.setDataValue("percentageFee", isNaN(parsed) ? 0 : parsed as any);
            } else {
              this.setDataValue("percentageFee", 0 as any);
            }
          },
        },
        minAmount: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: 0,
          get() {
            const rawData = this.getDataValue("minAmount");
            if (rawData === null || rawData === undefined) return 0;
            if (typeof rawData === 'string') {
              try {
                return JSON.parse(rawData);
              } catch {
                return parseFloat(rawData) || 0;
              }
            }
            return rawData;
          },
          set(value) {
            if (typeof value === 'number') {
              this.setDataValue("minAmount", value as any);
            } else if (typeof value === 'object' && value !== null) {
              this.setDataValue("minAmount", value as any);
            } else if (typeof value === 'string') {
              const parsed = parseFloat(value);
              this.setDataValue("minAmount", isNaN(parsed) ? 0 : parsed as any);
            } else {
              this.setDataValue("minAmount", 0 as any);
            }
          },
        },
        maxAmount: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const rawData = this.getDataValue("maxAmount");
            if (rawData === null || rawData === undefined) return null;
            if (typeof rawData === 'string') {
              try {
                return JSON.parse(rawData);
              } catch {
                const parsed = parseFloat(rawData);
                return isNaN(parsed) ? null : parsed;
              }
            }
            return rawData;
          },
          set(value) {
            if (typeof value === 'number') {
              this.setDataValue("maxAmount", value as any);
            } else if (typeof value === 'object' && value !== null) {
              this.setDataValue("maxAmount", value as any);
            } else if (typeof value === 'string') {
              const parsed = parseFloat(value);
              this.setDataValue("maxAmount", isNaN(parsed) ? null : parsed as any);
            } else {
              this.setDataValue("maxAmount", null as any);
            }
          },
        },
        type: {
          type: DataTypes.ENUM("FIAT", "CRYPTO"),
          allowNull: false,
          defaultValue: "FIAT",
          validate: {
            isIn: {
              args: [["FIAT", "CRYPTO"]],
              msg: "type: Must be either 'FIAT' or 'CRYPTO'",
            },
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
        version: {
          type: DataTypes.STRING(191),
          allowNull: true,
          defaultValue: "0.0.1",
        },
        productId: {
          type: DataTypes.UUID,
          allowNull: true,
          unique: "depositGatewayProductIdKey",
          validate: {
            isUUID: {
              args: 4,
              msg: "productId: Product ID must be a valid UUID",
            },
          },
        },
      },
      {
        sequelize,
        modelName: "depositGateway",
        tableName: "deposit_gateway",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "depositGatewayNameKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "name" }],
          },
          {
            name: "depositGatewayAliasKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "alias" }],
          },
          {
            name: "depositGatewayProductIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "productId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {}

  // Helper methods to get currency-specific values
  public getFixedFee(currency?: string): number {
    if (typeof this.fixedFee === 'number') return this.fixedFee;
    if (typeof this.fixedFee === 'object' && this.fixedFee && currency) {
      return this.fixedFee[currency.toUpperCase()] || 0;
    }
    return 0;
  }

  public getPercentageFee(currency?: string): number {
    if (typeof this.percentageFee === 'number') return this.percentageFee;
    if (typeof this.percentageFee === 'object' && this.percentageFee && currency) {
      return this.percentageFee[currency.toUpperCase()] || 0;
    }
    return 0;
  }

  public getMinAmount(currency?: string): number {
    if (typeof this.minAmount === 'number') return this.minAmount;
    if (typeof this.minAmount === 'object' && this.minAmount && currency) {
      return this.minAmount[currency.toUpperCase()] || 0;
    }
    return 0;
  }

  public getMaxAmount(currency?: string): number | null {
    if (typeof this.maxAmount === 'number') return this.maxAmount;
    if (typeof this.maxAmount === 'object' && this.maxAmount && currency) {
      return this.maxAmount[currency.toUpperCase()] || null;
    }
    return null;
  }
}
