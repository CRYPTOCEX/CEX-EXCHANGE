/**
 * Fix Ecosystem Orders Script
 *
 * This script finds and fixes faulty ecosystem orders where:
 * - Orders exist but funds weren't properly locked
 * - inOrder amount is less than what the order requires
 *
 * Actions taken:
 * 1. Refund any locked funds back to user's wallet balance
 * 2. Cancel the faulty order in Scylla
 * 3. Update orderbook to remove cancelled order entries
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

const scyllaConfig = {
  contactPoints: [process.env.SCYLLA_HOST || "localhost"],
  localDataCenter: process.env.SCYLLA_DATACENTER || "datacenter1",
  keyspace: scyllaKeyspace,
};

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

      // Get user's wallet
      const wallet = await Wallet.findOne({
        where: {
          userId,
          currency: lockCurrency,
          type: "ECO",
        },
      });

      if (!wallet) {
        console.log(`[SKIP] No wallet for user ${userId}, currency ${lockCurrency}`);
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

    console.log("Fixing faulty orders...\n");

    let fixed = 0;
    for (const order of faultyOrders) {
      try {
        // 1. Refund user - restore their balance, clear inOrder for this order
        if (order.inOrder > 0) {
          await sequelize.query(
            `UPDATE wallet SET balance = balance + ?, inOrder = GREATEST(0, inOrder - ?) WHERE id = ?`,
            { replacements: [order.inOrder, order.inOrder, order.walletId] }
          );
          console.log(`[REFUND] ${order.inOrder.toFixed(8)} ${order.currency} to ${order.userId}`);
        }

        // 2. Cancel the order in Scylla
        const cancelQuery = `
          UPDATE ${scyllaKeyspace}.orders
          SET status = 'CANCELLED', "updatedAt" = ?
          WHERE "userId" = ? AND "createdAt" = ? AND id = ?
        `;
        await scyllaClient.execute(cancelQuery, [
          new Date(),
          order.userId,
          order.createdAt,
          order.orderId,
        ], { prepare: true });
        console.log(`[CANCEL] Order ${order.orderId}`);

        // 3. Update orderbook - remove the cancelled order's amount
        const orderbookSide = order.side === "BUY" ? "BIDS" : "ASKS";
        const remainingNum = Number(order.remaining) / 1e18;

        // Get current orderbook entry
        const obQuery = `SELECT amount FROM ${scyllaKeyspace}.orderbook WHERE symbol = ? AND price = ? AND side = ?`;
        const obResult = await scyllaClient.execute(obQuery, [order.symbol, order.price, orderbookSide], { prepare: true });

        if (obResult.rows.length > 0) {
          const currentAmount = parseFloat(obResult.rows[0].amount?.toString() || "0");
          const newAmount = Math.max(0, currentAmount - remainingNum);

          if (newAmount <= 0.00000001) {
            // Delete entry
            const deleteQuery = `DELETE FROM ${scyllaKeyspace}.orderbook WHERE symbol = ? AND price = ? AND side = ?`;
            await scyllaClient.execute(deleteQuery, [order.symbol, order.price, orderbookSide], { prepare: true });
          } else {
            // Update entry
            const updateQuery = `UPDATE ${scyllaKeyspace}.orderbook SET amount = ? WHERE symbol = ? AND price = ? AND side = ?`;
            await scyllaClient.execute(updateQuery, [newAmount, order.symbol, order.price, orderbookSide], { prepare: true });
          }
          console.log(`[ORDERBOOK] Updated ${order.symbol} ${orderbookSide} at ${order.price}`);
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
    console.log("");
    console.log("IMPORTANT: Restart your backend server now!");
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
