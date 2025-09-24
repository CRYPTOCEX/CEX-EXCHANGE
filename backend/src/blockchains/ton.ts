import TonWeb from "tonweb"; // TON SDK
import { logError } from "@b/utils/logger";
import { decrypt } from "@b/utils/encrypt";
import { models } from "@b/db";
import { storeAndBroadcastTransaction } from "@b/api/(ext)/ecosystem/utils/redis/deposit";
import * as tonMnemonic from "tonweb-mnemonic";
import { RedisSingleton } from "@b/utils/redis";
import path from "path";
import fs from "fs";
const redis = RedisSingleton.getInstance();

const BN = TonWeb.utils.BN;
const HIGHLOAD_WALLET_TIMEOUT = 60 * 60; // 1 hour

type ParsedTransaction = {
  timestamp: string;
  hash: string;
  from: string;
  to: string;
  amount: string;
  confirmations: string;
  status: string;
  isError: string;
  fee: string;
};

class TonService {
  private tonWeb: any;
  private chainActive: boolean = false;
  private static instance: TonService;
  private static monitoringAddresses = new Map<string, boolean>();
  // Change processedTransactions from a Set to a Map so we can store timestamps
  private static processedTransactions: Map<string, number> = new Map();
  private static queue: (() => Promise<void>)[] = []; // Queue for RPC calls
  private static processing = false; // Whether the queue is processing

  // Expiry period for processed transactions (30 minutes)
  private static readonly PROCESSING_EXPIRY_MS = 30 * 60 * 1000;

  private constructor(
    endpoint: string = TonService.getTonEndpoint(),
    apiKey: string | undefined = TonService.getTonApiKey()
  ) {
    if (!apiKey) {
      console.warn(
        "No TON API Key provided. Some functionalities may be limited."
      );
    }
    const httpProvider = new TonWeb.HttpProvider(endpoint, { apiKey });
    this.tonWeb = new TonWeb(httpProvider);
  }

  /**
   * Dynamically determine the TON RPC endpoint based on the TON_NETWORK environment variable.
   */
  private static getTonEndpoint(): string {
    const network = process.env.TON_NETWORK || "mainnet";
    if (network === "testnet") {
      return (
        process.env.TON_TESTNET_RPC ||
        "https://testnet.toncenter.com/api/v2/jsonRPC"
      );
    }
    return (
      process.env.TON_MAINNET_RPC || "https://toncenter.com/api/v2/jsonRPC"
    );
  }

  /**
   * Dynamically get the API key based on the TON_NETWORK environment variable.
   */
  private static getTonApiKey(): string | undefined {
    const network = process.env.TON_NETWORK || "mainnet";
    if (network === "testnet") {
      return process.env.TON_TESTNET_RPC_API_KEY;
    }
    return process.env.TON_MAINNET_RPC_API_KEY;
  }

  /**
   * Singleton instance accessor.
   */
  public static async getInstance(): Promise<TonService> {
    if (!TonService.instance) {
      TonService.instance = new TonService();
      await TonService.instance.checkChainStatus();
      // Schedule periodic cleanup of processed transactions every minute
      setInterval(() => TonService.cleanupProcessedTransactions(), 60 * 1000);
    }
    return TonService.instance;
  }

  /**
   * Cleanup processedTransactions map by removing entries older than PROCESSING_EXPIRY_MS.
   */
  private static cleanupProcessedTransactions() {
    const now = Date.now();
    for (const [tx, timestamp] of TonService.processedTransactions.entries()) {
      if (now - timestamp > TonService.PROCESSING_EXPIRY_MS) {
        TonService.processedTransactions.delete(tx);
      }
    }
  }

  /**
   * Checks if the chain is active by the presence of a `ton.bin` file.
   */
  private async checkChainStatus(): Promise<void> {
    try {
      // Try multiple paths for the bin file - similar to how index.ts handles .env files
      const possiblePaths = [
        path.resolve(__dirname, "ton.bin.ts"),        // Development TypeScript
        path.resolve(__dirname, "ton.bin.js"),        // Production JavaScript
        path.resolve(process.cwd(), "backend/src/blockchains/ton.bin.ts"), // Development from root
        path.resolve(process.cwd(), "backend/src/blockchains/ton.bin.js"), // Production from root
        path.resolve(process.cwd(), "dist/blockchains/ton.bin.js"),        // Production dist
        path.resolve(process.cwd(), "src/blockchains/ton.bin.js"),         // Production src
      ];

      let tonBinFileExists = false;
      let foundPath = "";

      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          tonBinFileExists = true;
          foundPath = filePath;
          break;
        }
      }

      if (tonBinFileExists) {
        this.chainActive = true;
        console.log(`Chain 'TON' is active based on file check: ${foundPath}`);
      } else {
        console.log("Chain 'TON' is not active - ton.bin file not found in any expected location.");
        console.log(`Tried paths: ${possiblePaths.join(", ")}`);
        this.chainActive = false;
      }
    } catch (error) {
      console.error(`Error checking chain status for 'TON': ${error.message}`);
      this.chainActive = false;
    }
  }

  /**
   * Ensures the chain is active.
   */
  private ensureChainActive(): void {
    if (!this.chainActive) {
      throw new Error("Chain 'TON' is not active.");
    }
  }

  /**
   * Rate-limited RPC queue to ensure a maximum of 1 call per second.
   */
  private static async addToQueue(
    operation: () => Promise<void>
  ): Promise<void> {
    TonService.queue.push(operation);
    if (!TonService.processing) {
      await TonService.processQueue();
    }
  }

  private static async processQueue(): Promise<void> {
    TonService.processing = true;
    while (TonService.queue.length > 0) {
      const operation = TonService.queue.shift();
      if (operation) {
        try {
          await operation();
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1-second delay
        } catch (error) {
          console.error(
            `Error processing TON wallet operation: ${error.message}`
          );
        }
      }
    }
    TonService.processing = false;
  }

  private formatAddress(address): string {
    const addressObj = new this.tonWeb.utils.Address(address);
    const network = process.env.TON_NETWORK || "mainnet";

    // Determine if the network is testnet
    const isTestnet = network === "testnet";

    // Parameters for toString method
    const isUserFriendly = true;
    const isUrlSafe = true;
    const isBounceable = false;

    return addressObj.toString(isUserFriendly, isUrlSafe, isBounceable);
  }

  /**
   * Monitors TON deposits for a given wallet.
   * Instead of stopping monitoring after one deposit, this function
   * continues to check for new deposits every minute.
   */
  public async monitorTonDeposits(wallet: walletAttributes, address: string) {
    const monitoringKey = `${wallet.id}_${address}`;

    if (TonService.monitoringAddresses.has(monitoringKey)) {
      console.log(
        `[INFO] Monitoring already in progress for wallet ${wallet.id} on address ${address}`
      );
      return;
    }

    TonService.monitoringAddresses.set(monitoringKey, true);

    try {
      console.log(
        `[INFO] Starting deposit monitoring for wallet ${wallet.id} on address ${address}`
      );

      const checkDeposits = async () => {
        try {
          const rawTransactions = await this.fetchTransactions(address);
          for (const tx of rawTransactions) {
            // Check if transaction is already in DB or has been processed recently.
            const existingTx = await models.transaction.findOne({
              where: { trxId: tx.hash },
            });
            if (
              existingTx ||
              (TonService.processedTransactions.has(tx.hash) &&
                Date.now() - TonService.processedTransactions.get(tx.hash)! <
                  TonService.PROCESSING_EXPIRY_MS)
            ) {
              continue;
            }
            if (tx.status === "Success") {
              await this.processTonTransaction(tx.hash, wallet, address);
              // Mark as processed with current timestamp
              TonService.processedTransactions.set(tx.hash, Date.now());
            }
          }
        } catch (error) {
          console.error(
            `[ERROR] Error checking deposits for ${address}: ${error.message}`
          );
        }
        // Schedule the next check after 1 minute
        setTimeout(checkDeposits, 60 * 1000);
      };

      checkDeposits();
    } catch (error) {
      console.error(
        `[ERROR] Error monitoring TON deposits for ${address}: ${error.message}`
      );
      TonService.monitoringAddresses.delete(monitoringKey);
    }
  }

  /**
   * Processes a TON transaction by storing and broadcasting it.
   */
  private async processTonTransaction(
    transactionHash: string,
    wallet: walletAttributes,
    address: string
  ): Promise<void> {
    try {
      console.log(
        `[INFO] Fetching transaction ${transactionHash} for address ${address}`
      );

      // Fetch all transactions for the address and search for the specific transaction by hash
      const rawTransactions = (await this.fetchTransactions(address)) as any[];

      const transactionInfo = rawTransactions.find(
        (tx) => tx.hash === transactionHash
      );

      if (!transactionInfo) {
        console.error(
          `[ERROR] Transaction ${transactionHash} not found for address ${address}`
        );
        return;
      }

      const { from, amount } = transactionInfo;

      const addresses =
        typeof wallet.address === "string"
          ? JSON.parse(wallet.address)
          : wallet.address;
      const expectedTo = addresses["TON"].address; // Expected destination

      const toStr = new this.tonWeb.utils.Address(expectedTo).toString(false);
      const txToStr = new this.tonWeb.utils.Address(
        transactionInfo.to
      ).toString(false);
      console.log("🚀 ~ TonService ~ toStr:", toStr);
      console.log("🚀 ~ TonService ~ txToStr:", txToStr);
      if (txToStr !== toStr) {
        console.error(
          `[ERROR] Transaction ${transactionHash} is not for the expected address ${expectedTo}`
        );
        return;
      }

      const txData = {
        contractType: "NATIVE",
        id: wallet.id,
        chain: "TON",
        hash: transactionHash,
        type: "DEPOSIT",
        from,
        address: expectedTo,
        amount,
        status: "COMPLETED",
      };

      await storeAndBroadcastTransaction(txData, transactionHash);

      console.log(`[SUCCESS] Processed TON transaction ${transactionHash}`);
    } catch (error) {
      console.error(
        `[ERROR] Error processing TON transaction ${transactionHash}: ${error.message}`
      );
    }
  }

  /**
   * Fetches and parses transactions for a given TON address.
   */
  public async fetchTransactions(
    address: string
  ): Promise<ParsedTransaction[]> {
    this.ensureChainActive();

    let rawTransactions = [];
    try {
      const addressStr = this.formatAddress(address);
      rawTransactions = await this.tonWeb.provider.getTransactions(
        addressStr,
        10,
        undefined,
        undefined,
        undefined,
        true
      );
    } catch (error) {
      console.error(`Error in fetchTransactions:`, error);
      const errorMessage = error.message || "Unknown error occurred";
      logError("ton_fetch_transactions", error, __filename);
      throw new Error(`Failed to fetch TON transactions: ${errorMessage}`);
    }

    return this.parseTonTransactions(rawTransactions);
  }

  /**
   * Parses raw TON transactions into a standardized format.
   */
  private parseTonTransactions(rawTransactions: any[]): ParsedTransaction[] {
    return rawTransactions.map((tx) => {
      const { in_msg, out_msgs, utime } = tx;

      const from = in_msg?.source || "Unknown";
      const to =
        out_msgs.length > 0
          ? out_msgs[0].destination
          : in_msg?.destination || "Unknown";

      const amount = (parseInt(in_msg.value, 10) / 1e9).toString();

      const transactionHash = tx.transaction_id?.hash || "Unknown";

      return {
        timestamp: new Date(utime * 1000).toISOString(),
        hash: transactionHash,
        from,
        to,
        amount,
        confirmations: "N/A",
        status: "Success",
        isError: "0",
        fee: "N/A",
      };
    });
  }

  /**
   * Creates a new TON wallet.
   */
  public async createWallet() {
    this.ensureChainActive();

    const mnemonic = await tonMnemonic.generateMnemonic();
    const isValidMnemonic = await tonMnemonic.validateMnemonic(mnemonic);

    if (!isValidMnemonic) {
      throw new Error("Generated mnemonic is invalid.");
    }

    const keyPair = await tonMnemonic.mnemonicToKeyPair(mnemonic);

    const wallet = this.tonWeb.wallet.create({ publicKey: keyPair.publicKey });

    const address = await wallet.getAddress();

    return {
      address: address.toString(true),
      data: {
        mnemonic: mnemonic.join(" "),
        publicKey: TonWeb.utils.bytesToHex(keyPair.publicKey),
        privateKey: TonWeb.utils.bytesToHex(keyPair.secretKey),
      },
    };
  }

  /**
   * Retrieves the balance of a TON wallet.
   */
  public async getBalance(address: string): Promise<string> {
    this.ensureChainActive();
    try {
      const balanceNanoTon = await this.tonWeb.provider.getBalance(address);
      const balanceTON = (balanceNanoTon / 1e9).toString();
      return balanceTON;
    } catch (error) {
      console.error(`Failed to fetch TON balance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handles TON withdrawal by transferring TON to the specified address.
   */
  public async handleTonWithdrawal(
    transactionId: string,
    walletId: string,
    amount: number,
    toAddress: string
  ): Promise<void> {
    let checkedTransactions: Set<string> | null = new Set();

    try {
      console.log(
        `[INFO] Starting TON withdrawal for transaction ${transactionId}`
      );

      const walletDb = await models.wallet.findOne({ where: { id: walletId } });

      if (!walletDb) {
        throw new Error("Wallet not found");
      }

      const addresses =
        typeof walletDb.address === "string"
          ? JSON.parse(walletDb.address)
          : walletDb.address;
      const fromAddressStr = addresses["TON"].address;

      const walletData = await models.walletData.findOne({
        where: { walletId, currency: "TON", chain: "TON" },
      });

      if (!walletData || !walletData.data) {
        throw new Error("Private key not found for the wallet");
      }

      const decryptedWalletData = JSON.parse(decrypt(walletData.data));
      const privateKey = TonWeb.utils.hexToBytes(
        decryptedWalletData.privateKey
      );
      const publicKey = TonWeb.utils.hexToBytes(decryptedWalletData.publicKey);

      if (!privateKey || !publicKey) {
        throw new Error(
          "WalletContract requires both publicKey and privateKey."
        );
      }

      const fromAddress = this.formatAddress(fromAddressStr);

      const wallet = this.tonWeb.wallet.create({
        publicKey: publicKey,
        privateKey: privateKey,
        address: new this.tonWeb.utils.Address(fromAddress),
      });

      const walletAddress = await wallet.getAddress();
      let seqno = await wallet.methods.seqno().call();

      if (seqno === null || seqno === undefined || isNaN(seqno)) {
        seqno = 0;
      }

      const walletBalance = new BN(
        await this.tonWeb.provider.getBalance(walletAddress.toString(true))
      );
      const withdrawalAmount = new BN(amount * 1e9);

      if (withdrawalAmount.gte(walletBalance)) {
        console.log(
          `[ERROR] Not enough balance to process withdrawal for transaction ${transactionId}`
        );
        await models.transaction.update(
          {
            status: "FAILED",
            description: "Not enough balance for withdrawal",
          },
          { where: { id: transactionId } }
        );
        return;
      }

      const recipientAddress = this.formatAddress(toAddress);
      const uniquePayload = `TON_WITHDRAWAL_${transactionId}_${Date.now()}`;

      await wallet.methods
        .transfer({
          secretKey: privateKey,
          toAddress: recipientAddress,
          amount: withdrawalAmount,
          seqno: seqno,
          sendMode: 3,
          payload: uniquePayload,
        })
        .send();

      console.log(`[INFO] Transfer initiated with payload: ${uniquePayload}`);

      let retries = 0;
      const maxRetries = 10;
      const retryDelay = 10000;
      let transactionHash = null;

      while (retries < maxRetries && !transactionHash) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));

        const transactions = await this.tonWeb.provider.getTransactions(
          walletAddress.toString(true),
          5
        );

        console.log(
          `[INFO] Checking ${transactions.length} transactions on retry ${retries + 1}/${maxRetries}`
        );

        for (const tx of transactions) {
          if (checkedTransactions.has(tx.transaction_id.hash)) {
            continue;
          }
          checkedTransactions.add(tx.transaction_id.hash);

          if (tx.out_msgs && tx.out_msgs.length > 0) {
            const outMessage = tx.out_msgs[0];
            if (outMessage.message && outMessage.message === uniquePayload) {
              transactionHash = tx.transaction_id.hash;
              break;
            }
          }
        }

        retries++;
        if (transactionHash) {
          console.log(
            `[INFO] Transaction confirmed with hash: ${transactionHash}`
          );
        } else {
          console.log(
            `[INFO] Retry ${retries}/${maxRetries}: Transaction not yet confirmed.`
          );
        }
        if (checkedTransactions.size > 1000) {
          checkedTransactions.clear();
        }
      }

      if (!transactionHash) {
        throw new Error(
          `Transaction hash could not be retrieved after ${maxRetries} retries.`
        );
      }

      console.log(
        `[SUCCESS] Completed TON withdrawal for transaction ${transactionId}`
      );

      await models.transaction.update(
        { status: "COMPLETED", trxId: transactionHash },
        { where: { id: transactionId } }
      );
    } catch (error) {
      console.error(`[ERROR] Failed to send transfer: ${error.message}`);
      console.log(`[ERROR] Full Error: ${error.stack}`);
      await models.transaction.update(
        {
          status: "FAILED",
          description: `Failed to send transfer: ${error.message}`,
        },
        { where: { id: transactionId } }
      );
      throw error;
    } finally {
      if (checkedTransactions) {
        checkedTransactions.clear();
        checkedTransactions = null;
      }
    }
  }
}

export default TonService;
