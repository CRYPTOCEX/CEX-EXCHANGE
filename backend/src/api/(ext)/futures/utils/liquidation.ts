// Safe import for ecosystem modules
let fromBigInt: any;
let toBigIntFloat: any;
let client: any;
let scyllaFuturesKeyspace: any;
let getWalletByUserIdAndCurrency: any;
let updateWalletBalance: any;
try {
  const blockchainModule = require("@b/api/(ext)/ecosystem/utils/blockchain");
  fromBigInt = blockchainModule.fromBigInt;
  toBigIntFloat = blockchainModule.toBigIntFloat;

  const clientModule = require("@b/api/(ext)/ecosystem/utils/scylla/client");
  client = clientModule.default;
  scyllaFuturesKeyspace = clientModule.scyllaFuturesKeyspace;

  const walletModule = require("@b/api/(ext)/ecosystem/utils/wallet");
  getWalletByUserIdAndCurrency = walletModule.getWalletByUserIdAndCurrency;
  updateWalletBalance = walletModule.updateWalletBalance;
} catch (e) {
  // Ecosystem extension not available
}
import { emailQueue } from "../../../../utils/emails";
import { models } from "@b/db";
import { FuturesPosition } from "./queries/positions";
import { handlePositionBroadcast } from "./ws";

const calculateMargin = (
  position: FuturesPosition,
  matchedPrice: number
): number => {
  if (!toBigIntFloat) {
    throw new Error("Ecosystem extension not available");
  }

  const currentPriceBigInt = toBigIntFloat(matchedPrice); // Scale up by 18
  const entryPriceBigInt = position.entryPrice;
  const leverageBigInt = BigInt(position.leverage);

  // Ensure entryPriceBigInt is not zero to avoid division by zero
  if (entryPriceBigInt === BigInt(0)) {
    throw new Error("Entry price cannot be zero");
  }

  // Calculate price difference based on the side of the position
  const priceDifferenceBigInt =
    position.side === "BUY"
      ? currentPriceBigInt - entryPriceBigInt
      : entryPriceBigInt - currentPriceBigInt;
  const entryPriceWithLeverageBigInt = entryPriceBigInt / leverageBigInt;
  const marginBigInt =
    (priceDifferenceBigInt * BigInt(1000000000000000000)) /
    entryPriceWithLeverageBigInt;

  // Convert margin back to number for the result
  const margin = Number(marginBigInt) / 1000000000000000000;

  return margin;
};

export const checkForLiquidation = async (
  position: FuturesPosition,
  matchedPrice: number
) => {
  if (!toBigIntFloat) {
    console.warn("Ecosystem extension not available for liquidation checks");
    return;
  }

  const margin = calculateMargin(position, matchedPrice);

  const partialLiquidationThreshold = -0.8; // 80% loss for partial liquidation
  const fullLiquidationThreshold = -1.0; // 100% loss for full liquidation

  if (
    margin <= partialLiquidationThreshold &&
    margin > fullLiquidationThreshold
  ) {
    await liquidatePosition(position, matchedPrice, true); // Partial liquidation
  } else if (margin <= fullLiquidationThreshold) {
    await liquidatePosition(position, matchedPrice); // Full liquidation
  }
};

export const liquidatePosition = async (
  position: FuturesPosition,
  matchedPrice: number,
  partial: boolean = false
) => {
  if (!client || !scyllaFuturesKeyspace || !fromBigInt || !getWalletByUserIdAndCurrency || !updateWalletBalance) {
    throw new Error("Ecosystem extension not available");
  }

  // Calculate the amount to liquidate
  const amountToLiquidate = partial
    ? (position.amount * BigInt(80)) / BigInt(100) // Liquidate 80% of the position in partial liquidation
    : position.amount;

  // Update the position in the database
  await client.execute(
    `UPDATE ${scyllaFuturesKeyspace}.position SET amount = ?, status = ? WHERE "userId" = ? AND id = ?`,
    [
      partial ? amountToLiquidate.toString() : "0",
      partial ? "PARTIALLY_LIQUIDATED" : "LIQUIDATED",
      position.userId,
      position.id,
    ],
    { prepare: true }
  );

  // Update the user's wallet balance
  const wallet = await getWalletByUserIdAndCurrency(
    position.userId,
    position.symbol.split("/")[1]
  );

  if (wallet) {
    const amountToRefund =
      fromBigInt(amountToLiquidate) * fromBigInt(position.entryPrice);
    await updateWalletBalance(wallet, amountToRefund, "add");
  }

  // Broadcast position update
  await handlePositionBroadcast(position);

  // Send liquidation email
  const user = await models.user.findOne({ where: { id: position.userId } });
  if (user && user.email) {
    if (partial) {
      await sendPartialLiquidationNotificationEmail(
        user,
        position,
        matchedPrice
      );
    } else {
      await sendLiquidationNotificationEmail(user, position, matchedPrice);
    }
  }
};

export const sendWarningEmail = async (
  userId: string,
  position: FuturesPosition,
  margin: number,
  matchedPrice: number
) => {
  const user = await models.user.findOne({ where: { id: userId } });
  if (user && user.email) {
    await sendLiquidationWarningEmail(user, position, margin, matchedPrice);
  }
};

export async function sendLiquidationWarningEmail(
  user: any,
  position: any,
  margin: number,
  matchedPrice: number
) {
  const emailType = "LiquidationWarning";

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    SYMBOL: position.symbol,
    MARGIN: margin.toFixed(2),
    LEVERAGE: position.leverage,
    ENTRY_PRICE: fromBigInt ? fromBigInt(position.entryPrice) : position.entryPrice,
    CURRENT_PRICE: matchedPrice,
  };

  await emailQueue.add({ emailData, emailType });
}

export async function sendPartialLiquidationNotificationEmail(
  user: any,
  position: any,
  matchedPrice: number
) {
  const emailType = "PartialLiquidationNotification";

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    SYMBOL: position.symbol,
    LEVERAGE: position.leverage,
    ENTRY_PRICE: fromBigInt ? fromBigInt(position.entryPrice) : position.entryPrice,
    CURRENT_PRICE: matchedPrice,
  };

  await emailQueue.add({ emailData, emailType });
}

export async function sendLiquidationNotificationEmail(
  user: any,
  position: any,
  matchedPrice: number
) {
  const emailType = "LiquidationNotification";

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    SYMBOL: position.symbol,
    LEVERAGE: position.leverage,
    ENTRY_PRICE: fromBigInt ? fromBigInt(position.entryPrice) : position.entryPrice,
    CURRENT_PRICE: matchedPrice,
  };

  await emailQueue.add({ emailData, emailType });
}
