import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * Empty documents for the two JSON columns.
 *
 * Hoisted out of `init()` on purpose: the model-type generator parses the
 * attribute block by matching braces, so a nested object literal inline in
 * `defaultValue` confuses it and the emitted attribute type comes out subtly
 * wrong.
 *
 * Passed as FUNCTIONS, not objects. Sequelize calls a function `defaultValue`
 * per instance (`Utils.toDefaultValue`), so every row gets its own document; a
 * shared object literal would be handed to every instance by reference and the
 * first row to mutate it would change the default for the whole process.
 */
const emptyMenuOverrides = () => ({});
const emptyFooterContent = () => ({
  siteName: null,
  siteDescription: null,
  copyright: null,
  links: { hidden: [], labels: {}, icons: {}, order: {}, custom: [] },
  socials: null,
});

/**
 * The site's chrome selection — which navbar and footer LAYOUT the public site
 * renders. One row, ever.
 *
 * WHY THIS IS NOT IN `settings`
 * `GET /api/settings` is `requiresAuth: false` and returns every row, so the
 * settings table is a world-readable bag with a case-insensitive key and a size
 * cap. Chrome selection gets its own table so phases 3 and 4 can add footer
 * content and menu references without widening a public surface.
 *
 * The two JSON documents were added once their shape was settled, rather than
 * guessed at up front — an ALTER later is cheaper than a wrong wide schema kept
 * forever. Their contents are described in `frontend/lib/chrome/menu-overrides`
 * and `frontend/lib/chrome/content.ts`.
 *
 * ============================================================================
 * NO GETTERS ON THE JSON COLUMNS. THAT IS DELIBERATE.
 * ============================================================================
 *
 * The obvious thing here is a `get()` that parses the stored text. It is a trap:
 * production MySQL hands back an already-parsed object, local MariaDB (where
 * JSON is a LONGTEXT alias) hands back a string, and a `create()`/`update()`
 * result holds whatever was assigned. A getter calling `JSON.parse` therefore
 * works locally and 500s in production with `"[object Object]" is not valid
 * JSON`; this codebase has taken that outage before, on `walletPnl.balances`.
 *
 * So the guard lives in exactly ONE place instead — `toStoredJsonObject` in
 * `@b/api/content/chrome/utils`, which every read path goes through. Adding a
 * getter here would create a second normaliser to keep in step, and the two
 * disagreeing is how a double-encoded document ends up stored.
 */
export default class siteChrome
  extends Model<siteChromeAttributes, siteChromeCreationAttributes>
  implements siteChromeAttributes
{
  id!: string;
  navbarVariant!: string;
  footerVariant!: string;
  menuOverrides?: any;
  footerContent?: any;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof siteChrome {
    return siteChrome.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: "Unique identifier for the site chrome row (singleton)",
        },
        navbarVariant: {
          type: DataTypes.STRING(64),
          allowNull: false,
          defaultValue: "classic",
          comment:
            "Id of the navbar layout variant, matching the chrome variant registry",
        },
        footerVariant: {
          type: DataTypes.STRING(64),
          allowNull: false,
          defaultValue: "columns",
          comment:
            "Id of the footer layout variant, matching the chrome variant registry",
        },
        // NULLABLE, with the empty document as the application-level default.
        //
        // MySQL and MariaDB both refuse a DEFAULT clause on a JSON/TEXT column,
        // and sequelize knows it — its mysql dialect drops the clause for
        // BLOB/TEXT/GEOMETRY/JSON rather than emitting DDL the server rejects.
        // So `defaultValue` here applies on `create()` only and the COLUMN
        // default stays NULL. That is fine, and it is why the columns are
        // nullable: a row inserted by anything other than sequelize, or one
        // written before these columns existed, reads as NULL and the shared
        // reader turns that into the empty document.
        menuOverrides: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: emptyMenuOverrides,
          comment:
            "Menu override patches keyed by scope (admin, user, ext_*). Patch, never a snapshot - see frontend/lib/chrome/menu-overrides.ts",
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
          get(this: siteChrome) {
            const value = this.getDataValue("menuOverrides") as unknown;
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
        footerContent: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: emptyFooterContent,
          comment:
            "Footer brand text, link override patch and social links. null socials = derive from settings; [] = show none",
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
          get(this: siteChrome) {
            const value = this.getDataValue("footerContent") as unknown;
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
        createdAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: Sequelize.NOW,
        },
      },
      {
        sequelize,
        modelName: "siteChrome",
        tableName: "site_chrome",
        timestamps: true,
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
