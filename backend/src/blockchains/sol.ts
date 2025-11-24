// @b/blockchains/sol.ts

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  clusterApiUrl,
  TransactionConfirmationStrategy,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import * as ed25519 from "ed25519-hd-key";
import { RedisSingleton } from "@b/utils/redis";
import { differenceInMinutes } from "date-fns";
import { logError } from "@b/utils/logger";
import { decrypt } from "@b/utils/encrypt";
import { models } from "@b/db";
import { storeAndBroadcastTransaction } from "@b/api/(ext)/ecosystem/utils/redis/deposit";
import { getMasterWalletByChainFull, getWalletData } from "@b/api/(ext)/ecosystem/utils/wallet";
import * as path from "path";
import * as fs from "fs";

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

class SolanaService {
  private connection: Connection;
  private cacheExpiration: number;
  private chainActive: boolean = false;
  private static instance: SolanaService;

  private constructor(cacheExpirationMinutes: number = 30) {
    this.connection = new Connection(
      clusterApiUrl(
        process.env.SOL_NETWORK === "mainnet"
          ? "mainnet-beta"
          : process.env.SOL_NETWORK === "testnet"
            ? "testnet"
            : "devnet"
      ),
      "confirmed"
    );
    this.cacheExpiration = cacheExpirationMinutes;
  }

  /**
   * Singleton instance accessor.
   */
  public static async getInstance(): Promise<SolanaService> {
    if (!SolanaService.instance) {
      SolanaService.instance = new SolanaService();
      await SolanaService.instance.checkChainStatus();
    }
    return SolanaService.instance;
  }

  /**
   * Checks if the chain 'SOL' is active in the ecosystemBlockchain model.
   */
  private async checkChainStatus(): Promise<void> {
    try {
      // Try multiple paths for the bin file - similar to how index.ts handles .env files
      const possiblePaths = [
        path.resolve(__dirname, "sol.bin.ts"),        // Development TypeScript
        path.resolve(__dirname, "sol.bin.js"),        // Production JavaScript
        path.resolve(process.cwd(), "backend/src/blockchains/sol.bin.ts"), // Development from root
        path.resolve(process.cwd(), "backend/src/blockchains/sol.bin.js"), // Production from root
        path.resolve(process.cwd(), "dist/blockchains/sol.bin.js"),        // Production dist
        path.resolve(process.cwd(), "src/blockchains/sol.bin.js"),         // Production src
      ];

      let solBinFileExists = false;
      let foundPath = "";

      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          solBinFileExists = true;
          foundPath = filePath;
          break;
        }
      }

      if (solBinFileExists) {
        this.chainActive = true;
        console.log(`Chain 'SOL' is active based on file check: ${foundPath}`);
      } else {
        console.log("Chain 'SOL' is not active - sol.bin file not found in any expected location.");
        console.log(`Tried paths: ${possiblePaths.join(", ")}`);
        this.chainActive = false;
      }
    } catch (error) {
      console.error(`Error checking chain status for 'SOL': ${error.message}`);
      this.chainActive = false;
    }
  }

  /**
   * Throws an error if the chain is not active.
   */
  private ensureChainActive(): void {
    if (!this.chainActive) {
      throw new Error("Chain 'SOL' is not active in ecosystemBlockchain.");
    }
  }

  /**
   * Creates a new Solana wallet.
   */
  createWallet() {
    this.ensureChainActive();
    const mnemonic = generateMnemonic();
    const seed = mnemonicToSeedSync(mnemonic);
    const derivationPath = "m/44'/501'/0'/0'"; // Standard Solana derivation path
    const derivedSeed = ed25519.derivePath(
      derivationPath,
      seed.toString("hex")
    ).key;
    const keypair = Keypair.fromSeed(derivedSeed);
    const address = keypair.publicKey.toBase58();
    const privateKey = Buffer.from(keypair.secretKey).toString("hex");
    const publicKey = keypair.publicKey.toBase58();

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
   * Fetches and parses transactions for a given Solana address.
   * Utilizes caching to optimize performance.
   * @param address Solana wallet address
   */
  async fetchTransactions(address: string): Promise<ParsedTransaction[]> {
    try {
      const cacheKey = `wallet:${address}:transactions:sol`;
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const rawTransactions = await this.fetchSolanaTransactions(address);
      const parsedTransactions = this.parseSolanaTransactions(
        rawTransactions,
        address
      );

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
      logError("solana_fetch_transactions", error, __filename);
      throw new Error(`Failed to fetch Solana transactions: ${error.message}`);
    }
  }

  /**
   * Fetches raw transactions from Solana for a given address.
   * @param address Solana wallet address
   */
  private async fetchSolanaTransactions(address: string): Promise<any[]> {
    try {
      const publicKey = new PublicKey(address);
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        { limit: 50 }
      );
      const transactions = await Promise.all(
        signatures.map(async (signatureInfo) => {
          const transaction = await this.connection.getTransaction(
            signatureInfo.signature,
            {
              maxSupportedTransactionVersion: 0,
              commitment: "confirmed",
            }
          );
          return transaction;
        })
      );
      return transactions;
    } catch (error) {
      console.error(`Failed to fetch Solana transactions: ${error.message}`);
      return [];
    }
  }

  /**
   * Parses raw Solana transactions into a standardized format.
   * @param rawTransactions Raw transaction data from Solana
   * @param address Solana wallet address
   */
  private parseSolanaTransactions(
    rawTransactions: any[],
    address: string
  ): ParsedTransaction[] {
    if (!Array.isArray(rawTransactions)) {
      throw new Error(`Invalid raw transactions format for Solana`);
    }

    return rawTransactions
      .filter((tx) => tx !== null && tx.meta !== null) // Ensure transaction and meta are not null
      .map((tx) => {
        const { transaction, meta, blockTime } = tx;
        const hash = transaction.signatures[0]; // Transaction signature serves as the hash
        const timestamp = blockTime ? blockTime * 1000 : Date.now(); // Convert blockTime to milliseconds

        // Determine the status based on Solana-specific error field
        const status = meta.err ? "Failed" : "Success";

        // Initialize transaction variables
        let from = "";
        let to = "";
        let amount = "0";

        // Loop through instructions and identify transfer details
        transaction.message.instructions.forEach((instruction: any) => {
          // Check if it's a transfer instruction on the system program
          if (
            instruction.programId.equals(
              new PublicKey("11111111111111111111111111111111") // System Program ID for SOL transfers
            ) &&
            instruction.parsed?.type === "transfer"
          ) {
            const info = instruction.parsed.info;

            // Identify if the transaction involves the provided address
            if (info.source === address || info.destination === address) {
              from = info.source;
              to = info.destination;
              amount = (info.lamports / 1e9).toString(); // Convert lamports to SOL
            }
          }
        });

        return {
          timestamp: new Date(timestamp).toISOString(),
          hash,
          from,
          to,
          amount,
          confirmations: meta.confirmations?.toString() || "0", // Use confirmations from meta if available
          status,
          isError: status === "Failed" ? "1" : "0",
          fee: (meta.fee / 1e9).toString(), // Transaction fee in SOL (converted from lamports)
        };
      });
  }

  /**
   * Retrieves the balance of a Solana wallet.
   * Utilizes caching to optimize performance.
   * @param address Solana wallet address
   */
  async getBalance(address: string): Promise<string> {
    try {
      const publicKey = new PublicKey(address);
      const balanceLamports = await this.connection.getBalance(publicKey);
      const balanceSOL = (balanceLamports / 1e9).toString(); // Convert lamports to SOL

      return balanceSOL;
    } catch (error) {
      console.error(`Failed to fetch Solana balance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieves cached transaction data if available and not expired.
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

  async monitorSolanaDeposits(
    wallet: walletAttributes,
    address: string,
    onDepositProcessed?: () => void
  ) {
    try {
      const publicKey = new PublicKey(address);

      console.log(
        `[INFO] Starting monitoring for wallet ${wallet.id} on address ${address}`
      );

      // Create a unique inactivity timeout and listener ID for this request
      const timeoutDuration = 60 * 60 * 1000; // 1 hour in milliseconds
      let logsSubscriptionId: any = null;

      // Inactivity timeout handler
      const inactivityTimeout = setTimeout(async () => {
        if (logsSubscriptionId !== null) {
          console.log(
            `[INFO] No activity for 1 hour on account ${address}. Removing listener.`
          );
          await this.connection.removeOnLogsListener(logsSubscriptionId);
          logsSubscriptionId = null; // Ensure the listener is removed
        }
      }, timeoutDuration);

      // Subscribe to account logs with error handling
      logsSubscriptionId = await this.connection.onLogs(
        publicKey,
        async (logs, context) => {
          try {
            clearTimeout(inactivityTimeout); // Clear the inactivity timeout for this specific request

            console.log(
              `[INFO] WebSocket triggered for logs on account ${address}, Slot: ${context.slot}`
            );

            // Extract transaction signature from logs
            const transactionSignature = logs.signature;
            if (transactionSignature) {
              console.log(
                `[INFO] Detected transaction signature: ${transactionSignature}`
              );

              // Track the transaction signature
              await this.trackTransactionSignature(
                transactionSignature,
                wallet,
                address,
                logsSubscriptionId
              );

              // Remove listener after processing the transaction
              if (logsSubscriptionId !== null) {
                await this.connection.removeOnLogsListener(logsSubscriptionId);
                logsSubscriptionId = null; // Ensure it's cleaned up
                console.log(
                  `[INFO] Successfully processed deposit and removed listener for account ${address}`
                );
                if (onDepositProcessed) onDepositProcessed();
              }
            } else {
              console.error(
                `[ERROR] No transaction signature detected in logs`
              );
            }
          } catch (logError) {
            console.error(
              `[ERROR] Error processing logs for account ${address}: ${logError.message}`
            );
          }
        },
        "confirmed"
      );

      console.log(
        `[INFO] Subscribed to logs on Solana account: ${address}, subscriptionId: ${logsSubscriptionId}`
      );
    } catch (error) {
      console.error(
        `[ERROR] Error monitoring Solana deposits for ${address}: ${error.message}`
      );
    }
  }

  async trackTransactionSignature(
    signature: string,
    wallet: walletAttributes,
    address: string,
    logsSubscriptionId: number
  ) {
    try {
      const maxRetries = 30;
      let retries = 0;
      let transaction: any = null;

      // Retry mechanism to track the transaction status
      while (retries < maxRetries) {
        try {
          transaction = await this.connection.getTransaction(signature, {
            commitment: "finalized", // Ensure it's fully confirmed
            maxSupportedTransactionVersion: 0,
          });

          if (transaction) {
            console.log(`[INFO] Transaction ${signature} found.`);
            break; // Exit loop if transaction is found
          } else {
            console.log(
              `[INFO] Transaction ${signature} not found. Retrying... (${
                retries + 1
              }/${maxRetries})`
            );
          }
        } catch (error) {
          console.error(
            `[ERROR] Error fetching transaction ${signature}: ${error.message}`
          );
        }

        retries++;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      if (!transaction) {
        console.error(
          `[ERROR] Transaction ${signature} not found after ${maxRetries} retries.`
        );
        return;
      }

      if (!transaction.meta) {
        console.error(
          `[ERROR] Transaction metadata not available for ${signature}`
        );
        return;
      }

      const accountKeys = transaction.transaction.message.accountKeys.map(
        (key: PublicKey) => key.toBase58()
      );

      // Find the index of the wallet address in the accountKeys array
      const walletIndex = accountKeys.findIndex((key) => key === address);
      if (walletIndex === -1) {
        console.error(
          `[ERROR] Wallet address ${address} not found in transaction ${signature}`
        );
        return;
      }

      // Extract the pre and post balances for the wallet address
      const preBalance = transaction.meta.preBalances[walletIndex];
      const postBalance = transaction.meta.postBalances[walletIndex];

      // Calculate the difference to get the received amount
      const balanceDifference = postBalance - preBalance;
      const amountReceived = (balanceDifference / 1e9).toString(); // Convert lamports to SOL

      if (balanceDifference <= 0) {
        console.error(`[ERROR] No SOL received in transaction ${signature}`);
        return;
      }

      console.log(
        `[INFO] Amount received: ${amountReceived} SOL on account ${address}`
      );

      // Now store the transaction and broadcast the transaction with the received amount
      const txDetails = {
        contractType: "NATIVE",
        id: wallet.id,
        chain: "SOL",
        hash: transaction.transaction.signatures[0],
        type: "DEPOSIT",
        from: "N/A", // Optionally, you can extract the sender if needed
        address: address,
        amount: amountReceived,
        gasLimit: "N/A",
        gasPrice: "N/A",
        status: "COMPLETED",
      };

      console.log(
        `[INFO] Storing transaction for wallet ${wallet.id}, amount: ${amountReceived} SOL`
      );

      await storeAndBroadcastTransaction(txDetails, signature);

      console.log(
        `[SUCCESS] Transaction stored and broadcasted for wallet ${wallet.id}`
      );

      // Remove log listener once transaction is processed
      await this.connection.removeOnLogsListener(logsSubscriptionId);
      console.log(
        `[INFO] Unsubscribed from logs on Solana account: ${address}, subscriptionId: ${logsSubscriptionId}`
      );
    } catch (error) {
      console.error(
        `[ERROR] Error processing Solana transaction ${signature}: ${error.message}`
      );
    }
  }

  public async monitorSPLTokenDeposits(
    wallet: walletAttributes,
    monitoredWalletAddress: string,
    mintAddress: string,
    onDepositProcessed?: () => void
  ) {
    try {
      console.log(
        `[INFO] Starting SPL token deposit monitoring for wallet ${wallet.id} on token account ${monitoredWalletAddress} with mint ${mintAddress}`
      );

      const timeoutDuration = 60 * 60 * 1000; // 1 hour in milliseconds
      let programChangeSubscriptionId: number | undefined;

      // Inactivity timeout handler
      let inactivityTimeout: ReturnType<typeof setTimeout> | undefined =
        setTimeout(async () => {
          if (programChangeSubscriptionId !== undefined) {
            console.log(
              `[INFO] No activity for 1 hour on SPL token account ${monitoredWalletAddress}. Removing listener.`
            );
            await this.connection.removeProgramAccountChangeListener(
              programChangeSubscriptionId
            );
            programChangeSubscriptionId = undefined;
          }
        }, timeoutDuration);

      // Subscribe to program account changes with filters
      programChangeSubscriptionId = this.connection.onProgramAccountChange(
        TOKEN_PROGRAM_ID,
        async ({ accountId, accountInfo }, context) => {
          try {
            console.log(
              `[INFO] Program account change detected for account ${accountId.toBase58()}`
            );

            // Reset inactivity timeout
            if (inactivityTimeout) clearTimeout(inactivityTimeout);
            inactivityTimeout = setTimeout(async () => {
              if (programChangeSubscriptionId !== undefined) {
                console.log(
                  `[INFO] Inactivity timeout triggered for SPL token account ${monitoredWalletAddress}. Removing listener.`
                );
                await this.connection.removeProgramAccountChangeListener(
                  programChangeSubscriptionId
                );
                programChangeSubscriptionId = undefined;
              }
            }, timeoutDuration);

            // Fetch transactions in the block where the account change occurred
            const blockTransactions = await this.connection.getBlock(
              context.slot,
              { commitment: "confirmed", maxSupportedTransactionVersion: 0 }
            );
            if (!blockTransactions || !blockTransactions.transactions) {
              console.error(
                `[ERROR] No transactions found in block ${context.slot}`
              );
              return;
            }

            // Check and process deposits in the transactions
            const isDepositFound = await this.checkSPLTransactionsInBlock(
              blockTransactions.transactions,
              wallet,
              monitoredWalletAddress,
              mintAddress
            );

            // Stop monitoring if a deposit transaction is found and processed
            if (isDepositFound && programChangeSubscriptionId !== undefined) {
              await this.connection.removeProgramAccountChangeListener(
                programChangeSubscriptionId
              );
              programChangeSubscriptionId = undefined;
              console.log(
                `[INFO] SPL token deposit detected and processed. Monitoring stopped for account ${monitoredWalletAddress}`
              );
              if (onDepositProcessed) onDepositProcessed();
            }
          } catch (error) {
            console.error(
              `[ERROR] Error processing program account change for token account ${monitoredWalletAddress}: ${error.message}`
            );
          }
        },
        {
          filters: [
            {
              memcmp: {
                offset: 0, // Offset for mint address
                bytes: mintAddress,
              },
            },
            {
              memcmp: {
                offset: 32, // Offset for owner address
                bytes: monitoredWalletAddress,
              },
            },
            { dataSize: 165 }, // SPL token account size
          ],
          commitment: "confirmed",
        }
      );

      console.log(
        `[INFO] Subscribed to program changes for SPL token account ${monitoredWalletAddress}, subscriptionId: ${programChangeSubscriptionId}`
      );
    } catch (error) {
      console.error(
        `[ERROR] Error setting up SPL token deposit monitoring for ${monitoredWalletAddress}: ${error.message}`
      );
    }
  }

  /**
   * Checks SPL token transactions within a block to identify a deposit.
   * Processes and stores the deposit if found.
   * @param transactions Array of transactions in the block
   * @param wallet Wallet attributes for storage and broadcasting
   * @param monitoredWalletAddress The monitored token account address
   * @param mintAddress The mint address of the SPL token
   */
  private async checkSPLTransactionsInBlock(
    transactions: any[],
    wallet: walletAttributes,
    monitoredWalletAddress: string,
    mintAddress: string
  ): Promise<boolean> {
    for (const transaction of transactions) {
      if (transaction.meta && transaction.meta.postTokenBalances) {
        const tokenBalanceChange = transaction.meta.postTokenBalances.find(
          (balance) =>
            balance.owner === monitoredWalletAddress &&
            balance.mint === mintAddress
        );

        if (tokenBalanceChange) {
          const preBalance =
            transaction.meta.preTokenBalances.find(
              (balance) =>
                balance.owner === monitoredWalletAddress &&
                balance.mint === mintAddress
            )?.uiTokenAmount.uiAmount || 0;
          const postBalance = tokenBalanceChange.uiTokenAmount.uiAmount;

          const amountReceived = postBalance - preBalance;

          if (amountReceived > 0) {
            console.log(
              `[INFO] SPL Token Deposit Detected: ${amountReceived} tokens to ${monitoredWalletAddress}`
            );

            const txDetails = {
              contractType: "PERMIT",
              id: wallet.id,
              chain: "SOL",
              hash: transaction.transaction.signatures[0],
              type: "DEPOSIT",
              from: transaction.transaction.message.accountKeys[0],
              address: monitoredWalletAddress,
              amount: amountReceived.toString(),
              status: "COMPLETED",
            };

            console.log(
              `[INFO] Storing and broadcasting SPL transaction details for ${transaction.transaction.signatures[0]}`
            );
            await storeAndBroadcastTransaction(
              txDetails,
              transaction.transaction.signatures[0]
            );

            console.log(
              `[SUCCESS] SPL Token deposit transaction stored and broadcasted for wallet ${wallet.id}`
            );
            return true;
          }
        }
      }
    }
    return false;
  }

  async processSolanaTransaction(
    transactionHash: string,
    wallet: walletAttributes,
    address: string
  ) {
    try {
      console.log(
        `[INFO] Fetching transaction ${transactionHash} for address ${address}`
      );

      // Use the new GetVersionedTransactionConfig
      const transaction = await this.connection.getTransaction(
        transactionHash,
        {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0, // Use version 0 or adjust as needed
        }
      );

      if (!transaction) {
        console.error(
          `[ERROR] Transaction ${transactionHash} not found on Solana blockchain`
        );
        return;
      }

      if (!transaction.meta) {
        console.error(
          `[ERROR] Transaction metadata not available for ${transactionHash}`
        );
        return;
      }

      // Process the transaction as usual
      let contractType: "NATIVE" | "PERMIT" = "NATIVE";
      let amount = "0";

      const instructions =
        "instructions" in transaction.transaction.message
          ? transaction.transaction.message.instructions
          : transaction.transaction.message.compiledInstructions;

      instructions.forEach((instruction: any) => {
        if (
          instruction.programId &&
          instruction.programId.equals &&
          instruction.programId.equals(
            new PublicKey("11111111111111111111111111111111") // System Program ID for SOL transfers
          ) &&
          instruction.parsed?.type === "transfer"
        ) {
          const info = instruction.parsed.info;
          if (info.destination === address) {
            amount = (info.lamports / 1e9).toString(); // Convert lamports to SOL
            contractType = "NATIVE";
          }
        }
      });

      if (amount === "0") {
        console.error(
          `[ERROR] No SOL received in transaction ${transactionHash}`
        );
        return;
      }

      const txDetails = {
        contractType,
        id: wallet.id,
        chain: "SOL",
        hash: transaction.transaction.signatures[0],
        type: "DEPOSIT",
        from: "N/A",
        to: address,
        amount,
        fee: (transaction.meta.fee / 1e9).toString(), // Convert lamports to SOL
      };

      console.log(
        `[INFO] Storing and broadcasting transaction ${transactionHash} for wallet ${wallet.id}`
      );
      await storeAndBroadcastTransaction(
        txDetails,
        transaction.transaction.signatures[0]
      );

      console.log(
        `[SUCCESS] Processed Solana transaction ${transactionHash}, type: ${contractType}`
      );
    } catch (error) {
      console.error(
        `[ERROR] Error processing Solana transaction ${transactionHash}: ${error.message}`
      );
    }
  }

  async handleSolanaWithdrawal(
    transactionId: string,
    walletId: string,
    amount: number,
    toAddress: string
  ): Promise<void> {
    try {
      const recipient = new PublicKey(toAddress);
      const amountLamports = Math.round(amount * 1e9); // Convert SOL to lamports

      const transactionSignature = await this.transferSol(
        walletId,
        recipient,
        amountLamports
      );

      if (transactionSignature) {
        await models.transaction.update(
          {
            status: "COMPLETED",
            trxId: transactionSignature,
          },
          {
            where: { id: transactionId },
          }
        );
      } else {
        throw new Error("Failed to receive transaction signature");
      }
    } catch (error) {
      console.error(`Failed to execute Solana withdrawal: ${error.message}`);
      // Update transaction status to 'FAILED'
      await models.transaction.update(
        {
          status: "FAILED",
          description: `Withdrawal failed: ${error.message}`,
        },
        {
          where: { id: transactionId },
        }
      );
      throw error;
    }
  }

  /**
   * Transfers SOL from the custodial wallet to a recipient using the wallet's ID.
   * The wallet's public key (address) is retrieved from the database using the walletId.
   * The private key is fetched from the wallet data for signing the transaction.
   *
   * @param walletId ID of the wallet performing the transfer
   * @param recipient Recipient's public key (Solana address)
   * @param amount Amount of SOL to transfer (in lamports)
   */
  async transferSol(
    walletId: string,
    recipient: PublicKey,
    amount: number
  ): Promise<string> {
    try {
      // Fetch wallet's private key from the walletData table
      const walletData = await models.walletData.findOne({
        where: { walletId, currency: "SOL", chain: "SOL" },
      });

      if (!walletData || !walletData.data) {
        throw new Error("Private key not found for the wallet");
      }

      const decryptedWalletData = JSON.parse(decrypt(walletData.data));
      const privateKey = Buffer.from(decryptedWalletData.privateKey, "hex");
      const custodialWallet = Keypair.fromSecretKey(privateKey);

      // Create a transaction for transferring SOL
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: custodialWallet.publicKey,
          toPubkey: recipient,
          lamports: amount,
        })
      );

      // Fetch a recent blockhash and set it in the transaction
      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = custodialWallet.publicKey;

      // Sign the transaction
      transaction.sign(custodialWallet);

      // Serialize the transaction
      const serializedTransaction = transaction.serialize();

      // Send the transaction
      const signature = await this.connection.sendRawTransaction(
        serializedTransaction
      );

      console.log(`Transaction signature: ${signature}`);

      // Confirm the transaction
      try {
        await this.connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed"
        );
      } catch (confirmError) {
        console.warn(
          `Transaction confirmation failed: ${confirmError.message}`
        );
        // Do not throw here; we'll check the transaction status below
      }

      // Check the transaction status on the blockchain
      const txResult = await this.connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0, // or null if you support all versions
      });

      if (txResult && txResult.meta && txResult.meta.err === null) {
        console.log(`SOL transfer successful with signature: ${signature}`);
        return signature;
      } else if (txResult && txResult.meta && txResult.meta.err) {
        throw new Error(
          `Transaction failed with error: ${JSON.stringify(txResult.meta.err)}`
        );
      } else {
        throw new Error("Transaction not found or not confirmed");
      }
    } catch (error) {
      logError("solana_transfer_sol", error, __filename);
      throw new Error(`Failed to transfer SOL: ${error.message}`);
    }
  }

  async handleSplTokenWithdrawal(
    transactionId: string,
    walletId: string,
    tokenMintAddress: string,
    amount: number,
    toAddress: string,
    decimals: number
  ): Promise<void> {
    try {
      console.log(
        `[INFO] Starting SPL token withdrawal for transaction ${transactionId}`
      );

      // Step 1: Retrieve sender (token holder) wallet data
      console.log(
        `[INFO] Fetching sender wallet data for wallet ID: ${walletId}`
      );
      const senderWalletData = await getWalletData(walletId, "SOL");
      if (!senderWalletData || !senderWalletData.data) {
        throw new Error("Sender wallet data not found");
      }
      const decryptedSenderData = JSON.parse(decrypt(senderWalletData.data));
      const senderKeypair = Keypair.fromSecretKey(
        Buffer.from(decryptedSenderData.privateKey, "hex")
      );
      console.log(
        `[INFO] Sender public key: ${senderKeypair.publicKey.toBase58()}`
      );

      // Step 2: Retrieve master wallet data (for fee payment)
      console.log(`[INFO] Fetching master wallet data`);
      const masterWallet = await getMasterWalletByChainFull("SOL");
      if (!masterWallet || !masterWallet.data) {
        throw new Error("Master wallet not found or invalid");
      }
      const decryptedMasterData = JSON.parse(decrypt(masterWallet.data));
      const masterKeypair = Keypair.fromSecretKey(
        Buffer.from(decryptedMasterData.privateKey, "hex")
      );
      console.log(
        `[INFO] Master public key (fee payer): ${masterKeypair.publicKey.toBase58()}`
      );

      // Step 3: Verify sender's associated token account and balance
      const tokenMint = new PublicKey(tokenMintAddress);
      const amountInLamports = Math.round(amount * Math.pow(10, decimals));
      console.log(`[INFO] Amount in lamports: ${amountInLamports}`);

      const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        masterKeypair, // Master wallet is used to pay for account creation if needed
        tokenMint,
        senderKeypair.publicKey
      );

      const senderBalance = await this.connection.getTokenAccountBalance(
        senderTokenAccount.address
      );

      // Check for null and handle balance as 0 if null
      const senderBalanceAmount = senderBalance.value.uiAmount ?? 0;
      if (senderBalanceAmount < amount) {
        throw new Error("Insufficient SPL token balance in sender's account");
      }

      console.log(
        `[INFO] Sender associated token account: ${senderTokenAccount.address.toBase58()} with balance: ${
          senderBalance.value.uiAmount
        }`
      );

      // Step 4: Prepare recipient's associated token account for SPL token
      const recipientPublicKey = new PublicKey(toAddress);
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        masterKeypair, // Master wallet is used to create the token account if it doesn't exist
        tokenMint,
        recipientPublicKey
      );
      console.log(
        `[INFO] Recipient associated token account: ${recipientTokenAccount.address.toBase58()}`
      );

      // Step 5: Create the SPL Token Transfer Instruction
      const transferInstruction = createTransferInstruction(
        senderTokenAccount.address, // Source (sender token account)
        recipientTokenAccount.address, // Destination (recipient)
        senderKeypair.publicKey, // Owner (sender signs for transfer)
        amountInLamports,
        [], // No multi-signers
        TOKEN_PROGRAM_ID
      );
      console.log(
        `[INFO] Transfer instruction created for ${amountInLamports} tokens`
      );

      // Step 6: Set up the transaction with a fresh blockhash before sending
      const transaction = new Transaction().add(transferInstruction);

      // Step 7: Fetch a fresh blockhash just before sending the transaction
      const {
        blockhash: freshBlockhash,
        lastValidBlockHeight: freshLastValidBlockHeight,
      } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = freshBlockhash;
      transaction.feePayer = masterKeypair.publicKey; // Master wallet pays the transaction fee
      console.log(
        `[INFO] Transaction blockhash set, fee payer is master wallet`
      );

      // Step 8: Sign the transaction with the sender and master wallet
      transaction.sign(senderKeypair); // Sender signs to authorize token transfer
      console.log(`[INFO] Sender has signed the transfer instruction`);

      transaction.partialSign(masterKeypair); // Master wallet signs for paying the fee
      console.log(`[INFO] Master wallet has signed for fee payment`);

      // Step 9: Serialize, send, and confirm the transaction
      const serializedTransaction = transaction.serialize();
      const signature = await this.connection.sendRawTransaction(
        serializedTransaction
      );
      console.log(`[INFO] Transaction sent with signature: ${signature}`);

      // Use TransactionConfirmationStrategy with the updated blockhash and height
      const confirmationStrategy: TransactionConfirmationStrategy = {
        signature,
        blockhash: freshBlockhash,
        lastValidBlockHeight: freshLastValidBlockHeight,
      };
      await this.connection.confirmTransaction(
        confirmationStrategy,
        "confirmed"
      );
      console.log(`[INFO] Transaction ${signature} confirmed`);

      // Update transaction status to completed
      await models.transaction.update(
        { status: "COMPLETED", trxId: signature },
        { where: { id: transactionId } }
      );
      console.log(
        `[INFO] Transaction ${transactionId} marked as COMPLETED in the database`
      );
    } catch (error) {
      console.error(
        `[ERROR] Failed to process SPL token withdrawal: ${error.message}`
      );
      // Mark transaction as failed and log the error
      await models.transaction.update(
        {
          status: "FAILED",
          description: `SPL token withdrawal failed: ${error.message}`,
        },
        { where: { id: transactionId } }
      );
      throw error;
    }
  }

  /**
   * Deploys a new SPL token on Solana.
   */
  public async deploySplToken(
    masterWallet: ecosystemMasterWalletAttributes,
    decimals: number
  ): Promise<string> {
    try {
      this.ensureChainActive();
      console.log(`[INFO] Chain is active. Starting SPL token deployment.`);

      if (!masterWallet.data) {
        console.error(`[ERROR] Master wallet data not found.`);
        throw new Error("Master wallet data not found");
      }

      console.log(`[INFO] Decrypting master wallet private key.`);
      const decryptedData = JSON.parse(decrypt(masterWallet.data));
      if (!decryptedData || !decryptedData.privateKey) {
        console.error(`[ERROR] Master wallet private key is missing.`);
        throw new Error("Master wallet private key is missing");
      }

      let masterKeypair: Keypair;
      const privateKeyBytes = Buffer.from(decryptedData.privateKey, "hex");

      if (privateKeyBytes.length === 64) {
        console.log(`[INFO] Using 64-byte private key format.`);
        masterKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyBytes));
      } else if (privateKeyBytes.length === 32) {
        console.log(`[INFO] Extending 32-byte private key to 64 bytes.`);
        const extendedKey = new Uint8Array(64);
        extendedKey.set(privateKeyBytes, 0);
        masterKeypair = Keypair.fromSecretKey(extendedKey);
      } else {
        console.error(
          `[ERROR] Invalid secret key length: ${privateKeyBytes.length} bytes.`
        );
        throw new Error("Invalid secret key length. Expected 32 or 64 bytes.");
      }

      console.log(
        `[INFO] Creating a new mint for the token with decimals: ${decimals}.`
      );
      const mint = await createMint(
        this.connection,
        masterKeypair,
        masterKeypair.publicKey, // Mint authority
        null, // Freeze authority (optional)
        decimals
      );

      console.log(
        `[INFO] Mint created successfully with address: ${mint.toBase58()}.`
      );
      return mint.toBase58(); // Return the mint address immediately to the frontend
    } catch (error) {
      logError("deploy_spl_token", error, __filename);
      console.error(`[ERROR] Failed to deploy SPL token: ${error.message}`);
      throw new Error("Failed to deploy SPL token: " + error.message);
    }
  }

  public async mintInitialSupply(
    masterWallet: ecosystemMasterWalletAttributes,
    mintAddress: string,
    initialSupply: number,
    decimals: number,
    initialHolder: string // Add initialHolder parameter
  ) {
    try {
      console.log(
        `[INFO] Starting background minting process for mint address: ${mintAddress}, targeting initial holder: ${initialHolder}.`
      );

      if (!masterWallet.data) {
        console.error(`[ERROR] Master wallet data not found.`);
        throw new Error("Master wallet data not found");
      }
      const decryptedData = JSON.parse(decrypt(masterWallet.data));
      if (!decryptedData || !decryptedData.privateKey) {
        throw new Error("Master wallet private key is missing");
      }

      let masterKeypair: Keypair;
      const privateKeyBytes = Buffer.from(decryptedData.privateKey, "hex");

      if (privateKeyBytes.length === 64) {
        masterKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyBytes));
      } else if (privateKeyBytes.length === 32) {
        const extendedKey = new Uint8Array(64);
        extendedKey.set(privateKeyBytes, 0);
        masterKeypair = Keypair.fromSecretKey(extendedKey);
      } else {
        throw new Error("Invalid secret key length. Expected 32 or 64 bytes.");
      }

      const mint = new PublicKey(mintAddress);
      const mintAmount = initialSupply * Math.pow(10, decimals);
      const initialHolderPubKey = new PublicKey(initialHolder); // Convert to PublicKey

      // Retry mechanism for associated token account creation
      let initialHolderAccount;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          console.log(
            `[INFO] Attempt ${attempt}: Getting or creating associated token account for the initial holder: ${initialHolder}.`
          );

          initialHolderAccount = await getOrCreateAssociatedTokenAccount(
            this.connection,
            masterKeypair,
            mint,
            initialHolderPubKey // Use initialHolderPubKey
          );

          console.log(
            `[INFO] Associated token account for initial holder created with address: ${initialHolderAccount.address.toBase58()}`
          );
          break;
        } catch (error) {
          console.error(
            `[ERROR] Attempt ${attempt} to create associated token account failed: ${error.message}`
          );
          if (attempt === 3) {
            throw new Error(
              "Failed to create associated token account after multiple attempts: " +
                error.message
            );
          }
        }
      }

      // Retry minting the initial supply with fresh blockhash if necessary
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          const { blockhash, lastValidBlockHeight } =
            await this.connection.getLatestBlockhash();
          console.log(
            `[INFO] Using blockhash ${blockhash} for minting transaction.`
          );

          console.log(
            `[INFO] Attempt ${attempt}: Minting ${mintAmount} tokens to ${initialHolderAccount.address.toBase58()}.`
          );

          const signature = await mintTo(
            this.connection,
            masterKeypair, // Payer
            mint, // Mint address
            initialHolderAccount.address, // Destination
            masterKeypair, // Mint authority
            mintAmount
          );

          console.log(
            `[INFO] Minting transaction signature: ${signature}. Confirming transaction.`
          );

          // Confirm transaction
          const confirmation = await this.connection.confirmTransaction(
            { signature, blockhash, lastValidBlockHeight },
            "confirmed"
          );

          if (confirmation.value.err) {
            throw new Error(
              `Transaction failed with error: ${confirmation.value.err}`
            );
          }

          console.log(
            `[SUCCESS] Initial supply minted successfully to ${initialHolderAccount.address.toBase58()}`
          );
          return; // Exit after successful minting
        } catch (error) {
          console.error(
            `[ERROR] Attempt ${attempt} to mint tokens failed: ${error.message}`
          );
          if (attempt === 3) {
            throw new Error(
              "Failed to mint initial supply after multiple attempts: " +
                error.message
            );
          }
        }
      }
    } catch (error) {
      logError("mint_initial_supply", error, __filename);
      console.error(`[ERROR] Background minting failed: ${error.message}`);
    }
  }
}

export default SolanaService;
