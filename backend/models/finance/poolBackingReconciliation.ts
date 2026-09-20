import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * ONE ROW PER CURRENCY PER RECONCILIATION RUN — WHAT WAS READ, NOT JUST WHAT
 * WAS CONCLUDED.
 *
 * A gap between liabilities and holdings and a stale read of the exchange look
 * identical as a single number. So the row keeps the split of L (customers,
 * Super Admin, debited-but-unsent withdrawals) and the split of H per exchange
 * account type with the time each was fetched, and `status` says whether H
 * was readable at all. A run whose exchange read failed writes `h_unknown`,
 * carries no G and no drift, and raises no alert: an unreadable exchange is
 * not a hole.
 *
 * `drift` is the residual no obligation explains, and it is persisted only
 * once the same residual has survived `driftRunStreak` consecutive runs above
 * the currency's tolerance — a deposit credited on the venue minutes before
 * the database credits it is a transient, not a finding.
 */
export default class poolBackingReconciliation
  extends Model<poolBackingReconciliationAttributes, poolBackingReconciliationCreationAttributes>
  implements poolBackingReconciliationAttributes
{
  id!: string;
  runId!: string;
  currency!: string;
  at!: Date;
  status!: "ok" | "h_unknown";
  liabilities!: number;
  liabilitiesSplit?: Record<string, any> | null;
  holdings?: number | null;
  holdingsSplit?: Record<string, any> | null;
  ecosystemSplit?: Record<string, any> | null;
  ecosystemError?: string | null;
  inFlight!: number;
  gap?: number | null;
  openObligations!: number;
  residual?: number | null;
  drift?: number | null;
  driftRunStreak!: number;
  holdingsStale!: boolean;
  createdAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof poolBackingReconciliation {
    return poolBackingReconciliation.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        runId: {
          type: DataTypes.STRING(64),
          allowNull: false,
          comment: "Groups every currency's row of one run",
        },
        currency: { type: DataTypes.STRING(191), allowNull: false },
        at: { type: DataTypes.DATE, allowNull: false },
        status: {
          type: DataTypes.ENUM("ok", "h_unknown"),
          allowNull: false,
          defaultValue: "ok",
        },
        liabilities: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          comment: "L: what the pooled exchange account must be able to pay",
        },
        liabilitiesSplit: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: "customers, superAdmin, pendingWithdrawals",
          get(this: poolBackingReconciliation) {
            return parseJsonColumn(this.getDataValue("liabilitiesSplit"));
          },
        },
        holdings: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "H: the exchange account total over every account type; null when unreadable",
        },
        holdingsSplit: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: "per account type: total, fetchedAt, error",
          get(this: poolBackingReconciliation) {
            return parseJsonColumn(this.getDataValue("holdingsSplit"));
          },
        },
        ecosystemSplit: {
          type: DataTypes.JSON,
          allowNull: true,
          comment:
            "Phase 3, per chain: le, leTreasury, leUnattributed, he (null unless every address has a figure), heByKind, read coverage and ages, status ok|partial|unknown, gapE, open ecosystem rows, mirror. NULL when the currency has no ECO wallets, or when the ecosystem side could not be read (then ecosystemError says why)",
          get(this: poolBackingReconciliation) {
            return parseJsonColumn(this.getDataValue("ecosystemSplit"));
          },
        },
        ecosystemError: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment:
            "Why the ecosystem side was NOT read this run (the custody walk threw, the ECO currency list could not be read). NULL when it was read, or when the currency has no ecosystem side at all — the two cases a bare NULL ecosystemSplit could not tell apart",
        },
        inFlight: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          comment: "A: settlements under way, subtracted from the gap",
        },
        gap: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "G = L - H - A; null when H is unknown",
        },
        openObligations: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          comment: "Signed sum of OPEN and CLAIMED obligations on the exchange side",
        },
        residual: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "G minus open obligations — the part no row explains, this run",
        },
        drift: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "The residual once it has survived the streak; null until then",
        },
        driftRunStreak: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        holdingsStale: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        sequelize,
        modelName: "poolBackingReconciliation",
        tableName: "pool_backing_reconciliation",
        timestamps: true,
        updatedAt: false,
        paranoid: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "idx_pool_backing_reconciliation_currency_at",
            using: "BTREE",
            fields: [{ name: "currency" }, { name: "at" }],
          },
          {
            name: "idx_pool_backing_reconciliation_runId",
            using: "BTREE",
            fields: [{ name: "runId" }],
          },
          // Serves the time-bounded reads: the stale-exchange grouping in
          // reconcile.ts (`at >= now − 24 h`, every run of an outage) and the
          // console's newest-first page. Without it both were full scans of a
          // table nothing prunes; (currency, at) cannot serve a bare `at`.
          {
            name: "idx_pool_backing_reconciliation_at",
            using: "BTREE",
            fields: [{ name: "at" }],
          },
        ],
      }
    );
  }

  public static associate(_models: any) {
    // None.
  }
}

function parseJsonColumn(value: unknown): Record<string, any> | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value as Record<string, any>;
}
