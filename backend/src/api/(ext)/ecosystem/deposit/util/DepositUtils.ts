// DepositUtils.ts

import { ethers } from "ethers";
import { storeAndBroadcastTransaction } from "@b/api/(ext)/ecosystem/utils/redis/deposit";
import { decodeTransactionData } from "@b/api/(ext)/ecosystem/utils/blockchain";
import { logger } from "@b/utils/console";

/**
 * Decodes and validates a transaction, ensures `to` matches our target address.
 * Enhanced with better error handling and validation.
 * Returns true if processing was successful, false otherwise.
 */
export async function processTransaction(
  contractType: "PERMIT" | "NO_PERMIT" | "NATIVE",
  txHash: string,
  provider: ethers.JsonRpcProvider | ethers.WebSocketProvider,
  address: string,
  chain: string,
  decimals: number,
  feeDecimals: number,
  walletId: string
): Promise<boolean> {
  // Input validation
  if (!txHash || !provider || !address || !chain || !walletId) {
    logger.error("DEPOSIT", `Invalid parameters for processTransaction: txHash=${txHash}, address=${address}, chain=${chain}, walletId=${walletId}`);
    return false;
  }

  try {
    logger.info("DEPOSIT", `Processing ${contractType} transaction ${txHash} on ${chain}`);

    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      logger.error("DEPOSIT", `Transaction ${txHash} not found on ${chain}`);
      return false;
    }

    if (!tx.data) {
      logger.error("DEPOSIT", `Transaction ${txHash} has no data field`);
      return false;
    }

    const decodedData = decodeTransactionData(tx.data);
    const realTo = decodedData.to || tx.to;
    const amount = decodedData.amount || tx.value;

    if (!realTo || !address) {
      logger.error("DEPOSIT", `Invalid transaction data for ${txHash}: realTo=${realTo}, address=${address}`);
      return false;
    }

    // Validate address match (case-insensitive)
    if (realTo.toLowerCase() !== address.toLowerCase()) {
      logger.warn("DEPOSIT", `Address mismatch for ${txHash}: expected=${address}, actual=${realTo}`);
      return false;
    }

    // Validate amount
    if (!amount || amount.toString() === "0") {
      logger.warn("DEPOSIT", `Zero or invalid amount for transaction ${txHash}`);
      return false;
    }

    const txDetails = await createTransactionDetails(
      contractType,
      walletId,
      tx,
      realTo,
      chain,
      decimals,
      feeDecimals,
      "DEPOSIT",
      amount
    );

    await storeAndBroadcastTransaction(txDetails, txHash);
    logger.success("DEPOSIT", `Transaction ${txHash} processed successfully on ${chain}`);

    return true;
  } catch (error) {
    logger.error("DEPOSIT", `Error processing transaction ${txHash} on ${chain}: ${error.message}`);
    return false;
  }
}

/**
 * Creates standardized transaction details with enhanced validation and error handling
 */
export async function createTransactionDetails(
  contractType: "PERMIT" | "NO_PERMIT" | "NATIVE",
  walletId: string,
  tx: any,
  toAddress: string,
  chain: string,
  decimals: number,
  feeDecimals: number,
  type: string,
  amount = tx.amount
) {
  try {
    // Input validation
    if (!contractType || !walletId || !tx || !toAddress || !chain || !type) {
      throw new Error(
        "Missing required parameters for createTransactionDetails"
      );
    }

    // Validate decimals
    if (decimals < 0 || decimals > 18) {
      logger.warn("DEPOSIT", `Unusual decimals value: ${decimals} for chain ${chain}`);
    }

    if (feeDecimals < 0 || feeDecimals > 18) {
      logger.warn("DEPOSIT", `Unusual fee decimals value: ${feeDecimals} for chain ${chain}`);
    }

    // Safe amount formatting with validation
    let formattedAmount = "0";
    try {
      if (amount && amount.toString() !== "0") {
        formattedAmount = ethers.formatUnits(amount.toString(), decimals);

        // Validate formatted amount
        if (
          isNaN(parseFloat(formattedAmount)) ||
          parseFloat(formattedAmount) <= 0
        ) {
          logger.warn("DEPOSIT", `Invalid formatted amount ${formattedAmount} for transaction ${tx.hash}`);
          formattedAmount = "0";
        }
      }
    } catch (error) {
      logger.error("DEPOSIT", `Error formatting amount for transaction ${tx.hash}: ${error.message}`);
      formattedAmount = "0";
    }

    // Safe gas limit formatting
    let formattedGasLimit = "N/A";
    try {
      if (tx.gasLimit) {
        formattedGasLimit = tx.gasLimit.toString();
      }
    } catch (error) {
      logger.warn("DEPOSIT", `Error formatting gas limit for transaction ${tx.hash}: ${error.message}`);
    }

    // Safe gas price formatting
    let formattedGasPrice = "N/A";
    try {
      if (tx.gasPrice) {
        formattedGasPrice = ethers.formatUnits(
          tx.gasPrice.toString(),
          feeDecimals
        );

        // Validate gas price
        if (
          isNaN(parseFloat(formattedGasPrice)) ||
          parseFloat(formattedGasPrice) < 0
        ) {
          logger.warn("DEPOSIT", `Invalid gas price ${formattedGasPrice} for transaction ${tx.hash}`);
          formattedGasPrice = "N/A";
        }
      }
    } catch (error) {
      logger.warn("DEPOSIT", `Error formatting gas price for transaction ${tx.hash}: ${error.message}`);
    }

    const txDetails = {
      contractType,
      id: walletId,
      chain,
      hash: tx.hash,
      type,
      from: tx.from || "unknown",
      to: toAddress,
      amount: formattedAmount,
      gasLimit: formattedGasLimit,
      gasPrice: formattedGasPrice,
      timestamp: Math.floor(Date.now() / 1000),
      blockNumber: tx.blockNumber?.toString() || "0",
      status: "PENDING", // Will be updated by verification process
    };

    logger.debug("DEPOSIT", `Created transaction details for ${tx.hash}: amount=${formattedAmount}, chain=${chain}`);
    return txDetails;
  } catch (error) {
    logger.error("DEPOSIT", `Error creating transaction details: ${error.message}`);
    throw error;
  }
}
