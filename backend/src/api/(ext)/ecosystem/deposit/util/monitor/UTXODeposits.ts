// UTXODeposits.ts
import { IDepositMonitor } from "./IDepositMonitor";
import { storeAndBroadcastTransaction } from "@b/api/(ext)/ecosystem/utils/redis/deposit";
import { fetchUTXOTransactions, fetchUtxoTransaction } from "@b/api/(ext)/ecosystem/utils/utxo";
import { chainConfigs } from "@b/api/(ext)/ecosystem/utils/chains";
import { models } from "@b/db";
import { satoshiToStandardUnit } from "@b/api/(ext)/ecosystem/utils/blockchain";
import { logger } from "@b/utils/console";

interface UTXOOptions {
  wallet: walletAttributes;
  chain: string;
  address: string;
}

export class UTXODeposits implements IDepositMonitor {
  private wallet: walletAttributes;
  private chain: string;
  private address: string;
  public active: boolean = true;
  private intervalId?: NodeJS.Timeout;
  private consecutiveErrors: number = 0;
  private readonly MAX_CONSECUTIVE_ERRORS = 5;
  private readonly POLLING_INTERVAL = 30000; // 30 seconds for UTXO chains
  private static processedTxHashes: Map<string, number> = new Map(); // Static shared across all instances
  private static lastBroadcastedConfirmations: Map<string, number> = new Map(); // Static shared across all instances
  private static readonly PROCESSING_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
  private static cleanupInterval?: NodeJS.Timeout;
  private depositFound: boolean = false;

  constructor(options: UTXOOptions) {
    this.wallet = options.wallet;
    this.chain = options.chain;
    this.address = options.address;

    // Initialize cleanup on first instance
    if (!UTXODeposits.cleanupInterval) {
      UTXODeposits.cleanupInterval = setInterval(
        () => UTXODeposits.cleanupProcessedTransactions(),
        60 * 1000 // Run every minute
      );
    }
  }

  private static cleanupProcessedTransactions() {
    const now = Date.now();
    for (const [key, timestamp] of UTXODeposits.processedTxHashes.entries()) {
      if (now - timestamp > UTXODeposits.PROCESSING_EXPIRY_MS) {
        UTXODeposits.processedTxHashes.delete(key);
      }
    }
  }

  public async watchDeposits(): Promise<void> {
    if (!this.active) {
      logger.debug("UTXO_DEPOSIT", `Monitor for ${this.chain} is not active, skipping watchDeposits`);
      return;
    }

    logger.info("UTXO_DEPOSIT", `Starting UTXO deposit monitoring for ${this.chain} address ${this.address}`);
    await this.startPolling();
  }

  private async startPolling(): Promise<void> {
    const pollDeposits = async () => {
      // Check both at the start and after processing
      if (!this.active || this.depositFound) {
        if (this.depositFound) {
          logger.info("UTXO_DEPOSIT", `${this.chain} Deposit found and confirmed, stopping monitor`);
        } else {
          logger.debug("UTXO_DEPOSIT", `${this.chain} Monitor inactive, skipping poll`);
        }
        return;
      }

      try {
        logger.debug("UTXO_DEPOSIT", `${this.chain} Checking deposits for address ${this.address}`);

        // Fetch all transactions for this address
        const transactions = await fetchUTXOTransactions(this.chain, this.address);

        if (!transactions || transactions.length === 0) {
          logger.debug("UTXO_DEPOSIT", `${this.chain} No transactions found, waiting for next poll`);
          this.consecutiveErrors = 0;
        } else {
          // Count new (unprocessed) transactions
          let newTransactionsCount = 0;
          for (const tx of transactions) {
            // Use wallet-specific key for pay-to-many support
            const walletTxKey = `${this.wallet.id}-${tx.hash}`;
            if (!UTXODeposits.processedTxHashes.has(walletTxKey)) {
              newTransactionsCount++;
            }
          }

          // Only log if there are new transactions to process
          if (newTransactionsCount > 0) {
            logger.info("UTXO_DEPOSIT", `${this.chain} Found ${newTransactionsCount} new transactions out of ${transactions.length} total for wallet ${this.wallet.id}. Already processed: ${UTXODeposits.processedTxHashes.size}`);
          }

          // Process each transaction
          for (const tx of transactions) {
            // Use wallet-specific key for pay-to-many support
            const walletTxKey = `${this.wallet.id}-${tx.hash}`;

            // Skip if already processed for this wallet
            if (UTXODeposits.processedTxHashes.has(walletTxKey)) {
              continue;
            }

            // Check if transaction already exists in database
            const existingTx = await models.transaction.findOne({
              where: {
                trxId: tx.hash,
                walletId: this.wallet.id,
              },
            });

            if (existingTx) {
              UTXODeposits.processedTxHashes.set(walletTxKey, Date.now());
              continue;
            }

            logger.debug("UTXO_DEPOSIT", `${this.chain} Processing transaction ${tx.hash.substring(0, 12)}...`);

            const requiredConfirmations = chainConfigs[this.chain]?.confirmations || 3;
            const confirmations = tx.confirmations || 0;

            // Only log transaction details if it's new or confirmation count changed
            const confirmationKey = `confirmations-${walletTxKey}`;
            const lastConfirmations = UTXODeposits.lastBroadcastedConfirmations.get(confirmationKey);
            const isNew = lastConfirmations === undefined;
            const confirmationChanged = lastConfirmations !== confirmations;

            if (isNew || confirmationChanged) {
              logger.debug("UTXO_DEPOSIT", `${this.chain} Transaction ${tx.hash.substring(0, 12)}... has ${confirmations}/${requiredConfirmations} confirmations, value: ${tx.value} for wallet ${this.wallet.id}`);
            }

            // Broadcast pending transactions only when confirmation count changes
            if (confirmations < requiredConfirmations) {
              // Broadcast if this is a new transaction or if confirmations changed
              if (isNew || confirmationChanged) {
                logger.debug("UTXO_DEPOSIT", `${this.chain} Broadcasting pending status for ${tx.hash.substring(0, 12)}... to wallet ${this.wallet.id} (${confirmations}/${requiredConfirmations} confirmations)`);

                const pendingTxData = {
                  walletId: this.wallet.id,
                  chain: this.chain,
                  hash: tx.hash,
                  transactionHash: tx.hash,
                  type: "pending_confirmation",
                  from: "N/A",
                  address: this.address,
                  amount: satoshiToStandardUnit(tx.value || 0, this.chain),
                  fee: 0,
                  confirmations,
                  requiredConfirmations,
                  status: "PENDING",
                };

                await storeAndBroadcastTransaction(pendingTxData, tx.hash, true);
                UTXODeposits.lastBroadcastedConfirmations.set(confirmationKey, confirmations);

                logger.debug("UTXO_DEPOSIT", `${this.chain} Pending broadcast sent for ${tx.hash.substring(0, 12)}... to wallet ${this.wallet.id}`);
              }
              // Note: If confirmations haven't changed, we silently skip broadcasting (already tracked in map)
            } else {
              // Transaction is confirmed, fetch full transaction details
              logger.info("UTXO_DEPOSIT", `${this.chain} Transaction ${tx.hash.substring(0, 12)}... is fully confirmed! Fetching full details...`);

              try {
                const fullTx = await fetchUtxoTransaction(tx.hash, this.chain);

                if (!fullTx) {
                  throw new Error("fetchUtxoTransaction returned null/undefined");
                }

                logger.debug("UTXO_DEPOSIT", `${this.chain} Full transaction details received: inputs=${fullTx.inputs?.length || 0}, outputs=${fullTx.outputs?.length || 0}`);

                // Convert inputs and outputs from satoshis to standard units
                const convertedInputs = (fullTx.inputs || []).map((input) => ({
                  prev_hash: input.prev_hash,
                  output_index: input.output_index,
                  output_value: satoshiToStandardUnit(input.output_value || 0, this.chain),
                  addresses: input.addresses,
                  script: input.script,
                }));

                const convertedOutputs = (fullTx.outputs || []).map((output) => ({
                  value: satoshiToStandardUnit(output.value || 0, this.chain),
                  addresses: output.addresses,
                  script: output.script,
                  spent_by: output.spender,
                }));

                // Calculate amount from outputs for this address
                const amount = convertedOutputs
                  .filter((output) => output.addresses && output.addresses.includes(this.address))
                  .reduce((sum, output) => sum + output.value, 0);

                const txDetails = {
                  id: this.wallet.id,
                  chain: this.chain,
                  hash: tx.hash,
                  type: "DEPOSIT",
                  from: convertedInputs.map((input) => input.addresses).flat(),
                  to: convertedOutputs.map((output) => output.addresses).flat(),
                  amount: amount.toString(),
                  fee: "0",
                  status: "CONFIRMED",
                  timestamp: tx.confirmedTime ? new Date(tx.confirmedTime).getTime() / 1000 : Math.floor(Date.now() / 1000),
                  inputs: convertedInputs,
                  outputs: convertedOutputs,
                };

                logger.debug("UTXO_DEPOSIT", `${this.chain} Storing confirmed deposit for ${tx.hash.substring(0, 12)}... with amount ${txDetails.amount}`);

                await storeAndBroadcastTransaction(txDetails, tx.hash);
                UTXODeposits.processedTxHashes.set(walletTxKey, Date.now());

                logger.success("UTXO_DEPOSIT", `${this.chain} Successfully processed and stored deposit ${tx.hash.substring(0, 12)}... for wallet ${this.wallet.id} - stopping monitor`);

                // Set flag and stop polling immediately
                this.depositFound = true;
                this.stopPolling();
                return; // Exit immediately
              } catch (error) {
                logger.error("UTXO_DEPOSIT", `${this.chain} Failed to process confirmed transaction ${tx.hash.substring(0, 12)}... for wallet ${this.wallet.id}`);
                logger.error("UTXO_DEPOSIT", `${this.chain} Error details: ${error.message}`);
                logger.debug("UTXO_DEPOSIT", `${this.chain} Error stack: ${error.stack}`);
                // Don't add to processed hashes so it can be retried
                // Continue checking other transactions in the list
                continue;
              }
            }
          }

          // Only log completion if we processed new transactions and haven't found a deposit yet
          if (newTransactionsCount > 0 && !this.depositFound) {
            logger.debug("UTXO_DEPOSIT", `${this.chain} Finished processing ${newTransactionsCount} new transactions. Total processed in session: ${UTXODeposits.processedTxHashes.size}`);
          }

          // If deposit was found during processing, stop immediately
          if (this.depositFound) {
            logger.info("UTXO_DEPOSIT", `${this.chain} Confirmed deposit found during this poll, stopping monitor`);
            return;
          }

          this.consecutiveErrors = 0;
        }
      } catch (error) {
        this.consecutiveErrors++;
        logger.error("UTXO_DEPOSIT", `${this.chain} Error in polling cycle (attempt ${this.consecutiveErrors}/${this.MAX_CONSECUTIVE_ERRORS})`);
        logger.error("UTXO_DEPOSIT", `${this.chain} Error message: ${error.message}`);
        logger.debug("UTXO_DEPOSIT", `${this.chain} Error stack: ${error.stack}`);

        if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
          logger.error("UTXO_DEPOSIT", `${this.chain} Max consecutive errors reached, stopping monitor`);
          this.stopPolling();
          return;
        }
      }

      // Schedule next poll with exponential backoff on errors
      // Only schedule if monitor is still active and no deposit was found
      if (this.active && !this.depositFound) {
        const nextInterval =
          this.consecutiveErrors > 0
            ? Math.min(
                this.POLLING_INTERVAL * Math.pow(2, this.consecutiveErrors - 1),
                300000
              ) // Max 5 minutes
            : this.POLLING_INTERVAL;

        this.intervalId = setTimeout(pollDeposits, nextInterval);
      }
    };

    // Start initial polling
    await pollDeposits();
  }

  public stopPolling(): void {
    logger.info("UTXO_DEPOSIT", `Stopping UTXO deposit monitoring for ${this.chain}`);

    this.active = false;

    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = undefined;
    }

    logger.success("UTXO_DEPOSIT", `UTXO deposit monitoring stopped for ${this.chain}`);
  }
}
