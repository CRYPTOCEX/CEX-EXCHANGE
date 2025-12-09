import { models } from "@b/db";
import { Op, fn, col } from "sequelize";

interface FeeConfiguration {
  maker: number; // Percentage fee for offer creator
  taker: number; // Percentage fee for offer taker
  minimum: number; // Minimum fee amount
  maximum: number; // Maximum fee amount
}

interface MinimumTradeAmounts {
  [currency: string]: number;
}

interface TradeFees {
  buyerFee: number;
  sellerFee: number;
  totalFee: number;
  netAmountBuyer: number; // Amount buyer receives after fees
  netAmountSeller: number; // Amount seller receives after fees
}

/**
 * Get minimum trade amounts per currency to prevent dust trades
 * This helps avoid issues like BTC UTXO consolidation problems
 */
export async function getMinimumTradeAmounts(): Promise<MinimumTradeAmounts> {
  try {
    // Try to get from extension settings first (admin-configurable)
    const extensionSettings = await models.settings.findOne({
      where: { key: "p2p" },
    });

    if (extensionSettings?.value) {
      const p2pSettings = JSON.parse(extensionSettings.value);
      if (p2pSettings.MinimumTradeAmounts) {
        return p2pSettings.MinimumTradeAmounts;
      }
    }

    // Fallback: try old settings key
    const legacySettings = await models.settings.findOne({
      where: { key: "p2pMinimumTradeAmounts" },
    });

    if (legacySettings?.value) {
      return JSON.parse(legacySettings.value);
    }
  } catch (error) {
    console.error("Failed to load P2P minimum trade amounts:", error);
  }

  // Default minimum trade amounts to prevent dust
  // User requested 0.00005 BTC as minimum, which is very conservative
  return {
    BTC: 0.00005,    // 0.00005 BTC minimum (prevents UTXO dust)
    ETH: 0.001,      // 0.001 ETH minimum
    LTC: 0.01,       // 0.01 LTC minimum
    BCH: 0.001,      // 0.001 BCH minimum
    DOGE: 10,        // 10 DOGE minimum
    XRP: 5,          // 5 XRP minimum
    ADA: 5,          // 5 ADA minimum
    SOL: 0.01,       // 0.01 SOL minimum
    MATIC: 1,        // 1 MATIC minimum
    // Add more as needed
  };
}

/**
 * Validate if trade amount meets minimum requirements
 */
export async function validateMinimumTradeAmount(
  amount: number,
  currency: string
): Promise<{ valid: boolean; minimum?: number; message?: string }> {
  const minimums = await getMinimumTradeAmounts();
  const minimum = minimums[currency.toUpperCase()];

  if (minimum && amount < minimum) {
    return {
      valid: false,
      minimum,
      message: `Minimum trade amount for ${currency} is ${minimum}`,
    };
  }

  return { valid: true };
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
 * @param amount - Trade amount
 * @param currency - Currency code
 * @param offerOwnerId - The user ID of the offer creator (maker)
 * @param tradeInitiatorId - The user ID of the person who initiated/accepted the trade (taker)
 * @param buyerId - The user ID of the buyer in this trade
 * @param sellerId - The user ID of the seller in this trade
 * @param customConfig - Optional custom fee configuration
 */
export async function calculateTradeFees(
  amount: number,
  currency: string,
  offerOwnerId: string,
  tradeInitiatorId: string,
  buyerId: string,
  sellerId: string,
  customConfig?: FeeConfiguration
): Promise<TradeFees> {
  const config = customConfig || await getP2PFeeConfiguration();

  // Calculate raw fees
  const makerFeeAmount = amount * (config.maker / 100);
  const takerFeeAmount = amount * (config.taker / 100);

  // Apply minimum and maximum limits
  const appliedMakerFee = Math.min(
    Math.max(makerFeeAmount, config.minimum),
    config.maximum
  );
  const appliedTakerFee = Math.min(
    Math.max(takerFeeAmount, config.minimum),
    config.maximum
  );

  // Determine who gets which fee
  // Maker = offer owner, Taker = trade initiator
  const buyerIsMaker = buyerId === offerOwnerId;
  const sellerIsMaker = sellerId === offerOwnerId;

  // Assign fees correctly
  // The offer owner (maker) pays maker fee, trade initiator (taker) pays taker fee
  const buyerFee = buyerIsMaker ? appliedMakerFee : appliedTakerFee;
  const sellerFee = sellerIsMaker ? appliedMakerFee : appliedTakerFee;

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
    let escrowFeeRate = 0.2; // Default 0.2%

    // First try to get from extension settings (p2p key)
    const extensionSettings = await models.settings.findOne({
      where: { key: "p2p" },
    });

    if (extensionSettings?.value) {
      try {
        const p2pSettings = JSON.parse(extensionSettings.value);
        // Check for EscrowFeeRate in extension settings
        if (p2pSettings.EscrowFeeRate !== undefined) {
          escrowFeeRate = parseFloat(p2pSettings.EscrowFeeRate);
        } else if (p2pSettings.escrowFeeRate !== undefined) {
          escrowFeeRate = parseFloat(p2pSettings.escrowFeeRate);
        }
      } catch (parseError) {
        console.error("Failed to parse P2P extension settings:", parseError);
      }
    }

    // Fallback: try legacy settings key
    if (escrowFeeRate === 0.2) {
      const legacySettings = await models.settings.findOne({
        where: { key: "p2pEscrowFeeRate" },
      });
      if (legacySettings?.value) {
        escrowFeeRate = parseFloat(legacySettings.value);
      }
    }

    const escrowFee = amount * (escrowFeeRate / 100);

    // Apply minimum escrow fee
    const minEscrowFee = 0.0001;
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