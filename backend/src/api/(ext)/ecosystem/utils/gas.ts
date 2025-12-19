import type { Provider, TransactionRequest } from "ethers";
import { logger } from "@b/utils/console";

export async function estimateGas(
  transaction: TransactionRequest,
  provider: Provider,
  adjustmentFactor: number = 1.2
): Promise<bigint> {
  try {
    // Estimate gas required for the transaction
    const gasEstimate = await provider.estimateGas(transaction);

    // Adjust the gas estimate by a factor (to add some buffer)
    const adjustedGasEstimate =
      (gasEstimate * BigInt(Math.round(adjustmentFactor * 10))) / BigInt(10);

    return adjustedGasEstimate;
  } catch (error: any) {
    logger.error("ECOSYSTEM", "Failed to estimate gas for transaction", error);
    if (error.data) {
      logger.error("GAS", "Revert reason", { reason: error.data.reason, data: error.data });
    }
    throw new Error("Failed to estimate gas");
  }
}

export async function getAdjustedGasPrice(
  provider: Provider,
  adjustmentFactor: number = 1.2
): Promise<bigint> {
  try {
    // Fetch current gas price from the network
    const feeData = await provider.getFeeData();
    const currentGasPrice: bigint = feeData.gasPrice ?? BigInt(0);

    // Adjust the gas price
    const adjustedGasPrice =
      (currentGasPrice * BigInt(Math.round(adjustmentFactor * 10))) /
      BigInt(10);

    return adjustedGasPrice;
  } catch (error: any) {
    logger.error("ECOSYSTEM", "Failed to adjust gas price", error);
    throw new Error("Failed to adjust gas price");
  }
}
