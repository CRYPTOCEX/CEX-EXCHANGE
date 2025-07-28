// UTXODeposits.ts
import { IDepositMonitor } from "./IDepositMonitor";
import { storeAndBroadcastTransaction } from "@b/api/(ext)/ecosystem/utils/redis/deposit";
import { verifyUTXOTransaction } from "@b/api/(ext)/ecosystem/utils/utxo";
import { chainConfigs } from "@b/api/(ext)/ecosystem/utils/chains";

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

  constructor(options: UTXOOptions) {
    this.wallet = options.wallet;
    this.chain = options.chain;
    this.address = options.address;
  }

  public async watchDeposits(): Promise<void> {
    if (!this.active) {
      console.log(
        `[INFO] UTXO monitor for ${this.chain} is not active, skipping watchDeposits`
      );
      return;
    }

    console.log(
      `[INFO] Starting UTXO deposit monitoring for ${this.chain} address ${this.address}`
    );
    await this.startPolling();
  }

  private async startPolling(): Promise<void> {
    const pollDeposits = async () => {
      if (!this.active) {
        return;
      }

      try {
        console.log(
          `[INFO] Checking for UTXO deposits on ${this.chain} for address ${this.address}`
        );

        // Use the UTXO verification function to check for transactions
        const verification = await verifyUTXOTransaction(
          this.chain,
          this.address
        );

        if (verification.confirmed) {
          console.log(
            `[SUCCESS] UTXO deposit confirmed for ${this.chain} address ${this.address}`
          );

          try {
            // Create transaction details for UTXO
            const txDetails = {
              id: this.wallet.id,
              chain: this.chain,
              hash: `utxo_${this.chain}_${Date.now()}`,
              type: "DEPOSIT",
              from: "unknown", // UTXO doesn't always have clear from address
              to: this.address,
              amount: "0", // Amount will be determined by the verification process
              fee: verification.fee?.toString() || "0",
              status: "COMPLETED",
              timestamp: Math.floor(Date.now() / 1000),
            };

            await storeAndBroadcastTransaction(txDetails, txDetails.hash);
            console.log(
              `[SUCCESS] UTXO deposit ${txDetails.hash} processed and stored`
            );

            // Stop monitoring after successful deposit
            this.stopPolling();
            return;
          } catch (error) {
            console.error(
              `[ERROR] Error processing UTXO deposit: ${error.message}`
            );
            this.consecutiveErrors++;
          }
        } else {
          console.log(
            `[INFO] No confirmed UTXO deposits found for ${this.chain} address ${this.address}`
          );
        }

        this.consecutiveErrors = 0; // Reset on successful check
      } catch (error) {
        this.consecutiveErrors++;
        console.error(
          `[ERROR] Error checking UTXO deposits for ${this.chain} (attempt ${this.consecutiveErrors}/${this.MAX_CONSECUTIVE_ERRORS}): ${error.message}`
        );

        if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
          console.error(
            `[ERROR] Max consecutive errors reached for ${this.chain}, stopping monitor`
          );
          this.stopPolling();
          return;
        }
      }

      // Schedule next poll with exponential backoff on errors
      if (this.active) {
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
    console.log(`[INFO] Stopping UTXO deposit monitoring for ${this.chain}`);

    this.active = false;

    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = undefined;
    }

    console.log(`[SUCCESS] UTXO deposit monitoring stopped for ${this.chain}`);
  }
}
