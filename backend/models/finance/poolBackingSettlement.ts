import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * ONE PHYSICAL MOVEMENT BETWEEN THE TWO POOLS, OR THE RECORD OF ONE MADE BY HAND.
 *
 * A settlement is never a customer transaction row. The customer withdrawal
 * queue refunds the row's wallet when a broadcast fails, batches UTXO outputs,
 * and emails the row's user; the customer deposit verifiers CREDIT the row's
 * wallet, pay first-deposit rewards and abandon rows after seven days. Every
 * one of those is wrong for a platform movement, so the platform's movements
 * live here, with their own state machine and their own verifier.
 *
 * `activeKey` is the in-flight lock: `<currency>|<direction>` while a movement
 * is under way, NULL on every terminal state. It is UNIQUE, so a second claim —
 * from the console in the web process or the cron in its own process — loses
 * on the index rather than on a flag in memory that the other process cannot
 * see. NEEDS_REVIEW is terminal for the lock's purposes: a stuck movement must
 * not park its currency for ever.
 *
 * `amountRequested` is what the obligations are settled by; the difference to
 * `amountReceived` (the venue's deposit fee, gas) is booked as recognised loss
 * and recorded in `fees`, never left as a sub-threshold residual.
 *
 * `external` is the operator recording a movement they made outside the
 * platform (bought coins on the exchange, wired to a custody address): the row
 * carries their proof and settles obligations exactly as an engine movement
 * would, and is the ONLY way a `fiat_transfer` or `admin` obligation closes.
 */
export default class poolBackingSettlement
  extends Model<poolBackingSettlementAttributes, poolBackingSettlementCreationAttributes>
  implements poolBackingSettlementAttributes
{
  id!: string;
  currency!: string;
  direction!: "eco_to_exchange" | "exchange_to_eco" | "external" | "exchange_convert";
  chain?: string | null;
  network?: string | null;
  amountRequested!: number;
  amountSent?: number | null;
  amountReceived?: number | null;
  status!: "PLANNED" | "DISPATCHED" | "CONFIRMED" | "SETTLED" | "NEEDS_REVIEW" | "FAILED" | "RECORDED";
  activeKey?: string | null;
  txid?: string | null;
  proof?: Record<string, any> | null;
  fees?: Record<string, any> | null;
  initiatedBy?: string | null;
  note?: string | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof poolBackingSettlement {
    return poolBackingSettlement.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        currency: { type: DataTypes.STRING(191), allowNull: false },
        direction: {
          // POSITION IS LOAD-BEARING. MySQL stores an ENUM member as its
          // ordinal (1-based position in this list), so a member inserted
          // BEFORE an existing one renumbers every stored row on ALTER and a
          // settlement that was `external` reads back as whatever now sits in
          // its slot. New members are APPENDED, never inserted or reordered.
          //   exchange_convert (phase 3): the engine bought, on the exchange, a
          //   currency the exchange owed but never received — the C2 leg of an
          //   ECO C1 -> SPOT C2 conversion; no coins move between the pools.
          type: DataTypes.ENUM("eco_to_exchange", "exchange_to_eco", "external", "exchange_convert"),
          allowNull: false,
        },
        chain: {
          type: DataTypes.STRING(50),
          allowNull: true,
          comment: "Ecosystem chain the coins move on, when the platform moved them",
        },
        network: {
          type: DataTypes.STRING(100),
          allowNull: true,
          comment: "The exchange's own network id for that chain, as sent to it",
        },
        amountRequested: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          comment: "What the obligations are settled by",
        },
        amountSent: { type: DataTypes.DECIMAL(36, 18), allowNull: true },
        amountReceived: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "What the receiving side confirmed; the difference to requested is fees",
        },
        status: {
          type: DataTypes.ENUM(
            "PLANNED",
            "DISPATCHED",
            "CONFIRMED",
            "SETTLED",
            "NEEDS_REVIEW",
            "FAILED",
            "RECORDED"
          ),
          allowNull: false,
          defaultValue: "PLANNED",
        },
        activeKey: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment:
            "<currency>|<direction> while in flight, NULL when terminal. UNIQUE: the in-flight lock every process shares",
        },
        txid: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment:
            "The on-chain hash the front-run guard checks: reserved before the movement is visible (the expected UTXO txid before broadcast, the exchange's txid once it publishes one), so the spot deposit claim route and both spot verifiers can refuse it. Also inside proof; this column is the indexed copy",
        },
        proof: {
          type: DataTypes.JSON,
          allowNull: true,
          comment:
            "txid, exchange withdrawal/deposit ids, from/to address and tag, broadcast and confirmation times, receipts",
          get(this: poolBackingSettlement) {
            return parseJsonColumn(this.getDataValue("proof"));
          },
        },
        fees: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: "gas in the chain's native asset, the venue's fee, and the shortfall booked as loss",
          get(this: poolBackingSettlement) {
            return parseJsonColumn(this.getDataValue("fees"));
          },
        },
        initiatedBy: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment: "'auto' for the cron, otherwise the admin's user id",
        },
        note: { type: DataTypes.TEXT, allowNull: true },
      },
      {
        sequelize,
        modelName: "poolBackingSettlement",
        tableName: "pool_backing_settlement",
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
            name: "uq_pool_backing_settlement_activeKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "activeKey" }],
          },
          {
            name: "idx_pool_backing_settlement_currency_status",
            using: "BTREE",
            fields: [{ name: "currency" }, { name: "status" }],
          },
          {
            // The guard's lookup: every spot deposit claim and every spot
            // verifier pass asks "is this hash a settlement's?".
            name: "idx_pool_backing_settlement_txid",
            using: "BTREE",
            fields: [{ name: "txid" }],
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
