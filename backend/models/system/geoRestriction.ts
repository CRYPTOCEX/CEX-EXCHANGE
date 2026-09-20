import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * One operator-authored geographic access rule, keyed by ISO 3166-1 alpha-2
 * country code.
 *
 * This table is the evidentiary record of WHAT was restricted, WHY, BY WHOM
 * and WHEN — the thing a regulator or auditor actually asks for. It is
 * therefore `paranoid` (soft delete): a rule that has been retired must still
 * be provable for the period it was in force. Never hard-delete rows here.
 *
 * How a rule is read depends on the platform-wide `geoRestrictionMode`
 * setting (see @b/utils/geo/settings):
 *
 *   BLOCKLIST (default) — everyone is allowed except countries with an active
 *                         BLOCK rule. ALLOW rules are explicit carve-outs that
 *                         win over a BLOCK rule for the same country.
 *   ALLOWLIST           — everyone is blocked except countries with an active
 *                         ALLOW rule. A BLOCK rule still blocks (redundant but
 *                         harmless, and useful when switching modes).
 *
 * A rule only bites while it is BOTH `status: true` AND inside its
 * effectiveFrom/effectiveTo window, so a compliance date can be staged in
 * advance instead of being flipped by hand at midnight.
 */
export type GeoRestrictionType = "BLOCK" | "ALLOW";

/**
 * FULL    — the country cannot reach the platform at all (subject to the
 *           account-exit carve-outs in the policy settings).
 * PARTIAL — the country can browse and hold an account, but the activities
 *           listed in `restrictedActions` are refused.
 */
export type GeoRestrictionScope = "FULL" | "PARTIAL";

/**
 * The legal basis for the rule. Recorded so a restriction can be explained
 * years later without archaeology; purely descriptive — enforcement never
 * branches on it.
 */
export type GeoRestrictionReason =
  | "SANCTIONS"
  | "UNLICENSED"
  | "REGULATORY"
  | "HIGH_RISK"
  | "INTERNAL_POLICY"
  | "OTHER";

export const GEO_RESTRICTION_TYPES: GeoRestrictionType[] = ["BLOCK", "ALLOW"];
export const GEO_RESTRICTION_SCOPES: GeoRestrictionScope[] = [
  "FULL",
  "PARTIAL",
];
export const GEO_RESTRICTION_REASONS: GeoRestrictionReason[] = [
  "SANCTIONS",
  "UNLICENSED",
  "REGULATORY",
  "HIGH_RISK",
  "INTERNAL_POLICY",
  "OTHER",
];

export default class geoRestriction
  extends Model<geoRestrictionAttributes, geoRestrictionCreationAttributes>
  implements geoRestrictionAttributes
{
  id!: string;
  countryCode!: string;
  countryName!: string;
  type!: GeoRestrictionType;
  scope!: GeoRestrictionScope;
  restrictedActions?: string[] | null;
  reason!: GeoRestrictionReason;
  legalReference?: string | null;
  notes?: string | null;
  status!: boolean;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof geoRestriction {
    return geoRestriction.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        countryCode: {
          type: DataTypes.STRING(2),
          allowNull: false,
          validate: {
            is: {
              args: /^[A-Z]{2}$/,
              msg: "countryCode: Country code must be an ISO 3166-1 alpha-2 code (e.g. US)",
            },
          },
        },
        countryName: {
          type: DataTypes.STRING(128),
          allowNull: false,
          validate: {
            notEmpty: { msg: "countryName: Country name cannot be empty" },
          },
        },
        type: {
          type: DataTypes.ENUM("BLOCK", "ALLOW"),
          allowNull: false,
          defaultValue: "BLOCK",
          validate: {
            isIn: {
              args: [GEO_RESTRICTION_TYPES],
              msg: "type: Type must be one of BLOCK, ALLOW",
            },
          },
        },
        scope: {
          type: DataTypes.ENUM("FULL", "PARTIAL"),
          allowNull: false,
          defaultValue: "FULL",
          validate: {
            isIn: {
              args: [GEO_RESTRICTION_SCOPES],
              msg: "scope: Scope must be one of FULL, PARTIAL",
            },
          },
        },
        // Meaningful only when scope === "PARTIAL". Values are the action keys
        // from @b/utils/geo/actions (REGISTER, TRADE, DEPOSIT, ...).
        restrictedActions: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: null,
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
          get(this: geoRestriction) {
            const value = this.getDataValue("restrictedActions") as unknown;
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
        reason: {
          type: DataTypes.ENUM(
            "SANCTIONS",
            "UNLICENSED",
            "REGULATORY",
            "HIGH_RISK",
            "INTERNAL_POLICY",
            "OTHER"
          ),
          allowNull: false,
          defaultValue: "REGULATORY",
          validate: {
            isIn: {
              args: [GEO_RESTRICTION_REASONS],
              msg: `reason: Reason must be one of ${GEO_RESTRICTION_REASONS.join(", ")}`,
            },
          },
        },
        // Free text citation, e.g. "OFAC 31 CFR Part 560" or "MiCA Art. 59".
        legalReference: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        // Null means "in force immediately / indefinitely". Both bounds are
        // inclusive of the start and exclusive of the end.
        effectiveFrom: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        effectiveTo: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        // Accountability trail: which admin authored / last changed the rule.
        // Deliberately plain UUID columns rather than FKs — the rule must
        // survive the deletion of the staff account that created it.
        createdBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        updatedBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "geoRestriction",
        tableName: "geo_restriction",
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
            // One live rule per country. Soft-deleted rows keep their code, so
            // the uniqueness is enforced in the API layer against non-deleted
            // rows rather than by a DB constraint that a restore would break.
            name: "geoRestrictionCountryCodeIdx",
            using: "BTREE",
            fields: [{ name: "countryCode" }],
          },
          {
            name: "geoRestrictionStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {}
}
