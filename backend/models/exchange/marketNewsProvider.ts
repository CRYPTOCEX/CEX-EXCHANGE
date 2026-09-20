import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * marketNewsProvider — the operator's control surface for where market news
 * comes from.
 *
 * WHY A TABLE AND NOT A CONSTANT. Until this row existed the core news feed had
 * exactly one source, chosen at compile time, switched on by the mere presence
 * of `APP_FINNHUB_API_KEY`, and tuned by three constants in the cron job. An
 * operator who wanted a second source, a different category, or a different
 * retention had to edit TypeScript. The admin screen showed the stories and
 * nothing at all about where they came from.
 *
 * MULTI-ACTIVE, deliberately unlike `fx_provider`.
 * The fx addon quotes prices, and two providers disagreeing about the price of
 * EURUSD is a bug — hence its single-active rule. News is additive: a desk
 * reading CryptoPanic for tagged tickers AND an RSS feed for its own
 * publisher's copy is a normal setup, and the `externalId` unique key already
 * makes the merge idempotent. So `status` is a plain per-row switch and any
 * number of rows may hold it.
 *
 * TWO JSON COLUMNS, BOTH TEXT. `categories` and `config` are TEXT holding JSON
 * behind a guarded getter, exactly as `marketNews.relatedSymbols` is and for
 * the same reason: production MySQL hands a `DataTypes.JSON` column back
 * pre-parsed while local MariaDB hands back a string, so a route that assumed
 * either one broke on the other install. The getters below normalise both and
 * degrade an unparseable value to null rather than throwing inside a request.
 *
 * `apiKey` IS STORED IN THE CLEAR, and that is a deliberate, bounded choice.
 *
 * The alternative was `@b/utils/encrypt`, and it is the wrong tool here: that
 * is the ecosystem VAULT, unlocked by an admin after every restart and absent
 * from `.env.example` entirely. Keys encrypted with it would stop the news sync
 * dead whenever the vault happened to be locked, which is a far worse failure
 * than the one it would prevent.
 *
 * The other alternative was writing the operator's key into `.env`. That is
 * where every other credential in this product lives, and it does not work for
 * this one: the scheduler runs in a SEPARATE PROCESS from the admin console
 * (`dev:web` and `dev:cron`, two pm2 apps in production), so a key saved
 * through the console would be live for the Test button and stale for the job
 * that actually syncs, until someone restarted. A row both processes read is
 * the only shape without that gap.
 *
 * What that costs, stated plainly so nobody discovers it later: this value
 * appears in a `mysqldump`, and therefore in the admin database backup. These
 * are read-only news-feed keys on free tiers with no financial authority,
 * which is the only class of secret this treatment is acceptable for. The env
 * var remains supported and takes second place, so an operator who would
 * rather keep the key out of the database simply does not use this field.
 *
 * `lastSync*` is state, not configuration. It is written by the cron job and by
 * the admin "sync now" button so the console can answer the only question an
 * operator actually asks — "is this thing working right now?" — without making
 * them read a log file.
 */
export default class marketNewsProvider
  extends Model<
    marketNewsProviderAttributes,
    marketNewsProviderCreationAttributes
  >
  implements marketNewsProviderAttributes
{
  id!: string;
  name!: string;
  title!: string;
  description?: string;
  status?: boolean;
  apiKey?: string;
  categories?: string;
  fetchLimit?: number;
  retentionDays?: number;
  config?: string;
  lastSyncAt?: Date;
  lastSyncStatus?: string;
  lastSyncCount?: number;
  lastSyncMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof marketNewsProvider {
    return marketNewsProvider.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(64),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
          comment:
            "Adapter identifier (finnhub, cryptocompare, cryptopanic, rss) — the join key to the code, never renamed",
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
          allowNull: true,
          comment:
            "What the adapter can actually do — re-synced from the catalogue on every list call so an upgraded install never shows stale claims",
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment:
            "Enabled — any number of rows may hold this, unlike fx_provider",
        },
        apiKey: {
          type: DataTypes.STRING(500),
          allowNull: true,
          comment:
            "Operator-supplied vendor credential. Takes precedence over the env var. NEVER returned by any endpoint - the admin console reports only whether one is stored.",
        },
        categories: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment:
            "JSON array of what to ask this provider for; each adapter decides what a category means to its own vendor",
          set(value) {
            this.setDataValue(
              "categories",
              value === null || value === undefined || typeof value === "string"
                ? (value as any)
                : JSON.stringify(value)
            );
          },
          get() {
            const value = this.getDataValue("categories");
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
        fetchLimit: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 60,
          validate: {
            min: { args: [1], msg: "fetchLimit: Must be at least 1" },
            max: { args: [500], msg: "fetchLimit: Must be 500 or fewer" },
          },
          comment: "Stories pulled per category, per run",
        },
        retentionDays: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 30,
          validate: {
            min: { args: [1], msg: "retentionDays: Must be at least 1" },
            max: { args: [3650], msg: "retentionDays: Must be 3650 or fewer" },
          },
          comment:
            "Age at which this provider's own rows are pruned; MANUAL rows are exempt and stay the operator's to remove",
        },
        config: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment:
            "JSON object of adapter-specific settings (rss feed list, cryptopanic filter, ...)",
          set(value) {
            this.setDataValue(
              "config",
              value === null || value === undefined || typeof value === "string"
                ? (value as any)
                : JSON.stringify(value)
            );
          },
          get() {
            const value = this.getDataValue("config");
            if (!value) return null;
            if (typeof value !== "string") return value as any;
            try {
              const parsed = JSON.parse(value);
              return parsed && typeof parsed === "object" && !Array.isArray(parsed)
                ? (parsed as any)
                : null;
            } catch {
              return null;
            }
          },
        },
        lastSyncAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        lastSyncStatus: {
          type: DataTypes.STRING(16),
          allowNull: true,
          validate: {
            isIn: {
              args: [["OK", "EMPTY", "ERROR", "SKIPPED"]],
              msg: "lastSyncStatus: Must be OK, EMPTY, ERROR or SKIPPED",
            },
          },
          comment:
            "Outcome of the last run. EMPTY is not ERROR — a vendor with no new stories is a normal Sunday",
        },
        lastSyncCount: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
          comment: "Rows INSERTED on the last run, not rows returned",
        },
        lastSyncMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment:
            "Operator-readable detail. Never holds a credential — the adapters redact before they report",
        },
      },
      {
        sequelize,
        modelName: "marketNewsProvider",
        tableName: "market_news_provider",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "marketNewsProviderNameKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "name" }],
          },
        ],
      }
    );
  }
}
