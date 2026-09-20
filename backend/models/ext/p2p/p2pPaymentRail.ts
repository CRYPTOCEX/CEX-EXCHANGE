import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * A payment RAIL: the shared identity of a way to pay, and the shape of the
 * details it needs.
 *
 * WHY THIS EXISTS
 * ---------------
 * `p2p_payment_methods` was two things in one row: the identity ("PayPal") and
 * one person's credentials (`metadata: {"PayPal email": "me@example.com"}`).
 * Every trader who accepted PayPal therefore created another row NAMED PayPal,
 * and the marketplace's payment filter is built by grouping the methods attached
 * to live offers — keyed on the row id. A thousand traders accepting PayPal
 * produced a thousand filter entries, every one of them reading "PayPal".
 *
 * Splitting them gives each half a single job:
 *
 *   THE RAIL  — name, icon, and the FIELDS this way of paying needs. Shared by
 *               everyone, and the thing the market filters on, an offer's chips
 *               are drawn from, and a trader picks when adding their details.
 *   THE ACCOUNT — `p2p_payment_methods`, unchanged in shape and still the row an
 *               offer links to and a trade snapshots. It now carries `railId`
 *               and its `metadata` holds the VALUES for that rail's fields.
 *
 * WHAT WAS DELIBERATELY NOT DONE
 * ------------------------------
 * The offer join (`p2p_offer_payment_method`) and the trade payment snapshot
 * still point at the account row. Repointing them at the rail would have been
 * tidier and would have rewritten, in one migration, the rows that decide where
 * a buyer sends money and what an offer accepts. The duplication complaint is
 * entirely about how the FACET is keyed, and grouping the facet by `railId`
 * answers it without touching a single live offer or trade.
 *
 * TWO KINDS OF RAIL
 * -----------------
 * A CATALOGUE rail (PayPal, Wise, SEPA) ships with its fields defined, because
 * the fields are a property of the rail rather than of whoever is using it. A
 * CUSTOM rail is defined by the first trader who needs it, and its shape is then
 * FROZEN: the next trader to use it fills in values for the same fields. That is
 * the whole point — a shape that each user could edit is just the old free-form
 * blob with extra steps, and it would put the same rail in the filter twice as
 * soon as two people disagreed about the field names. A trader who needs a
 * different shape creates a differently-named rail.
 */
export default class p2pPaymentRail
  extends Model<p2pPaymentRailAttributes, p2pPaymentRailCreationAttributes>
  implements p2pPaymentRailAttributes
{
  id!: string;
  name!: string;
  slug!: string;
  icon?: string;
  description?: string;
  fields!: {
    /** Stable key. Also the metadata key an account stores its value under. */
    key: string;
    /** What the trader is asked for. */
    label: string;
    required: boolean;
    placeholder?: string;
    /** One line of help, where the label alone is not enough. */
    help?: string;
  }[];
  isCustom!: boolean;
  createdByUserId?: string;
  listed!: boolean;
  available!: boolean;
  popularityRank!: number;
  processingTime?: string;
  fees?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof p2pPaymentRail {
    return p2pPaymentRail.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: { msg: "Payment rail name must not be empty" },
          },
        },
        /**
         * The DEDUPLICATION KEY, and the reason it is a column rather than a
         * function of `name`.
         *
         * The complaint this table answers is "one PayPal, not a thousand", and
         * a unique constraint on `name` does not deliver that: "PayPal",
         * "Paypal", "pay pal" and "PayPal " are four different strings and the
         * database will happily hold all four. `slug` is the name reduced to
         * lower-case alphanumerics (see `railSlug`), it is UNIQUE, and it is
         * what a create checks against — so the duplication cannot come back
         * through spelling.
         */
        slug: {
          type: DataTypes.STRING(120),
          allowNull: false,
          unique: "p2p_payment_rails_slug_unique",
          validate: {
            notEmpty: { msg: "Payment rail slug must not be empty" },
          },
        },
        icon: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        /**
         * The shape. An ARRAY, because order is meaningful — it is the order the
         * trader fills the form in and the order their buyer reads the details.
         */
        fields: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
          comment:
            "Ordered field definitions: [{key,label,required,placeholder,help}]. An account stores its values against these keys.",
          get() {
            const rawValue = this.getDataValue(
              "fields" as keyof p2pPaymentRailAttributes
            );
            // On this platform's MySQL driver a JSON column comes back as a
            // STRING on some installs and as an object on others; the model that
            // does not handle both 500s on exactly one of them.
            if (!rawValue) return [];
            if (typeof rawValue === "string") {
              try {
                const parsed = JSON.parse(rawValue);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            }
            return Array.isArray(rawValue) ? rawValue : [];
          },
        },
        isCustom: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment:
            "True when a trader defined this rail rather than it shipping in the catalogue.",
        },
        createdByUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "Null for catalogue rails. The author of a custom rail.",
        },
        /**
         * Whether this rail appears in the PUBLIC market filter.
         *
         * Catalogue rails are listed. A trader-created rail is not — it works
         * from the moment it is saved, it is findable by name by the next trader
         * who needs it, and it appears on the offers that use it. What it does
         * not do is enter the filter every visitor sees on the strength of one
         * person having typed it. The market promotes a rail once it is carried
         * by offers from more than one maker; an admin can list one directly.
         */
        listed: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        available: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        popularityRank: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        processingTime: {
          type: DataTypes.STRING(50),
          allowNull: true,
          comment: "Default clearing time, which an account may override.",
        },
        fees: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "p2pPaymentRail",
        tableName: "p2p_payment_rails",
        timestamps: true,
        paranoid: true,
        indexes: [
          { name: "p2p_payment_rails_slug_unique", unique: true, fields: ["slug"] },
          { name: "p2p_payment_rails_listed", fields: ["listed", "available"] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // A rail has many accounts — one per trader who uses it.
    p2pPaymentRail.hasMany(models.p2pPaymentMethod, {
      as: "accounts",
      foreignKey: "railId",
      // NOT cascade. Deleting a rail must never silently take a trader's stored
      // account details with it, and both models are paranoid, so the account
      // outlives the soft-delete and can be reattached.
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    p2pPaymentRail.belongsTo(models.user, {
      as: "author",
      foreignKey: "createdByUserId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
