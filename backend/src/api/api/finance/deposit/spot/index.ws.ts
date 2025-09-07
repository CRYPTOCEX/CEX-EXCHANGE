import { Op } from "sequelize";
import ExchangeManager from "@b/utils/exchange";
import { messageBroker } from "@b/handler/Websocket";
import { createError } from "@b/utils/error";
import { processRewards } from "@b/utils/affiliate";
import { getUserById } from "@b/api/user/profile/utils";
import { sendSpotWalletDepositConfirmationEmail } from "@b/utils/emails";
import { models } from "@b/db";
import { updateTransaction } from "../../utils";
import { createNotification } from "@b/utils/notifications";
import { CacheManager } from "@b/utils/cache";
import {
  parseMetadataAndMapChainToXt,
  parseTransactionMetadata,
} from "./utils";

const path = "/api/finance/deposit/spot";
export const metadata = {};
export const spotVerificationIntervals: Map<string, NodeJS.Timeout> = new Map();

export default async (data: Handler, message) => {
  const { user } = data;

  if (!user?.id) throw createError(401, "Unauthorized");
  if (typeof message === "string") {
    message = JSON.parse(message);
  }

  const { trx } = message.payload;

  const transaction = (await models.transaction.findOne({
    where: { referenceId: trx, userId: user.id, type: "DEPOSIT" },
  })) as transactionAttributes;

  if (!transaction) {
    return sendMessage(message.payload, {
      status: 404,
      message: "Transaction not found",
    });
  }

  startSpotVerificationSchedule(transaction.id, user.id, trx);
};

const sendMessage = (payload, data) => {
  try {
    messageBroker.broadcastToSubscribedClients(path, payload, {
      stream: "verification",
      data: data,
    });
  } catch (error) {
    console.error(`Failed to send message: ${error}`);
  }
};

export function startSpotVerificationSchedule(
  transactionId: string,
  userId: string,
  trx: string
) {
  const payload = {
    trx,
  };
  // Clear any existing interval for this transaction (if any)
  const existingInterval = spotVerificationIntervals.get(transactionId);
  if (existingInterval) {
    clearInterval(existingInterval);
  }

  // Schedule the verifyTransaction function to run every 15 seconds
  const interval = setInterval(async () => {
    try {
      await verifyTransaction(userId, trx, payload);
    } catch (error) {
      console.error(`Error verifying transaction: ${error.message}`);
      stopVerificationSchedule(transactionId);
    }
  }, 15000);

  // Store the interval in the map
  spotVerificationIntervals.set(transactionId, interval);

  // Stop the verification schedule after 30 minutes
  setTimeout(() => {
    stopVerificationSchedule(transactionId);
  }, 1800000); // 30 minutes in milliseconds
}

export function stopVerificationSchedule(transactionId: string) {
  const interval = spotVerificationIntervals.get(transactionId);
  if (interval) {
    clearInterval(interval);
    spotVerificationIntervals.delete(transactionId);
  }
}

function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

function unescapeString(str) {
  return str.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

export async function verifyTransaction(
  userId: string,
  trx: string,
  payload: any
) {
  console.log(`[SPOT DEPOSIT] Starting verification for transaction ${trx} (User: ${userId})`);
  
  try {
    const transaction = await getTransactionQuery(userId, trx);

    if (!transaction) {
      console.error(`[SPOT DEPOSIT] Transaction not found for trx: ${trx}, userId: ${userId}`);
      throw new Error("Transaction not found");
    }

    const wallet = await models.wallet.findByPk(transaction.walletId);
    if (!wallet) {
      console.error(`[SPOT DEPOSIT] Wallet not found for transaction ${transaction.id}`);
      throw new Error("Wallet not found");
    }

    console.log(`[SPOT DEPOSIT] Processing transaction ${transaction.id} for currency ${wallet.currency}`);

    // Parse metadata and get chain information
    const { metadata, xtChain } = parseMetadataAndMapChainToXt(transaction.metadata);
    console.log(`[SPOT DEPOSIT] Parsed metadata:`, metadata);
    console.log(`[SPOT DEPOSIT] Chain: ${metadata.chain}, XT mapped chain: ${xtChain}`);

    if (transaction.status === "COMPLETED") {
      console.log(`[SPOT DEPOSIT] Transaction ${transaction.id} already completed`);
      sendMessage(payload, {
        status: 201,
        message: "Transaction already completed",
        transaction,
        balance: wallet.balance,
        currency: wallet.currency,
        chain: metadata.chain,
        method: "Wallet Transfer",
      });
      stopVerificationSchedule(transaction.id);
      return;
    }

    // Initialize exchange
    console.log(`[SPOT DEPOSIT] Initializing exchange connection...`);
    const exchange = await ExchangeManager.startExchange();
    if (!exchange) {
      console.error(`[SPOT DEPOSIT] Exchange instance not available - this could indicate missing exchange configuration`);
      
      // Check if any exchange provider is configured
      const activeProvider = await models.exchange.findOne({
        where: { status: true }
      });
      
      if (!activeProvider) {
        console.error(`[SPOT DEPOSIT] No active exchange provider found in database`);
        sendMessage(payload, {
          status: 500,
          message: "No exchange provider configured. Please configure an exchange provider in the admin panel.",
        });
        stopVerificationSchedule(transaction.id);
        return;
      }
      
      console.error(`[SPOT DEPOSIT] Exchange provider '${activeProvider.name}' is configured but connection failed`);
      sendMessage(payload, {
        status: 500,
        message: `Exchange connection failed. Please check ${activeProvider.name} API credentials.`,
      });
      stopVerificationSchedule(transaction.id);
      return;
    }
    
    const provider = await ExchangeManager.getProvider();
    if (!provider) {
      console.error(`[SPOT DEPOSIT] Provider name not available`);
      sendMessage(payload, {
        status: 500,
        message: "Exchange provider not available",
      });
      stopVerificationSchedule(transaction.id);
      return;
    }

    console.log(`[SPOT DEPOSIT] Using exchange provider: ${provider}`);

    try {
      const credentialsTest = await ExchangeManager.testExchangeCredentials(provider);
      if (!credentialsTest.status) {
        console.error(`[SPOT DEPOSIT] Exchange credentials test failed: ${credentialsTest.message}`);
        sendMessage(payload, {
          status: 500,
          message: `Exchange credentials invalid: ${credentialsTest.message}`,
        });
        stopVerificationSchedule(transaction.id);
        return;
      }
      console.log(`[SPOT DEPOSIT] Exchange credentials verified successfully`);
    } catch (error) {
      console.error(`[SPOT DEPOSIT] Error testing exchange credentials: ${error.message}`);
      // Continue with verification attempt but log the error
    }

    console.log(`[SPOT DEPOSIT] Fetching deposits for currency ${wallet.currency}...`);
    let deposits: any[] = []; // Initialize to an empty array
    try {
      if (exchange.has["fetchDeposits"]) {
        const params: Record<string, any> = {};

        // If the exchange is xt, pass the chain as `network`
        if (xtChain && provider === "xt") {
          params.chain = xtChain;
          console.log(`[SPOT DEPOSIT] Using XT chain parameter: ${xtChain}`);
        }
        // For KuCoin, we need to handle TRC20 properly
        else if (provider === "kucoin" && metadata.chain) {
          // KuCoin uses different network naming
          const kucoinChainMap = {
            'TRC20': 'TRX',
            'ERC20': 'ETH',
            'BEP20': 'BSC',
            'POLYGON': 'MATIC',
            'ARBITRUM': 'ARBITRUM',
            'OPTIMISM': 'OPTIMISM'
          };
          
          const kucoinChain = kucoinChainMap[metadata.chain] || metadata.chain;
          params.chain = kucoinChain;
          console.log(`[SPOT DEPOSIT] Using KuCoin chain parameter: ${kucoinChain} (original: ${metadata.chain})`);
        }

        // For KuCoin debugging - let's try multiple approaches
        if (provider === "kucoin") {
          console.log(`[SPOT DEPOSIT] KuCoin Debug - Testing different parameter combinations...`);
          
          // Try 1: With chain parameter
          console.log(`[SPOT DEPOSIT] KuCoin Try #1: With chain='TRX' parameter`);
          deposits = await exchange.fetchDeposits(
            wallet.currency,
            undefined,
            undefined,
            params
          );
          console.log(`[SPOT DEPOSIT] KuCoin Try #1 Result: ${deposits.length} deposits`);
          
          // If no results with chain, try without chain parameter
          if (deposits.length === 0) {
            console.log(`[SPOT DEPOSIT] KuCoin Try #2: Without chain parameter`);
            const depositsNoChain = await exchange.fetchDeposits(wallet.currency);
            console.log(`[SPOT DEPOSIT] KuCoin Try #2 Result: ${depositsNoChain.length} deposits`);
            
            if (depositsNoChain.length > 0) {
              deposits = depositsNoChain;
              console.log(`[SPOT DEPOSIT] KuCoin: Using results from Try #2 (no chain parameter)`);
            }
          }
          
          // If still no results, try fetching ALL deposits (no currency filter)
          if (deposits.length === 0) {
            console.log(`[SPOT DEPOSIT] KuCoin Try #3: Fetching ALL deposits (no currency filter)`);
            try {
              const allDeposits = await exchange.fetchDeposits();
              console.log(`[SPOT DEPOSIT] KuCoin Try #3 Result: ${allDeposits.length} total deposits`);
              
              if (allDeposits.length > 0) {
                // Filter for TRX deposits manually
                const trxDeposits = allDeposits.filter(d => d.currency === 'TRX');
                console.log(`[SPOT DEPOSIT] KuCoin Try #3: Found ${trxDeposits.length} TRX deposits out of ${allDeposits.length} total`);
                
                // Log sample of all deposits to see what's available
                console.log(`[SPOT DEPOSIT] KuCoin Sample of ALL deposits:`, allDeposits.slice(0, 5).map(d => ({
                  currency: d.currency,
                  amount: d.amount,
                  txid: d.txid,
                  status: d.status,
                  network: d.network,
                  timestamp: d.timestamp
                })));
                
                if (trxDeposits.length > 0) {
                  deposits = trxDeposits;
                  console.log(`[SPOT DEPOSIT] KuCoin: Using filtered TRX deposits`);
                }
              }
            } catch (allDepositsError) {
              console.error(`[SPOT DEPOSIT] KuCoin Try #3 Error:`, allDepositsError.message);
            }
          }
        } else {
          // For non-KuCoin exchanges, use normal approach
          deposits = await exchange.fetchDeposits(
            wallet.currency,
            undefined,
            undefined,
            params
          );
        }
        
        console.log(`[SPOT DEPOSIT] Found ${deposits.length} deposits using fetchDeposits with params:`, params);
        
        // Log first few deposits for debugging
        if (deposits.length > 0) {
          console.log(`[SPOT DEPOSIT] Sample deposits:`, deposits.slice(0, 3).map(d => ({
            txid: d.txid,
            amount: d.amount,
            currency: d.currency,
            status: d.status,
            timestamp: d.timestamp,
            network: d.network || 'N/A'
          })));
        } else {
          console.log(`[SPOT DEPOSIT] No deposits found. This could mean:`);
          console.log(`[SPOT DEPOSIT] 1. The deposit hasn't reached KuCoin yet`);
          console.log(`[SPOT DEPOSIT] 2. API permissions don't include deposit history`);
          console.log(`[SPOT DEPOSIT] 3. Different KuCoin account than expected`);
          console.log(`[SPOT DEPOSIT] 4. Deposit is too old (outside API time range)`);
          
          // Check account info to verify we're connected to the right account
          try {
            console.log(`[SPOT DEPOSIT] Checking KuCoin account info...`);
            const balance = await exchange.fetchBalance();
            console.log(`[SPOT DEPOSIT] Account has balances for currencies:`, Object.keys(balance).filter(k => balance[k].total > 0));
            
            // Check if TRX balance exists
            if (balance.TRX) {
              console.log(`[SPOT DEPOSIT] TRX Balance: total=${balance.TRX.total}, free=${balance.TRX.free}, used=${balance.TRX.used}`);
            } else {
              console.log(`[SPOT DEPOSIT] No TRX balance found in account`);
            }
          } catch (balanceError) {
            console.error(`[SPOT DEPOSIT] Error checking account balance:`, balanceError.message);
          }
        }
      } else if (exchange.has["fetchTransactions"]) {
        deposits = await exchange.fetchTransactions();
        console.log(`[SPOT DEPOSIT] Found ${deposits.length} transactions using fetchTransactions`);
      } else {
        console.error(`[SPOT DEPOSIT] Exchange ${provider} does not support fetchDeposits or fetchTransactions`);
        sendMessage(payload, {
          status: 500,
          message: `Exchange ${provider} does not support deposit verification`,
        });
        stopVerificationSchedule(transaction.id);
        return;
      }
    } catch (error) {
      console.error(`[SPOT DEPOSIT] Error fetching deposits or transactions: ${error.message}`);
      console.error(`[SPOT DEPOSIT] Full error details:`, error);
      // Check if this is a credential or network error that should stop verification
      if (error.name === 'AuthenticationError' || error.name === 'PermissionDenied') {
        sendMessage(payload, {
          status: 500,
          message: `Exchange authentication failed: ${error.message}`,
        });
        stopVerificationSchedule(transaction.id);
        return;
      }
      // For other errors, just continue (might be temporary)
      return;
    }

    console.log(`[SPOT DEPOSIT] Searching for transaction ${trx} in ${deposits.length} deposits...`);
    let deposit;
    if (provider === "binance") {
      deposit = deposits.find((d) => {
        // Parse txid if it's from Binance and contains "Off-chain transfer"
        const parsedTxid = parseBinanceTxid(d.txid);
        const matches = parsedTxid === transaction.referenceId;
        if (matches) {
          console.log(`[SPOT DEPOSIT] Found matching Binance deposit: ${d.txid} (parsed: ${parsedTxid})`);
        }
        return matches;
      });
    } else {
      // For other providers, use the txid as is
      deposit = deposits.find((d) => {
        const matches = d.txid === transaction.referenceId;
        if (matches) {
          console.log(`[SPOT DEPOSIT] Found matching deposit: ${d.txid}`);
        }
        return matches;
      });
    }

    if (!deposit) {
      console.log(`[SPOT DEPOSIT] Transaction ${trx} not found in exchange deposits yet`);
      return;
    }

    console.log(`[SPOT DEPOSIT] Found deposit with status: ${deposit.status}, amount: ${deposit.amount}`);

    if (deposit.status !== "ok") {
      console.log(`[SPOT DEPOSIT] Deposit status is not 'ok': ${deposit.status}`);
      return;
    }

    const amount = deposit.amount;
    const fee = deposit.fee?.cost || 0;

    console.log(`[SPOT DEPOSIT] Processing deposit: amount=${amount}, fee=${fee}, currency=${deposit.currency || wallet.currency}`);

    if (
      ["kucoin", "binance", "okx", "xt"].includes(provider) &&
      wallet.currency !== deposit.currency
    ) {
      console.error(`[SPOT DEPOSIT] Currency mismatch: wallet=${wallet.currency}, deposit=${deposit.currency}`);
      sendMessage(payload, {
        status: 400,
        message: "Invalid deposit currency",
      });
      stopVerificationSchedule(transaction.id);
      await deleteTransaction(transaction.id);
      return;
    }

    const cacheManager = CacheManager.getInstance();
    const settings = await cacheManager.getSettings();
    if (
      settings.has("depositExpiration") &&
      settings.get("depositExpiration") === "true"
    ) {
      const createdAt = deposit.timestamp / 1000;
      const transactionCreatedAt = transaction.createdAt
        ? new Date(transaction.createdAt).getTime() / 1000
        : 0;
      const currentTime = Date.now() / 1000;
      const timeDiff = (currentTime - createdAt) / 60; // Difference in minutes

      if (
        createdAt < transactionCreatedAt - 900 ||
        createdAt > transactionCreatedAt + 900 ||
        timeDiff > 45
      ) {
        console.log(`[SPOT DEPOSIT] Deposit expired: createdAt=${createdAt}, transactionCreatedAt=${transactionCreatedAt}, timeDiff=${timeDiff} minutes`);
        sendMessage(payload, {
          status: 400,
          message: "Deposit expired",
        });
        stopVerificationSchedule(transaction.id);
        await updateTransaction(transaction.id, {
          status: "TIMEOUT",
          description: "Deposit expired. Please try again.",
          amount: amount,
        });
        return;
      }
    }

    // Generalized function to parse txid if it includes text like "Off-chain transfer" in different languages
    function parseBinanceTxid(txid: string) {
      const offChainTransferPatterns = [
        /off-?chain transfer\s+(\w+)/i,
        /офчейн\s+перевод\s+(\w+)/i,
        /transferência\s+off-chain\s+(\w+)/i,
        /transferencia\s+off-chain\s+(\w+)/i,
      ];
      for (const pattern of offChainTransferPatterns) {
        const match = txid.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      return txid;
    }

    console.log(`[SPOT DEPOSIT] Updating transaction ${transaction.id} to COMPLETED`);
    const updatedTransaction = await updateTransaction(transaction.id, {
      status: "COMPLETED",
      description: `Deposit of ${amount} ${wallet.currency} to wallet`,
      amount: amount,
      fee: fee,
    });

    console.log(`[SPOT DEPOSIT] Updating wallet balance for user ${userId}`);
    const updatedWallet = (await updateSpotWalletBalance(
      userId,
      wallet.currency,
      amount,
      fee,
      "DEPOSIT"
    )) as walletAttributes;

    if (!updatedWallet) {
      console.error(`[SPOT DEPOSIT] Failed to update wallet balance`);
      sendMessage(payload, {
        status: 500,
        message: "Failed to update wallet balance",
      });
      stopVerificationSchedule(updatedTransaction.id);
      return;
    }

    if (provider === "kucoin") {
      try {
        await exchange.transfer(wallet.currency, deposit.amount, "main", "trade");
        console.log(`[SPOT DEPOSIT] Completed KuCoin transfer from main to trade account`);
      } catch (error) {
        console.error(`[SPOT DEPOSIT] Transfer failed: ${error.message}`);
      }
    }

    const userData = await getUserById(userId);
    try {
      await sendSpotWalletDepositConfirmationEmail(
        userData,
        updatedTransaction,
        updatedWallet,
        metadata.chain
      );
      await createNotification({
        userId: userId,
        relatedId: updatedTransaction.id,
        type: "system",
        title: "Deposit Confirmation",
        message: `Your deposit of ${amount} ${wallet.currency} has been confirmed.`,
        link: `/finance/wallet/deposit/${updatedTransaction.id}`,
        actions: [
          {
            label: "View Deposit",
            link: `/finance/wallet/deposit/${updatedTransaction.id}`,
            primary: true,
          },
        ],
      });
      console.log(`[SPOT DEPOSIT] Sent confirmation email and notification`);
    } catch (error) {
      console.error(`[SPOT DEPOSIT] Deposit confirmation email failed: ${error.message}`);
    }

    try {
      await processRewards(userData.id, amount, "WELCOME_BONUS", wallet.currency);
      console.log(`[SPOT DEPOSIT] Processed welcome bonus rewards`);
    } catch (error) {
      console.error(`[SPOT DEPOSIT] Error processing rewards: ${error.message}`);
    }

    console.log(`[SPOT DEPOSIT] Successfully completed deposit ${trx} for user ${userId}`);
    sendMessage(payload, {
      status: 200,
      message: "Transaction completed",
      transaction: updatedTransaction,
      balance: updatedWallet.balance,
      currency: updatedWallet.currency,
      chain: metadata.chain,
      method: "Wallet Transfer",
    });
    stopVerificationSchedule(updatedTransaction.id);
  } catch (error) {
    console.error(`[SPOT DEPOSIT] Error in verifyTransaction: ${error.message}`, error);
    // Send error message to client
    sendMessage(payload, {
      status: 500,
      message: `Verification error: ${error.message}`,
    });
    throw error; // Re-throw to be caught by the interval handler
  }
}

function normalizeTransactionReference(reference: string) {
  const lowerCaseReference = reference.toLowerCase().trim();
  const offChainPatterns = [
    "off-chain transfer",
    "offchain transfer",
    "transferencia fuera de cadena",
  ];
  for (const pattern of offChainPatterns) {
    if (lowerCaseReference.includes(pattern)) {
      return "off-chain transfer";
    }
  }
  return reference;
}

export async function getTransactionQuery(userId: string, trx: string) {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const transaction = await models.transaction.findOne({
    where: {
      referenceId: trx,
      userId: userId,
      type: "DEPOSIT",
      createdAt: { [Op.gte]: thirtyMinutesAgo },
    },
    include: [
      {
        model: models.wallet,
        as: "wallet",
        attributes: ["id", "currency"],
      },
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });
  if (!transaction) {
    throw new Error("Transaction not found");
  }
  return transaction.get({ plain: true }) as unknown as transactionAttributes;
}

export async function deleteTransaction(id: string) {
  await models.transaction.destroy({
    where: { id },
  });
}

export async function updateSpotWalletBalance(
  userId: string,
  currency: string,
  amount: number,
  fee: number,
  type: "DEPOSIT" | "WITHDRAWAL" | "REFUND_WITHDRAWAL"
) {
  const wallet = await models.wallet.findOne({
    where: { userId: userId, currency: currency, type: "SPOT" },
  });
  if (!wallet) {
    return new Error("Wallet not found");
  }
  let balance;
  switch (type) {
    case "WITHDRAWAL":
      balance = wallet.balance - (amount + fee);
      break;
    case "DEPOSIT":
      balance = wallet.balance + (amount - fee);
      break;
    case "REFUND_WITHDRAWAL":
      balance = wallet.balance + amount + fee;
      break;
    default:
      break;
  }
  if (balance < 0) {
    throw new Error("Insufficient balance");
  }
  await models.wallet.update(
    { balance: balance },
    { where: { id: wallet.id } }
  );
  const updatedWallet = await models.wallet.findByPk(wallet.id);
  if (!updatedWallet) {
    throw new Error("Wallet not found");
  }
  return updatedWallet.get({ plain: true });
}
