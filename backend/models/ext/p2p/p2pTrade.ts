import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";
import { readJsonArrayColumn } from "@b/utils/json-column";

export default class p2pTrade
  extends Model<p2pTradeAttributes, p2pTradeCreationAttributes>
  implements p2pTradeAttributes
{
  id!: string;
  offerId!: string;
  buyerId!: string;
  sellerId!: string;
  type!: "BUY" | "SELL";
  currency!: string;
  amount!: number;
  price!: number;
  total!: number;
  status!: "PENDING" | "PAYMENT_SENT" | "COMPLETED" | "CANCELLED" | "DISPUTED" | "EXPIRED";
  paymentMethod!: string;
  paymentDetails?: any;
  timeline?: any;
  terms?: string;
  escrowFee?: string;
  escrowTime?: string;
  paymentConfirmedAt?: Date;
  paymentReference?: string;

  // --- Escrow attribution -------------------------------------------------
  // Escrow used to exist only as the seller's wallet-wide `inOrder`, which
  // carries no attribution: nothing recorded which trade a held balance
  // belonged to, or whether it had already been paid out. Every payout door
  // therefore had to infer that from `trade.status` plus its own private
  // idempotency key, and the keys did not overlap across doors — so the same
  // escrow could be paid out by release, then again by dispute resolution.
  // These two columns make the escrow state explicit and are the guard that
  // `settleTradeEscrow` serialises on.
  escrowAmount?: number;
  escrowStatus!: "NONE" | "HELD" | "RELEASED" | "REFUNDED";

  // --- WHICH wallet the escrow is actually in, and WHOSE ------------------
  // `escrowAmount` said how much; nothing said what, where, or whose. Every
  // payout door therefore derived those three from the only shape of offer the
  // addon had thought about — the seller delivers the asset leg — and hardcoded
  // it: owner `trade.sellerId`, wallet `offer.walletType`, currency
  // `trade.currency`.
  //
  // That is wrong for an offer whose ASSET leg is fiat (`walletType: "FIAT"`,
  // which the composer offers). There the only crypto on the offer is the PRICE
  // leg, so the escrow is the price currency, in the price leg's wallet, held by
  // whoever pays the crypto — which on a fiat-asset BUY offer is the MAKER, not
  // the seller of anything. The platform instead tried to hold the fiat asset
  // ("Available: 0 EUR ... deposit more funds to your FIAT wallet") against a
  // product that promises it never touches the cash leg
  // (store/content/docs/p2p/index.md:19). These three columns record the escrow
  // that was actually taken, so settlement reads it instead of re-deriving it
  // from an assumption. See src/api/(ext)/p2p/utils/escrow-leg.ts.
  //
  // ── THE LEGACY-NULL FALLBACK CONTRACT ─────────────────────────────────────
  // New columns are NULLABLE. NULL means "legacy row" and MUST be resolved
  // exactly as today (escrow owner = trade.sellerId, wallet = offer.walletType,
  // currency = trade.currency), INCLUDING existing FIAT holds, so money already
  // sitting in a fiat wallet's inOrder can still be released/refunded and
  // unwound. NEVER make settleTradeEscrow refuse FIAT outright. The new "no
  // fiat holds" guard applies ONLY to opening a NEW hold.
  //
  // `resolveTradeEscrowTriple()` in utils/escrow-leg.ts is that resolution, and
  // it is the only place allowed to perform it: the fallback is atomic (a row
  // that recorded only part of the triple falls back on all of it), because a
  // mixed answer would look for a hold in a wallet nobody ever held anything in
  // while looking authoritative. Nothing needs backfilling — a NULL row settles
  // correctly by definition, since NULL reproduces the behaviour it was written
  // under.
  /** The currency the escrow is held in. NULL => `trade.currency`. */
  escrowCurrency?: string | null;
  /** The wallet type it is held in. NULL => `offer.walletType`. May legitimately be FIAT. */
  escrowWalletType?: "FIAT" | "SPOT" | "ECO" | null;
  /** Whose wallet holds it — the party who delivered the crypto. NULL => `trade.sellerId`. */
  escrowOwnerId?: string | null;

  // --- Lifecycle timestamps -----------------------------------------------
  // These were written by several handlers with an `as any` cast against
  // columns that did not exist, so Sequelize silently dropped them. The
  // 7-day post-completion dispute window was gated on `completedAt` and was
  // therefore permanently inert.
  completedAt?: Date;
  cancelledAt?: Date;
  disputedAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
  resolution?: any;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof p2pTrade {
    return p2pTrade.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        offerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "offerId cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "offerId must be a valid UUID" },
          },
        },
        buyerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "buyerId cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "buyerId must be a valid UUID" },
          },
        },
        sellerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "sellerId cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "sellerId must be a valid UUID" },
          },
        },
        type: {
          type: DataTypes.ENUM("BUY", "SELL"),
          allowNull: false,
          validate: {
            isIn: { args: [["BUY", "SELL"]], msg: "type must be BUY or SELL" },
          },
        },
        currency: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: { notEmpty: { msg: "currency must not be empty" } },
        },
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "amount must be a valid number" },
            min: { args: [0], msg: "amount cannot be negative" },
          },
        },
        price: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "price must be a valid number" },
            min: { args: [0], msg: "price cannot be negative" },
          },
        },
        total: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "total must be a valid number" },
            min: { args: [0], msg: "total cannot be negative" },
          },
        },
        status: {
          type: DataTypes.ENUM(
            "PENDING",
            "PAYMENT_SENT",
            "COMPLETED",
            "CANCELLED",
            "DISPUTED",
            "EXPIRED"
          ),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [
                [
                  "PENDING",
                  "PAYMENT_SENT",
                  "COMPLETED",
                  "CANCELLED",
                  "DISPUTED",
                  "EXPIRED",
                ],
              ],
              msg: "Invalid status",
            },
          },
        },
        paymentMethod: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "paymentMethod cannot be null" },
            /*
             * `"all"`, NOT `4`, AND THE SAME NOW GOES FOR EVERY UUID VALIDATOR
             * IN THIS LAYER — 209 of them, which all carried `args: 4`.
             *
             * This column holds `p2pPaymentMethod.id`, and that column promises
             * a UUID and nothing more: it is `DataTypes.UUID` with
             * `defaultValue: UUIDV4` and no validator of its own. So the
             * product mints v4 today and the two columns agreed by coincidence
             * rather than by contract — a method row that arrived from a data
             * migration, an import, or a hand-written INSERT could hold any
             * other version, and every trade against it was then rejected
             * FOREVER, at write time, deep inside the transaction.
             *
             * A UUID's version says which algorithm minted it. It is not a
             * statement about validity, and nothing in this application reads
             * it. Pinning the check to 4 did not make a reference safer; it
             * made a legitimate identifier unwritable — v7, which is ordinary
             * in anything generated in the last few years, was refused.
             *
             * `"all"` still refuses everything that is not a UUID: versions
             * 1-8 with a conforming variant, plus nil and max. The two rows
             * that exposed this — hand-inserted with variant nibbles of `0`
             * and `1` — are still refused, because they are not UUIDs.
             *
             * The referential guarantee here was never this validator's job in
             * the first place. A foreign key is what says the row exists.
             *
             * Precedent: the three `isUUIDOrNull` validators this codebase
             * wrote by hand — in `stakingPosition` and `stakingAdminActivity` —
             * already test shape alone and name no version at all.
             */
            isUUID: { args: ANY_UUID_VERSION, msg: "paymentMethod must be a valid UUID" },
          },
        },
        paymentDetails: {
          type: DataTypes.JSON,
          allowNull: true,
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
          get(this: p2pTrade) {
            const value = this.getDataValue("paymentDetails") as unknown;
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
        timeline: {
          type: DataTypes.JSON,
          allowNull: true,
          /*
           * Guarded AND DETACHED — see src/utils/json-column.ts for why the
           * second half matters more than the first.
           *
           * The guard is the old reason: prod MySQL delivers a DataTypes.JSON
           * column ALREADY PARSED, local MariaDB 10.4 stores it as LONGTEXT and
           * hands back the raw STRING, and `Array.isArray("[...]")` is false, so
           * an unguarded consumer either dies or silently renders nothing.
           *
           * The detachment is the reason the chat lost every message on any
           * install with a real JSON column. Returning `value` on the parsed
           * path returned the array inside `dataValues` itself, so the nine
           * routes that read this column, push an entry and write it back were
           * handing Sequelize the object it already held — no change detected,
           * no UPDATE issued, the entry gone. Nine call sites cannot each be
           * trusted to remember that; a read that cannot alias the row makes it
           * impossible to get wrong.
           */
          get(this: p2pTrade) {
            return readJsonArrayColumn(this.getDataValue("timeline"));
          },
        },
        terms: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        escrowFee: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        escrowTime: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        paymentConfirmedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        paymentReference: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        escrowAmount: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          validate: {
            isFloat: { msg: "escrowAmount must be a valid number" },
            min: { args: [0], msg: "escrowAmount cannot be negative" },
          },
        },
        escrowStatus: {
          type: DataTypes.ENUM("NONE", "HELD", "RELEASED", "REFUNDED"),
          allowNull: false,
          defaultValue: "NONE",
          validate: {
            isIn: {
              args: [["NONE", "HELD", "RELEASED", "REFUNDED"]],
              msg: "Invalid escrowStatus",
            },
          },
        },
        // All three NULLABLE, and NULL is meaningful: it is the legacy-row
        // marker the fallback contract above is built on. Do not give any of
        // them a defaultValue — a default would make a legacy row
        // indistinguishable from a row that recorded an escrow, and would strand
        // the fiat holds that already exist.
        escrowCurrency: {
          type: DataTypes.STRING(50),
          allowNull: true,
          comment: "Currency the escrow is held in. NULL = legacy row, use trade.currency.",
        },
        escrowWalletType: {
          type: DataTypes.ENUM("FIAT", "SPOT", "ECO"),
          allowNull: true,
          comment:
            "Wallet type the escrow is held in. NULL = legacy row, use offer.walletType. FIAT is legal here for pre-existing holds.",
          validate: {
            isIn: {
              args: [["FIAT", "SPOT", "ECO"]],
              msg: "Invalid escrowWalletType",
            },
          },
        },
        escrowOwnerId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "User whose wallet holds the escrow. NULL = legacy row, use trade.sellerId.",
          validate: {
            // Shape only, no version — the same reasoning as `paymentMethod`
            // above: a UUID's version says which algorithm minted it and nothing
            // about validity, and pinning it to 4 would make a legitimate v7
            // owner id unwritable INSIDE the settlement transaction, i.e. it
            // would strand the escrow it was supposed to describe.
            isUUID: { args: ANY_UUID_VERSION, msg: "escrowOwnerId must be a valid UUID" },
          },
        },
        completedAt: { type: DataTypes.DATE, allowNull: true },
        cancelledAt: { type: DataTypes.DATE, allowNull: true },
        disputedAt: { type: DataTypes.DATE, allowNull: true },
        cancelledBy: { type: DataTypes.UUID, allowNull: true },
        cancellationReason: { type: DataTypes.STRING(500), allowNull: true },
        resolution: {
          type: DataTypes.JSON,
         allowNull: true,
          get(this: any) {
            /*
             * Guarded both ways: `typeof` stops an already-parsed value (prod
             * MySQL) being parsed a second time, and the try/catch stops a
             * corrupt value throwing inside a getter during an ordinary read.
             */
            const value = this.getDataValue("resolution") as unknown;
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
      },
      {
        sequelize,
        modelName: "p2pTrade",
        tableName: "p2p_trades",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "idx_p2p_trade_status",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "idx_p2p_trade_buyerId_status",
            using: "BTREE",
            fields: [{ name: "buyerId" }, { name: "status" }],
          },
          {
            name: "idx_p2p_trade_sellerId_status",
            using: "BTREE",
            fields: [{ name: "sellerId" }, { name: "status" }],
          },
          {
            name: "idx_p2p_trade_createdAt",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
          {
            // Drives escrow reconciliation: "which trades still hold funds".
            name: "idx_p2p_trade_escrowStatus",
            using: "BTREE",
            fields: [{ name: "escrowStatus" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    p2pTrade.belongsTo(models.user, {
      as: "buyer",
      foreignKey: "buyerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pTrade.belongsTo(models.user, {
      as: "seller",
      foreignKey: "sellerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pTrade.belongsTo(models.p2pOffer, {
      as: "offer",
      foreignKey: "offerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pTrade.hasOne(models.p2pDispute, {
      as: "dispute",
      foreignKey: "tradeId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pTrade.hasMany(models.p2pReview, {
      as: "reviews",
      foreignKey: "tradeId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pTrade.belongsTo(models.p2pPaymentMethod, {
      as: "paymentMethodDetails",
      foreignKey: "paymentMethod",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
