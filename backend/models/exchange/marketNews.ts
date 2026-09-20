import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * marketNews — the market-news feed beside the exchange trading chart.
 *
 * A CORE table, deliberately not the forex addon's `fx_market_news`. The
 * crypto terminal is core and must keep working on an install where the
 * forex-trading extension is absent, unlicensed or disabled — reading its
 * table would couple the busiest page in the app to an optional add-on. The
 * two feeds also carry different stories: the fx sync only ever asks its
 * provider for `category=forex`.
 *
 * Two-source model, same contract as the fx feed: PROVIDER rows are upserted
 * by `externalId` on each sync; MANUAL rows (NULL externalId) are operator
 * desk commentary and survive every sync untouched.
 *
 * `relatedSymbols` is TEXT holding a JSON array, not DataTypes.JSON: prod
 * MySQL returns JSON columns pre-parsed while local MariaDB returns a string,
 * so the guarded getter below normalises both and an unparseable value
 * degrades to an empty list instead of throwing inside a route.
 */
export default class marketNews
  extends Model<marketNewsAttributes, marketNewsCreationAttributes>
  implements marketNewsAttributes
{
  id!: string;
  externalId?: string;
  source!: string;
  provider?: string;
  publishedAt!: Date;
  headline!: string;
  summary?: string;
  url?: string;
  imageUrl?: string;
  category?: string;
  relatedSymbols?: string;
  status?: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof marketNews {
    return marketNews.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        externalId: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment:
            "Stable provider dedup key (<provider>:<id>) — NULL for operator-authored MANUAL rows",
        },
        source: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "PROVIDER",
          validate: {
            isIn: {
              args: [["PROVIDER", "MANUAL"]],
              msg: "source: Must be PROVIDER or MANUAL",
            },
          },
        },
        provider: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        publishedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        headline: {
          type: DataTypes.STRING(500),
          allowNull: false,
          validate: {
            notEmpty: { msg: "headline: Headline must not be empty" },
          },
        },
        summary: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment:
            "PLAIN TEXT only — vendors ship the publisher's HTML here, so every write door converts it first",
        },
        url: {
          type: DataTypes.STRING(1000),
          allowNull: true,
        },
        imageUrl: {
          type: DataTypes.STRING(1000),
          allowNull: true,
        },
        category: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: "Provider category (crypto, general, merger, ...)",
        },
        relatedSymbols: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "JSON array of base/quote assets this story is tagged with",
          set(value) {
            this.setDataValue(
              "relatedSymbols",
              value === null || value === undefined || typeof value === "string"
                ? (value as any)
                : JSON.stringify(value)
            );
          },
          get() {
            const value = this.getDataValue("relatedSymbols");
            if (!value) return null;
            if (typeof value !== "string") return value as any;
            try {
              const parsed = JSON.parse(value);
              return Array.isArray(parsed) ? (parsed as any) : null;
            } catch {
              return null;
            }
          },
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: true,
          comment: "Visible to clients — lets an operator pull a story",
        },
      },
      {
        sequelize,
        modelName: "marketNews",
        tableName: "market_news",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "marketNewsExternalIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "externalId" }],
          },
          {
            name: "marketNewsPublishedAtIndex",
            using: "BTREE",
            fields: [{ name: "publishedAt" }],
          },
        ],
      }
    );
  }
}
