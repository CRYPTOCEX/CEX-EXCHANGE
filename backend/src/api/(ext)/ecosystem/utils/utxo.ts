import * as assert from "assert";
import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";
import WebSocket from "ws";
import {
  dashNetwork,
  dogecoinNetwork,
  litecoinNetwork,
  satoshiToStandardUnit,
  standardUnitToSatoshi,
} from "./blockchain";
import { models, sequelize } from "@b/db";
import { Transaction } from "sequelize";
import { decrypt } from "../../../../utils/encrypt";
import { getMasterWalletByChain } from "./wallet";
import { getUTXOProvider } from "./utxo/providers/UTXOProviderFactory";
import { logger } from "@b/utils/console";

class TransactionBroadcastedError extends Error {
  txid: string;
  constructor(message: string, txid: string) {
    super(message);
    this.name = "TransactionBroadcastedError";
    this.txid = txid;
  }
}

const BTC_NETWORK = process.env.BTC_NETWORK || "mainnet";
const BLOCKCYPHER_TOKEN = process.env.BLOCKCYPHER_TOKEN;
const BTC_NODE = process.env.BTC_NODE || "blockcypher";
const LTC_NODE = process.env.LTC_NODE || "blockcypher";
const DOGE_NODE = process.env.DOGE_NODE || "blockcypher";
const DASH_NODE = process.env.DASH_NODE || "blockcypher";
const wsConnections = new Map();

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

function getUtxoNetwork(chain) {
  switch (chain) {
    case "BTC":
      return BTC_NETWORK === "mainnet"
        ? bitcoin.networks.bitcoin
        : bitcoin.networks.testnet;
    case "LTC":
      return litecoinNetwork;
    case "DOGE":
      return dogecoinNetwork;
    case "DASH":
      return dashNetwork;
    default:
      throw new Error(`Unsupported UTXO chain: ${chain}`);
  }
}

const getUtxoProvider = (chain) => {
  switch (chain) {
    case "BTC":
      return BTC_NODE;
    case "LTC":
      return LTC_NODE;
    case "DOGE":
      return DOGE_NODE;
    case "DASH":
      return DASH_NODE;
    default:
      return "blockcypher";
  }
};

const providers = {
  haskoin: {
    BTC: `https://api.haskoin.com/btc${
      BTC_NETWORK === "mainnet" ? "" : "test"
    }`,
  },
  blockcypher: {
    BTC: `https://api.blockcypher.com/v1/btc/${
      BTC_NETWORK === "mainnet" ? "main" : "test3"
    }`,
    LTC: "https://api.blockcypher.com/v1/ltc/main",
    DASH: "https://api.blockcypher.com/v1/dash/main",
    DOGE: "https://api.blockcypher.com/v1/doge/main",
  },
};

export const watchAddressBlockCypher = (chain, address, callback) => {
  const network =
    chain === "BTC" ? (BTC_NETWORK === "mainnet" ? "main" : "test3") : "main";
  const ws = new WebSocket(
    `wss://socket.blockcypher.com/v1/${chain.toLowerCase()}/${network}?token=${BLOCKCYPHER_TOKEN}`
  );

  ws.on("open", function open() {
    ws.send(JSON.stringify({ event: "unconfirmed-tx", address: address }));
  });

  ws.on("message", function incoming(data) {
    const messageString = data.toString();
    const message = JSON.parse(messageString);

    if (message && message.hash) {
      callback(message);
      cancelWatchAddress(chain, address); // Close the WebSocket after receiving the transaction
    }
  });

  ws.on("close", function close() {
    logger.info("UTXO", `WebSocket disconnected from ${chain} address: ${address}`);
  });

  ws.on("error", function error(err) {
    logger.error("UTXO", "Watch address error", err);
  });

  const wsKey = `${chain}_${address.toLowerCase()}`;
  wsConnections.set(wsKey, ws);
};

export const cancelWatchAddress = (chain, address) => {
  const wsKey = `${chain}_${address.toLowerCase()}`;
  const ws = wsConnections.get(wsKey);

  if (ws) {
    try {
      ws.close();
      logger.info("UTXO", `WebSocket for ${chain} address ${address} has been successfully closed.`);
    } catch (error) {
      logger.error("UTXO", "Cancel watch address error", error);
    } finally {
      wsConnections.delete(wsKey);
    }
  } else {
    logger.info("UTXO", `No active WebSocket found for ${chain} address ${address}.`);
  }
};

export async function createTransactionDetailsForUTXO(
  id,
  transaction,
  address,
  chain
) {
  const txHash = transaction.hash;

  const inputs = transaction.inputs.map((input) => ({
    prevHash: input.prev_hash,
    outputIndex: input.output_index,
    value: satoshiToStandardUnit(input.output_value, chain),
    addresses: input.addresses,
    script: input.script,
  }));

  const outputs = transaction.outputs
    .filter((output) => output.addresses.includes(address))
    .map((output) => ({
      value: satoshiToStandardUnit(output.value, chain),
      addresses: output.addresses,
      script: output.script,
    }));

  const amount = outputs.reduce((acc, output) => acc + output.value, 0);

  const txDetails = {
    id,
    address,
    chain,
    hash: txHash,
    from: inputs.map((input) => input.addresses).flat(),
    to: outputs.map((output) => output.addresses).flat(),
    amount,
    inputs,
    outputs,
  };

  return txDetails;
}

export async function recordUTXO(
  walletId,
  transactionId,
  index,
  amount,
  script,
  status
) {
  await models.ecosystemUtxo.create({
    walletId: walletId,
    transactionId: transactionId,
    index: index,
    amount: amount,
    script: script,
    status: status,
  });
}

const constructApiUrl = (
  chain,
  operation,
  address = "",
  txHash = "",
  provider = ""
) => {
  if (provider === "") provider = getUtxoProvider(chain);

  switch (provider) {
    case "haskoin": {
      const haskoinBaseURL = providers.haskoin[chain];
      switch (operation) {
        case "fetchBalance":
          return `${haskoinBaseURL}/address/${address}/balance`;
        case "fetchTransactions":
          return `${haskoinBaseURL}/address/${address}/transactions/full`;
        case "fetchTransaction":
          return `${haskoinBaseURL}/transaction/${txHash}`;
        case "fetchRawTransaction":
          return `${haskoinBaseURL}/transaction/${txHash}/raw`;
        case "broadcastTransaction":
          return `${haskoinBaseURL}/transactions/full`;
        default:
          throw new Error(`Unsupported operation for Haskoin: ${operation}`);
      }
    }
    case "blockcypher":
    default: {
      const blockcypherBaseURL = providers.blockcypher[chain];
      switch (operation) {
        case "fetchBalance":
          return `${blockcypherBaseURL}/addrs/${address}/balance`;
        case "fetchTransactions":
          return `${blockcypherBaseURL}/addrs/${address}`;
        case "fetchTransaction":
          return `${blockcypherBaseURL}/txs/${txHash}`;
        case "fetchRawTransaction":
          return `${blockcypherBaseURL}/txs/${txHash}?includeHex=true`;
        case "broadcastTransaction":
          return `${blockcypherBaseURL}/txs/push`;
        default:
          throw new Error(
            `Unsupported operation for BlockCypher: ${operation}`
          );
      }
    }
  }
};

const fetchFromApi = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response structure");
    }
    return data;
  } catch (error) {
    logger.error("UTXO", "Fetch from API error", error);
    throw error;
  }
};

export const createUTXOWallet = (chain) => {
  const network = getUtxoNetwork(chain);
  if (!network) {
    throw new Error(`Unsupported UTXO chain: ${chain}`);
  }

  const keyPair = ECPair.makeRandom({ network });
  const { address } = bitcoin.payments.p2pkh({
    pubkey: keyPair.publicKey,
    network,
  });

  if (chain === "BTC" && network === bitcoin.networks.testnet) {
    assert.strictEqual(
      address!.startsWith("m") || address!.startsWith("n"),
      true
    );
  }

  const privateKey = keyPair.toWIF();

  return {
    address,
    data: {
      privateKey,
    },
  };
};

export const fetchUTXOTransactions = async (chain, address) => {
  try {
    const provider = await getUTXOProvider(chain);
    logger.info("UTXO", `Using ${provider.getName()} for fetching transactions`);
    return await provider.fetchTransactions(address);
  } catch (error) {
    logger.error("UTXO", "Fetch transactions error", error);
    return [];
  }
};

export const fetchUTXOWalletBalance = async (chain, address) => {
  try {
    const provider = await getUTXOProvider(chain);
    const balanceSatoshis = await provider.getBalance(address);
    return satoshiToStandardUnit(balanceSatoshis, chain);
  } catch (error) {
    logger.error("UTXO", "Fetch wallet balance error", error);
    return 0;
  }
};

export const fetchRawUtxoTransaction = async (txHash, chain) => {
  try {
    const provider = await getUTXOProvider(chain);
    return await provider.fetchRawTransaction(txHash);
  } catch (error) {
    logger.error("UTXO", "Fetch raw transaction error", error);
    throw error;
  }
};

export const fetchUtxoTransaction = async (txHash, chain) => {
  try {
    const provider = await getUTXOProvider(chain);
    return await provider.fetchTransaction(txHash);
  } catch (error) {
    logger.error("UTXO", "Fetch transaction error", error);
    return null;
  }
};

function formatTransactionData(data, provider) {
  switch (provider) {
    case "haskoin":
      return {
        hash: data.txid,
        block_height: data.block?.height,
        inputs: data.inputs,
        outputs: data.outputs.map((output) => ({
          addresses: [output.addresses],
          script: output.pkscript,
          value: output.value,
          spent: output.spent,
          spender: output.spender,
        })),
      };

    case "blockcypher":
    default:
      return {
        hash: data.hash,
        block_height: data.block_height,
        inputs: data.inputs,
        outputs: data.outputs.map((output) => ({
          addresses: output.addresses,
          script: output.script,
          value: output.value,
          spender: output.spent_by,
        })),
      };
  }
}

export const verifyUTXOTransaction = async (chain, txHash) => {
  const url = constructApiUrl(chain, "fetchTransaction", "", txHash);

  const startTime = Date.now();
  const maxDuration = 1800 * 1000; // 30 minutes in milliseconds
  const retryInterval = 30 * 1000; // 30 seconds in milliseconds
  const provider = getUtxoProvider(chain);

  while (Date.now() - startTime < maxDuration) {
    try {
      const txData: any = await fetchFromApi(url);
      let confirmed: boolean = false;
      let fee: number = 0;

      switch (provider) {
        case "haskoin":
          confirmed = !!txData.block;
          fee = txData.fee;
          break;
        case "blockcypher":
        default:
          confirmed = txData.confirmations >= 1;
          fee = txData.fee ? satoshiToStandardUnit(txData.fee, chain) : 0;
          break;
      }

      if (confirmed) {
        return { confirmed, fee };
      }
    } catch (error) {
      logger.error("UTXO", "Verify transaction error", error);
    }
    await new Promise((resolve) => setTimeout(resolve, retryInterval));
  }

  return { confirmed: false, fee: 0 };
};

export const broadcastRawUtxoTransaction = async (rawTxHex, chain) => {
  if (!rawTxHex) {
    logger.error("UTXO", "Error broadcasting transaction: No transaction data provided");
    return {
      success: false,
      error: "No transaction data provided",
      txid: null,
    };
  }

  try {
    const provider = await getUTXOProvider(chain);
    logger.info("UTXO", `Broadcasting transaction using ${provider.getName()}`);
    return await provider.broadcastTransaction(rawTxHex);
  } catch (error) {
    logger.error("UTXO", "Broadcast transaction error", error);
    return { success: false, error: error.message, txid: null };
  }
};

export const calculateUTXOFee = async (toAddress, amount, chain) => {
  const feeRatePerByte = await getCurrentUtxoFeeRatePerByte(chain);
  if (!feeRatePerByte) {
    throw new Error("Failed to fetch current fee rate");
  }

  const inputs: { transactionId: string; index: number; amount: number }[] = [];
  const outputs: { toAddress: string; amount: number }[] = [];
  let totalInputValue = 0;

  const utxos = await models.ecosystemUtxo.findAll({
    where: { status: false },
    order: [["amount", "DESC"]],
  });
  if (utxos.length === 0) throw new Error("No UTXOs available for withdrawal");

  for (const utxo of utxos) {
    inputs.push(utxo);
    totalInputValue += utxo.amount;
    if (totalInputValue >= amount) {
      break;
    }
  }

  outputs.push({ toAddress, amount });

  const estimatedTxSize = inputs.length * 180 + outputs.length * 34 + 10;
  const transactionFee = estimatedTxSize * feeRatePerByte;

  return transactionFee;
};

export async function getCurrentUtxoFeeRatePerByte(chain) {
  try {
    const provider = await getUTXOProvider(chain);
    return await provider.getFeeRate();
  } catch (error) {
    logger.error("UTXO", "Get fee rate error", error);
    return 1; // Default 1 sat/byte
  }
}

export async function handleUTXOWithdrawal(transaction: transactionAttributes) {
  const metadata =
    typeof transaction.metadata === "string"
      ? JSON.parse(transaction.metadata)
      : transaction.metadata;
  const chain = metadata.chain;
  const toAddress = metadata.toAddress;
  const amountToSend = standardUnitToSatoshi(transaction.amount, chain);
  const flatFee = standardUnitToSatoshi(transaction.fee, chain);

  const wallet = await models.wallet.findByPk(transaction.walletId);
  if (!wallet) throw new Error("Wallet not found");

  // Pre-flight check: validate withdrawal is economical before proceeding
  const validationResult = await calculateMinimumWithdrawal(
    wallet.id,
    chain,
    transaction.amount
  );

  if (!validationResult.isEconomical) {
    logger.warn("UTXO", `Withdrawal validation failed: ${JSON.stringify(validationResult)}`);

    // Check if we should auto-consolidate
    const shouldConsolidate = await shouldAutoConsolidateUTXOs(wallet.id, chain);

    if (shouldConsolidate.shouldConsolidate) {
      logger.info("UTXO", `Auto consolidation triggered for wallet ${wallet.id}, chain ${chain}: ${shouldConsolidate.reason}`);

      // Attempt automatic consolidation
      const consolidationResult = await consolidateUTXOs(
        wallet.id,
        chain,
        10 // Higher max fee rate for urgent consolidation (10 sat/byte)
      );

      if (consolidationResult.success) {
        logger.success("UTXO", `Auto consolidation success: ${consolidationResult.message}`);
        logger.info("UTXO", `Waiting for consolidation transaction to confirm...`);

        // Wait for consolidation transaction to confirm before proceeding
        const confirmationResult = await verifyUTXOTransaction(chain, consolidationResult.txid!);

        if (!confirmationResult.confirmed) {
          throw new Error(`Consolidation transaction ${consolidationResult.txid} failed to confirm within 30 minutes. Please try withdrawal again later.`);
        }

        logger.success("UTXO", `Auto consolidation transaction confirmed. Fee: ${confirmationResult.fee} ${chain}`);

        // Re-validate after consolidation
        const revalidationResult = await calculateMinimumWithdrawal(
          wallet.id,
          chain,
          transaction.amount
        );

        if (!revalidationResult.isEconomical) {
          throw new Error(`Even after consolidation: ${revalidationResult.reason}`);
        }

        logger.info("UTXO", `After consolidation: withdrawal now requires ${revalidationResult.utxoCount} UTXOs`);
      } else {
        logger.warn("UTXO", `Auto consolidation failed: ${consolidationResult.message}`);
        throw new Error(`${validationResult.reason}. Consolidation attempt failed: ${consolidationResult.message}`);
      }
    } else {
      throw new Error(validationResult.reason);
    }
  } else {
    logger.info("UTXO", `Withdrawal validation passed: requires ${validationResult.utxoCount} UTXOs`);
  }

  const masterWallet = (await getMasterWalletByChain(
    chain
  )) as unknown as EcosystemMasterWallet;
  if (!masterWallet) throw new Error(`Master wallet not found for ${chain}`);

  const network = getUtxoNetwork(chain);
  if (!network) throw new Error(`Unsupported UTXO chain: ${chain}`);

  const currentFeeRatePerByte = await getCurrentUtxoFeeRatePerByte(chain);

  if (!currentFeeRatePerByte) {
    throw new Error("Failed to fetch current fee rate");
  }

  const dustThreshold = getDustThreshold(chain);

  if (amountToSend < dustThreshold) {
    throw new Error(
      `Amount to send (${amountToSend} satoshis) is below the dust threshold of ${dustThreshold} satoshis.`
    );
  }

  // Retry mechanism
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    // Use database transaction with row-level locking to prevent race conditions
    // This ensures that when multiple withdrawals happen simultaneously,
    // each one gets exclusive access to UTXOs
    const dbTransaction = await sequelize.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });

    try {
      // Lock UTXOs for this transaction using FOR UPDATE
      // This prevents other concurrent withdrawals from using the same UTXOs
      const utxos = await models.ecosystemUtxo.findAll({
        where: { status: false, walletId: wallet.id },
        order: [["amount", "DESC"]],
        lock: Transaction.LOCK.UPDATE, // Row-level lock
        transaction: dbTransaction,
      });

      if (utxos.length === 0) {
        await dbTransaction.rollback();
        throw new Error("No UTXOs available for withdrawal");
      }

      try {
        const { success, txid } = await createAndBroadcastTransaction(
          utxos,
          wallet,
          transaction,
          amountToSend,
          flatFee,
          currentFeeRatePerByte,
          dustThreshold,
          chain,
          network,
          toAddress,
          dbTransaction // Pass transaction to mark UTXOs within same transaction
        );

        if (success) {
          // Commit the database transaction (UTXOs are now marked as spent)
          await dbTransaction.commit();

          // Update transaction status
          await models.transaction.update(
            {
              status: "COMPLETED",
              description: `Withdrawal of ${transaction.amount} ${wallet.currency} to ${toAddress}`,
              trxId: txid,
            },
            {
              where: { id: transaction.id },
            }
          );
          return { success: true, txid };
        } else {
          await dbTransaction.rollback();
          throw new Error("Transaction failed without specific error");
        }
      } catch (error) {
        // Always rollback on error
        await dbTransaction.rollback();

        if (error instanceof TransactionBroadcastedError) {
          // Transaction was broadcasted; update status and exit
          await models.transaction.update(
            {
              status: "COMPLETED",
              description: `Withdrawal of ${transaction.amount} ${wallet.currency} to ${toAddress}`,
              trxId: error.txid,
            },
            {
              where: { id: transaction.id },
            }
          );
          // Optionally log the error
          logger.error("UTXO", "Post-broadcast error", error);
          return { success: true, txid: error.txid };
        } else if (
          error.message.includes("already been spent") ||
          error.message.includes("Missing inputs") ||
          error.message.includes("bad-txns-inputs-spent")
        ) {
          // Identify and mark the spent UTXOs
          await markSpentUtxosFromError(error, chain, wallet.id);

          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error(
              `Failed to broadcast transaction after ${maxRetries} attempts due to spent UTXOs.`
            );
          }
          // Retry after marking spent UTXOs
          continue;
        } else {
          // For other errors, throw immediately
          throw new Error(`Failed to broadcast transaction: ${error.message}`);
        }
      }
    } catch (outerError) {
      // Handle errors from UTXO fetching
      if (outerError.message === "No UTXOs available for withdrawal") {
        throw outerError;
      }
      // For unexpected errors, rollback and rethrow
      throw outerError;
    }
  }
}

async function createAndBroadcastTransaction(
  utxos,
  wallet,
  transaction,
  amountToSend,
  flatFee,
  currentFeeRatePerByte,
  dustThreshold,
  chain,
  network,
  toAddress,
  dbTransaction?: Transaction // Optional database transaction for UTXO locking
) {
  const psbt = new bitcoin.Psbt({ network });
  let totalInputValue = 0;
  const keyPairs: { index: number; keyPair: any }[] = [];

  // Gather inputs until we have enough to cover the amount plus fees
  for (const utxo of utxos) {
    const walletData = (await models.walletData.findOne({
      where: { walletId: utxo.walletId },
    })) as unknown as WalletData;
    if (!walletData) continue;

    const decryptedData = JSON.parse(decrypt(walletData.data));
    if (!decryptedData.privateKey) continue;

    const rawTxHex = await fetchRawUtxoTransaction(utxo.transactionId, chain);
    psbt.addInput({
      hash: utxo.transactionId,
      index: utxo.index,
      nonWitnessUtxo: Buffer.from(rawTxHex, "hex"),
    });
    // Convert UTXO amount from standard units to satoshis
    const utxoAmountInSatoshis = standardUnitToSatoshi(utxo.amount, chain);
    totalInputValue += utxoAmountInSatoshis;

    const keyPair = ECPair.fromWIF(decryptedData.privateKey, network);
    keyPairs.push({ index: psbt.inputCount - 1, keyPair });

    // Estimate transaction size
    const numInputs = psbt.inputCount;
    const numOutputs = 2; // Assume two outputs: recipient and change
    const estimatedTxSize = numInputs * 180 + numOutputs * 34 + 10;

    // Calculate transaction fee
    let transactionFee = Math.ceil(estimatedTxSize * currentFeeRatePerByte);

    // Calculate required amount
    // Note: flatFee is already deducted from user balance in index.post.ts
    // We only need amountToSend (what user wants to send) + network fee
    let requiredAmount = amountToSend + transactionFee;
    let change = totalInputValue - requiredAmount;

    logger.debug("UTXO", `Input #${psbt.inputCount}: utxo=${utxoAmountInSatoshis}, total=${totalInputValue}, amount=${amountToSend}, fee=${transactionFee}, required=${requiredAmount}, change=${change}`);

    // Check if change is dust
    const isChangeDust = change > 0 && change < dustThreshold;

    if (isChangeDust) {
      logger.debug("UTXO", `Change is dust (${change} < ${dustThreshold}), adding to fee`);
      transactionFee += change;
      requiredAmount += change;
      change = 0;
    }

    // Recalculate after adjustments
    requiredAmount = amountToSend + transactionFee;
    change = totalInputValue - requiredAmount;

    logger.debug("UTXO", `After dust adjustment: required=${requiredAmount}, change=${change}, hasEnough=${totalInputValue >= requiredAmount}`);

    if (totalInputValue >= requiredAmount) {
      // We have enough inputs
      // Build transaction outputs
      const outputs: { address: string; value: bigint }[] = [];

      // Recipient output
      outputs.push({
        address: toAddress,
        value: BigInt(amountToSend),
      });

      // Change output if applicable
      if (change > 0) {
        outputs.push({
          address: getChangeAddress(wallet, chain),
          value: BigInt(change),
        });
      }

      // Add outputs to PSBT
      outputs.forEach((output) => {
        psbt.addOutput(output);
      });

      // Sign inputs
      keyPairs.forEach(({ index, keyPair }) => {
        psbt.signInput(index, keyPair);
      });

      psbt.finalizeAllInputs();

      const rawTx = psbt.extractTransaction().toHex();
      const broadcastResult = await broadcastRawUtxoTransaction(rawTx, chain);

      if (!broadcastResult.success) {
        throw new Error(
          `Failed to broadcast transaction: ${broadcastResult.error}`
        );
      }

      if (broadcastResult.success) {
        const txid = broadcastResult.txid;

        try {
          // Handle change output and mark used UTXOs
          if (change > 0) {
            await recordChangeUtxo(txid, change, wallet, chain, dbTransaction);
          }
          await markUsedUtxos(psbt, utxos, dbTransaction);

          return { success: true, txid };
        } catch (postBroadcastError) {
          // Log the error but return success
          logger.error("UTXO", "Post-broadcast error", postBroadcastError);
          return { success: true, txid };
        }
      } else {
        throw new Error(
          `Failed to broadcast transaction: ${broadcastResult.error}`
        );
      }
    }
  }

  throw new Error("Insufficient funds to cover the amount and transaction fee");
}

function getChangeAddress(wallet, chain): string {
  const walletAddresses =
    typeof wallet.address === "string"
      ? JSON.parse(wallet.address)
      : (wallet.address as unknown as Record<string, { address: string }>);
  if (!walletAddresses) throw new Error("Wallet addresses not found");
  if (!walletAddresses?.[chain])
    throw new Error("Wallet address chain not found");
  if (!walletAddresses?.[chain]?.address)
    throw new Error("Wallet address not found");
  return walletAddresses[chain].address;
}

async function markUsedUtxos(psbt, utxos, dbTransaction?: Transaction) {
  if (!psbt || !utxos) {
    logger.error("UTXO", "Cannot mark used UTXOs: psbt or utxos is undefined");
    return;
  }

  for (let i = 0; i < psbt.inputCount; i++) {
    const input = psbt.txInputs[i];
    if (!input || !input.hash || input.index === undefined) {
      logger.error("UTXO", `Input at index ${i} is undefined or missing properties`);
      continue;
    }

    const txid = Buffer.from(input.hash).reverse().toString("hex");
    const index = input.index;

    // Find the UTXO in the list
    const utxo = utxos.find(
      (u) => u.transactionId === txid && u.index === index
    );

    if (utxo) {
      const updateOptions: any = {
        where: { id: utxo.id },
      };

      // If we have a database transaction, use it for atomic updates
      if (dbTransaction) {
        updateOptions.transaction = dbTransaction;
      }

      await models.ecosystemUtxo.update(
        { status: true },
        updateOptions
      );
    } else {
      logger.error("UTXO", `UTXO not found for transaction ${txid} index ${index}`);
    }
  }
}

async function recordChangeUtxo(txid, changeAmount, wallet, chain, dbTransaction?: Transaction) {
  if (!txid) {
    logger.error("UTXO", "Cannot record change UTXO: txid is undefined");
    return;
  }

  const changeTxData: any = await fetchUtxoTransaction(txid, chain);

  if (!changeTxData || !changeTxData.outputs) {
    logger.error("UTXO", "Change transaction data is undefined or invalid");
    return;
  }

  const changeAddress = getChangeAddress(wallet, chain);

  const changeOutput = changeTxData.outputs.find(
    (output) => output.addresses && output.addresses.includes(changeAddress)
  );

  if (changeOutput) {
    const changeOutputIndex = changeTxData.outputs.indexOf(changeOutput);
    const changeScript = changeOutput.script;

    // changeAmount is in satoshis from the calculation, convert to standard units for database storage
    const changeAmountInStandardUnits = satoshiToStandardUnit(changeAmount, chain);

    const createOptions: any = {
      walletId: wallet.id,
      transactionId: txid,
      index: changeOutputIndex,
      amount: changeAmountInStandardUnits,
      script: changeScript,
      status: false,
    };

    // If we have a database transaction, use it
    if (dbTransaction) {
      await models.ecosystemUtxo.create(createOptions, { transaction: dbTransaction });
    } else {
      await models.ecosystemUtxo.create(createOptions);
    }
  } else {
    logger.error("UTXO", "Change output not found in transaction data");
  }
}

async function markSpentUtxosFromError(error, chain, walletId) {
  // Extract the transaction ID and input index from the error message
  const spentUtxos: { transactionId: string; index: number }[] =
    parseSpentUtxosFromError(error.message);

  if (spentUtxos.length === 0) {
    // Fallback: Check each UTXO individually
    await markSpentUtxos(chain, walletId);
  } else {
    // Mark the specific UTXOs as spent
    for (const spentUtxo of spentUtxos) {
      const utxo = await models.ecosystemUtxo.findOne({
        where: {
          transactionId: spentUtxo.transactionId,
        },
      });
      if (utxo) {
        await models.ecosystemUtxo.update(
          { status: true },
          {
            where: { id: utxo.id },
          }
        );
        logger.info("UTXO", `Marked UTXO as spent: txId=${spentUtxo.transactionId}, index=${spentUtxo.index}`);
      } else {
        logger.error("UTXO", `UTXO not found in database for transaction ${spentUtxo.transactionId} index ${spentUtxo.index}`);
      }
    }
  }
}

function parseSpentUtxosFromError(errorMessage: string) {
  const spentUtxos: { transactionId: string; index: number }[] = [];
  const regex =
    /Transaction ([a-f0-9]{64}) referenced by input (\d+) of [a-f0-9]{64} has already been spent/gi;
  let match;
  while ((match = regex.exec(errorMessage)) !== null) {
    const transactionId = match[1];
    const index = parseInt(match[2]);
    spentUtxos.push({ transactionId, index });
  }
  return spentUtxos;
}

async function markSpentUtxos(chain, walletId) {
  // Fetch all unspent UTXOs for this wallet
  const utxos = await models.ecosystemUtxo.findAll({
    where: {
      status: false,
      walletId: walletId,
    },
  });

  // Check each UTXO individually
  for (const utxo of utxos) {
    try {
      const txData: any = await fetchUtxoTransaction(utxo.transactionId, chain);
      // Check if the UTXO is spent
      const output = txData.outputs[utxo.index];
      const isSpent = output.spent || output.spender;
      if (isSpent) {
        await models.ecosystemUtxo.update(
          { status: true },
          {
            where: { id: utxo.id },
          }
        );
      }
    } catch (error) {
      // If unable to fetch transaction data, skip this UTXO
    }
  }
}

/**
 * Determine if automatic UTXO consolidation should be triggered
 * Consolidation is needed when:
 * 1. There are many small UTXOs (>= 5)
 * 2. Average UTXO size is small relative to typical transaction fees
 */
async function shouldAutoConsolidateUTXOs(
  walletId: string,
  chain: string
): Promise<{ shouldConsolidate: boolean; reason: string }> {
  const utxos = await models.ecosystemUtxo.findAll({
    where: { status: false, walletId: walletId },
    order: [["amount", "ASC"]],
  });

  if (utxos.length < 2) {
    return {
      shouldConsolidate: false,
      reason: "Not enough UTXOs to warrant consolidation (need at least 2)"
    };
  }

  const currentFeeRate = await getCurrentUtxoFeeRatePerByte(chain);
  if (!currentFeeRate) {
    return {
      shouldConsolidate: false,
      reason: "Cannot fetch fee rate"
    };
  }

  // Calculate average UTXO size in satoshis
  const totalValue = utxos.reduce((sum, utxo) => {
    return sum + standardUnitToSatoshi(utxo.amount, chain);
  }, 0);
  const avgUtxoSize = totalValue / utxos.length;

  // Cost to spend one UTXO (input size × fee rate)
  const costPerInput = 180 * currentFeeRate;

  // If average UTXO is less than 3x the cost to spend it, consolidation is beneficial
  if (avgUtxoSize < costPerInput * 3) {
    return {
      shouldConsolidate: true,
      reason: `${utxos.length} UTXOs with avg size ${satoshiToStandardUnit(avgUtxoSize, chain)} ${chain} (cost to spend: ${satoshiToStandardUnit(costPerInput, chain)} ${chain}). Consolidation will reduce future fees.`
    };
  }

  // If we have many UTXOs (>= 10), consolidate even if they're not super tiny
  if (utxos.length >= 10) {
    return {
      shouldConsolidate: true,
      reason: `${utxos.length} UTXOs detected. Consolidation will improve wallet efficiency.`
    };
  }

  return {
    shouldConsolidate: false,
    reason: "UTXOs are large enough, no consolidation needed"
  };
}

/**
 * Calculate minimum economical withdrawal amount based on available UTXOs and fees
 * Returns { isEconomical: boolean, minAmount: number, reason: string }
 */
export async function calculateMinimumWithdrawal(
  walletId: string,
  chain: string,
  requestedAmount: number
): Promise<{ isEconomical: boolean; minAmount: number; reason: string; utxoCount: number }> {
  const requestedAmountSats = standardUnitToSatoshi(requestedAmount, chain);
  const currentFeeRate = await getCurrentUtxoFeeRatePerByte(chain);

  if (!currentFeeRate) {
    return {
      isEconomical: false,
      minAmount: 0,
      reason: "Failed to fetch current fee rate",
      utxoCount: 0
    };
  }

  // Get available UTXOs sorted by amount (largest first)
  const utxos = await models.ecosystemUtxo.findAll({
    where: { status: false, walletId: walletId },
    order: [["amount", "DESC"]],
  });

  if (utxos.length === 0) {
    return {
      isEconomical: false,
      minAmount: 0,
      reason: "No UTXOs available",
      utxoCount: 0
    };
  }

  const dustThreshold = getDustThreshold(chain);

  // Calculate how many UTXOs we'd need for this withdrawal
  let totalInputValue = 0;
  let inputCount = 0;

  for (const utxo of utxos) {
    inputCount++;
    const utxoAmountSats = standardUnitToSatoshi(utxo.amount, chain);
    totalInputValue += utxoAmountSats;

    // Calculate fee for current input count (2 outputs: recipient + change)
    const estimatedTxSize = inputCount * 180 + 2 * 34 + 10;
    const transactionFee = Math.ceil(estimatedTxSize * currentFeeRate);
    const requiredAmount = requestedAmountSats + transactionFee;

    // If we have enough
    if (totalInputValue >= requiredAmount) {
      const change = totalInputValue - requiredAmount;

      // Check if change would be dust (if so, add to fee)
      if (change > 0 && change < dustThreshold) {
        const adjustedRequired = requestedAmountSats + transactionFee + change;
        if (totalInputValue >= adjustedRequired) {
          return {
            isEconomical: true,
            minAmount: requestedAmount,
            reason: "Withdrawal is economical",
            utxoCount: inputCount
          };
        }
      } else {
        return {
          isEconomical: true,
          minAmount: requestedAmount,
          reason: "Withdrawal is economical",
          utxoCount: inputCount
        };
      }
    }
  }

  // If we exhausted all UTXOs and still don't have enough
  const finalTxSize = utxos.length * 180 + 2 * 34 + 10;
  const finalFee = Math.ceil(finalTxSize * currentFeeRate);
  const maxPossibleWithdrawal = totalInputValue - finalFee;

  if (maxPossibleWithdrawal <= 0) {
    return {
      isEconomical: false,
      minAmount: 0,
      reason: `UTXOs too small for any withdrawal. Total value: ${satoshiToStandardUnit(totalInputValue, chain)} ${chain}, estimated fee: ${satoshiToStandardUnit(finalFee, chain)} ${chain}. Consider consolidating UTXOs when fees are lower.`,
      utxoCount: utxos.length
    };
  }

  return {
    isEconomical: false,
    minAmount: satoshiToStandardUnit(maxPossibleWithdrawal, chain),
    reason: `Insufficient funds. Maximum possible withdrawal: ${satoshiToStandardUnit(maxPossibleWithdrawal, chain)} ${chain}. Consider consolidating UTXOs to reduce fees.`,
    utxoCount: utxos.length
  };
}

/**
 * Consolidate small UTXOs into larger ones when fee rates are low
 * This helps reduce future transaction costs
 */
export async function consolidateUTXOs(
  walletId: string,
  chain: string,
  maxFeeRate: number = 2 // Only consolidate when fees are <= 2 sat/byte
): Promise<{ success: boolean; txid?: string; message: string }> {
  const currentFeeRate = await getCurrentUtxoFeeRatePerByte(chain);

  if (!currentFeeRate) {
    return {
      success: false,
      message: "Failed to fetch current fee rate"
    };
  }

  if (currentFeeRate > maxFeeRate) {
    return {
      success: false,
      message: `Current fee rate (${currentFeeRate} sat/byte) is too high for consolidation. Waiting for fees <= ${maxFeeRate} sat/byte.`
    };
  }

  const wallet = await models.wallet.findByPk(walletId);
  if (!wallet) {
    return {
      success: false,
      message: "Wallet not found"
    };
  }

  const masterWallet = (await getMasterWalletByChain(chain)) as unknown as EcosystemMasterWallet;
  if (!masterWallet) {
    return {
      success: false,
      message: `Master wallet not found for ${chain}`
    };
  }

  const network = getUtxoNetwork(chain);
  if (!network) {
    return {
      success: false,
      message: `Unsupported UTXO chain: ${chain}`
    };
  }

  // Get all available UTXOs
  const dbTransaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  try {
    const utxos = await models.ecosystemUtxo.findAll({
      where: { status: false, walletId: walletId },
      order: [["amount", "ASC"]], // Smallest first for consolidation
      lock: Transaction.LOCK.UPDATE,
      transaction: dbTransaction,
    });

    logger.info("UTXO", `Consolidation: Found ${utxos.length} available UTXOs for wallet ${walletId}`);

    if (utxos.length < 2) {
      await dbTransaction.rollback();
      return {
        success: false,
        message: `Not enough UTXOs to consolidate (need at least 2, found ${utxos.length})`
      };
    }

    // Only consolidate SMALL UTXOs (inefficient to spend)
    // Calculate the cost to spend one UTXO
    const costPerInput = 180 * currentFeeRate; // 180 bytes per input × fee rate
    const utxoDustThreshold = getDustThreshold(chain);

    // Filter UTXOs that are small (less than 5x the cost to spend them)
    // Keep larger UTXOs separate for efficiency
    const smallUtxos = utxos.filter(utxo => {
      const utxoValueSats = standardUnitToSatoshi(utxo.amount, chain);
      const isSmall = utxoValueSats < (costPerInput * 5);
      const isDust = utxoValueSats < utxoDustThreshold * 2;
      return isSmall || isDust;
    });

    if (smallUtxos.length < 2) {
      await dbTransaction.rollback();
      return {
        success: false,
        message: `No small UTXOs to consolidate. All ${utxos.length} UTXOs are already efficiently sized.`
      };
    }

    // Limit to 50 UTXOs per consolidation to avoid huge transactions
    const utxosToConsolidate = smallUtxos.slice(0, Math.min(50, smallUtxos.length));

    logger.info("UTXO", `Consolidation: Will consolidate ${utxosToConsolidate.length} small UTXOs (out of ${utxos.length} total). Keeping ${utxos.length - utxosToConsolidate.length} larger UTXOs separate.`);

    const psbt = new bitcoin.Psbt({ network });
    let totalInputValue = 0;
    const keyPairs: { index: number; keyPair: any }[] = [];

    // Add all inputs
    for (const utxo of utxosToConsolidate) {
      const walletData = (await models.walletData.findOne({
        where: { walletId: utxo.walletId },
      })) as unknown as WalletData;

      if (!walletData) continue;

      const decryptedData = JSON.parse(decrypt(walletData.data));
      if (!decryptedData.privateKey) continue;

      const rawTxHex = await fetchRawUtxoTransaction(utxo.transactionId, chain);
      psbt.addInput({
        hash: utxo.transactionId,
        index: utxo.index,
        nonWitnessUtxo: Buffer.from(rawTxHex, "hex"),
      });

      const utxoAmountSats = standardUnitToSatoshi(utxo.amount, chain);
      totalInputValue += utxoAmountSats;

      const keyPair = ECPair.fromWIF(decryptedData.privateKey, network);
      keyPairs.push({ index: psbt.inputCount - 1, keyPair });
    }

    // Calculate fee for consolidation (1 output only - back to ourselves)
    const numInputs = psbt.inputCount;
    const numOutputs = 1;
    const estimatedTxSize = numInputs * 180 + numOutputs * 34 + 10;
    const transactionFee = Math.ceil(estimatedTxSize * currentFeeRate);

    const outputAmount = totalInputValue - transactionFee;
    const dustThreshold = getDustThreshold(chain);

    if (outputAmount < dustThreshold) {
      await dbTransaction.rollback();
      return {
        success: false,
        message: `Consolidation would result in dust output (${outputAmount} < ${dustThreshold} satoshis)`
      };
    }

    // Add single output back to our own address
    const changeAddress = getChangeAddress(wallet, chain);
    psbt.addOutput({
      address: changeAddress,
      value: BigInt(outputAmount),
    });

    // Sign all inputs
    keyPairs.forEach(({ index, keyPair }) => {
      psbt.signInput(index, keyPair);
    });

    psbt.finalizeAllInputs();

    const rawTx = psbt.extractTransaction().toHex();
    const broadcastResult = await broadcastRawUtxoTransaction(rawTx, chain);

    if (!broadcastResult.success) {
      await dbTransaction.rollback();
      return {
        success: false,
        message: `Failed to broadcast consolidation: ${broadcastResult.error}`
      };
    }

    const txid = broadcastResult.txid;

    if (!txid) {
      await dbTransaction.rollback();
      return {
        success: false,
        message: "Failed to get transaction ID from broadcast result"
      };
    }

    // Mark all used UTXOs as spent
    await markUsedUtxos(psbt, utxosToConsolidate, dbTransaction);

    // Record the new consolidated UTXO
    await recordChangeUtxo(txid, outputAmount, wallet, chain, dbTransaction);

    await dbTransaction.commit();

    logger.success("UTXO", `Consolidation: Successfully consolidated ${numInputs} UTXOs into 1. TxID: ${txid}`);

    return {
      success: true,
      txid,
      message: `Successfully consolidated ${numInputs} UTXOs (${satoshiToStandardUnit(totalInputValue, chain)} ${chain}) into 1 UTXO (${satoshiToStandardUnit(outputAmount, chain)} ${chain}). Fee: ${satoshiToStandardUnit(transactionFee, chain)} ${chain}`
    };
  } catch (error) {
    await dbTransaction.rollback();
    logger.error("UTXO", "Consolidate UTXOs error", error);
    return {
      success: false,
      message: `Consolidation failed: ${error.message}`
    };
  }
}

function getDustThreshold(chain: string): number {
  switch (chain) {
    case "BTC":
      return 546; // Satoshis for P2PKH
    case "LTC":
      return 1000; // Adjust according to LTC standards
    case "DOGE":
      return 100000000; // DOGE has different units
    case "DASH":
      return 546; // Similar to BTC
    default:
      throw new Error(`Unsupported UTXO chain: ${chain}`);
  }
}
