import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

// A curated Hummingbot strategy/controller preset, authored by an admin in the
// Strategy Studio and (when published) distributed to users to download into
// their own Hummingbot install. The platform does NOT run these — it stores and
// generates the YAML; the bot runs locally on the operator's / user's machine.
export type HbStrategyFamily = "pmm" | "xemm";
export type HbStrategyStatus = "draft" | "published";

export interface hbStrategyPresetAttributes {
  id: string;
  name: string;
  description?: string | null;
  // Strategy family — drives the guided form and the YAML generator:
  //   pmm  → controller_name: bicrypto_pmm        (market_making)
  //   xemm → controller_name: xemm_multiple_levels (generic, maker on Bicrypto)
  family: HbStrategyFamily;
  // Maker trading pair in Hummingbot form, e.g. "BTC-USDT".
  pair: string;
  // Maker connector (always Bicrypto for our presets; stored for clarity/future).
  makerConnector: string;
  // Taker connector for XEMM (e.g. "binance"); null for PMM.
  takerConnector?: string | null;
  // Family-specific parameters (spreads, levels, amounts, leverage, …). The
  // YAML generator is a pure function of (family, pair, connectors, config).
  config: Record<string, any>;
  status: HbStrategyStatus;
  version: number;
  // Admin user who authored the preset (nullable so deleting the user keeps it).
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface hbStrategyPresetCreationAttributes
  extends Omit<
    hbStrategyPresetAttributes,
    "id" | "version" | "createdAt" | "updatedAt"
  > {}

export default class hbStrategyPreset
  extends Model<hbStrategyPresetAttributes, hbStrategyPresetCreationAttributes>
  implements hbStrategyPresetAttributes
{
  id!: string;
  name!: string;
  description?: string | null;
  family!: HbStrategyFamily;
  pair!: string;
  makerConnector!: string;
  takerConnector?: string | null;
  config!: Record<string, any>;
  status!: HbStrategyStatus;
  version!: number;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof hbStrategyPreset {
    return hbStrategyPreset.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(120),
          allowNull: false,
          validate: { notEmpty: { msg: "name: must not be empty" } },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        family: {
          type: DataTypes.ENUM("pmm", "xemm"),
          allowNull: false,
        },
        pair: {
          type: DataTypes.STRING(40),
          allowNull: false,
          validate: { notEmpty: { msg: "pair: must not be empty" } },
        },
        makerConnector: {
          type: DataTypes.STRING(60),
          allowNull: false,
          defaultValue: "bicrypto",
        },
        takerConnector: {
          type: DataTypes.STRING(60),
          allowNull: true,
        },
        config: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: {},
          /**
           * Parse on read.
           *
           * A DataTypes.JSON column comes back ALREADY PARSED on MySQL but as a
           * raw STRING on MariaDB, so every consumer that reaches into it works
           * on one and silently fails on the other. Here it made the YAML
           * generator reject a perfectly valid preset with "buySpreads must be a
           * non-empty array" — the array was there, but `("{...}").buySpreads`
           * is undefined, and a string has no properties to complain about.
           *
           * Normalising in the getter fixes every call site at once: the
           * supervisor writing controller YAML, the Studio, and the user-facing
           * download. Returns {} rather than throwing on malformed JSON, so one
           * bad row cannot take out the whole list endpoint.
           */
          get(this: hbStrategyPreset) {
            const raw = this.getDataValue("config") as any;
            if (typeof raw !== "string") return raw ?? {};
            try {
              return JSON.parse(raw);
            } catch {
              return {};
            }
          },
        },
        status: {
          type: DataTypes.ENUM("draft", "published"),
          allowNull: false,
          defaultValue: "draft",
        },
        version: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "hbStrategyPreset",
        tableName: "hb_strategy_preset",
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, using: "BTREE", fields: [{ name: "id" }] },
          { name: "hbStrategyPresetStatusIdx", using: "BTREE", fields: [{ name: "status" }] },
          { name: "hbStrategyPresetFamilyIdx", using: "BTREE", fields: [{ name: "family" }] },
          { name: "hbStrategyPresetCreatedByIdx", using: "BTREE", fields: [{ name: "createdBy" }] },
        ],
      }
    );
  }

  public static associate(models: any) {
    hbStrategyPreset.belongsTo(models.user, {
      as: "creator",
      foreignKey: "createdBy",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
