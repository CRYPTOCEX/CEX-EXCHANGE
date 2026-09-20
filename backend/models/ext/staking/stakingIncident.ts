import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * SOMETHING THE RECONCILER OR AN ENGINE FOUND THAT A HUMAN MUST SEE.
 *
 * The hourly reconciler compares on-chain truth (tranches, wallet balance,
 * share totals) against the book (positions, treasury shares, gas reserve) and
 * opens an incident on every discrepancy it cannot explain. The observer opens
 * one on a negative reward. The validator policy engine opens one on a breach.
 * The wallet monitor opens one when the native balance falls below the gas
 * reserve floor, because a staking wallet that cannot pay a fee cannot process
 * an EXIT.
 *
 * An incident never blocks an exit. It stops NEW intake when its severity is
 * CRITICAL and its kind says so, and it always notifies the Super Admins.
 *
 * `dedupeKey` is unique among OPEN rows, so a condition that persists for six
 * hours is one incident with a rising `occurrences`, not six.
 */
function decimalGetter(field: string) {
  return function (this: Model): number {
    const raw = this.getDataValue(field as never) as unknown;
    if (raw === null || raw === undefined) return raw as never;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : (0 as number);
  };
}

export default class stakingIncident
  extends Model<stakingIncidentAttributes, stakingIncidentCreationAttributes>
  implements stakingIncidentAttributes
{
  id!: string;
  poolId!: string | null;
  chain!: string | null;
  kind!:
    | "SLASHING"
    | "DRIFT"
    | "LOW_GAS"
    | "VALIDATOR_BREACH"
    | "BATCH_STUCK"
    | "OBSERVER_LAG"
    | "UNBONDING_OVERDUE"
    | "DELEGATION_STALE"
    | "COMMISSION"
    | "OTHER";
  severity!: "INFO" | "WARNING" | "CRITICAL";
  status!: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  title!: string;
  detail!: string | null;
  /** Loss recorded against the pool, when the incident is a slashing. */
  lossAmount!: number | null;
  /** Reimbursed so far. Never more than `lossAmount`. */
  reimbursedAmount!: number;
  /** Unique among OPEN rows. See the header. */
  dedupeKey!: string;
  occurrences!: number;
  firstSeenAt!: Date;
  lastSeenAt!: Date;
  acknowledgedBy!: string | null;
  acknowledgedAt!: Date | null;
  resolvedBy!: string | null;
  resolvedAt!: Date | null;
  resolution!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof stakingIncident {
    return stakingIncident.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        poolId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        chain: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        kind: {
          type: DataTypes.ENUM(
            "SLASHING",
            "DRIFT",
            "LOW_GAS",
            "VALIDATOR_BREACH",
            "BATCH_STUCK",
            "OBSERVER_LAG",
            "UNBONDING_OVERDUE",
            "DELEGATION_STALE",
            "COMMISSION",
            "OTHER"
          ),
          allowNull: false,
          validate: {
            isIn: {
              args: [
                ["SLASHING", "DRIFT", "LOW_GAS", "VALIDATOR_BREACH", "BATCH_STUCK", "OBSERVER_LAG", "UNBONDING_OVERDUE", "DELEGATION_STALE", "COMMISSION", "OTHER"],
              ],
              msg: "kind: Must be a known incident kind",
            },
          },
        },
        severity: {
          type: DataTypes.ENUM("INFO", "WARNING", "CRITICAL"),
          allowNull: false,
          defaultValue: "WARNING",
          validate: {
            isIn: {
              args: [["INFO", "WARNING", "CRITICAL"]],
              msg: "severity: Must be one of: INFO, WARNING, CRITICAL",
            },
          },
        },
        status: {
          type: DataTypes.ENUM("OPEN", "ACKNOWLEDGED", "RESOLVED"),
          allowNull: false,
          defaultValue: "OPEN",
          validate: {
            isIn: {
              args: [["OPEN", "ACKNOWLEDGED", "RESOLVED"]],
              msg: "status: Must be one of: OPEN, ACKNOWLEDGED, RESOLVED",
            },
          },
        },
        title: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: { notEmpty: { msg: "title: Title must not be empty" } },
        },
        detail: {
          type: DataTypes.TEXT("long"),
          allowNull: true,
        },
        lossAmount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          get: decimalGetter("lossAmount"),
        },
        reimbursedAmount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("reimbursedAmount"),
          validate: { min: { args: [0], msg: "reimbursedAmount: Cannot be negative" } },
        },
        dedupeKey: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: { notEmpty: { msg: "dedupeKey: Dedupe key must not be empty" } },
        },
        occurrences: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        firstSeenAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        lastSeenAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        acknowledgedBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        acknowledgedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        resolvedBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        resolvedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        resolution: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "stakingIncident",
        tableName: "staking_incidents",
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          { name: "staking_incidents_status_severity_idx", fields: [{ name: "status" }, { name: "severity" }] },
          { name: "staking_incidents_dedupe_idx", fields: [{ name: "dedupeKey" }, { name: "status" }] },
          { name: "staking_incidents_pool_idx", fields: [{ name: "poolId" }] },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingIncident.belongsTo(models.stakingPool, {
      foreignKey: "poolId",
      as: "pool",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
