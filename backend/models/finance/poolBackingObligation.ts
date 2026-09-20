import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * ONE ROW PER DATABASE BALANCE CHANGE THAT HAS NO PHYSICAL COUNTERPART.
 *
 * A SPOT wallet is a number in this database backed by ONE pooled exchange
 * account; an ECO wallet is a number backed by on-chain custody the platform
 * holds. Most writers move both sides together — a verified exchange deposit,
 * a broadcast withdrawal. A few move the number and nothing else: an ECO -> SPOT
 * transfer leaves the coins at the customer's deposit address while the
 * exchange now owes them; an admin credit invents a balance from nothing. Each
 * such write records itself here, in the SAME database transaction, so that the
 * gap between what the pools owe and what they hold is EXPLAINED row by row
 * rather than discovered as one unexplained number.
 *
 * Sign: `+` means the exchange pool is SHORT by this amount (the ecosystem or
 * the treasury must send); `-` means the exchange holds MORE than it owes (the
 * exchange must send to ecosystem custody). `amount` is what was CREDITED to
 * the receiving wallet — never the debit, because the transfer fee stays on
 * the paying side and is owed to the Super Admin wallet there.
 *
 * `side` says which pool the row describes. A same-currency transfer is one
 * row, `both` — the exchange's shortfall IS the ecosystem's surplus. A
 * conversion (ECO USDT -> SPOT BTC) is two rows in two currencies, one per
 * side, because shipping USDT cannot close a BTC hole. `nettable` is stored,
 * not derived: only transfer rows may ever be netted and settled by the
 * engine. Admin rows are treasury events — netting one against a customer's
 * transfer would move the hole from one pool to the other, not close it.
 *
 * Reconciliation drift (`plans/done/POOL-BACKING.md`) is NOT a row here: it is a
 * measurement residual kept on `poolBackingReconciliation` and acknowledged on
 * `poolBackingCurrency`. Making it a row would make it settleable, and the
 * platform's own minted liabilities (ROI, rewards, fees) would then be "backed"
 * by shipping customers' custody coins to the exchange.
 */
export default class poolBackingObligation
  extends Model<poolBackingObligationAttributes, poolBackingObligationCreationAttributes>
  implements poolBackingObligationAttributes
{
  id!: string;
  currency!: string;
  side!: "both" | "exchange" | "ecosystem";
  chain?: string | null;
  amount!: number;
  source!: "transfer" | "conversion" | "fiat_transfer" | "admin" | "minted" | "exchange_fee";
  status!: "OPEN" | "CLAIMED" | "SETTLED" | "WAIVED" | "CANCELLED";
  nettable!: boolean;
  sourceRef?: string | null;
  legs?: Record<string, any> | null;
  evidence?: Record<string, any> | null;
  settlementId?: string | null;
  createdBy?: string | null;
  waivedBy?: string | null;
  waiveReason?: string | null;
  waivedAt?: Date | null;
  settledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof poolBackingObligation {
    return poolBackingObligation.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        currency: {
          type: DataTypes.STRING(191),
          allowNull: false,
          comment: "Currency the amount is denominated in",
        },
        side: {
          type: DataTypes.ENUM("both", "exchange", "ecosystem"),
          allowNull: false,
          defaultValue: "both",
          comment:
            "Which pool the row describes: both (a same-currency transfer), exchange only, or ecosystem only",
        },
        chain: {
          type: DataTypes.STRING(50),
          allowNull: true,
          comment:
            "Ecosystem chain the coins sit on, when the ecosystem side is involved; null when the transfer's chain map could not attribute it",
        },
        amount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          comment:
            "Signed. Positive: the exchange pool is short by this much. Negative: the exchange holds this much more than it owes",
        },
        source: {
          type: DataTypes.ENUM(
            "transfer",
            "conversion",
            "fiat_transfer",
            "admin",
            "minted",
            "exchange_fee"
          ),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM("OPEN", "CLAIMED", "SETTLED", "WAIVED", "CANCELLED"),
          allowNull: false,
          defaultValue: "OPEN",
        },
        nettable: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment:
            "Whether the settlement engine may net this row against others of its currency and settle it. Only transfer legs are",
        },
        sourceRef: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment:
            "The transaction row that created it: the INCOMING leg of a transfer, the adjustment row of an admin credit. Deliberately not a foreign key — the row must survive a deleted transaction",
        },
        legs: {
          type: DataTypes.JSON,
          allowNull: true,
          comment:
            "Both transaction ids of a transfer and the per-chain attribution the ledger recorded",
          get(this: poolBackingObligation) {
            return parseJsonColumn(this.getDataValue("legs"));
          },
        },
        evidence: {
          type: DataTypes.JSON,
          allowNull: true,
          comment:
            "What proved the row unbacked or backed: exchange deposit id and status, the fetch time",
          get(this: poolBackingObligation) {
            return parseJsonColumn(this.getDataValue("evidence"));
          },
        },
        settlementId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "The poolBackingSettlement that claimed or settled this row",
        },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "The admin who caused an admin row; null for customer-driven rows",
        },
        waivedBy: { type: DataTypes.UUID, allowNull: true },
        waiveReason: { type: DataTypes.TEXT, allowNull: true },
        waivedAt: { type: DataTypes.DATE, allowNull: true },
        settledAt: { type: DataTypes.DATE, allowNull: true },
      },
      {
        sequelize,
        modelName: "poolBackingObligation",
        tableName: "pool_backing_obligation",
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
            name: "idx_pool_backing_obligation_currency_status",
            using: "BTREE",
            fields: [{ name: "currency" }, { name: "status" }],
          },
          {
            name: "idx_pool_backing_obligation_currency_chain_status",
            using: "BTREE",
            fields: [{ name: "currency" }, { name: "chain" }, { name: "status" }],
          },
          {
            // One row per (transaction leg, side): a retried request that
            // reaches the ledger twice collides here instead of double-counting.
            name: "uq_pool_backing_obligation_sourceRef_side",
            unique: true,
            using: "BTREE",
            fields: [{ name: "sourceRef" }, { name: "side" }],
          },
          {
            name: "idx_pool_backing_obligation_settlementId",
            using: "BTREE",
            fields: [{ name: "settlementId" }],
          },
        ],
      }
    );
  }

  public static associate(_models: any) {
    // Deliberately none: sourceRef and settlementId are recorded, not enforced.
  }
}

/**
 * Prod MySQL hands a DataTypes.JSON column back parsed; MariaDB stores it as
 * LONGTEXT and returns the raw string. Same guard as walletAuditLog.metadata.
 */
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
