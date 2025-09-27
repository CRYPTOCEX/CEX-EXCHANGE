// EVMDeposits.ts
import { IDepositMonitor } from "./IDepositMonitor";
import { getEcosystemToken } from "@b/api/(ext)/ecosystem/utils/tokens";
import { fetchEcosystemTransactions } from "@b/api/(ext)/ecosystem/utils/transactions";
import { chainConfigs } from "@b/api/(ext)/ecosystem/utils/chains";
import {
  initializeWebSocketProvider,
  initializeHttpProvider,
  chainProviders,
} from "../ProviderManager";
import { ethers } from "ethers";
import { processTransaction, createTransactionDetails } from "../DepositUtils";
import { storeAndBroadcastTransaction } from "@b/api/(ext)/ecosystem/utils/redis/deposit";

interface EVMOptions {
  wallet: walletAttributes;
  chain: string;
  currency: string;
  address: string;
  contractType: "PERMIT" | "NO_PERMIT" | "NATIVE";
}

export class EVMDeposits implements IDepositMonitor {
  private wallet: walletAttributes;
  private chain: string;
  private currency: string;
  private address: string;
  private contractType: "PERMIT" | "NO_PERMIT" | "NATIVE";
  public active: boolean = true;
  private intervalId?: NodeJS.Timeout;
  private eventListener?: any;
  private eventFilter?: any;

  constructor(options: EVMOptions) {
    this.wallet = options.wallet;
    this.chain = options.chain;
    this.currency = options.currency;
    this.address = options.address;
    this.contractType = options.contractType;
  }

  public async watchDeposits(): Promise<void> {
    if (!this.active) {
      console.log(
        `[INFO] Monitor for ${this.chain} is not active, skipping watchDeposits`
      );
      return;
    }

    try {
      let provider = chainProviders.get(this.chain);

      if (!provider) {
        provider = await initializeWebSocketProvider(this.chain);
        if (!provider) {
          provider = await initializeHttpProvider(this.chain);
        }
        if (!provider) {
          console.error(
            `[ERROR] No provider available for chain ${this.chain}`
          );
          return;
        }
      }

      const feeDecimals = chainConfigs[this.chain]?.decimals || 18;

      if (this.contractType === "NATIVE") {
        await this.watchNativeDeposits(provider, feeDecimals);
      } else {
        await this.watchTokenDeposits(provider, feeDecimals);
      }
    } catch (error) {
      console.error(
        `[ERROR] Error in watchDeposits for ${this.chain}: ${error.message}`
      );
      this.active = false;
    }
  }

  private async watchNativeDeposits(provider: any, feeDecimals: number) {
    const decimals = chainConfigs[this.chain]?.decimals || 18;
    let depositFound = false;
    let startTime = Math.floor(Date.now() / 1000);
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 5;

    console.log(
      `[INFO] Starting native deposit monitoring for ${this.chain} address ${this.address}`
    );

    const verifyDeposits = async () => {
      if (depositFound || !this.active) {
        return;
      }

      try {
        const transactions = await fetchEcosystemTransactions(
          this.chain,
          this.address
        );

        for (const tx of transactions) {
          if (
            tx.to &&
            tx.to.toLowerCase() === this.address.toLowerCase() &&
            Number(tx.timestamp) > startTime &&
            Number(tx.status) === 1
          ) {
            depositFound = true;
            consecutiveErrors = 0; // Reset error counter on success

            try {
              console.log(
                `[SUCCESS] Found native deposit for ${this.chain}: ${tx.hash}`
              );

              const txDetails = await createTransactionDetails(
                "NATIVE",
                this.wallet.id,
                tx,
                this.address,
                this.chain,
                decimals,
                feeDecimals,
                "DEPOSIT"
              );
              await storeAndBroadcastTransaction(txDetails, tx.hash);

              console.log(
                `[SUCCESS] Native deposit ${tx.hash} processed successfully`
              );
            } catch (error) {
              console.error(
                `[ERROR] Error processing native transaction ${tx.hash}: ${error.message}`
              );
              // Don't mark as depositFound if processing failed
              depositFound = false;
            }

            startTime = Math.floor(Date.now() / 1000);
            break;
          }
        }

        consecutiveErrors = 0; // Reset on successful API call
      } catch (error) {
        consecutiveErrors++;
        console.error(
          `[ERROR] Error fetching transactions for ${this.chain} (attempt ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}): ${error.message}`
        );

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.error(
            `[ERROR] Max consecutive errors reached for ${this.chain}, stopping monitor`
          );
          this.stopPolling();
          return;
        }
      }
    };

    // Initial verification
    await verifyDeposits();

    // Set up periodic checking with exponential backoff on errors
    const getInterval = () =>
      consecutiveErrors > 0
        ? Math.min(10000 * Math.pow(2, consecutiveErrors - 1), 60000) // Exponential backoff, max 1 minute
        : 10000; // Normal interval

    const scheduleNext = () => {
      if (this.active && !depositFound) {
        this.intervalId = setTimeout(async () => {
          await verifyDeposits();
          scheduleNext();
        }, getInterval());
      } else if (depositFound) {
        console.log(
          `[INFO] Native deposit found for ${this.chain}, stopping monitoring`
        );
      }
    };

    scheduleNext();
  }

  private async watchTokenDeposits(provider: any, feeDecimals: number) {
    try {
      const token = await getEcosystemToken(this.chain, this.currency);
      if (!token) {
        console.error(
          `[ERROR] Token ${this.currency} not found for chain ${this.chain}`
        );
        return;
      }

      const decimals = token.decimals;
      console.log(
        `[INFO] Starting token deposit monitoring for ${this.currency} on ${this.chain} at address ${this.address}`
      );

      const filter = {
        address: token.contract,
        topics: [
          ethers.id("Transfer(address,address,uint256)"),
          null,
          this.address ? ethers.zeroPadValue(this.address, 32) : undefined,
        ],
      };

      // Store the filter for later cleanup
      this.eventFilter = filter;

      // Enhanced event listener with better error handling
      this.eventListener = async (log) => {
        if (!this.active) {
          console.log(
            `[INFO] Monitor inactive, ignoring event for ${this.chain}`
          );
          return;
        }

        try {
          console.log(
            `[INFO] Token transfer event detected for ${this.currency} on ${this.chain}: ${log.transactionHash}`
          );

          const success = await processTransaction(
            this.contractType === "NO_PERMIT" ? "NO_PERMIT" : "PERMIT",
            log.transactionHash,
            provider,
            this.address,
            this.chain,
            decimals,
            feeDecimals,
            this.wallet.id
          );

          if (success) {
            console.log(
              `[SUCCESS] Token deposit ${log.transactionHash} processed successfully`
            );

            // Enhanced cleanup - different timeout based on contract type
            const cleanupTimeout =
              this.contractType === "NO_PERMIT"
                ? 5 * 60 * 1000 // 5 minutes for NO_PERMIT
                : 30 * 60 * 1000; // 30 minutes for PERMIT

            setTimeout(() => {
              this.stopEventListener();
              console.log(
                `[INFO] Token deposit monitoring stopped after ${cleanupTimeout / 1000}s for ${this.chain}`
              );
            }, cleanupTimeout);
          }
        } catch (error) {
          console.error(
            `[ERROR] Error in token deposit handler for ${this.chain}: ${error.message}`
          );
        }
      };

      // Enhanced provider event handling with reconnection logic
      provider.on(filter, this.eventListener);

      provider.on("error", (error) => {
        console.error(
          `[ERROR] Provider error for ${this.chain}: ${error.message}`
        );

        // Attempt reconnection for WebSocket providers
        if (provider.websocket) {
          console.log(
            `[INFO] Attempting to reconnect WebSocket provider for ${this.chain}`
          );
          setTimeout(async () => {
            try {
              const newProvider = await initializeWebSocketProvider(this.chain);
              if (newProvider && this.active) {
                provider.removeAllListeners();
                await this.watchTokenDeposits(newProvider, feeDecimals);
              }
            } catch (reconnectError) {
              console.error(
                `[ERROR] Failed to reconnect provider for ${this.chain}: ${reconnectError.message}`
              );
            }
          }, 5000);
        }
      });

      // Add connection monitoring
      if (provider.websocket) {
        provider.websocket.on("close", () => {
          console.warn(`[WARN] WebSocket connection closed for ${this.chain}`);
        });

        provider.websocket.on("open", () => {
          console.log(`[INFO] WebSocket connection opened for ${this.chain}`);
        });
      }
    } catch (error) {
      console.error(
        `[ERROR] Error setting up token deposit monitoring for ${this.chain}: ${error.message}`
      );
      this.active = false;
    }
  }

  private stopEventListener() {
    if (this.eventListener && this.eventFilter) {
      const provider = chainProviders.get(this.chain);
      if (provider) {
        try {
          provider.off(this.eventFilter, this.eventListener);
          console.log(`[INFO] Event listener removed for ${this.chain}`);
        } catch (error) {
          console.error(
            `[ERROR] Error removing event listener for ${this.chain}: ${error.message}`
          );
        }
      }
      this.eventListener = null;
      this.eventFilter = null;
    }
  }

  public stopPolling(): void {
    console.log(`[INFO] Stopping EVM deposit monitoring for ${this.chain}`);

    this.active = false;

    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = undefined;
    }

    this.stopEventListener();

    console.log(`[SUCCESS] EVM deposit monitoring stopped for ${this.chain}`);
  }
}
