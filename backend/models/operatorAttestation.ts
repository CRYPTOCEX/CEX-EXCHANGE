import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * ONE LICENCE THIS OPERATOR HOLDS, FOR ONE MODULE, IN ONE COUNTRY.
 *
 * ---------------------------------------------------------------------------
 * WHY THE PLATFORM ASKS AT ALL
 * ---------------------------------------------------------------------------
 * We are a template vendor: the operator publishes the app under their own
 * developer account, and every store rule that matters attaches to THEM. Apple
 * 3.1.5(iii) tests whether a crypto exchange is licensed in the storefronts it
 * is offered in; Google Play's crypto policy names fourteen countries where a
 * licence or registration is required. We cannot hold either on their behalf,
 * and we cannot verify a claim they make — but we can refuse to serve a
 * regulated module into a country nobody has claimed at all.
 *
 * So this table is the operator's own statement, recorded rather than assumed.
 * It is deliberately not evidence: nothing here is verified against a
 * regulator. What it changes is that serving futures into Germany becomes
 * something somebody typed a licence number for, instead of a default.
 *
 * ---------------------------------------------------------------------------
 * DEFAULT DENY, AND WHAT THAT COSTS
 * ---------------------------------------------------------------------------
 * An empty table serves NO regulated module to ANY mobile client. That is the
 * point, and it is the expensive direction: a fresh install shows a customer
 * fewer modules until the operator fills this in. The alternative — serve
 * everything until somebody objects — is how a fleet of operator apps ends up
 * in front of a reviewer with no licence behind any of them.
 *
 * ---------------------------------------------------------------------------
 * ONE ROW PER (MODULE, COUNTRY), AND NO UNIQUE INDEX
 * ---------------------------------------------------------------------------
 * Granular because a licence is: an operator may be authorised for spot in
 * twenty countries and derivatives in two.
 *
 * NO UNIQUE INDEX on (moduleId, countryCode) even though it reads like one,
 * because this model is paranoid and a UNIQUE column on a paranoid model keeps
 * the soft-deleted row's value — which would make re-attesting a country the
 * operator had previously removed impossible, forever, with a duplicate-key
 * error nobody could explain. The reader resolves duplicates instead: the row
 * with the furthest expiry wins.
 *
 * ---------------------------------------------------------------------------
 * EXPIRY IS ENFORCED, NOT DECORATIVE
 * ---------------------------------------------------------------------------
 * A lapsed attestation stops serving the module to residents of that country
 * the moment it lapses. No grace period: the window during which a platform
 * serves a regulated product with an expired licence is exactly the window
 * nobody wants to have to explain.
 */
export default class operatorAttestation
  extends Model<
    operatorAttestationAttributes,
    operatorAttestationCreationAttributes
  >
  implements operatorAttestationAttributes
{
  id!: string;
  /** A `MOBILE_MODULES` id — `futures`, `staking`, `p2p`. */
  moduleId!: string;
  /** ISO 3166-1 alpha-2, upper case. Stored normalised; see utils/attestation. */
  countryCode!: string;
  /** The legal entity that holds the licence — not the brand. */
  entityName!: string;
  /** The authority that issued it, in the operator's own words. */
  regulator!: string;
  /** Licence, registration or reference number. */
  licenceNumber!: string;
  /** When it lapses. A row past this date serves nobody. */
  expiresAt!: Date;
  /** Free-text, for whatever the four fields above cannot carry. */
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof operatorAttestation {
    return operatorAttestation.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        moduleId: {
          type: DataTypes.STRING(64),
          allowNull: false,
          validate: {
            notEmpty: { msg: "moduleId cannot be empty" },
          },
        },
        countryCode: {
          type: DataTypes.STRING(2),
          allowNull: false,
          validate: {
            // ISO-2 only. The resolver normalises ISO-3 on the way in, so a
            // three-letter value reaching the column is a bug rather than a
            // tolerated shape — and a silently-stored "USA" would match no
            // resident at all.
            is: {
              args: [/^[A-Z]{2}$/],
              msg: "countryCode must be an ISO 3166-1 alpha-2 code, upper case",
            },
          },
        },
        entityName: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: { notEmpty: { msg: "entityName cannot be empty" } },
        },
        regulator: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: { notEmpty: { msg: "regulator cannot be empty" } },
        },
        licenceNumber: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: { notEmpty: { msg: "licenceNumber cannot be empty" } },
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
          validate: { notNull: { msg: "expiresAt cannot be null" } },
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "operatorAttestation",
        tableName: "operator_attestations",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            // The reader's query: every live attestation for one module.
            name: "idx_attestation_module_country",
            using: "BTREE",
            fields: [{ name: "moduleId" }, { name: "countryCode" }],
          },
          {
            // "What lapses next" — the console's warning list.
            name: "idx_attestation_expiresAt",
            using: "BTREE",
            fields: [{ name: "expiresAt" }],
          },
        ],
      }
    );
  }
}
