import {
  loadFromRedis,
  offloadToRedis,
} from "@b/api/(ext)/ecosystem/utils/redis/deposit";
import { handleEcosystemDeposit } from "@b/api/(ext)/ecosystem/utils/wallet";
import { hasClients, messageBroker } from "@b/handler/Websocket";
import { verifyUTXOTransaction } from "@b/api/(ext)/ecosystem/utils/utxo";
import { createNotification } from "@b/utils/notifications";
import { unlockAddress } from "../../wallet/utils";
import {
  chainProviders,
  initializeHttpProvider,
  initializeWebSocketProvider,
} from "./ProviderManager";

// Track verification attempts to prevent excessive retries
const verificationAttempts = new Map<string, number>();
const MAX_VERIFICATION_ATTEMPTS = 5;
const VERIFICATION_ATTEMPT_RESET_TIME = 30 * 60 * 1000; // 30 minutes

export async function verifyPendingTransactions() {
  if (!hasClients(`/api/ecosystem/deposit`)) {
    return;
  }

  const processingTransactions = new Set();
  const processingStats = {
    total: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    const pendingTransactions = await loadFromRedis("pendingTransactions");

    if (!pendingTransactions || Object.keys(pendingTransactions).length === 0) {
      return;
    }

    const txHashes = Object.keys(pendingTransactions);
    processingStats.total = txHashes.length;

    console.log(
      `[INFO] Starting verification of ${txHashes.length} pending transactions`
    );

    // Limit concurrency for large batch of txs
    const concurrency = 5;
    const chunks: string[][] = [];
    for (let i = 0; i < txHashes.length; i += concurrency) {
      chunks.push(txHashes.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      const verificationPromises = chunk.map(async (txHash) => {
        if (processingTransactions.has(txHash)) {
          console.log(`[SKIP] Transaction ${txHash} already being processed.`);
          processingStats.skipped++;
          return;
        }

        try {
          const txDetails = pendingTransactions[txHash];
          if (!txDetails) {
            console.error(
              `[ERROR] Transaction ${txHash} not found in pending list.`
            );
            processingStats.failed++;
            return;
          }

          // Check verification attempts to prevent endless retries
          const attemptKey = `${txHash}:${txDetails.chain}`;
          const attempts = verificationAttempts.get(attemptKey) || 0;

          if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
            console.warn(
              `[WARN] Max verification attempts reached for ${txHash}, removing from pending`
            );
            delete pendingTransactions[txHash];
            verificationAttempts.delete(attemptKey);
            await offloadToRedis("pendingTransactions", pendingTransactions);
            processingStats.failed++;
            return;
          }

          processingTransactions.add(txHash);
          const chain = txDetails.chain;

          let isConfirmed = false;
          let updatedTxDetails: any = null;

          // Enhanced verification logic with better error handling
          if (["SOL", "TRON", "XMR", "TON"].includes(chain)) {
            isConfirmed =
              txDetails.status === "COMPLETED" ||
              txDetails.status === "CONFIRMED";
            updatedTxDetails = txDetails;

            if (isConfirmed) {
              console.log(
                `[SUCCESS] ${chain} transaction ${txHash} already confirmed`
              );
            }
          } else if (["BTC", "LTC", "DOGE", "DASH"].includes(chain)) {
            // UTXO chain verification with enhanced error handling
            try {
              const data = await verifyUTXOTransaction(chain, txHash);
              isConfirmed = data.confirmed;
              updatedTxDetails = {
                ...txDetails,
                status: isConfirmed ? "COMPLETED" : "PENDING",
                fee: data.fee || 0,
              };

              if (isConfirmed) {
                console.log(`[SUCCESS] UTXO transaction ${txHash} confirmed`);
              } else {
                console.log(
                  `[PENDING] UTXO transaction ${txHash} still pending confirmation`
                );
              }
            } catch (error) {
              console.error(
                `[ERROR] UTXO verification failed for ${txHash}: ${error.message}`
              );
              verificationAttempts.set(attemptKey, attempts + 1);
              processingStats.failed++;
              return;
            }
          } else {
            // EVM-compatible chain verification with improved provider management
            let provider = chainProviders.get(chain);
            if (!provider) {
              provider = await initializeWebSocketProvider(chain);
              if (!provider) {
                provider = await initializeHttpProvider(chain);
              }
            }

            if (!provider) {
              console.error(
                `[ERROR] Provider not available for chain ${chain}`
              );
              verificationAttempts.set(attemptKey, attempts + 1);
              processingStats.failed++;
              return;
            }

            try {
              const receipt = await provider.getTransactionReceipt(txHash);
              if (!receipt) {
                console.log(
                  `[PENDING] Transaction ${txHash} on ${chain} not yet confirmed.`
                );
                verificationAttempts.set(attemptKey, attempts + 1);
                return;
              }

              isConfirmed = receipt.status === 1;
              updatedTxDetails = {
                ...txDetails,
                gasUsed: receipt.gasUsed?.toString() || "0",
                effectiveGasPrice:
                  receipt.effectiveGasPrice?.toString() ||
                  txDetails.gasPrice ||
                  "0",
                blockNumber: receipt.blockNumber?.toString() || "0",
                status: isConfirmed ? "COMPLETED" : "FAILED",
              };

              if (isConfirmed) {
                console.log(
                  `[SUCCESS] EVM transaction ${txHash} on ${chain} confirmed in block ${receipt.blockNumber}`
                );
              } else {
                console.log(
                  `[FAILED] EVM transaction ${txHash} on ${chain} failed`
                );
              }
            } catch (error) {
              console.error(
                `[ERROR] Error fetching receipt for ${txHash} on ${chain}: ${error.message}`
              );
              verificationAttempts.set(attemptKey, attempts + 1);
              processingStats.failed++;
              return;
            }
          }

          if (isConfirmed && updatedTxDetails) {
            try {
              console.log(
                `[INFO] Processing confirmed transaction ${txHash} for deposit handling`
              );

              const response = await handleEcosystemDeposit(updatedTxDetails);
              if (!response.transaction) {
                console.log(
                  `[INFO] Transaction ${txHash} already processed or invalid. Removing from pending.`
                );
                delete pendingTransactions[txHash];
                verificationAttempts.delete(attemptKey);
                await offloadToRedis(
                  "pendingTransactions",
                  pendingTransactions
                );
                processingStats.skipped++;
                return;
              }

              const address =
                chain === "MO"
                  ? txDetails.to?.toLowerCase()
                  : typeof txDetails.to === "string"
                    ? txDetails.to
                    : txDetails.address?.toLowerCase();

              // Enhanced WebSocket broadcast with better error handling
              try {
                messageBroker.broadcastToSubscribedClients(
                  "/api/ecosystem/deposit",
                  {
                    currency: response.wallet?.currency,
                    chain,
                    address,
                  },
                  {
                    stream: "verification",
                    data: {
                      status: 200,
                      message: "Transaction completed",
                      ...response,
                      trx: updatedTxDetails,
                      balance: response.wallet?.balance,
                      currency: response.wallet?.currency,
                      chain,
                      method: "Wallet Deposit",
                    },
                  }
                );
                console.log(
                  `[SUCCESS] WebSocket broadcast sent for transaction ${txHash}`
                );
              } catch (broadcastError) {
                console.error(
                  `[ERROR] WebSocket broadcast failed for ${txHash}: ${broadcastError.message}`
                );
                // Don't fail the entire processing for broadcast errors
              }

              // Enhanced address unlocking with error handling
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
                  // Don't fail the transaction processing for unlock errors
                }
              }

              // Enhanced notification creation with error handling
              if (response.wallet?.userId) {
                try {
                  await createNotification({
                    userId: response.wallet.userId,
                    relatedId: response.transaction?.id,
                    title: "Deposit Confirmation",
                    message: `Your deposit of ${updatedTxDetails.amount} ${response.wallet.currency} has been confirmed.`,
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
                  // Don't fail the transaction processing for notification errors
                }
              }

              delete pendingTransactions[txHash];
              verificationAttempts.delete(attemptKey);
              await offloadToRedis("pendingTransactions", pendingTransactions);
              processingStats.processed++;

              console.log(
                `[SUCCESS] Transaction ${txHash} fully processed and removed from pending`
              );
            } catch (error) {
              console.error(
                `[ERROR] Error handling deposit for ${txHash}: ${error.message}`
              );
              if (error.message.includes("already processed")) {
                delete pendingTransactions[txHash];
                verificationAttempts.delete(attemptKey);
                await offloadToRedis(
                  "pendingTransactions",
                  pendingTransactions
                );
                processingStats.skipped++;
              } else {
                verificationAttempts.set(attemptKey, attempts + 1);
                processingStats.failed++;
              }
            }
          } else {
            // Transaction not yet confirmed, increment attempts but don't mark as failed
            verificationAttempts.set(attemptKey, attempts + 1);
          }
        } catch (error) {
          console.error(
            `[ERROR] Error verifying transaction ${txHash}: ${error.message}`
          );
          const attemptKey = `${txHash}:${pendingTransactions[txHash]?.chain || "unknown"}`;
          const attempts = verificationAttempts.get(attemptKey) || 0;
          verificationAttempts.set(attemptKey, attempts + 1);
          processingStats.failed++;
        } finally {
          processingTransactions.delete(txHash);
        }
      });

      await Promise.all(verificationPromises);
    }

    // Log processing summary
    console.log(
      `[SUMMARY] Verification completed - Total: ${processingStats.total}, Processed: ${processingStats.processed}, Failed: ${processingStats.failed}, Skipped: ${processingStats.skipped}`
    );
  } catch (error) {
    console.error(
      `[ERROR] Error in verifyPendingTransactions: ${error.message}`
    );
  } finally {
    // Cleanup old verification attempts
    cleanupVerificationAttempts();
  }
}

/**
 * Cleanup old verification attempts to prevent memory leaks
 */
function cleanupVerificationAttempts() {
  const now = Date.now();
  const cutoffTime = now - VERIFICATION_ATTEMPT_RESET_TIME;

  for (const [key, timestamp] of verificationAttempts.entries()) {
    if (timestamp < cutoffTime) {
      verificationAttempts.delete(key);
    }
  }
}
