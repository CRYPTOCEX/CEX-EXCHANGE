import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * Append-only evidence log of geographic access decisions.
 *
 * This exists for the legal side of the feature, not for debugging: when an
 * operator has to demonstrate that restricted jurisdictions were actually
 * turned away — and that the rule in force at the time was applied — this is
 * the record that proves it. Rows are never updated; they are only inserted,
 * and pruned wholesale by the retention job.
 *
 * NOT paranoid: a soft-deleted audit row is worse than useless (it looks like
 * evidence but is filtered out of every query). Retention is explicit and
 * operator-configured via `geoRestrictionLogRetentionDays`.
 *
 * Writes are best-effort and deduplicated (see @b/utils/geo/audit): a blocked
 * crawler retrying 50x/second must not be able to fill the disk, and a logging
 * failure must never turn into a request failure.
 */
export type GeoAccessDecision = "BLOCKED" | "ALLOWED" | "BYPASSED";

/**
 * Which signal produced the country. Ordered strongest-first in the resolver;
 * recorded here so a disputed block can be traced to its evidence.
 */
export type GeoCountrySource =
  | "CDN_HEADER"
  | "IP_LOOKUP"
  | "KYC"
  | "PROFILE"
  | "MANUAL"
  | "NONE";

export const GEO_ACCESS_DECISIONS: GeoAccessDecision[] = [
  "BLOCKED",
  "ALLOWED",
  "BYPASSED",
];

export const GEO_COUNTRY_SOURCES: GeoCountrySource[] = [
  "CDN_HEADER",
  "IP_LOOKUP",
  "KYC",
  "PROFILE",
  "MANUAL",
  "NONE",
];

export default class geoAccessLog
  extends Model<geoAccessLogAttributes, geoAccessLogCreationAttributes>
  implements geoAccessLogAttributes
{
  id!: string;
  ip!: string;
  countryCode?: string | null;
  countryName?: string | null;
  region?: string | null;
  city?: string | null;
  source!: GeoCountrySource;
  decision!: GeoAccessDecision;
  /** Machine-readable outcome code, e.g. COUNTRY_BLOCKED, ADMIN_BYPASS. */
  reasonCode!: string;
  /** Human sentence shown to the visitor / stored for the record. */
  reasonDetail?: string | null;
  restrictionId?: string | null;
  action?: string | null;
  path!: string;
  method!: string;
  userId?: string | null;
  userAgent?: string | null;
  isProxy?: boolean | null;
  isHosting?: boolean | null;
  isTor?: boolean | null;
  /** Repeats collapsed into this row by the dedupe window (1 = no repeats). */
  hitCount!: number;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof geoAccessLog {
    return geoAccessLog.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        // Wide enough for a full IPv6 address plus a scope id.
        ip: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        countryCode: {
          type: DataTypes.STRING(2),
          allowNull: true,
        },
        countryName: {
          type: DataTypes.STRING(128),
          allowNull: true,
        },
        region: {
          type: DataTypes.STRING(128),
          allowNull: true,
        },
        city: {
          type: DataTypes.STRING(128),
          allowNull: true,
        },
        source: {
          type: DataTypes.ENUM(
            "CDN_HEADER",
            "IP_LOOKUP",
            "KYC",
            "PROFILE",
            "MANUAL",
            "NONE"
          ),
          allowNull: false,
          defaultValue: "NONE",
        },
        decision: {
          type: DataTypes.ENUM("BLOCKED", "ALLOWED", "BYPASSED"),
          allowNull: false,
        },
        reasonCode: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        reasonDetail: {
          type: DataTypes.STRING(512),
          allowNull: true,
        },
        // Plain UUID, not an FK: the rule may be soft-deleted or the row may
        // outlive it, and the audit trail must not cascade away with it.
        restrictionId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        action: {
          type: DataTypes.STRING(32),
          allowNull: true,
        },
        path: {
          type: DataTypes.STRING(512),
          allowNull: false,
        },
        method: {
          type: DataTypes.STRING(10),
          allowNull: false,
        },
        // Nullable and un-constrained: most geo decisions happen before the
        // visitor is authenticated, and deleting a user must not erase the
        // record that their jurisdiction was refused.
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        userAgent: {
          type: DataTypes.STRING(512),
          allowNull: true,
        },
        isProxy: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
        },
        isHosting: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
        },
        isTor: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
        },
        hitCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
      },
      {
        sequelize,
        modelName: "geoAccessLog",
        tableName: "geo_access_log",
        timestamps: true,
        paranoid: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            // Drives both the admin log table (newest first) and the
            // retention purge (delete where createdAt < cutoff).
            name: "geoAccessLogCreatedAtIdx",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
          {
            name: "geoAccessLogDecisionCreatedAtIdx",
            using: "BTREE",
            fields: [{ name: "decision" }, { name: "createdAt" }],
          },
          {
            name: "geoAccessLogCountryCodeIdx",
            using: "BTREE",
            fields: [{ name: "countryCode" }],
          },
          {
            name: "geoAccessLogIpIdx",
            using: "BTREE",
            fields: [{ name: "ip" }],
          },
          {
            name: "geoAccessLogUserIdIdx",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Reporting convenience only. `constraints: false` keeps this a pure JOIN
    // hint: no FK is created, so deleting a user leaves the audit row intact.
    geoAccessLog.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      constraints: false,
    });
  }
}
