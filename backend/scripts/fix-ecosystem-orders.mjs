/**
 * Fix Ecosystem Orders Script
 *
 * Finds ecosystem orders that are OPEN while the wallet behind them does not
 * hold enough in `inOrder` to cover them, and retires them: release what is
 * held, mark the order CANCELED, take its size out of the aggregated book, and
 * remove its row from the matcher's index.
 *
 * DRY RUN BY DEFAULT — pass --execute to apply. This is the convention every
 * other writing script in backend/scripts follows, and it is load-bearing here:
 * the detection below compares ONE order against the WHOLE wallet's `inOrder`,
 * so the list is worth reading before anything is cancelled.
 *
 *     node backend/scripts/fix-ecosystem-orders.mjs              # report
 *     node backend/scripts/fix-ecosystem-orders.mjs --execute    # apply
 *
 * ---------------------------------------------------------------------------
 * THREE DEFECTS THIS SCRIPT SHIPPED WITH, AND WHAT THEY COST
 * ---------------------------------------------------------------------------
 *
 * All three were in the write half, and together they turned a repair into the
 * platform's worst ecosystem corruption — an order that is displayed as resting
 * liquidity, absent from every list, and removable by no cancel door:
 *
 * 1. THE ORDERBOOK KEY WAS AT THE WRONG SCALE. `orders.price` is VARINT at the
 *    1e18 fixed point; `orderbook.price` is a DOUBLE at human scale. The level
 *    was looked up with the raw 1e18 value, so the SELECT matched nothing on
 *    every real order — a miss, not an error — and the level was left standing
 *    while `[OK]` was printed. The key is now derived exactly as the backend
 *    derives it: `fromBigInt(removeTolerance(price))`.
 *
 * 2. THE STATUS WAS SPELLED `CANCELLED`. Every terminal status in this platform
 *    is `CANCELED` (one L) or `CLOSED`, and `isTerminalOrderStatus` tests those
 *    two. A double-L status is therefore neither OPEN (so no list shows it, and
 *    no cancel door will touch it) nor terminal (so nothing treats it as
 *    settled) — an order in a state no code path recognises.
 *
 * 3. THE INDEX ROW WAS NEVER DELETED. `open_orders_by_market` is what the
 *    matching engine LOADS FROM. A row left there still says status 'OPEN', so
 *    the next restart puts the order back in the matching queue as live, funded
 *    liquidity — after this script has already released its funds — and the
 *    five-minute reconciler then rebuilds the aggregated level to match it. See
 *    backend/src/api/(ext)/ecosystem/utils/scylla/index-audit.ts.
 *
 * It also connected to `SCYLLA_HOST` only, which is not the variable this
 * platform sets (`SCYLLA_CONNECT_POINTS`), so on an ordinary install it went to
 * localhost and could not connect at all.
 *
 * Run from project root: pnpm fix:eco-orders
 * Or from backend: node scripts/fix-ecosystem-orders.mjs
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Client, auth } from "cassandra-driver";
import { Sequelize, DataTypes } from "sequelize";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from project root (v5/.env)
config({ path: path.join(__dirname, "../../.env") });

// Initialize Scylla client
const scyllaKeyspace = process.env.SCYLLA_KEYSPACE || "trading";
const scyllaUsername = process.env.SCYLLA_USERNAME;
const scyllaPassword = process.env.SCYLLA_PASSWORD;

// SCYLLA_CONNECT_POINTS is what the platform actually sets (see
// backend/src/api/(ext)/ecosystem/utils/scylla/client.ts and every sibling
// script). SCYLLA_HOST is kept as a fallback so an operator who set only that
// still connects.
const scyllaConfig = {
  contactPoints: process.env.SCYLLA_CONNECT_POINTS
    ? process.env.SCYLLA_CONNECT_POINTS.split(",").map((p) => p.trim())
    : [process.env.SCYLLA_HOST || "localhost"],
  localDataCenter: process.env.SCYLLA_DATACENTER || "datacenter1",
  keyspace: scyllaKeyspace,
};

/** Apply, rather than report. Dry run is the default. */
const EXECUTE = process.argv.slice(2).includes("--execute");

/*
  SCALING HELPERS — MUST MIRROR
  backend/src/api/(ext)/ecosystem/utils/blockchain.ts EXACTLY.

  `orders.price` is VARINT at the 1e18 fixed point. `orderbook.price` is a DOUBLE
  at human scale, and it is a KEY COLUMN — so a value that differs from the one
  the backend wrote selects nothing, and a SELECT that matches nothing is a
  perfectly good empty result rather than an error. That is how this script came
  to leave every level standing while reporting success.

  removeTolerance's default digit count is 2, which is what `createOrder` applies
  to the price before storing it, and therefore what every writer of the
  aggregated level derives its key from.
*/
const fromBigInt = (v) => Number(BigInt(v.toString())) / 1e18;
function removeTolerance(v, toleranceDigits = 2) {
  const b = BigInt(v.toString());
  const t = BigInt("1" + "0".repeat(toleranceDigits));
  if (b < t) return b;
  return (b / t) * t;
}
/** The aggregated book's key for an order price, exactly as the backend writes it. */
const orderbookPriceKey = (rawVarint) => fromBigInt(removeTolerance(BigInt(rawVarint)));

// Add authentication if credentials are provided
if (scyllaUsername && scyllaPassword) {
  scyllaConfig.authProvider = new auth.PlainTextAuthProvider(
    scyllaUsername,
    scyllaPassword
  );
}

const scyllaClient = new Client(scyllaConfig);

// Initialize Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME || "platform",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    dialect: "mysql",
    logging: false,
  }
);

// Define Wallet model
const Wallet = sequelize.define("wallet", {
  id: { type: DataTypes.UUID, primaryKey: true },
  userId: DataTypes.UUID,
  currency: DataTypes.STRING,
  type: DataTypes.STRING,
  balance: DataTypes.DECIMAL(30, 18),
  inOrder: DataTypes.DECIMAL(30, 18),
}, {
  tableName: "wallet",
  timestamps: false,
});

async function main() {
  console.log("=".repeat(60));
  console.log("Ecosystem Faulty Orders Fix Script");
  console.log("=".repeat(60));
  console.log("");

  try {
    console.log("Connecting to databases...");
    await scyllaClient.connect();
    await sequelize.authenticate();
    console.log("Connected successfully.\n");

    console.log("Fetching open orders from Scylla...");

    // Get all open orders
    const query = `SELECT * FROM ${scyllaKeyspace}.orders WHERE status = 'OPEN' ALLOW FILTERING`;
    const result = await scyllaClient.execute(query);

    console.log(`Found ${result.rows.length} open orders.\n`);

    const faultyOrders = [];

    for (const row of result.rows) {
      const orderId = row.id?.toString() || "";

      // Skip bot orders - they use pool liquidity, not user wallets
      if (row.marketMakerId || row.botId) {
        continue;
      }

      const userId = row.userId?.toString();
      if (!userId || userId === "00000000-0000-0000-0000-000000000000") {
        continue;
      }

      // Debug: log specific problematic orders
      const knownProblematicIds = [
        "056792f7-3908-4c6b-ba50-f084954e685e",
        "50d7a0f2-9e55-472d-8672-e969064f68f5",
      ];
      if (knownProblematicIds.some(id => orderId.includes(id.substring(0, 8)))) {
        console.log(`[DEBUG] Found order ${orderId}: userId=${userId}, status=${row.status}, marketMakerId=${row.marketMakerId}, botId=${row.botId}, side=${row.side}, symbol=${row.symbol}`);
      }

      const symbol = row.symbol;
      if (!symbol || !symbol.includes("/")) {
        continue;
      }

      const [baseCurrency, quoteCurrency] = symbol.split("/");
      const side = row.side;

      // Calculate required lock amount
      const remaining = BigInt(row.remaining?.toString() || "0");
      const cost = BigInt(row.cost?.toString() || "0");
      const amount = BigInt(row.amount?.toString() || "0");

      // Skip if no remaining amount
      if (remaining <= 0n) {
        continue;
      }

      const fillRatio = amount > 0n ? Number(remaining) / Number(amount) : 0;
      const requiredBigInt = side === "BUY" ? cost : remaining;
      const required = Number(requiredBigInt) / 1e18 * (side === "BUY" ? fillRatio : 1);
      const lockCurrency = side === "BUY" ? quoteCurrency : baseCurrency;

      /*
        THE WALLET THAT WAS DEBITED, NOT ALWAYS "ECO".

        `placeOrder` holds an order's funds in the wallet named by the order's own
        `walletType` — "ECO" or "COPY_TRADING" — and records it on the row. Asking
        for the ECO wallet unconditionally reads a wallet that never held these
        funds: its `inOrder` is 0, so every COPY_TRADING order on the install is
        judged UNDERFUNDED and retired, while the real hold in the COPY_TRADING
        wallet is stranded with no door left to release it.

        Measured on the development cluster: all three genuinely-held
        COPY_TRADING orders on MO/USDT were reported faulty by this script. The
        backend's own cancel routes were corrected for exactly this; this copy was
        not.
      */
      const orderWalletType = row.walletType || "ECO";

      const wallet = await Wallet.findOne({
        where: {
          userId,
          currency: lockCurrency,
          type: orderWalletType,
        },
      });

      if (!wallet) {
        console.log(
          `[SKIP] No ${orderWalletType} wallet for user ${userId}, currency ${lockCurrency}`
        );
        continue;
      }

      const inOrder = parseFloat(wallet.inOrder?.toString() || "0");

      // Check if insufficient funds locked (with 0.0001 tolerance)
      if (inOrder + 0.0001 < required) {
        faultyOrders.push({
          walletId: wallet.id,
          orderId: row.id?.toString() || "",
          userId,
          symbol,
          side,
          remaining,
          cost,
          // Carried because the RELEASE step sizes this order's share the way
          // `placeOrder` sized its hold — a BUY held `cost + fee`, so releasing
          // `cost` alone would strand the fee share in `inOrder` forever.
          fee: BigInt(row.fee?.toString() || "0"),
          amount,
          price: row.price?.toString() || "0",
          createdAt: row.createdAt,
          inOrder,
          required,
          currency: lockCurrency,
        });

        console.log(`[FAULTY] Order ${row.id?.toString()}`);
        console.log(`         User: ${userId}`);
        console.log(`         ${symbol} ${side}`);
        console.log(`         inOrder: ${inOrder.toFixed(8)} ${lockCurrency}`);
        console.log(`         Required: ${required.toFixed(8)} ${lockCurrency}`);
        console.log(`         Diff: ${(required - inOrder).toFixed(8)}`);
        console.log("");
      }
    }

    console.log("=".repeat(60));
    console.log(`Found ${faultyOrders.length} faulty orders`);
    console.log("=".repeat(60));
    console.log("");

    if (faultyOrders.length === 0) {
      console.log("No faulty orders to fix. Exiting.");
      await cleanup();
      process.exit(0);
    }

    if (!EXECUTE) {
      console.log("DRY RUN — nothing was changed.");
      console.log("");
      console.log("Re-run with --execute to release the held funds, mark these orders");
      console.log("CANCELED, remove their size from the aggregated book and delete their");
      console.log("rows from the matcher's index. Restart the backend afterwards.");
      console.log("");
      await cleanup();
      process.exit(0);
    }

    console.log("Fixing faulty orders...\n");

    let fixed = 0;
    let levelsMissing = 0;
    for (const order of faultyOrders) {
      try {
        /*
          1. Release THIS ORDER'S SHARE of the hold — not the wallet's whole pot.

          `order.inOrder` is the wallet's TOTAL `inOrder`, across every open order
          the user has in that currency and wallet type. Paying all of it back
          used to be this step: `balance = balance + <whole pot>`. On a wallet
          with a single faulty order that happens to be right, and it is how this
          script has been run — but it is the wrong rule, and it fails in the
          direction that costs money.

          The detection above deliberately does NOT bound the blast radius for
          it. It skips every row carrying `marketMakerId` or `botId`, so "the
          only faulty order" is only ever the only NON-BOT one; a trading bot's
          orders are the OWNER'S orders, funded from the owner's own wallet, and
          they are invisible to this scan while their holds sit in the very pot
          being emptied. The consequence is silent and doubly bad: the other
          order's hold is credited to the customer's spendable balance, and when
          that order is later cancelled its own release finds nothing left to
          release and is clamped to zero (see `releaseOnly` in
          ecosystem/utils/wallet.ts) — so the customer is paid once and the
          second refund quietly does not happen.

          The share is sized exactly as `placeOrder` sized the hold: a BUY holds
          `cost + fee`, a SELL holds the base amount, both pro-rated by what is
          still unfilled. LEAST() clamps it to whatever the wallet actually holds
          at the moment of the write, so a hold that was already drained cannot
          push `inOrder` negative or mint a refund.

          MySQL assigns SET expressions left to right, and `inOrder` is still its
          original value while the `balance` expression is evaluated — so both
          LEAST() terms see the same number.
        */
        const fillRatio =
          order.amount > 0n ? Number(order.remaining) / Number(order.amount) : 0;
        const ownShare =
          order.side === "BUY"
            ? (Number(order.cost) / 1e18 + Number(order.fee ?? 0n) / 1e18) * fillRatio
            : Number(order.remaining) / 1e18;
        const release = Math.min(ownShare, order.inOrder);

        if (release > 0) {
          await sequelize.query(
            `UPDATE wallet
                SET balance = balance + LEAST(inOrder, ?),
                    inOrder = inOrder - LEAST(inOrder, ?)
              WHERE id = ?`,
            { replacements: [release, release, order.walletId] }
          );
          console.log(
            `[RELEASE] ${release.toFixed(8)} ${order.currency} to ${order.userId}` +
              (order.inOrder > release
                ? `  (wallet holds ${order.inOrder.toFixed(8)}; the rest belongs to other orders ` +
                  `and is left alone — run \`pnpm reconcile:eco-inorder\` if it is stranded)`
                : "")
          );
        } else {
          console.log(
            `[RELEASE] nothing to release for ${order.orderId} — the hold is already gone`
          );
        }

        /*
          2. Retire the order — the LEDGER row and the MATCHER'S INDEX ROW, in
             one batch.

          `CANCELED`, one L: that is the spelling `isTerminalOrderStatus` and
          every cancel path in the backend test for. The double-L this used to
          write is neither OPEN nor terminal, so the order fell out of every list
          while no code path considered it settled.

          The index delete is not optional. `open_orders_by_market` is what the
          matching engine loads from, its row carries status 'OPEN', and the funds
          have just been released — so a row left behind comes back at the next
          restart as resting liquidity with nothing behind it, and the orderbook
          reconciler then rebuilds its level to match. A batch, so the two rows
          cannot part company.
        */
        const orderbookSide = order.side === "BUY" ? "BIDS" : "ASKS";
        const priceKey = orderbookPriceKey(order.price);

        await scyllaClient.batch(
          [
            {
              query: `UPDATE ${scyllaKeyspace}.orders
                         SET status = 'CANCELED', "updatedAt" = ?
                       WHERE "userId" = ? AND "createdAt" = ? AND id = ?`,
              params: [new Date(), order.userId, order.createdAt, order.orderId],
            },
            {
              // Keyed by the values the row was WRITTEN under — the stored VARINT
              // price, not the human-scale one used for the book below.
              query: `DELETE FROM ${scyllaKeyspace}.open_orders_by_market
                       WHERE symbol = ? AND side = ? AND price = ? AND "createdAt" = ? AND id = ?`,
              params: [
                order.symbol,
                String(order.side).toUpperCase(),
                order.price.toString(),
                order.createdAt,
                order.orderId,
              ],
            },
          ],
          { prepare: true }
        );
        console.log(`[CANCEL] Order ${order.orderId} (ledger + matcher index)`);

        // 3. Take this order's remaining size out of the aggregated level.
        const remainingNum = fromBigInt(order.remaining);

        const obQuery = `SELECT amount FROM ${scyllaKeyspace}.orderbook WHERE symbol = ? AND price = ? AND side = ?`;
        const obResult = await scyllaClient.execute(obQuery, [order.symbol, priceKey, orderbookSide], { prepare: true });

        if (obResult.rows.length > 0) {
          const currentAmount = parseFloat(obResult.rows[0].amount?.toString() || "0");
          const newAmount = Math.max(0, currentAmount - remainingNum);

          if (newAmount <= 0.00000001) {
            // Delete entry
            const deleteQuery = `DELETE FROM ${scyllaKeyspace}.orderbook WHERE symbol = ? AND price = ? AND side = ?`;
            await scyllaClient.execute(deleteQuery, [order.symbol, priceKey, orderbookSide], { prepare: true });
          } else {
            // Update entry
            const updateQuery = `UPDATE ${scyllaKeyspace}.orderbook SET amount = ? WHERE symbol = ? AND price = ? AND side = ?`;
            await scyllaClient.execute(updateQuery, [newAmount, order.symbol, priceKey, orderbookSide], { prepare: true });
          }
          console.log(`[ORDERBOOK] ${order.symbol} ${orderbookSide} @ ${priceKey}: ${currentAmount} -> ${newAmount <= 0.00000001 ? "deleted" : newAmount}`);
        } else {
          // SAID OUT LOUD, because this used to happen on EVERY order — the key
          // was at the wrong scale — and `[OK]` was printed anyway.
          levelsMissing++;
          console.log(`[ORDERBOOK] no level at ${order.symbol} ${orderbookSide} @ ${priceKey} — nothing to decrement`);
        }

        fixed++;
        console.log(`[OK] Fixed order ${order.orderId}\n`);
      } catch (error) {
        console.error(`[ERROR] Failed to fix order ${order.orderId}:`, error.message);
      }
    }

    console.log("=".repeat(60));
    console.log("CLEANUP COMPLETE");
    console.log("=".repeat(60));
    console.log(`Fixed ${fixed}/${faultyOrders.length} faulty orders`);
    if (levelsMissing > 0) {
      console.log(
        `${levelsMissing} order(s) had no aggregated level to decrement. That is normal for a ` +
          `partially-filled level that was already emptied; if you see it for ALL of them, the ` +
          `book and the ledger disagree — run \`pnpm rebuild:eco-orderbook\`.`
      );
    }
    console.log("");
    console.log("IMPORTANT: Restart your backend server now! The matching engine holds these");
    console.log("orders in memory and will keep quoting them until it reloads.");
    console.log("");

  } catch (error) {
    console.error("Script failed:", error);
  } finally {
    await cleanup();
  }
}

async function cleanup() {
  try {
    await scyllaClient.shutdown();
    await sequelize.close();
  } catch (e) {
    // Ignore cleanup errors
  }
}

main();
