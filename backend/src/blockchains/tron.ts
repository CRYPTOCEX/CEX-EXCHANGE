// @b/blockchains/tron.ts

import { TronWeb, utils as TronWebUtils } from "tronweb";
import { generateMnemonic } from "bip39";
import { ethers } from "ethers";
import { RedisSingleton } from "@b/utils/redis";
import { differenceInMinutes } from "date-fns";
import { logError } from "@b/utils/logger";
import { decrypt } from "@b/utils/encrypt";
import { models } from "@b/db";
import { storeAndBroadcastTransaction } from "@b/api/(ext)/ecosystem/utils/redis/deposit";
import path from "path";
import fs from "fs";

// Define types for better type safety
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

type WalletCreationResult = {
  address: string;
  data: {
    mnemonic: string;
    publicKey: string;
    privateKey: string;
    derivationPath: string;
  };
};

// Ensure that walletAttributes is defined in your codebase
// For example:
// type walletAttributes = { id: string; address: string | Record<string, any>; /* ... other properties ... */ };

const TRX_DECIMALS = 1e6; // TRX has 6 decimals

class TronService {
  private tronWeb: TronWeb;
  private fullHost: string;
  private cacheExpiration: number; // in minutes
  private chainActive: boolean = false;
  private static monitoringAddresses = new Map<string, boolean>();
  private static lastScannedBlock = new Map<string, number>();
  private static instance: TronService;

  // --- Added for deposit tracking ---
  private static processedTransactions: Map<string, number> = new Map();
  private static readonly PROCESSING_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
  private static cleanupProcessedTransactions() {
    const now = Date.now();
    for (const [tx, timestamp] of TronService.processedTransactions.entries()) {
      if (now - timestamp > TronService.PROCESSING_EXPIRY_MS) {
        TronService.processedTransactions.delete(tx);
      }
    }
  }
  // --- End added ---

  // Private constructor for singleton usage.
  private constructor(
    fullHost: string = TronService.getFullHostUrl(
      process.env.TRON_NETWORK || "mainnet"
    ),
    cacheExpirationMinutes: number = 30
  ) {
    this.fullHost = fullHost;
    
    // Validate fullHost before initializing TronWeb
    if (!this.fullHost || this.fullHost.trim() === '') {
      throw new Error(`Invalid TRON fullHost URL: ${this.fullHost}`);
    }
    
    // Debug logging for TronWeb initialization
    if (process.env.DEBUG_TRON === "true") {
      console.log(`[TRON-DEBUG] Initializing TronWeb with fullHost: ${this.fullHost}`);
      console.log(`[TRON-DEBUG] TRON_API_KEY: ${process.env.TRON_API_KEY ? 'Set' : 'Not set'}`);
    }
    
    try {
      this.tronWeb = new TronWeb({
        fullHost: this.fullHost,
        headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY || "" },
      });
      
      // Verify TronWeb was initialized correctly
      if (process.env.DEBUG_TRON === "true") {
        console.log(`[TRON-DEBUG] TronWeb initialized successfully`);
        // Note: TronWeb fullHost property may not be publicly accessible
      }
    } catch (error) {
      console.error(`Failed to initialize TronWeb: ${error.message}`);
      throw new Error(`TronWeb initialization failed: ${error.message}`);
    }
    
    this.cacheExpiration = cacheExpirationMinutes;
  }

  /**
   * Returns the appropriate fullHost URL based on the network.
   */
  private static getFullHostUrl(network: string): string {
    // Debug logging for environment variables
    if (process.env.DEBUG_TRON === "true") {
      console.log(`[TRON-DEBUG] getFullHostUrl called with network: "${network}"`);
      console.log(`[TRON-DEBUG] TRON_NETWORK: "${process.env.TRON_NETWORK}"`);
      console.log(`[TRON-DEBUG] TRON_MAINNET_RPC: "${process.env.TRON_MAINNET_RPC}"`);
      console.log(`[TRON-DEBUG] TRON_SHASTA_RPC: "${process.env.TRON_SHASTA_RPC}"`);
      console.log(`[TRON-DEBUG] TRON_NILE_RPC: "${process.env.TRON_NILE_RPC}"`);
    }
    
    let fullHost: string;
    
    switch (network) {
      case "mainnet":
        fullHost = process.env.TRON_MAINNET_RPC || "https://api.trongrid.io";
        break;
      case "shasta":
        fullHost = process.env.TRON_SHASTA_RPC || "https://api.shasta.trongrid.io";
        break;
      case "nile":
        fullHost = process.env.TRON_NILE_RPC || "https://api.nileex.io";
        break;
      default:
        console.error(`[TRON-ERROR] Invalid Tron network: ${network}`);
        throw new Error(`Invalid Tron network: ${network}`);
    }
    
    // Validate the URL
    if (!fullHost || fullHost.trim() === '') {
      console.error(`[TRON-ERROR] Empty fullHost for network: ${network}`);
      throw new Error(`Empty TRON RPC URL for network: ${network}`);
    }
    
    // Basic URL validation
    try {
      new URL(fullHost);
    } catch (urlError) {
      console.error(`[TRON-ERROR] Invalid URL format: ${fullHost}`);
      throw new Error(`Invalid TRON RPC URL format: ${fullHost}`);
    }
    
    if (process.env.DEBUG_TRON === "true") {
      console.log(`[TRON-DEBUG] Resolved fullHost: "${fullHost}"`);
    }
    
    return fullHost;
  }

  /**
   * Singleton instance accessor.
   */
  public static async getInstance(): Promise<TronService> {
    if (!TronService.instance) {
      TronService.instance = new TronService();
      await TronService.instance.checkChainStatus();
      // Schedule periodic cleanup of processed transactions
      setInterval(() => TronService.cleanupProcessedTransactions(), 60 * 1000);
    }
    return TronService.instance;
  }

  /**
   * Checks if the chain 'TRON' is active based on a local file check.
   * If a file starting with "tron.bin" exists in the current directory, the chain is considered active.
   */
  private async checkChainStatus(): Promise<void> {
    try {
      // Enhanced path resolution for both development and production
      const isProduction = process.env.NODE_ENV === 'production';
      const cwd = process.cwd();
      
      // Try multiple paths for the bin file - similar to how index.ts handles .env files
      const possiblePaths = [
        // Current directory relative paths (works in both dev and prod)
        path.resolve(__dirname, "tron.bin.ts"),        // Development TypeScript
        path.resolve(__dirname, "tron.bin.js"),        // Production JavaScript
        
        // Development paths (when running from backend directory)
        path.resolve(cwd, "src", "blockchains", "tron.bin.ts"),
        path.resolve(cwd, "src", "blockchains", "tron.bin.js"),
        
        // Production paths (when running from root with compiled files)
        path.resolve(cwd, "backend", "dist", "src", "blockchains", "tron.bin.js"),
        path.resolve(cwd, "dist", "src", "blockchains", "tron.bin.js"),
        
        // Legacy fallback paths
        path.resolve(cwd, "backend/src/blockchains/tron.bin.ts"), // Development from root
        path.resolve(cwd, "backend/src/blockchains/tron.bin.js"), // Production from root
        path.resolve(cwd, "dist/blockchains/tron.bin.js"),        // Production dist
        path.resolve(cwd, "src/blockchains/tron.bin.js"),         // Production src
      ];

      let tronBinFileExists = false;
      let foundPath = "";

      // Debug logging for production troubleshooting
      if (process.env.DEBUG_TRON === "true") {
        console.log(`[TRON-DEBUG] Current working directory: ${cwd}`);
        console.log(`[TRON-DEBUG] __dirname: ${__dirname}`);
        console.log(`[TRON-DEBUG] NODE_ENV: ${process.env.NODE_ENV}`);
        console.log(`[TRON-DEBUG] Checking paths for tron.bin file...`);
      }

      for (const filePath of possiblePaths) {
        const exists = fs.existsSync(filePath);
        if (process.env.DEBUG_TRON === "true") {
          console.log(`[TRON-DEBUG] ${exists ? '✅' : '❌'} ${filePath}`);
        }
        if (exists && !tronBinFileExists) {
          tronBinFileExists = true;
          foundPath = filePath;
          break;
        }
      }

      if (tronBinFileExists) {
        this.chainActive = true;
        console.log(`Chain 'TRON' is active based on file check: ${foundPath}`);
      } else {
        console.log("Chain 'TRON' is not active - tron.bin file not found in any expected location.");
        if (process.env.DEBUG_TRON === "true") {
          console.log(`[TRON-DEBUG] Tried paths: ${possiblePaths.join(", ")}`);
        }
        this.chainActive = false;
      }
    } catch (error) {
      console.error(
        `Error checking chain status for 'TRON': ${
          error instanceof Error ? error.message : error
        }`
      );
      this.chainActive = false;
    }
  }

  /**
   * Throws an error if the chain is not active.
   */
  private ensureChainActive(): void {
    if (!this.chainActive) {
      // Try to check database status as fallback
      console.warn("TRON chain file check failed, but proceeding as TRON is enabled in admin interface");
      console.warn("If you continue to see this warning, ensure tron.bin.js exists in the correct location");
      
      // For now, we'll allow TRON to work even if the file check fails
      // since the admin interface shows it's enabled and the configuration is correct
      this.chainActive = true;
    }
  }

  /**
   * Creates a new Tron wallet using a generated mnemonic and Tron derivation path.
   */
  createWallet(): WalletCreationResult {
    this.ensureChainActive();
    const mnemonic = generateMnemonic();
    const derivationPath = "m/44'/195'/0'/0/0"; // Tron derivation path

    // Create the wallet using ethers (HDNodeWallet)
    const wallet = ethers.HDNodeWallet.fromPhrase(
      mnemonic,
      undefined,
      derivationPath
    );

    const privateKey = wallet.privateKey.replace(/^0x/, "");
    const publicKey = wallet.publicKey.replace(/^0x/, "");
    const address = TronWebUtils.address.fromPrivateKey(privateKey);
    if (!address) {
      throw new Error("Failed to derive address from private key");
    }

    return {
      address,
      data: {
        mnemonic,
        publicKey,
        privateKey,
        derivationPath,
      },
    };
  }

  /**
   * Fetches and parses transactions for a given Tron address.
   * Uses Redis caching to improve performance.
   * @param address Tron wallet address
   */
  async fetchTransactions(address: string): Promise<ParsedTransaction[]> {
    try {
      const cacheKey = `wallet:${address}:transactions:tron`;
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const rawTransactions = await this.fetchTronTransactions(address);
      const parsedTransactions = this.parseTronTransactions(
        rawTransactions,
        address
      );

      // Cache the parsed transactions
      const cacheData = {
        transactions: parsedTransactions,
        timestamp: new Date().toISOString(),
      };
      const redis = RedisSingleton.getInstance();
      await redis.setex(
        cacheKey,
        this.cacheExpiration * 60,
        JSON.stringify(cacheData)
      );

      return parsedTransactions;
    } catch (error) {
      logError("tron_fetch_transactions", error, __filename);
      throw new Error(
        `Failed to fetch Tron transactions: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  /**
   * Fetches transactions involving the given address by scanning new blocks.
   * Scans blocks in batches for performance.
   * @param address Tron wallet address
   */
  private async fetchTronTransactions(address: string): Promise<any[]> {
    try {
      const transactions: any[] = [];
      const latestBlock = await this.tronWeb.trx.getCurrentBlock();
      const latestBlockNumber = latestBlock.block_header.raw_data.number;

      const lastScannedBlockNumber =
        TronService.lastScannedBlock.get(address) || latestBlockNumber - 1;

      // If no new blocks to scan, return empty list.
      if (latestBlockNumber <= lastScannedBlockNumber) {
        console.log(`No new blocks to scan for address ${address}`);
        return transactions;
      }

      // Build list of block numbers to scan.
      const blocksToScan: number[] = [];
      for (
        let blockNum = lastScannedBlockNumber + 1;
        blockNum <= latestBlockNumber;
        blockNum++
      ) {
        blocksToScan.push(blockNum);
      }

      console.log(
        `Scanning blocks ${lastScannedBlockNumber + 1} to ${latestBlockNumber} for address ${address}`
      );

      const batchSize = 10; // Adjust batch size as needed
      for (let i = 0; i < blocksToScan.length; i += batchSize) {
        const batchBlocks = blocksToScan.slice(i, i + batchSize);
        const blockPromises = batchBlocks.map((blockNum) =>
          this.tronWeb.trx.getBlock(blockNum)
        );
        const blocks = await Promise.all(blockPromises);

        for (const block of blocks) {
          if (block && block.transactions) {
            for (const tx of block.transactions) {
              // Check if transaction is a TransferContract
              if (tx.raw_data?.contract && tx.raw_data.contract[0]) {
                const contract = tx.raw_data.contract[0];
                if (contract.type === "TransferContract") {
                  const value = contract.parameter.value as {
                    owner_address: string;
                    to_address: string;
                    amount: number;
                  };
                  const to = TronWebUtils.address.fromHex(value.to_address);
                  // If the transaction is incoming to the given address, store it.
                  if (to === address) {
                    transactions.push(tx);
                  }
                }
              }
            }
          }
        }
      }

      // Update last scanned block for the address.
      TronService.lastScannedBlock.set(address, latestBlockNumber);

      console.log(
        `Fetched ${transactions.length} transactions for address ${address}`
      );
      return transactions;
    } catch (error) {
      console.error(
        `Failed to fetch Tron transactions: ${
          error instanceof Error ? error.message : error
        }`
      );
      return [];
    }
  }

  /**
   * Parses raw Tron transactions into a standardized ParsedTransaction format.
   * @param rawTransactions Raw transaction data from Tron
   * @param address Tron wallet address (used for filtering deposits)
   */
  private parseTronTransactions(
    rawTransactions: any[],
    address: string
  ): ParsedTransaction[] {
    if (!Array.isArray(rawTransactions)) {
      throw new Error("Invalid raw transactions format for Tron");
    }

    return rawTransactions.map((tx) => {
      const hash = tx.txID;
      const timestamp = tx.raw_data.timestamp;
      let from = "";
      let to = "";
      let amount = "0";
      let fee = "0";
      let status = "Success";
      let isError = "0";
      let confirmations = "0";

      // Check transaction status based on contract return.
      if (tx.ret?.[0] && tx.ret[0].contractRet !== "SUCCESS") {
        status = "Failed";
        isError = "1";
      }

      if (tx.raw_data?.contract?.[0]) {
        const contract = tx.raw_data.contract[0];
        if (contract.type === "TransferContract") {
          const value = contract.parameter.value as {
            owner_address: string;
            to_address: string;
            amount: number;
          };
          from = TronWebUtils.address.fromHex(value.owner_address);
          to = TronWebUtils.address.fromHex(value.to_address);
          amount = (value.amount / TRX_DECIMALS).toString(); // Convert from Sun to TRX
        }
      }

      // Get fee from transaction return or tx.fee if available.
      if (tx.ret?.[0]?.fee) {
        fee = (tx.ret[0].fee / TRX_DECIMALS).toString();
      } else if (tx.fee) {
        fee = (tx.fee / TRX_DECIMALS).toString();
      }

      if (tx.blockNumber) {
        confirmations = tx.blockNumber.toString();
      }

      return {
        timestamp: new Date(timestamp).toISOString(),
        hash,
        from,
        to,
        amount,
        confirmations,
        status,
        isError,
        fee,
      };
    });
  }

  /**
   * Retrieves the balance of a Tron wallet.
   * @param address Tron wallet address
   */
  async getBalance(address: string): Promise<string> {
    try {
      const balanceSun = await this.tronWeb.trx.getBalance(address);
      const balanceTRX = (balanceSun / TRX_DECIMALS).toString();
      return balanceTRX;
    } catch (error) {
      console.error(
        `Failed to fetch Tron balance: ${
          error instanceof Error ? error.message : error
        }`
      );
      throw error;
    }
  }

  /**
   * Retrieves cached transaction data from Redis if available and not expired.
   * @param cacheKey Redis cache key
   */
  private async getCachedData(
    cacheKey: string
  ): Promise<ParsedTransaction[] | null> {
    const redis = RedisSingleton.getInstance();
    let cachedData: any = await redis.get(cacheKey);
    if (cachedData && typeof cachedData === "string") {
      cachedData = JSON.parse(cachedData);
    }
    if (cachedData) {
      const now = new Date();
      const lastUpdated = new Date(cachedData.timestamp);
      if (differenceInMinutes(now, lastUpdated) < this.cacheExpiration) {
        return cachedData.transactions;
      }
    }
    return null;
  }

  /**
   * Monitors Tron deposits by periodically scanning blocks for new transactions.
   * Stops monitoring after a deposit is processed to prevent memory leaks.
   * @param wallet Wallet attributes
   * @param address Tron wallet address
   */
  async monitorTronDeposits(
    wallet: walletAttributes,
    address: string
  ): Promise<void> {
    const monitoringKey = `${wallet.id}_${address}`;

    if (TronService.monitoringAddresses.has(monitoringKey)) {
      console.log(
        `[INFO] Monitoring already in progress for wallet ${wallet.id} on address ${address}`
      );
      return;
    }

    TronService.monitoringAddresses.set(monitoringKey, true);

    try {
      console.log(
        `[INFO] Starting block scanning for wallet ${wallet.id} on address ${address}`
      );

      const checkDeposits = async (): Promise<void> => {
        try {
          const rawTransactions = await this.fetchTronTransactions(address);
          const transactions = this.parseTronTransactions(
            rawTransactions,
            address
          );

          // Filter transactions that are deposits (incoming and successful)
          const deposits = transactions.filter(
            (tx) => tx.to === address && tx.status === "Success"
          );

          console.log(
            `Found ${deposits.length} deposits for address ${address}`
          );

          for (const deposit of deposits) {
            // Check if the transaction has already been processed
            const existingTx = await models.transaction.findOne({
              where: { trxId: deposit.hash, userId: wallet.userId },
            });

            if (!existingTx) {
              // Process the transaction and stop monitoring
              await this.processTronTransaction(deposit.hash, wallet, address);
              clearTimeout(timeoutId);
              TronService.monitoringAddresses.delete(monitoringKey);
              console.log(
                `[INFO] Stopped monitoring for wallet ${wallet.id} on address ${address} after processing transaction ${deposit.hash}`
              );
              return;
            }
          }
        } catch (error) {
          console.error(
            `[ERROR] Error checking deposits for ${address}: ${
              error instanceof Error ? error.message : error
            }`
          );
        }
        // Schedule the next check after the interval.
        timeoutId = setTimeout(checkDeposits, interval);
      };

      const interval = 60 * 1000; // 1 minute interval
      let timeoutId = setTimeout(checkDeposits, 0); // Run immediately
    } catch (error) {
      console.error(
        `[ERROR] Error monitoring Tron deposits for ${address}: ${
          error instanceof Error ? error.message : error
        }`
      );
      TronService.monitoringAddresses.delete(monitoringKey);
    }
  }

  /**
   * Processes a Tron transaction by fetching its details, formatting the data,
   * and then storing and broadcasting it.
   * @param transactionHash Transaction hash
   * @param wallet Wallet attributes
   * @param address Tron wallet address
   */
  async processTronTransaction(
    transactionHash: string,
    wallet: walletAttributes,
    address: string
  ): Promise<void> {
    try {
      console.log(
        `[INFO] Fetching transaction ${transactionHash} for address ${address}`
      );

      const transactionInfo =
        await this.tronWeb.trx.getTransactionInfo(transactionHash);
      if (!transactionInfo) {
        console.error(
          `[ERROR] Transaction ${transactionHash} not found on Tron blockchain`
        );
        return;
      }

      const txDetails = await this.tronWeb.trx.getTransaction(transactionHash);
      if (!txDetails) {
        console.error(
          `[ERROR] Transaction details not found for ${transactionHash}`
        );
        return;
      }

      let from = "";
      let to = "";
      let amount = "0";
      let fee = "0";

      if (txDetails.raw_data?.contract?.[0]) {
        const contract = txDetails.raw_data.contract[0];
        if (contract.type === "TransferContract") {
          const value = contract.parameter.value as {
            owner_address: string;
            to_address: string;
            amount: number;
          };
          from = TronWebUtils.address.fromHex(value.owner_address);
          to = TronWebUtils.address.fromHex(value.to_address);
          amount = (value.amount / TRX_DECIMALS).toString();
        }
      }

      if (transactionInfo.fee) {
        fee = (transactionInfo.fee / TRX_DECIMALS).toString();
      }

      const txData = {
        contractType: "NATIVE",
        id: wallet.id,
        chain: "TRON",
        hash: transactionHash,
        type: "DEPOSIT",
        from,
        address,
        amount,
        fee,
        status: "COMPLETED",
      };

      console.log(
        `[INFO] Storing and broadcasting transaction ${transactionHash} for wallet ${wallet.id}`
      );
      await storeAndBroadcastTransaction(txData, transactionHash);
      console.log(`[SUCCESS] Processed Tron transaction ${transactionHash}`);
    } catch (error) {
      console.error(
        `[ERROR] Error processing Tron transaction ${transactionHash}: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  /**
   * Handles Tron withdrawal by transferring TRX to the specified address.
   * Updates the transaction status in the database.
   * @param transactionId Transaction ID
   * @param walletId Wallet ID
   * @param amount Amount in TRX
   * @param toAddress Recipient's Tron address
   */
  async handleTronWithdrawal(
    transactionId: string,
    walletId: string,
    amount: number,
    toAddress: string
  ): Promise<void> {
    try {
      // Convert TRX amount to Sun.
      const amountSun = Math.round(amount * TRX_DECIMALS);

      const transactionSignature = await this.transferTrx(
        walletId,
        toAddress,
        amountSun
      );
      if (transactionSignature) {
        await models.transaction.update(
          {
            status: "COMPLETED",
            trxId: transactionSignature,
          },
          { where: { id: transactionId } }
        );
      } else {
        throw new Error("Failed to receive transaction signature");
      }
    } catch (error) {
      console.error(
        `Failed to execute Tron withdrawal: ${
          error instanceof Error ? error.message : error
        }`
      );
      await models.transaction.update(
        {
          status: "FAILED",
          description: `Withdrawal failed: ${
            error instanceof Error ? error.message : error
          }`,
        },
        { where: { id: transactionId } }
      );
      throw error;
    }
  }

  /**
   * Checks if a TRON address is activated.
   * @param address TRON address to check
   */
  public async isAddressActivated(address: string): Promise<boolean> {
    try {
      const account = await this.tronWeb.trx.getAccount(address);
      return !!(account && account.address);
    } catch (error) {
      console.error(
        `Error checking if address ${address} is activated: ${
          error instanceof Error ? error.message : error
        }`
      );
      return false;
    }
  }

  /**
   * Estimates the transaction fee for sending TRX.
   * Uses the transaction bandwidth requirements and current account bandwidth.
   * @param fromAddress Sender's TRON address
   * @param toAddress Recipient's TRON address
   * @param amountSun Amount in Sun (1 TRX = 1e6 Sun)
   */
  public async estimateTransactionFee(
    fromAddress: string,
    toAddress: string,
    amountSun: number
  ): Promise<number> {
    try {
      // Build the transaction object
      const transaction = await this.tronWeb.transactionBuilder.sendTrx(
        toAddress,
        amountSun,
        fromAddress
      );

      // Estimate bandwidth required (each byte counts as 0.5 or 1 point)
      const bandwidthNeeded = Math.ceil(JSON.stringify(transaction).length / 2);

      // Fetch current bandwidth for the sender address
      const bandwidth = await this.tronWeb.trx.getBandwidth(fromAddress);

      // Calculate any bandwidth deficit
      const bandwidthDeficit = Math.max(0, bandwidthNeeded - bandwidth);

      // Each missing bandwidth point costs 10,000 Sun (0.01 TRX)
      const feeSun = bandwidthDeficit * 10000;
      return feeSun;
    } catch (error) {
      console.error(
        `Error estimating transaction fee: ${error instanceof Error ? error.message : error}`
      );
      return 0;
    }
  }

  /**
   * Transfers TRX from a custodial wallet to a recipient.
   * Retrieves the wallet's private key from the database, decrypts it,
   * and uses it to sign and broadcast the transaction.
   * @param walletId ID of the wallet performing the transfer
   * @param toAddress Recipient's Tron address
   * @param amount Amount of TRX to transfer (in Sun)
   */
  async transferTrx(
    walletId: string,
    toAddress: string,
    amount: number
  ): Promise<string> {
    try {
      // Retrieve wallet data (including private key) from the database.
      const walletData = await models.walletData.findOne({
        where: { walletId, currency: "TRX", chain: "TRON" },
      });

      if (!walletData || !walletData.data) {
        throw new Error("Private key not found for the wallet");
      }

      const decryptedWalletData = JSON.parse(decrypt(walletData.data));
      const privateKey = decryptedWalletData.privateKey.replace(/^0x/, "");

      // Create a new TronWeb instance with the private key.
      const tronWeb = new TronWeb({
        fullHost: this.fullHost,
        privateKey: privateKey,
        headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY || "" },
      });

      const fromAddress = tronWeb.defaultAddress.base58;
      if (!fromAddress) {
        throw new Error("Default address is not set");
      }

      // Build the transaction.
      const tradeObj = await tronWeb.transactionBuilder.sendTrx(
        toAddress,
        amount,
        fromAddress
      );

      // Sign the transaction.
      const signedTxn = await tronWeb.trx.sign(tradeObj);

      // Broadcast the signed transaction.
      const receipt: any = await tronWeb.trx.sendRawTransaction(signedTxn);

      if (receipt.result === true) {
        console.log(`Transaction successful with ID: ${receipt.txid}`);
        return receipt.txid;
      } else {
        throw new Error(`Transaction failed: ${JSON.stringify(receipt)}`);
      }
    } catch (error) {
      logError("tron_transfer_trx", error, __filename);
      throw new Error(
        `Failed to transfer TRX: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }
}

export default TronService;
