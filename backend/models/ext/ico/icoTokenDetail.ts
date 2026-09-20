import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class icoTokenDetail
  extends Model<icoTokenDetailAttributes, icoTokenDetailCreationAttributes>
  implements icoTokenDetailAttributes
{
  id!: string;
  offeringId!: string;
  tokenType!: string;
  totalSupply!: number;
  tokensForSale!: number;
  salePercentage!: number;
  blockchain!: string;
  description!: string;
  useOfFunds!: any;
  links!: {
    whitepaper?: string;
    github?: string;
    telegram?: string;
    twitter?: string;
  };
  vestingEnabled!: boolean;
  vestingType?: "LINEAR" | "CLIFF" | "MILESTONE" | null;
  vestingDurationMonths?: number | null;
  vestingCliffMonths?: number | null;
  vestingMilestones?: any;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof icoTokenDetail {
    return icoTokenDetail.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        offeringId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "offeringId: Offering ID cannot be null" },
            isUUID: { args: ANY_UUID_VERSION,
              msg: "offeringId: Offering ID must be a valid UUID",
            },
          },
        },
        tokenType: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: { msg: "tokenType: Token type must not be empty" },
          },
        },
        totalSupply: {
          type: DataTypes.DECIMAL(36, 8),
          // mysql2 returns DECIMAL as a STRING. `*` and `-` coerce, but `<`
          // and `>` between two of them compare LEXICOGRAPHICALLY, so every
          // balance/threshold check silently used string order. Hand back a
          // number so comparisons mean what they read as.
          get(this: any) {
            const value = this.getDataValue("totalSupply");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          validate: {
            isFloat: { msg: "totalSupply: Must be a valid number" },
            min: { args: [0], msg: "totalSupply: Cannot be negative" },
          },
        },
        tokensForSale: {
          type: DataTypes.DECIMAL(36, 8),
          // mysql2 returns DECIMAL as a STRING. `*` and `-` coerce, but `<`
          // and `>` between two of them compare LEXICOGRAPHICALLY, so every
          // balance/threshold check silently used string order. Hand back a
          // number so comparisons mean what they read as.
          get(this: any) {
            const value = this.getDataValue("tokensForSale");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          validate: {
            isFloat: { msg: "tokensForSale: Must be a valid number" },
            min: { args: [0], msg: "tokensForSale: Cannot be negative" },
          },
        },
        salePercentage: {
          type: DataTypes.DECIMAL(5, 2),
          // mysql2 returns DECIMAL as a STRING. `*` and `-` coerce, but `<`
          // and `>` between two of them compare LEXICOGRAPHICALLY, so every
          // balance/threshold check silently used string order. Hand back a
          // number so comparisons mean what they read as.
          get(this: any) {
            const value = this.getDataValue("salePercentage");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          validate: {
            isFloat: { msg: "salePercentage: Must be a valid number" },
            min: { args: [0], msg: "salePercentage: Cannot be negative" },
            max: { args: [100], msg: "salePercentage: Cannot exceed 100" },
          },
        },
        blockchain: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: { msg: "blockchain: Blockchain must not be empty" },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description must not be empty" },
          },
        },
        useOfFunds: {
          type: DataTypes.JSON,
          allowNull: false,
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: icoTokenDetail) {
            const value = this.getDataValue("useOfFunds") as unknown;
            if (value == null) return [];
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return [];
              }
            }
            return value;
          },
        },
        links: {
          type: DataTypes.JSON,
          allowNull: false,
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: icoTokenDetail) {
            const value = this.getDataValue("links") as unknown;
            if (value == null) return [];
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return [];
              }
            }
            return value;
          },
        },
        // --- Vesting ---------------------------------------------------------
        // The offering's distribution promise, captured at launch. It is stored
        // on the offering (not on the buyer) because every buyer of a given sale
        // vests on the same terms; the per-buyer schedule is materialised into
        // `ico_token_vesting` / `ico_token_vesting_release` at purchase time so
        // the terms a buyer agreed to cannot be edited out from under them.
        vestingEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        vestingType: {
          type: DataTypes.ENUM("LINEAR", "CLIFF", "MILESTONE"),
          allowNull: true,
          comment:
            "LINEAR: equal monthly tranches. CLIFF: nothing until the cliff, then the accrued portion, then monthly. MILESTONE: explicit dated percentages.",
        },
        vestingDurationMonths: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "Total vesting length in months (LINEAR and CLIFF only)",
        },
        vestingCliffMonths: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "Months before the first tranche unlocks (CLIFF only)",
        },
        vestingMilestones: {
          type: DataTypes.JSON,
          allowNull: true,
          comment:
            "MILESTONE only: [{ monthsAfterPurchase, percentage }] summing to 100",
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: icoTokenDetail) {
            const value = this.getDataValue("vestingMilestones") as unknown;
            if (value == null) return null;
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
        },
      },
      {
        sequelize,
        modelName: "icoTokenDetail",
        tableName: "ico_token_detail",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "icoTokenDetailOfferingIdKey",
            unique: true,
            fields: [{ name: "offeringId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    icoTokenDetail.belongsTo(models.icoTokenOffering, {
      as: "offering",
      foreignKey: "offeringId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    // Association without foreign key constraint (table already has 64 keys - MySQL limit)
    // This allows eager loading without creating a new database constraint
    icoTokenDetail.belongsTo(models.icoTokenType, {
      as: "tokenTypeData",
      foreignKey: "tokenType",
      targetKey: "id",
      constraints: false, // Don't create FK constraint in database
    });
  }
}
