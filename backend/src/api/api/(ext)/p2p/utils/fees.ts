import { models } from "@b/db";
import { Op, fn, col } from "sequelize";

interface FeeConfiguration {
  maker: number; // Percentage fee for offer creator
  taker: number; // Percentage fee for offer taker
  minimum: number; // Minimum fee amount
  maximum: number; // Maximum fee amount
}

interface TradeFees {
  buyerFee: number;
  sellerFee: number;
  totalFee: number;
  netAmountBuyer: number; // Amount buyer receives after fees
  netAmountSeller: number; // Amount seller receives after fees
}

/**
 * Get P2P fee configuration
 * This could be stored in settings or database
 */
export async function getP2PFeeConfiguration(): Promise<FeeConfiguration> {
  try {
    // Try to get from settings
    const settings = await models.settings.findOne({
      where: { key: "p2pFeeConfiguration" },
    });

    if (settings?.value) {
      return JSON.parse(settings.value);
    }
  } catch (error) {
    console.error("Failed to load P2P fee configuration:", error);
  }

  // Default configuration
  return {
    maker: 0.1, // 0.1% for maker (offer creator)
    taker: 0.2, // 0.2% for taker (offer acceptor)
    minimum: 0.01, // Minimum fee
    maximum: 100, // Maximum fee
  };
}

/**
 * Calculate trade fees for a P2P trade
 */
export async function calculateTradeFees(
  amount: number,
  currency: string,
  isMakerBuyer: boolean,
  customConfig?: FeeConfiguration
): Promise<TradeFees> {
  const config = customConfig || await getP2PFeeConfiguration();

  // Calculate raw fees
  const makerFee = amount * (config.maker / 100);
  const takerFee = amount * (config.taker / 100);

  // Apply minimum and maximum limits
  const appliedMakerFee = Math.min(
    Math.max(makerFee, config.minimum),
    config.maximum
  );
  const appliedTakerFee = Math.min(
    Math.max(takerFee, config.minimum),
    config.maximum
  );

  // Determine buyer and seller fees based on who is maker/taker
  const buyerFee = isMakerBuyer ? appliedMakerFee : appliedTakerFee;
  const sellerFee = isMakerBuyer ? appliedTakerFee : appliedMakerFee;

  // Calculate net amounts
  const netAmountBuyer = amount - buyerFee;
  const netAmountSeller = amount - sellerFee;

  return {
    buyerFee: parseFloat(buyerFee.toFixed(8)),
    sellerFee: parseFloat(sellerFee.toFixed(8)),
    totalFee: parseFloat((buyerFee + sellerFee).toFixed(8)),
    netAmountBuyer: parseFloat(netAmountBuyer.toFixed(8)),
    netAmountSeller: parseFloat(netAmountSeller.toFixed(8)),
  };
}

/**
 * Calculate escrow fee for a P2P trade
 * This is separate from trading fees and covers the escrow service
 */
export async function calculateEscrowFee(
  amount: number,
  currency: string
): Promise<number> {
  try {
    // Try to get from settings
    const settings = await models.settings.findOne({
      where: { key: "p2pEscrowFeeRate" },
    });

    const escrowFeeRate = settings?.value ? parseFloat(settings.value) : 0.1; // Default 0.1%
    const escrowFee = amount * (escrowFeeRate / 100);

    // Apply minimum escrow fee
    const minEscrowFee = 0.01;
    return parseFloat(Math.max(escrowFee, minEscrowFee).toFixed(8));
  } catch (error) {
    console.error("Failed to calculate escrow fee:", error);
    return 0;
  }
}

/**
 * Get fee discount for user based on trading volume or tier
 */
export async function getUserFeeDiscount(userId: string): Promise<number> {
  try {
    // Calculate user's 30-day trading volume
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const volumeResult = await models.p2pTrade.findOne({
      attributes: [
        [fn("SUM", col("totalAmount")), "volume"],
      ],
      where: {
        [Op.or]: [
          { buyerId: userId },
          { sellerId: userId },
        ],
        status: "COMPLETED",
        completedAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
      raw: true,
    });

    const volume = parseFloat(volumeResult?.volume || "0");

    // Define volume tiers and discounts
    const tiers = [
      { minVolume: 100000, discount: 50 }, // 50% discount for > $100k volume
      { minVolume: 50000, discount: 30 },  // 30% discount for > $50k volume
      { minVolume: 10000, discount: 20 },  // 20% discount for > $10k volume
      { minVolume: 5000, discount: 10 },   // 10% discount for > $5k volume
      { minVolume: 1000, discount: 5 },    // 5% discount for > $1k volume
    ];

    // Find applicable tier
    const applicableTier = tiers.find(tier => volume >= tier.minVolume);
    return applicableTier?.discount || 0;
  } catch (error) {
    console.error("Failed to calculate user fee discount:", error);
    return 0;
  }
}

/**
 * Apply fee discount to calculated fees
 */
export async function applyFeeDiscount(
  fees: TradeFees,
  userId: string
): Promise<TradeFees> {
  const discount = await getUserFeeDiscount(userId);
  
  if (discount === 0) {
    return fees;
  }

  const discountMultiplier = 1 - (discount / 100);

  return {
    buyerFee: parseFloat((fees.buyerFee * discountMultiplier).toFixed(8)),
    sellerFee: parseFloat((fees.sellerFee * discountMultiplier).toFixed(8)),
    totalFee: parseFloat((fees.totalFee * discountMultiplier).toFixed(8)),
    netAmountBuyer: parseFloat((fees.netAmountBuyer + fees.buyerFee * (discount / 100)).toFixed(8)),
    netAmountSeller: parseFloat((fees.netAmountSeller + fees.sellerFee * (discount / 100)).toFixed(8)),
  };
}

/**
 * Create fee transaction records
 */
export async function createFeeTransactions(
  tradeId: string,
  buyerId: string,
  sellerId: string,
  fees: TradeFees,
  currency: string,
  transaction?: any
): Promise<void> {
  const feeTransactions: any[] = [];

  if (fees.buyerFee > 0) {
    feeTransactions.push({
      userId: buyerId,
      type: "P2P_FEE",
      status: "COMPLETED",
      amount: -fees.buyerFee,
      fee: 0,
      currency,
      description: `P2P trading fee for trade #${tradeId}`,
      referenceId: tradeId,
    });
  }

  if (fees.sellerFee > 0) {
    feeTransactions.push({
      userId: sellerId,
      type: "P2P_FEE",
      status: "COMPLETED",
      amount: -fees.sellerFee,
      fee: 0,
      currency,
      description: `P2P trading fee for trade #${tradeId}`,
      referenceId: tradeId,
    });
  }

  if (feeTransactions.length > 0) {
    await models.transaction.bulkCreate(feeTransactions, { transaction });
  }
}

/**
 * Calculate and display fee preview
 */
export function calculateFeePreview(
  amount: number,
  feeRate: number,
  ismaker: boolean = false
): {
  fee: number;
  netAmount: number;
  feePercentage: string;
} {
  const fee = amount * (feeRate / 100);
  const netAmount = amount - fee;

  return {
    fee: parseFloat(fee.toFixed(8)),
    netAmount: parseFloat(netAmount.toFixed(8)),
    feePercentage: `${feeRate}%`,
  };
}