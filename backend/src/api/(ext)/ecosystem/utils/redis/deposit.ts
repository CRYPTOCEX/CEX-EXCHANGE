import { RedisSingleton } from "@b/utils/redis";
import { messageBroker } from "@b/handler/Websocket";
import { handleEcosystemDeposit } from "@b/api/(ext)/ecosystem/utils/wallet";
import { createNotification } from "@b/utils/notifications";
import { unlockAddress } from "@b/api/(ext)/ecosystem/wallet/utils";

const redis = RedisSingleton.getInstance();
const setAsync = (key: string, value: string) => redis.set(key, value);
const getAsync = (key: string) => redis.get(key);
const delAsync = (key: string) => redis.del(key);
const keysAsync = (pattern: string) => redis.keys(pattern);

export async function storeAndBroadcastTransaction(txDetails, txHash, isPending = false) {
  try {
    console.log(`[INFO] Processing deposit for immediate broadcast: ${txHash}`);

    // Check if this is a pending transaction update (for confirmations)
    if (isPending && txDetails.type === "pending_confirmation") {
      console.log(`[INFO] Broadcasting pending transaction update for ${txHash}`);

      const address = txDetails.address?.toLowerCase() || txDetails.to?.toLowerCase();

      // For UTXO chains (BTC, LTC, DOGE, DASH, XMR), currency === chain
      const currency = txDetails.currency || txDetails.chain;

      // Broadcast pending transaction status to WebSocket subscribers
      const broadcastPayload = {
        currency: currency,
        chain: txDetails.chain,
        address: address,
      };

      console.log(`[WS_DEBUG] Broadcasting to subscribed clients with payload:`, JSON.stringify(broadcastPayload));

      messageBroker.broadcastToSubscribedClients(
        "/api/ecosystem/deposit",
        broadcastPayload,
        {
          stream: "verification",
          data: {
            type: "pending_confirmation",
            transactionHash: txDetails.transactionHash,
            hash: txDetails.hash,
            confirmations: txDetails.confirmations,
            requiredConfirmations: txDetails.requiredConfirmations,
            amount: txDetails.amount,
            fee: txDetails.fee,
            status: "PENDING",
            chain: txDetails.chain,
            walletId: txDetails.walletId,
          },
        }
      );

      console.log(`[SUCCESS] Broadcasted pending transaction ${txHash} with ${txDetails.confirmations}/${txDetails.requiredConfirmations} confirmations to currency:${currency}, chain:${txDetails.chain}, address:${address}`);
      return;
    }

    // First, try to handle the ecosystem deposit immediately
    const response = await handleEcosystemDeposit(txDetails);

    if (response.transaction) {
      // Success! Broadcast immediately to connected clients
      console.log(
        `[SUCCESS] Deposit processed immediately for ${txHash}, broadcasting to WebSocket`
      );

      // Handle address - it could be a string or array
      let address: string;
      if (txDetails.chain === "MO") {
        address = Array.isArray(txDetails.to)
          ? txDetails.to[0]?.toLowerCase()
          : txDetails.to?.toLowerCase();
      } else {
        address = txDetails.address?.toLowerCase() ||
          (Array.isArray(txDetails.to) ? txDetails.to[0]?.toLowerCase() : txDetails.to?.toLowerCase());
      }

      // Broadcast to WebSocket subscribers
      const broadcastPayload = {
        currency: response.wallet?.currency,
        chain: txDetails.chain,
        address: address,
      };

      messageBroker.broadcastToSubscribedClients(
        "/api/ecosystem/deposit",
        broadcastPayload,
        {
          stream: "verification",
          data: {
            status: 200,
            message: "Deposit confirmed",
            transaction: response.transaction,
            wallet: response.wallet,
            trx: txDetails,
            balance: response.wallet?.balance,
            currency: response.wallet?.currency,
            chain: txDetails.chain,
            method: "Wallet Deposit",
          },
        }
      );

      // Handle address unlocking for NO_PERMIT tokens
      if (txDetails.contractType === "NO_PERMIT" && txDetails.to) {
        try {
          await unlockAddress(txDetails.to);
          console.log(
            `[SUCCESS] Address ${txDetails.to} unlocked for NO_PERMIT transaction ${txHash}`
          );
        } catch (unlockError) {
          console.error(
            `[ERROR] Failed to unlock address ${txDetails.to}: ${unlockError.message}`
          );
        }
      }

      // Create notification
      if (response.wallet?.userId) {
        try {
          await createNotification({
            userId: response.wallet.userId,
            relatedId: response.transaction?.id,
            title: "Deposit Confirmation",
            message: `Your deposit of ${txDetails.amount} ${response.wallet.currency} has been confirmed.`,
            type: "system",
            link: `/finance/history`,
            actions: [
              {
                label: "View Deposit",
                link: `/finance/history`,
                primary: true,
              },
            ],
          });
          console.log(
            `[SUCCESS] Notification created for user ${response.wallet.userId}`
          );
        } catch (notificationError) {
          console.error(
            `[ERROR] Failed to create notification: ${notificationError.message}`
          );
        }
      }

      // Don't store as pending since it's already processed
      console.log(
        `[SUCCESS] Deposit ${txHash} processed and broadcast immediately`
      );
      return;
    } else {
      console.log(
        `[INFO] Deposit ${txHash} couldn't be processed immediately, storing as pending`
      );
    }
  } catch (error) {
    console.error(
      `[ERROR] Error in immediate deposit processing for ${txHash}: ${error.message}`
    );
  }

  // Fallback: Store as pending for the verification worker to handle later
  console.log(`[INFO] Storing ${txHash} as pending for verification worker`);
  const pendingTransactions =
    (await loadFromRedis("pendingTransactions")) || {};
  pendingTransactions[txHash] = txDetails;
  await offloadToRedis("pendingTransactions", pendingTransactions);
}

export async function offloadToRedis<T>(key: string, value: T): Promise<void> {
  const serializedValue = JSON.stringify(value);
  await setAsync(key, serializedValue);
}

export async function loadKeysFromRedis(pattern: string): Promise<string[]> {
  try {
    const keys = await keysAsync(pattern);
    return keys;
  } catch (error) {
    console.error("Failed to fetch keys:", error);
    return [];
  }
}

export async function loadFromRedis(identifier: string): Promise<any | null> {
  const dataStr = await getAsync(identifier);
  if (!dataStr) return null;
  try {
    return JSON.parse(dataStr);
  } catch (error) {
    console.error("Failed to parse JSON:", error);
    return null;
  }
}

export async function removeFromRedis(key: string): Promise<void> {
  try {
    const delResult = await delAsync(key);
    console.log(`Delete Result for key ${key}: `, delResult);
  } catch (error) {
    console.error(`Failed to delete key ${key}:`, error);
  }
}
