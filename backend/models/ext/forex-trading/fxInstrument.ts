import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class fxInstrument
  extends Model<fxInstrumentAttributes, fxInstrumentCreationAttributes>
  implements fxInstrumentAttributes
{
  id!: string;
  currency!: string;
  pair!: string;
  assetClass!: string;
  groupId?: string;
  status!: string;
  providerSymbols?: string;
  swapLong!: number;
  swapShort!: number;
  metadata?: string;
  isTrending?: boolean;
  isHot?: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof fxInstrument {
    return fxInstrument.init(
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
          comment: "Base symbol (EUR, AAPL, XAU) — displayed symbol = `${currency}/${pair}`",
        },
        pair: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "pair: Pair must not be empty" },
          },
          comment: "Quote currency (USD, EUR, JPY)",
        },
        assetClass: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "FOREX",
          validate: {
            isIn: {
              args: [["FOREX", "STOCK", "COMMODITY", "INDEX", "CRYPTO"]],
              msg: "assetClass: Must be one of FOREX, STOCK, COMMODITY, INDEX, CRYPTO",
            },
          },
          comment: "Asset class driving session/swap/margin defaults",
        },
        groupId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "groupId: Must be a valid UUID" },
          },
          comment: "Symbol group (dealing-desk config: leverage, markup, swap policy, sessions)",
        },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "INACTIVE",
          validate: {
            isIn: {
              args: [["INACTIVE", "ACTIVE", "CLOSE_ONLY", "HALTED", "DELISTED"]],
              msg: "status: Must be one of INACTIVE, ACTIVE, CLOSE_ONLY, HALTED, DELISTED",
            },
          },
          comment:
            "Lifecycle: INACTIVE (imported, not enabled) -> ACTIVE -> CLOSE_ONLY (no new/margin-increasing orders) -> DELISTED; HALTED = temporary freeze (corporate action / provider outage)",
        },
        providerSymbols: {
          type: DataTypes.TEXT,
          allowNull: true,
          validate: {
            isValidProviderSymbols(value) {
              if (value === null || value === undefined) return;
              try {
                const json = typeof value === "string" ? JSON.parse(value) : value;
                if (typeof json !== "object" || json === null || Array.isArray(json)) {
                  throw new Error("providerSymbols must be a JSON object");
                }
              } catch (err) {
                throw new Error(
                  "providerSymbols: must be a valid JSON object: " + err.message
                );
              }
            },
          },
          set(value) {
            this.setDataValue(
              "providerSymbols",
              typeof value === "string" ? value : JSON.stringify(value)
            );
          },
          get() {
            const value = this.getDataValue("providerSymbols");
            return value ? JSON.parse(value) : null;
          },
          comment:
            'Per-provider symbol mapping: { "twelvedata": "EUR/USD", "tradermade": "EURUSD", "polygon": "C:EURUSD" }',
        },
        swapLong: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "swapLong: Swap long must be a number" },
          },
          comment:
            "Overnight swap for long positions, in points (can be negative = charge, positive = credit)",
        },
        swapShort: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "swapShort: Swap short must be a number" },
          },
          comment:
            "Overnight swap for short positions, in points (can be negative = charge, positive = credit)",
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
          validate: {
            isValidMetadata(value) {
              if (value === null || value === undefined) return;
              try {
                const json = typeof value === "string" ? JSON.parse(value) : value;
                if (typeof json !== "object" || json === null) {
                  throw new Error("metadata must be a valid JSON object");
                }
                if (typeof json.precision !== "object") {
                  throw new Error("metadata.precision must be an object");
                }
                if (typeof json.contractSize !== "number") {
                  throw new Error("metadata.contractSize must be a number");
                }
                if (typeof json.pipSize !== "number") {
                  throw new Error("metadata.pipSize must be a number");
                }
                if (typeof json.pointSize !== "number") {
                  throw new Error("metadata.pointSize must be a number");
                }
              } catch (err) {
                throw new Error(
                  "metadata: must be a valid JSON object: " + err.message
                );
              }
            },
          },
          set(value) {
            this.setDataValue(
              "metadata",
              typeof value === "string" ? value : JSON.stringify(value)
            );
          },
          get() {
            const value = this.getDataValue("metadata");
            return value ? JSON.parse(value) : null;
          },
          comment:
            "{ precision:{price,amount}, digits, limits:{amount:{min,max,step}, cost:{min,max}}, contractSize, pipSize, pointSize, stopsLevel, delayed:boolean } — pipValue/pointValue are NEVER stored (dynamic: pointSize x contractSize in quote ccy, converted at current rate)",
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
      },
      {
        sequelize,
        modelName: "fxInstrument",
        tableName: "fx_instrument",
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
            name: "fxInstrumentCurrencyPairKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "currency" }, { name: "pair" }],
          },
          {
            name: "fxInstrumentStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "fxInstrumentAssetClassIdx",
            using: "BTREE",
            fields: [{ name: "assetClass" }],
          },
          {
            name: "fxInstrumentGroupIdIdx",
            using: "BTREE",
            fields: [{ name: "groupId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    fxInstrument.belongsTo(models.fxSymbolGroup, {
      as: "group",
      foreignKey: "groupId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
