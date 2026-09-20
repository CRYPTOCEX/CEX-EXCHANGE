import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * THE PER-CURRENCY ANCHOR ROW.
 *
 * Two jobs. First, it is the row every writer that reads or writes obligations
 * of a currency locks FIRST (`SELECT ... FOR UPDATE`), before any wallet row —
 * the cap check inside a transfer and a settlement's claim then serialise on
 * one row in one order and cannot deadlock against each other. Second, it
 * carries the operator's per-currency choices: the cap that refuses a transfer
 * pushing the open obligations past it, the settle threshold, the map from
 * ecosystem chain to the exchange's network id, and the acknowledgement of the
 * opening drift the first reconciliation found.
 *
 * Absent row = no per-currency override; the global settings apply. Rows are
 * created on first use by the ledger, never by hand.
 */
export default class poolBackingCurrency
  extends Model<poolBackingCurrencyAttributes, poolBackingCurrencyCreationAttributes>
  implements poolBackingCurrencyAttributes
{
  currency!: string;
  capUsd?: number | null;
  thresholdUsd?: number | null;
  networkMap?: Record<string, any> | null;
  lastResidual?: number | null;
  residualStreak!: number;
  drift?: number | null;
  driftFirstSeenAt?: Date | null;
  driftAcknowledgedAt?: Date | null;
  driftAcknowledgedBy?: string | null;
  driftAcknowledgedAmount?: number | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof poolBackingCurrency {
    return poolBackingCurrency.init(
      {
        currency: {
          type: DataTypes.STRING(191),
          primaryKey: true,
          allowNull: false,
        },
        capUsd: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment:
            "Per-currency override of poolBackingCapUsd: the most the open transfer obligations may reach, in USD, before an ECO -> SPOT transfer is refused",
        },
        thresholdUsd: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "Per-currency override of poolBackingThresholdUsd",
        },
        networkMap: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: "ecosystem chain id -> the active exchange's network id, validated at reconciliation",
          get(this: poolBackingCurrency) {
            return parseJsonColumn(this.getDataValue("networkMap"));
          },
        },
        lastResidual: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "The residual the last reconciliation saw, to measure the streak",
        },
        residualStreak: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: "Consecutive runs the residual held the same sign above tolerance",
        },
        drift: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "The persisted drift for this currency, once the streak was reached",
        },
        driftFirstSeenAt: { type: DataTypes.DATE, allowNull: true },
        driftAcknowledgedAt: { type: DataTypes.DATE, allowNull: true },
        driftAcknowledgedBy: { type: DataTypes.UUID, allowNull: true },
        driftAcknowledgedAmount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment:
            "The drift as it stood when acknowledged; a drift that has since grown past it counts as unacknowledged again",
        },
        notes: { type: DataTypes.TEXT, allowNull: true },
      },
      {
        sequelize,
        modelName: "poolBackingCurrency",
        tableName: "pool_backing_currency",
        timestamps: true,
        paranoid: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "currency" }],
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
