import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * A FEE REVERSAL THAT IS OWED BUT NOT YET BOOKED.
 *
 * ---------------------------------------------------------------------------
 * THE WINDOW THIS TABLE EXISTS TO CLOSE
 * ---------------------------------------------------------------------------
 * Placing a futures order moves money three ways: `cost + fee` leaves the
 * trader's wallet, `collectPlatformFee` credits the WHOLE fee to the platform
 * treasury, and `withholdFeeShare` moves a slice of it into the insurance fund.
 * Cancelling has to reverse all three, and the three sites that do it —
 * `futures/order/[id]/index.del.ts`, `refundCancelledOrder`, and the market
 * maker's `cancelPoolOrder` — each perform the refund and then, as separate
 * awaits, the release and the loss.
 *
 * `walletService.credit` commits its own transaction. So a process killed
 * between the refund and the reversal leaves the trader paid and the platform
 * still reporting the fee as revenue, with the insurance fund still reserving
 * against an order that no longer exists. Nothing retries: the order is already
 * CANCELED, and every one of those three sites turns a second call around
 * before it reaches the money.
 *
 * A deploy reload, a hot patch, or any kill during the expiry sweep is enough.
 * At the tethered five-minute quote life the maker cancels twelve times more
 * often than it used to, which is what moved this from theoretical to worth a
 * table.
 *
 * ---------------------------------------------------------------------------
 * WHY A ROW RATHER THAN A LONGER TRANSACTION
 * ---------------------------------------------------------------------------
 * The reversal touches the platform treasury and the insurance fund — two
 * wallets shared by every trader on the install. Holding them inside the
 * caller's transaction for the length of a cancel would serialise every cancel
 * on the platform behind one row. This is the standard alternative: record the
 * INTENT atomically with the refund, and let a sweep carry it out.
 *
 * `referenceId` is UNIQUE, and that is the idempotency anchor. It is the order
 * id, the same reference `withholdFeeShare` used at placement, so a retried
 * cancel cannot enqueue a second reversal for one order.
 *
 * ---------------------------------------------------------------------------
 * WHY `creditKey` IS STORED
 * ---------------------------------------------------------------------------
 * The sweep must never book a reversal for a refund that did not happen — that
 * understates revenue by exactly as much as the missing reversal overstated it.
 * Storing the refund's wallet idempotency key lets the sweep VERIFY the money
 * moved before it touches the treasury, which also makes the write order at the
 * call site irrelevant: a row whose credit never landed is abandoned rather
 * than settled.
 */
export default class futuresFeeReversal
  extends Model<
    futuresFeeReversalAttributes,
    futuresFeeReversalCreationAttributes
  >
  implements futuresFeeReversalAttributes
{
  id!: string;
  referenceId!: string;
  symbol!: string;
  currency!: string;
  refundedFee!: number;
  originalFee!: number;
  creditKey!: string;
  status!: "PENDING" | "COMPLETED" | "ABANDONED";
  attempts!: number;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof futuresFeeReversal {
    return futuresFeeReversal.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        referenceId: {
          type: DataTypes.STRING(191),
          allowNull: false,
          unique: true,
          comment:
            "Cancelled order id — the same reference withholdFeeShare used at placement",
        },
        symbol: {
          type: DataTypes.STRING(191),
          allowNull: false,
          comment: "Market the cancelled order belonged to",
        },
        currency: {
          type: DataTypes.STRING(191),
          allowNull: false,
          comment: "Quote currency the fee was taken in",
        },
        refundedFee: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          comment: "Fee actually handed back — the unfilled share of the original",
        },
        originalFee: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          comment:
            "The order's whole fee. releaseFeeShare re-derives the withheld slice from this, so passing the refunded amount would release a slice of a slice",
        },
        creditKey: {
          type: DataTypes.STRING(191),
          allowNull: false,
          comment:
            "Wallet idempotency key of the refund this reverses; the sweep verifies it landed before touching the treasury",
        },
        status: {
          type: DataTypes.ENUM("PENDING", "COMPLETED", "ABANDONED"),
          allowNull: false,
          defaultValue: "PENDING",
          comment:
            "ABANDONED: the refund never reached a wallet, so nothing is owed. Kept rather than deleted — it is the record of a cancel that half-happened",
        },
        attempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: "Sweep attempts, so a permanently failing row can be found",
        },
        note: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: "Why a row was abandoned, or the last failure",
        },
      },
      {
        sequelize,
        modelName: "futuresFeeReversal",
        tableName: "futures_fee_reversal",
        timestamps: true,
        indexes: [
          {
            name: "futures_fee_reversal_reference_unique",
            unique: true,
            fields: [{ name: "referenceId" }],
          },
          {
            // The sweep's own query: oldest PENDING first.
            name: "futures_fee_reversal_status_created",
            fields: [{ name: "status" }, { name: "createdAt" }],
          },
        ],
      }
    );
  }
}
