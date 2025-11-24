import { models } from "@b/db";
import { getBitcoinNodeService, getEcosystemWalletUtils, isServiceAvailable } from "@b/utils/safe-imports";
import { createNotification } from "@b/utils/notifications";

const BTC_NODE = process.env.BTC_NODE || "blockcypher";
const SCAN_INTERVAL = 60000; // 60 seconds
const REQUIRED_CONFIRMATIONS = 3;

interface ProcessedTransaction {
  txid: string;
  walletId: string;
  lastChecked: number;
}

class BTCDepositScanner {
  private static instance: BTCDepositScanner;
  private isScanning: boolean = false;
  private processedTransactions: Map<string, ProcessedTransaction> = new Map();
  private nodeService: any = null;
  private scanInterval: NodeJS.Timeout | null = null;
  private ecosystemWalletUtils: any = null;

  private constructor() {}

  public static getInstance(): BTCDepositScanner {
    if (!BTCDepositScanner.instance) {
      BTCDepositScanner.instance = new BTCDepositScanner();
    }
    return BTCDepositScanner.instance;
  }

  public async start(): Promise<void> {
    if (BTC_NODE !== "node") {
      return;
    }

    // Check if ecosystem is available
    this.ecosystemWalletUtils = await getEcosystemWalletUtils();
    if (!isServiceAvailable(this.ecosystemWalletUtils)) {
      return;
    }

    const BitcoinNodeService = await getBitcoinNodeService();
    if (!isServiceAvailable(BitcoinNodeService)) {
      return;
    }

    console.log(`[BTC_SCANNER] Starting Bitcoin deposit scanner...`);

    try {
      // Initialize Bitcoin Core RPC
      this.nodeService = await BitcoinNodeService.getInstance();

      // Check if node is synced
      const isSynced = await this.nodeService.isSynced();
      if (!isSynced) {
        const progress = await this.nodeService.getSyncProgress();
        console.log(
          `[BTC_SCANNER] Node not fully synced yet: ${progress.blocks}/${progress.headers} (${progress.progress.toFixed(2)}%)`
        );
        console.log(`[BTC_SCANNER] Scanner will start when sync completes`);
      }

      // Import all existing BTC addresses
      await this.importAllAddresses();

      // Start periodic scanning
      this.startPeriodicScan();

      console.log(`[BTC_SCANNER] Bitcoin deposit scanner started successfully`);
    } catch (error) {
      console.error(`[BTC_SCANNER] Failed to start scanner: ${error.message}`);
      throw error;
    }
  }

  public stop(): void {
    console.log(`[BTC_SCANNER] Stopping Bitcoin deposit scanner...`);
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    console.log(`[BTC_SCANNER] Bitcoin deposit scanner stopped`);
  }

  private async importAllAddresses(): Promise<void> {
    try {
      console.log(`[BTC_SCANNER] Importing all BTC ecosystem wallet addresses...`);

      const wallets = await models.wallet.findAll({
        where: {
          type: "ECO",
          currency: "BTC",
        },
      });

      console.log(`[BTC_SCANNER] Found ${wallets.length} BTC wallets to import`);

      for (const wallet of wallets) {
        try {
          if (!wallet.address) continue;

          const addresses = typeof wallet.address === "string"
            ? JSON.parse(wallet.address)
            : wallet.address;

          const btcAddress = addresses?.BTC?.address;
          if (!btcAddress) continue;

          await this.nodeService!.importAddress(
            btcAddress,
            `wallet_${wallet.id}_user_${wallet.userId}`
          );

          // Small delay to avoid overwhelming the node
          await this.delay(100);
        } catch (error) {
          console.error(
            `[BTC_SCANNER] Failed to import address for wallet ${wallet.id}: ${error.message}`
          );
        }
      }

      console.log(`[BTC_SCANNER] Address import completed`);
    } catch (error) {
      console.error(`[BTC_SCANNER] Failed to import addresses: ${error.message}`);
      throw error;
    }
  }

  private startPeriodicScan(): void {
    console.log(`[BTC_SCANNER] Starting periodic scan every ${SCAN_INTERVAL / 1000}s`);

    this.scanInterval = setInterval(async () => {
      await this.scanAllWallets();
    }, SCAN_INTERVAL);

    // Run first scan immediately
    setImmediate(() => this.scanAllWallets());
  }

  private async scanAllWallets(): Promise<void> {
    if (this.isScanning) {
      console.log(`[BTC_SCANNER] Previous scan still running, skipping this cycle`);
      return;
    }

    if (!this.nodeService) {
      console.log(`[BTC_SCANNER] Node service not initialized, skipping scan`);
      return;
    }

    // Check if node is synced
    const isSynced = await this.nodeService.isSynced();
    if (!isSynced) {
      console.log(`[BTC_SCANNER] Node not synced yet, skipping scan`);
      return;
    }

    this.isScanning = true;

    try {
      console.log(`[BTC_SCANNER] Starting wallet scan cycle...`);

      const wallets = await models.wallet.findAll({
        where: {
          type: "ECO",
          currency: "BTC",
        },
      });

      console.log(`[BTC_SCANNER] Scanning ${wallets.length} BTC wallets for deposits`);

      let newDepositsFound = 0;
      let pendingDeposits = 0;

      for (const wallet of wallets) {
        try {
          const result = await this.scanWalletForDeposits(wallet);
          newDepositsFound += result.newDeposits;
          pendingDeposits += result.pendingDeposits;
        } catch (error) {
          console.error(
            `[BTC_SCANNER] Error scanning wallet ${wallet.id}: ${error.message}`
          );
        }
      }

      console.log(
        `[BTC_SCANNER] Scan cycle completed: ${newDepositsFound} new deposits, ${pendingDeposits} pending`
      );
    } catch (error) {
      console.error(`[BTC_SCANNER] Error in scan cycle: ${error.message}`);
    } finally {
      this.isScanning = false;
    }
  }

  private async scanWalletForDeposits(
    wallet: walletAttributes
  ): Promise<{ newDeposits: number; pendingDeposits: number }> {
    try {
      if (!wallet.address) {
        return { newDeposits: 0, pendingDeposits: 0 };
      }

      const addresses = typeof wallet.address === "string"
        ? JSON.parse(wallet.address)
        : wallet.address;

      const btcAddress = addresses?.BTC?.address;
      if (!btcAddress) {
        return { newDeposits: 0, pendingDeposits: 0 };
      }

      // Get transactions for this address
      const transactions = await this.nodeService!.getAddressTransactions(btcAddress);

      let newDeposits = 0;
      let pendingDeposits = 0;

      for (const tx of transactions) {
        // Only process incoming transactions
        if (tx.category !== "receive") continue;

        const txKey = `${tx.txid}-${wallet.id}`;

        // Check if already processed
        const existingTx = await models.transaction.findOne({
          where: {
            trxId: tx.txid,
            walletId: wallet.id,
            type: "DEPOSIT",
          },
        });

        if (existingTx && existingTx.status === "COMPLETED") {
          // Already processed, mark as known
          this.processedTransactions.set(txKey, {
            txid: tx.txid,
            walletId: wallet.id,
            lastChecked: Date.now(),
          });
          continue;
        }

        // Get full transaction details
        const txDetails = await this.nodeService!.getRawTransaction(tx.txid);

        if (txDetails.confirmations >= REQUIRED_CONFIRMATIONS) {
          // Process confirmed deposit
          console.log(
            `[BTC_SCANNER] Processing confirmed deposit: ${tx.txid} (${txDetails.confirmations} confirmations)`
          );

          await this.processDeposit(wallet, txDetails, btcAddress);
          newDeposits++;

          this.processedTransactions.set(txKey, {
            txid: tx.txid,
            walletId: wallet.id,
            lastChecked: Date.now(),
          });
        } else {
          // Still pending
          console.log(
            `[BTC_SCANNER] Pending deposit: ${tx.txid} (${txDetails.confirmations}/${REQUIRED_CONFIRMATIONS} confirmations)`
          );
          pendingDeposits++;
        }
      }

      return { newDeposits, pendingDeposits };
    } catch (error) {
      console.error(
        `[BTC_SCANNER] Error scanning wallet ${wallet.id}: ${error.message}`
      );
      return { newDeposits: 0, pendingDeposits: 0 };
    }
  }

  private async processDeposit(
    wallet: walletAttributes,
    txDetails: any,
    address: string
  ): Promise<void> {
    try {
      // Get raw transaction for inputs/outputs
      const rawTx = await this.nodeService!.getRawTransaction(txDetails.txid);

      const txData = {
        id: wallet.id,
        chain: "BTC",
        hash: txDetails.txid,
        type: "DEPOSIT",
        from: "N/A",
        to: address,
        amount: txDetails.amount.toString(),
        fee: txDetails.fee.toString(),
        status: "CONFIRMED",
        timestamp: txDetails.time || Math.floor(Date.now() / 1000),
        inputs: rawTx.vin || [],
        outputs: rawTx.vout || [],
      };

      console.log(
        `[BTC_SCANNER] Creating deposit transaction for ${txDetails.amount} BTC`
      );

      const result = await this.ecosystemWalletUtils.handleEcosystemDeposit(txData);

      if (result.transaction) {
        console.log(
          `[BTC_SCANNER] Deposit processed successfully: ${result.transaction.id}`
        );

        // Send notification to user
        try {
          await createNotification({
            userId: wallet.userId,
            relatedId: result.transaction.id,
            title: "Deposit Confirmed",
            message: `Your deposit of ${txDetails.amount} BTC has been confirmed.`,
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
        } catch (notifError) {
          console.error(
            `[BTC_SCANNER] Failed to send notification: ${notifError.message}`
          );
        }
      }
    } catch (error) {
      console.error(
        `[BTC_SCANNER] Failed to process deposit ${txDetails.txid}: ${error.message}`
      );
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default BTCDepositScanner;