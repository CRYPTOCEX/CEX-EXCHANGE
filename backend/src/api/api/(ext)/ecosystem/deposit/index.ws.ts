// index.ws.ts
import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { getEcosystemToken } from "@b/api/(ext)/ecosystem/utils/tokens";
import { EVMDeposits } from "./util/monitor/EVMDeposits";
import { UTXODeposits } from "./util/monitor/UTXODeposits";
import { SolanaDeposits } from "./util/monitor/SolanaDeposits";
import { TronDeposits } from "./util/monitor/TronDeposits";
import { MoneroDeposits } from "./util/monitor/MoneroDeposits";
import { TonDeposits } from "./util/monitor/TonDeposits";
import { MODeposits } from "./util/monitor/MODeposits";
import { createWorker } from "@b/utils/cron";
import { verifyPendingTransactions } from "./util/PendingVerification";
import { isMainThread } from "worker_threads";

const monitorInstances = new Map(); // Maps userId -> monitor instance
const monitorStopTimeouts = new Map(); // Maps userId -> stopPolling timeout ID
const activeConnections = new Map(); // Maps userId -> connection metadata
let workerInitialized = false;

export const metadata = {};

export default async (data: Handler, message) => {
  const { user } = data;

  if (!user?.id) throw createError(401, "Unauthorized");

  if (typeof message === "string") {
    try {
      message = JSON.parse(message);
    } catch (err) {
      console.error(`Failed to parse incoming message: ${err.message}`);
      throw createError(400, "Invalid JSON payload");
    }
  }

  const { currency, chain, address } = message.payload;

  // Enhanced validation
  if (!currency || !chain) {
    throw createError(400, "Currency and chain are required");
  }

  try {
    const wallet = await models.wallet.findOne({
      where: {
        userId: user.id,
        currency,
        type: "ECO",
      },
    });

    if (!wallet) throw createError(400, "Wallet not found");
    if (!wallet.address) throw createError(400, "Wallet address not found");

    const addresses = JSON.parse(wallet.address as any);
    const walletChain = addresses[chain];

    if (!walletChain) throw createError(400, "Address not found");

    const token = await getEcosystemToken(chain, currency);
    if (!token) throw createError(400, "Token not found");

    const contractType = token.contractType;
    const finalAddress =
      contractType === "NO_PERMIT" ? address : walletChain.address;

    const monitorKey = user.id;

    // Store connection metadata for better tracking
    activeConnections.set(monitorKey, {
      userId: user.id,
      currency,
      chain,
      address: finalAddress,
      contractType,
      connectedAt: Date.now(),
    });

    // Clear any pending stop timeouts since the user reconnected
    if (monitorStopTimeouts.has(monitorKey)) {
      clearTimeout(monitorStopTimeouts.get(monitorKey));
      monitorStopTimeouts.delete(monitorKey);
      console.log(
        `[INFO] Cleared stop timeout for user ${monitorKey} on reconnection`
      );
    }

    let monitor = monitorInstances.get(monitorKey);

    // Enhanced monitor management - check if monitor is stale or for different parameters
    if (monitor) {
      const connection = activeConnections.get(monitorKey);
      const isStaleMonitor =
        monitor.active === false ||
        (connection &&
          (monitor.chain !== chain ||
            monitor.currency !== currency ||
            monitor.address !== finalAddress));

      if (isStaleMonitor) {
        console.log(
          `[INFO] Monitor for user ${monitorKey} is stale or inactive. Creating a new monitor.`
        );
        // Clean up old monitor
        if (typeof monitor.stopPolling === "function") {
          monitor.stopPolling();
        }
        monitorInstances.delete(monitorKey);
        monitor = null;
      }
    }

    if (!monitor) {
      // No existing monitor for this user, create a new one
      console.log(
        `[INFO] Creating new monitor for user ${monitorKey}, chain: ${chain}, currency: ${currency}`
      );

      monitor = createMonitor(chain, {
        wallet,
        chain,
        currency,
        address: finalAddress,
        contractType,
      });

      if (monitor) {
        await monitor.watchDeposits();
        monitorInstances.set(monitorKey, monitor);
        console.log(
          `[SUCCESS] Monitor created and started for user ${monitorKey}`
        );
      } else {
        console.error(`[ERROR] Failed to create monitor for chain ${chain}`);
        throw createError(500, `Monitor creation failed for chain ${chain}`);
      }
    } else {
      // Monitor already exists and is valid, just reuse it
      console.log(`[INFO] Reusing existing monitor for user ${monitorKey}`);
    }

    // Initialize verification worker if not already done
    if (isMainThread && !workerInitialized) {
      try {
        await createWorker(
          "verifyPendingTransactions",
          verifyPendingTransactions,
          10000
        );
        console.log("[SUCCESS] Verification worker started");
        workerInitialized = true;
      } catch (error) {
        console.error(
          `[ERROR] Failed to start verification worker: ${error.message}`
        );
      }
    }
  } catch (error) {
    console.error(
      `[ERROR] Error in deposit WebSocket handler: ${error.message}`
    );
    // Clean up on error
    const monitorKey = user.id;
    if (monitorInstances.has(monitorKey)) {
      const monitor = monitorInstances.get(monitorKey);
      if (typeof monitor.stopPolling === "function") {
        monitor.stopPolling();
      }
      monitorInstances.delete(monitorKey);
    }
    activeConnections.delete(monitorKey);
    throw error;
  }
};

function createMonitor(chain: string, options: any) {
  const { wallet, currency, address, contractType } = options;

  try {
    if (["BTC", "LTC", "DOGE", "DASH"].includes(chain)) {
      return new UTXODeposits({ wallet, chain, address });
    } else if (chain === "SOL") {
      return new SolanaDeposits({ wallet, chain, currency, address });
    } else if (chain === "TRON") {
      return new TronDeposits({ wallet, chain, address });
    } else if (chain === "XMR") {
      return new MoneroDeposits({ wallet });
    } else if (chain === "TON") {
      return new TonDeposits({ wallet, chain, address });
    } else if (chain === "MO" && contractType !== "NATIVE") {
      return new MODeposits({ wallet, chain, currency, address, contractType });
    } else {
      return new EVMDeposits({
        wallet,
        chain,
        currency,
        address,
        contractType,
      });
    }
  } catch (error) {
    console.error(
      `[ERROR] Error creating monitor for chain ${chain}: ${error.message}`
    );
    return null;
  }
}

export const onClose = async (ws, route, clientId) => {
  console.log(`[INFO] WebSocket connection closed for client ${clientId}`);

  // Clear any previous pending stop timeouts for this client
  if (monitorStopTimeouts.has(clientId)) {
    clearTimeout(monitorStopTimeouts.get(clientId));
    monitorStopTimeouts.delete(clientId);
  }

  const monitor = monitorInstances.get(clientId);
  const connection = activeConnections.get(clientId);

  if (monitor && typeof monitor.stopPolling === "function") {
    // Enhanced timeout management - different timeouts based on contract type
    const timeoutDuration =
      connection?.contractType === "NO_PERMIT"
        ? 2 * 60 * 1000 // 2 minutes for NO_PERMIT (shorter due to address locking)
        : 10 * 60 * 1000; // 10 minutes for others

    console.log(
      `[INFO] Scheduling monitor stop for client ${clientId} in ${timeoutDuration / 1000}s (${connection?.contractType || "unknown"} type)`
    );

    // Schedule stopPolling after timeout if the user doesn't reconnect
    const timeoutId = setTimeout(() => {
      try {
        console.log(
          `[INFO] Executing scheduled monitor stop for client ${clientId}`
        );

        if (monitor && typeof monitor.stopPolling === "function") {
          monitor.stopPolling();
        }

        monitorStopTimeouts.delete(clientId);
        monitorInstances.delete(clientId);
        activeConnections.delete(clientId);

        console.log(
          `[SUCCESS] Monitor stopped and cleaned up for client ${clientId}`
        );
      } catch (error) {
        console.error(
          `[ERROR] Error during monitor cleanup for client ${clientId}: ${error.message}`
        );
      }
    }, timeoutDuration);

    monitorStopTimeouts.set(clientId, timeoutId);
  } else {
    // No monitor or invalid monitor, just clean up immediately
    monitorInstances.delete(clientId);
    activeConnections.delete(clientId);
  }
};
