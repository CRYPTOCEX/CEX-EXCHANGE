import { getWallet } from "@b/api/finance/wallet/utils";
// Safe import for ecosystem modules
let fromBigIntMultiply: any;
let fromBigInt: any;
try {
  const module = require("@b/api/(ext)/ecosystem/utils/blockchain");
  fromBigIntMultiply = module.fromBigIntMultiply;
  fromBigInt = module.fromBigInt;
} catch (e) {
  // Ecosystem extension not available
}
import { FuturesOrder } from "./queries/order";
import {
  FuturesPosition,
  createPosition,
  getPosition,
  updatePositionInDB,
  updatePositionStatus,
} from "./queries/positions";
// Safe import for ecosystem modules
let updateWalletBalance: any;
try {
  const module = require("../../ecosystem/utils/wallet");
  updateWalletBalance = module.updateWalletBalance;
} catch (e) {
  // Ecosystem extension not available
}

// Constants
const SCALE_FACTOR = BigInt(10 ** 18);
const FUTURES_WALLET_TYPE = "FUTURES";

// Types
type Side = "BUY" | "SELL";

// Helper functions
const scaleDown = (value: bigint): number =>
  Number(value) / Number(SCALE_FACTOR);
const scaleUp = (value: number): bigint =>
  BigInt(Math.round(value * Number(SCALE_FACTOR)));

export const calculateUnrealizedPnl = (
  entryPrice: bigint,
  amount: bigint,
  currentPrice: bigint,
  side: Side
): bigint => {
  const unscaledEntryPrice = scaleDown(entryPrice);
  const unscaledCurrentPrice = scaleDown(currentPrice);
  const unscaledAmount = scaleDown(amount);

  const pnl =
    side === "BUY"
      ? (unscaledCurrentPrice - unscaledEntryPrice) * unscaledAmount
      : (unscaledEntryPrice - unscaledCurrentPrice) * unscaledAmount;

  return scaleUp(pnl);
};

// Main functions
export const updatePositions = async (
  buyOrder: FuturesOrder,
  sellOrder: FuturesOrder,
  amountToFill: bigint,
  matchedPrice: bigint
): Promise<void> => {
  await Promise.all([
    updateSinglePosition(buyOrder, amountToFill, matchedPrice),
    updateSinglePosition(sellOrder, amountToFill, matchedPrice),
  ]);
};

const updateSinglePosition = async (
  order: FuturesOrder,
  amount: bigint,
  matchedPrice: bigint
): Promise<void> => {
  const position = await getPosition(order.userId, order.symbol, order.side);

  if (position) {
    await updateExistingPosition(position, order, amount, matchedPrice);
  } else {
    await createNewPosition(order, amount, matchedPrice);
  }
};

const updateExistingPosition = async (
  position: FuturesPosition,
  order: FuturesOrder,
  amount: bigint,
  matchedPrice: bigint
): Promise<void> => {
  const newAmount = scaleDown(position.amount) + scaleDown(amount);
  const newEntryPrice =
    (scaleDown(position.entryPrice) * scaleDown(position.amount) +
      scaleDown(order.price) * scaleDown(amount)) /
    newAmount;

  const scaledNewAmount = scaleUp(newAmount);
  const scaledNewEntryPrice = scaleUp(newEntryPrice);

  const unrealizedPnl = calculateUnrealizedPnl(
    scaledNewEntryPrice,
    scaledNewAmount,
    matchedPrice,
    order.side as Side
  );

  await updatePositionInDB(
    position.userId,
    position.id,
    scaledNewEntryPrice,
    scaledNewAmount,
    unrealizedPnl,
    position.stopLossPrice,
    position.takeProfitPrice
  );
};

const createNewPosition = async (
  order: FuturesOrder,
  amount: bigint,
  matchedPrice: bigint
): Promise<void> => {
  const unrealizedPnl = calculateUnrealizedPnl(
    order.price,
    amount,
    matchedPrice,
    order.side as Side
  );

  await createPosition(
    order.userId,
    order.symbol,
    order.side,
    order.price,
    amount,
    order.leverage,
    unrealizedPnl,
    order.stopLossPrice,
    order.takeProfitPrice
  );
};

export const closePosition = async (order: FuturesOrder): Promise<void> => {
  const position = await getPosition(order.userId, order.symbol, order.side);

  if (position) {
    const realizedPnl = fromBigIntMultiply ? fromBigIntMultiply(position.unrealizedPnl, BigInt(1)) : position.unrealizedPnl;
    const baseCurrency = order.symbol.split("/")[1];
    const wallet = await getWallet(
      order.userId,
      FUTURES_WALLET_TYPE,
      baseCurrency
    );

    if (wallet) {
      if (updateWalletBalance) {
        await updateWalletBalance(wallet, realizedPnl, "add");
      } else {
        throw new Error("Ecosystem extension not available for wallet operations");
      }
    } else {
      throw new Error(
        `Wallet not found for user ${order.userId} and currency ${baseCurrency}`
      );
    }

    await updatePositionStatus(position.userId, position.id, "CLOSED");
  } else {
    throw new Error(
      `No position found for user ${order.userId} and symbol ${order.symbol}`
    );
  }
};
