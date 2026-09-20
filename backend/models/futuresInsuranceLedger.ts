import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * The futures insurance fund, as a LEDGER rather than a balance.
 *
 * ---------------------------------------------------------------------------
 * WHY A FUND EXISTS AT ALL
 * ---------------------------------------------------------------------------
 * Leverage lets a trader promise more than they deposited. When the price moves
 * further than their deposit covers, the winner on the other side is owed money
 * that does not exist — measured on this platform at 40 on a single trade, where
 * both sides had posted 60 each against 300 of notional.
 *
 * Liquidation is the first defence and closes the loser while their margin still
 * covers what they owe. It is not sufficient: a genuine gap, or a book too thin
 * for the liquidation order to fill in, jumps past it. What is left over is the
 * DEFICIT, and it has to come from somewhere real or it is simply created.
 *
 * ---------------------------------------------------------------------------
 * WHY A LEDGER AND NOT A BALANCE COLUMN
 * ---------------------------------------------------------------------------
 * A balance answers "how much is there". An operator whose futures book has just
 * cost them money needs to answer "why", and a single mutable number cannot. So
 * the balance is the SUM of these rows, every one of which names the position,
 * the market, the mark it settled at and the amount — and none of which is ever
 * updated in place.
 *
 * That also makes the fund reconstructible. A balance column that drifts from
 * reality has no way back; a sum of immutable rows does.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE MONEY IS
 * ---------------------------------------------------------------------------
 * The fund is a RESERVE, not a spendable wallet. A `FEE_SHARE` row records
 * revenue the platform withheld from itself — the fee was collected but a share
 * of it was not taken as profit. A `DEFICIT` row records money that was paid to
 * a trader and funded by that reserve.
 *
 * The invariant the drivers assert holds by construction:
 *
 *   Σ(wallet balances) + Σ(margin on OPEN positions) + fund = constant
 *
 * A fee share moves value from the platform's wallet into the fund; a deficit
 * moves it from the fund into a trader's wallet. Neither creates any.
 *
 * A NEGATIVE total is legal and deliberate. It means the operator is carrying a
 * debt their reserve did not cover — which is exactly what they need to be able
 * to see, and which the ADL policy exists to prevent from ever happening
 * silently.
 */
export default class futuresInsuranceLedger
  extends Model<
    futuresInsuranceLedgerAttributes,
    futuresInsuranceLedgerCreationAttributes
  >
  implements futuresInsuranceLedgerAttributes
{
  id!: string;
  currency!: string;
  amount!: number;
  type!:
    | "CLEARING"
    | "FEE_SHARE"
    | "LIQUIDATION_SURPLUS"
    | "DEFICIT"
    | "ADL"
    | "ADJUSTMENT";
  shortfall?: number;
  symbol?: string;
  positionId?: string;
  userId?: string;
  markPrice?: number;
  description?: string;
  sliceKey!: string;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof futuresInsuranceLedger {
    return futuresInsuranceLedger.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        currency: {
          type: DataTypes.STRING(32),
          allowNull: false,
          validate: {
            notEmpty: { msg: "currency: Currency must not be empty" },
          },
        },
        /**
         * Signed, in the quote currency. POSITIVE adds to the fund, NEGATIVE
         * draws from it.
         *
         * DECIMAL because this is money. A DOUBLE here would make the fund's
         * balance depend on the order the rows are summed in.
         */
        amount: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          get() {
            // Every DECIMAL comes back from this driver as a STRING.
            const raw = this.getDataValue("amount");
            return raw === null || raw === undefined ? 0 : Number(raw);
          },
        },
        type: {
          type: DataTypes.ENUM(
            "CLEARING",
            "FEE_SHARE",
            "LIQUIDATION_SURPLUS",
            "DEFICIT",
            "ADL",
            "ADJUSTMENT"
          ),
          allowNull: false,
        },
        /**
         * The part of a loss that ran PAST the position's own margin.
         *
         * A separate column from `amount` because they answer different
         * questions and one cannot be derived from the other. `amount` is the
         * cash that moved through the fund — for a bankrupt close that is
         * +margin, because the fund RECEIVES everything the trader had.
         * `shortfall` is what the trader owed beyond it: the fund's real
         * exposure, the number the circuit breaker measures and the only one an
         * operator has to act on.
         *
         * Summing `amount` to find "how much has this cost me" gives the wrong
         * sign and the wrong magnitude; the driver did exactly that and read a
         * genuine shortfall as zero.
         */
        shortfall: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: true,
          get() {
            const raw = this.getDataValue("shortfall");
            return raw === null || raw === undefined ? null : Number(raw);
          },
        },
        /** The market this row is about, e.g. "BTC/USDT". Absent on ADJUSTMENT. */
        symbol: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        /** The position that caused it, so an operator can trace one event. */
        positionId: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        /** The mark the settlement used, which is usually the operator's first question. */
        markPrice: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: true,
          get() {
            const raw = this.getDataValue("markPrice");
            return raw === null || raw === undefined ? null : Number(raw);
          },
        },
        description: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        /**
         * Which SLICE of the position this row clears.
         *
         * A reduce-only or liquidation order fills across book levels, and
         * every fill clears its own slice through the fund. The unique index
         * below used to be `(positionId, type)` alone, so the FIRST slice's
         * CLEARING row landed and every later one was refused as a duplicate —
         * and `recordInsuranceEntry` deliberately swallows a duplicate as
         * "another settlement path got there first". A three-level liquidation
         * therefore put one third of its margin through the fund and lost the
         * rest of the trail, silently.
         *
         * The slice key is the SAME cumulative-fill discriminator the wallet's
         * idempotency key uses (`utils/slice-key.ts`), so one wallet movement
         * maps to one ledger row and a genuine retry of the same fill still
         * collides. Full closes, ADL and fee shares have no slice and carry the
         * empty string: NOT NULL, because MySQL treats every NULL in a unique
         * index as distinct and the double-settlement guard would be gone.
         */
        sliceKey: {
          type: DataTypes.STRING(191),
          allowNull: false,
          defaultValue: "",
        },
      },
      {
        sequelize,
        modelName: "futuresInsuranceLedger",
        tableName: "futures_insurance_ledger",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            // The balance query: SUM(amount) WHERE currency = ?
            name: "futures_insurance_ledger_currency",
            using: "BTREE",
            fields: [{ name: "currency" }],
          },
          {
            // The circuit breaker's query: how much has THIS market cost?
            name: "futures_insurance_ledger_symbol",
            using: "BTREE",
            fields: [{ name: "symbol" }],
          },
          {
            /*
             * ONE CLEARING ENTRY PER POSITION, ENFORCED BY THE DATABASE.
             *
             * Two settlement paths can reach the same position: the manual
             * close, the mark sweep's stop, the matcher's risk drain and a
             * liquidation all read it, decide what it owes, and write CLOSED.
             * The wallet's idempotency key normally makes a duplicate harmless —
             * except when the payout is ZERO, which is exactly the total-loss
             * case, because then no key is ever consumed. Both callers would
             * hand the fund a `+margin` row for one event, creating
             * `(N-1) x margin` and telling the circuit breaker the market cost
             * N times what it did.
             *
             * A Scylla lightweight transaction was tried for this and is the
             * WRONG instrument: it commits at SERIAL consistency while every
             * read here is ordinary, so a closed position still read as OPEN and
             * a flat round trip drifted by a whole margin. MySQL is strongly
             * consistent, so the constraint belongs here — the second writer
             * simply cannot insert, and `recordInsuranceEntry` already swallows
             * and logs a failed write rather than failing a settlement that has
             * already moved money.
             *
             * Scoped to `positionId` + `type` + `sliceKey`: a position may hold
             * one CLEARING (or DEFICIT) row PER FILL SLICE and, separately, one
             * ADL marker. Rows with a NULL positionId — FEE_SHARE, ADJUSTMENT —
             * are exempt, because MySQL treats each NULL as distinct in a unique
             * index; `sliceKey` is NOT NULL for exactly that reason.
             *
             * This index REPLACED `futures_insurance_ledger_position_once`
             * (`positionId`, `type`), which refused every clearing slice after
             * the first. `sync({ alter: true })` adds this index but never
             * relaxes an existing UNIQUE one, so the old name is listed in
             * `RELAXED_UNIQUE_INDEXES` (src/db.ts) and boot turns it into a
             * plain index; otherwise it would keep refusing the second slice
             * whatever this model declares.
             */
            name: "futures_insurance_ledger_slice_once",
            unique: true,
            using: "BTREE",
            fields: [{ name: "positionId" }, { name: "type" }, { name: "sliceKey" }],
          },
        ],
      }
    );
  }
}
