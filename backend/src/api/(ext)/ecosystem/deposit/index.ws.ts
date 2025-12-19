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
import { createWorker } from "@b/cron";
import { verifyPendingTransactions } from "./util/PendingVerification";
import { isMainThread } from "worker_threads";
import { logger } from "@b/utils/console";

const monitorInstances = new Map(); // Maps userId -> monitor instance
const monitorStopTimeouts = new Map(); // Maps userId -> stopPolling timeout ID
const activeConnections = new Map(); // Maps userId -> connection metadata
let workerInitialized = false;

export const metadata = {
  logModule: "ECOSYSTEM",
  logTitle: "Deposit WebSocket monitoring"
};

export default async (data: Handler, message) => {
  const { user, ctx } = data;

  if (!user?.id) throw createError(401, "Unauthorized");

  ctx?.step("Parsing deposit WebSocket message");
  if (typeof message === "string") {
    try {
      message = JSON.parse(message);
    } catch (err) {
      logger.error("DEPOSIT_WS", `Failed to parse incoming message: ${err.message}`);
      ctx?.fail("Invalid JSON payload");
      throw createError(400, "Invalid JSON payload");
    }
  }

  const { currency, chain, address } = message.payload;

  ctx?.step("Validating deposit parameters");
  // Enhanced validation
  if (!currency || !chain) {
    ctx?.fail("Missing currency or chain");
    throw createError(400, "Currency and chain are required");
  }

  try {
    ctx?.step(`Finding wallet for ${currency}`);
    const wallet = await models.wallet.findOne({
      where: {
        userId: user.id,
        currency,
        type: "ECO",
      },
    });

    if (!wallet) {
      ctx?.fail("Wallet not found");
      throw createError(400, "Wallet not found");
    }
    if (!wallet.address) {
      ctx?.fail("Wallet address not found");
      throw createError(400, "Wallet address not found");
    }

    const addresses = JSON.parse(wallet.address as any);
    const walletChain = addresses[chain];

    if (!walletChain) {
      ctx?.fail("Address not found for chain");
      throw createError(400, "Address not found");
    }

    ctx?.step(`Fetching token configuration for ${currency} on ${chain}`);
    const token = await getEcosystemToken(chain, currency);
    if (!token) {
      ctx?.fail("Token not found");
      throw createError(400, "Token not found");
    }

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
      logger.info("DEPOSIT_WS", `Cleared stop timeout for user ${monitorKey} on reconnection`);
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
        logger.info("DEPOSIT_WS", `Monitor for user ${monitorKey} is stale or inactive. Creating a new monitor.`);
        // Clean up old monitor
        if (typeof monitor.stopPolling === "function") {
          monitor.stopPolling();
        }
        monitorInstances.delete(monitorKey);
        monitor = null;
      }
    }

    if (!monitor) {
      ctx?.step(`Creating new deposit monitor for ${chain}/${currency}`);
      // No existing monitor for this user, create a new one
      logger.info("DEPOSIT_WS", `Creating new monitor for user ${monitorKey}, chain: ${chain}, currency: ${currency}`);

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
        logger.success("DEPOSIT_WS", `Monitor created and started for user ${monitorKey}`);
        ctx?.success(`Deposit monitor started for ${chain}/${currency}`);
      } else {
        logger.error("DEPOSIT_WS", `Failed to create monitor for chain ${chain}`);
        ctx?.fail(`Monitor creation failed for chain ${chain}`);
        throw createError(500, `Monitor creation failed for chain ${chain}`);
      }
    } else {
      // Monitor already exists and is valid, just reuse it
      logger.info("DEPOSIT_WS", `Reusing existing monitor for user ${monitorKey}`);
      ctx?.success(`Reusing existing deposit monitor for ${chain}/${currency}`);
    }

    // Initialize verification worker if not already done
    if (isMainThread && !workerInitialized) {
      try {
        ctx?.step("Initializing verification worker");
        await createWorker(
          "verifyPendingTransactions",
          verifyPendingTransactions,
          10000
        );
        logger.success("DEPOSIT_WS", "Verification worker started");
        workerInitialized = true;
      } catch (error) {
        logger.error("DEPOSIT_WS", `Failed to start verification worker: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error("DEPOSIT_WS", `Error in deposit WebSocket handler: ${error.message}`);
    ctx?.fail(`Deposit monitoring failed: ${error.message}`);
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
    logger.error("DEPOSIT_WS", `Error creating monitor for chain ${chain}: ${error.message}`);
    return null;
  }
}

export const onClose = async (ws, route, clientId) => {
  logger.info("DEPOSIT_WS", `WebSocket connection closed for client ${clientId}`);

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

    logger.info("DEPOSIT_WS", `Scheduling monitor stop for client ${clientId} in ${timeoutDuration / 1000}s (${connection?.contractType || "unknown"} type)`);

    // Schedule stopPolling after timeout if the user doesn't reconnect
    const timeoutId = setTimeout(() => {
      try {
        logger.info("DEPOSIT_WS", `Executing scheduled monitor stop for client ${clientId}`);

        if (monitor && typeof monitor.stopPolling === "function") {
          monitor.stopPolling();
        }

        monitorStopTimeouts.delete(clientId);
        monitorInstances.delete(clientId);
        activeConnections.delete(clientId);

        logger.success("DEPOSIT_WS", `Monitor stopped and cleaned up for client ${clientId}`);
      } catch (error) {
        logger.error("DEPOSIT_WS", `Error during monitor cleanup for client ${clientId}: ${error.message}`);
      }
    }, timeoutDuration);

    monitorStopTimeouts.set(clientId, timeoutId);
  } else {
    // No monitor or invalid monitor, just clean up immediately
    monitorInstances.delete(clientId);
    activeConnections.delete(clientId);
  }
};
