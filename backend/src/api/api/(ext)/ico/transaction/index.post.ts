import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { getWallet } from "@b/api/finance/wallet/utils";
import crypto from "crypto";
import {
  sendIcoBuyerEmail,
  sendIcoSellerEmail,
} from "@b/api/(ext)/admin/ico/utils";
import { createNotification } from "@b/utils/notifications";
import { rateLimiters } from "@b/handler/Middleware";
import { Op } from "sequelize";

export const metadata = {
  summary: "Create a New ICO Investment",
  description:
    "Creates a new ICO investment transaction for the authenticated user using icoTransaction only. The wallet type and currency are derived from the associated plan. It also deducts funds from the user's wallet, records the transaction, updates offering stats, and sends email and in‑app notifications to both investor and seller.",
  operationId: "createIcoInvestment",
  tags: ["ICO", "Investments"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            offeringId: { type: "string", description: "ICO offering ID" },
            amount: { type: "number", description: "Investment amount" },
            walletAddress: {
              type: "string",
              description: "Wallet address where tokens will be sent",
            },
          },
          required: ["offeringId", "amount", "walletAddress"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "ICO investment transaction created successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
              transactionId: {
                type: "string",
                description: "Transaction ID",
              },
              tokenAmount: {
                type: "number",
                description: "Number of tokens purchased",
              },
            },
          },
        },
      },
    },
    400: { description: "Missing required fields or insufficient balance." },
    401: { description: "Unauthorized." },
    500: { description: "Internal Server Error." },
  },
};

// Helper function to validate wallet address based on blockchain
function validateWalletAddress(address: string, blockchain: string): boolean {
  const validators: Record<string, RegExp> = {
    ethereum: /^0x[a-fA-F0-9]{40}$/,
    bsc: /^0x[a-fA-F0-9]{40}$/,
    polygon: /^0x[a-fA-F0-9]{40}$/,
    bitcoin: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
    solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  };
  
  const validator = validators[blockchain.toLowerCase()];
  return validator ? validator.test(address) : true;
}

// Get investment limits from settings
async function getInvestmentLimits() {
  const settings = await models.settings.findAll({
    where: {
      key: {
        [Op.in]: ['icoMinInvestment', 'icoMaxInvestment', 'icoMaxPerUser']
      }
    }
  });
  
  const limits = settings.reduce((acc, setting) => {
    acc[setting.key] = parseFloat(setting.value) || 0;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    minInvestment: limits.icoMinInvestment || 10,
    maxInvestment: limits.icoMaxInvestment || 100000,
    maxPerUser: limits.icoMaxPerUser || 50000,
  };
}

export default async (data: Handler) => {
  // Apply rate limiting
  await rateLimiters.orderCreation(data);
  
  const { body, user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { offeringId, amount, walletAddress } = body;
  if (!offeringId || !amount || !walletAddress) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }

  // Validate investment amount
  if (!Number.isFinite(amount) || amount <= 0) {
    throw createError({ statusCode: 400, message: "Invalid investment amount" });
  }

  // Start a transaction to ensure atomic operations
  const transaction = await sequelize.transaction();
  
  try {
    // Retrieve the ICO offering with lock
    const offering = await models.icoTokenOffering.findByPk(offeringId, {
      include: [
        {
          model: models.icoTokenDetail,
          as: "tokenDetail",
          required: true,
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    
    if (!offering) {
      throw createError({ statusCode: 404, message: "Offering not found" });
    }

    // Validate offering status
    if (offering.status !== 'ACTIVE') {
      throw createError({ 
        statusCode: 400, 
        message: `Offering is ${offering.status.toLowerCase()}. Only active offerings can receive investments.` 
      });
    }

    // Check if offering has started and not ended
    const now = new Date();
    if (now < offering.startDate) {
      throw createError({ 
        statusCode: 400, 
        message: "Offering has not started yet" 
      });
    }
    if (now > offering.endDate) {
      throw createError({ 
        statusCode: 400, 
        message: "Offering has ended" 
      });
    }

    // Validate wallet address
    const blockchain = offering.tokenDetail.blockchain;
    if (!validateWalletAddress(walletAddress, blockchain)) {
      throw createError({ 
        statusCode: 400, 
        message: `Invalid ${blockchain} wallet address format` 
      });
    }

    // Get investment limits
    const limits = await getInvestmentLimits();
    
    // Validate investment amount against limits
    if (amount < limits.minInvestment) {
      throw createError({ 
        statusCode: 400, 
        message: `Minimum investment is ${limits.minInvestment} ${offering.purchaseWalletCurrency}` 
      });
    }
    if (amount > limits.maxInvestment) {
      throw createError({ 
        statusCode: 400, 
        message: `Maximum investment is ${limits.maxInvestment} ${offering.purchaseWalletCurrency}` 
      });
    }

    // Check user's total investment in this offering
    const existingInvestments = await models.icoTransaction.findAll({
      where: {
        userId: user.id,
        offeringId: offering.id,
        status: { [Op.in]: ['PENDING', 'VERIFICATION', 'RELEASED'] }
      },
      transaction,
    });
    
    const totalUserInvestment = existingInvestments.reduce((sum, inv) => {
      return sum + (inv.amount * inv.price);
    }, 0);
    
    if (totalUserInvestment + amount > limits.maxPerUser) {
      throw createError({ 
        statusCode: 400, 
        message: `Maximum investment per user is ${limits.maxPerUser} ${offering.purchaseWalletCurrency}. You have already invested ${totalUserInvestment}.` 
      });
    }

    // Find active phase
    const activePhase = await models.icoTokenOfferingPhase.findOne({
      where: { 
        offeringId: offering.id,
        remaining: { [Op.gt]: 0 }
      },
      order: [['createdAt', 'ASC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!activePhase) {
      throw createError({ 
        statusCode: 400, 
        message: "No tokens available for sale" 
      });
    }

    // Use the active phase's token price
    const tokenPrice = activePhase.tokenPrice;
    
    // Get token details for decimals
    const ecosystemToken = await models.ecosystemToken.findOne({
      where: { 
        currency: offering.symbol,
        chain: blockchain.toLowerCase()
      },
      transaction,
    });
    
    const decimals = ecosystemToken?.decimals || 18;
    
    // Calculate token amount with proper decimal handling
    const tokenAmount = (amount / tokenPrice) * Math.pow(10, decimals);
    const tokenAmountNormalized = amount / tokenPrice;

    // Check if phase has enough tokens
    if (tokenAmountNormalized > activePhase.remaining) {
      throw createError({ 
        statusCode: 400, 
        message: `Only ${activePhase.remaining} tokens remaining in current phase` 
      });
    }

    // Check if total raised doesn't exceed target
    const totalRaised = await models.icoTransaction.sum('amount', {
      where: {
        offeringId: offering.id,
        status: { [Op.in]: ['PENDING', 'VERIFICATION', 'RELEASED'] }
      },
      transaction,
    }) || 0;

    if (totalRaised + amount > offering.targetAmount) {
      const remainingCap = offering.targetAmount - totalRaised;
      throw createError({ 
        statusCode: 400, 
        message: `Investment exceeds target amount. Only ${remainingCap} ${offering.purchaseWalletCurrency} remaining.` 
      });
    }

    // Lock and verify wallet balance
    const wallet = await models.wallet.findOne({
      where: {
        userId: user.id,
        type: offering.purchaseWalletType,
        currency: offering.purchaseWalletCurrency,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!wallet || wallet.balance < amount) {
      throw createError({
        statusCode: 400,
        message: "Insufficient wallet balance for investment.",
      });
    }

    // Deduct the investment amount from the investor's wallet
    await wallet.update(
      { balance: wallet.balance - amount },
      { transaction }
    );

    // Generate a unique transaction ID
    const transactionId = crypto.randomBytes(16).toString("hex");

    // Create the icoTransaction record
    const icoTransaction = await models.icoTransaction.create(
      {
        userId: user.id,
        offeringId: offering.id,
        amount: tokenAmountNormalized,
        price: tokenPrice,
        status: "PENDING",
        transactionId,
        walletAddress,
        notes: JSON.stringify({
          phase: activePhase.name,
          decimals,
          rawTokenAmount: tokenAmount.toString(),
          investmentAmount: amount,
          currency: offering.purchaseWalletCurrency,
        }),
      },
      { transaction }
    );

    // Update phase remaining tokens
    await activePhase.update(
      { remaining: activePhase.remaining - tokenAmountNormalized },
      { transaction }
    );

    // Update the offering's participant count
    const isNewParticipant = existingInvestments.length === 0;
    if (isNewParticipant) {
      await offering.update(
        { participants: offering.participants + 1 },
        { transaction }
      );
    }

    // Create wallet transaction record
    await models.transaction.create(
      {
        userId: user.id,
        walletId: wallet.id,
        type: "ICO_INVESTMENT",
        status: "COMPLETED",
        amount: amount,
        fee: 0,
        description: `ICO Investment in ${offering.name} - ${tokenAmountNormalized} tokens at ${tokenPrice} ${offering.purchaseWalletCurrency} each`,
        referenceId: icoTransaction.id,
      },
      { transaction }
    );

    // Create audit log
    await models.icoAdminActivity.create(
      {
        type: "INVESTMENT_CREATED",
        offeringId: offering.id,
        offeringName: offering.name,
        adminId: user.id,
        details: JSON.stringify({
          investor: user.email,
          amount,
          tokenAmount: tokenAmountNormalized,
          phase: activePhase.name,
          walletAddress,
        }),
      },
      { transaction }
    );

    // Commit the transaction after successful operations
    await transaction.commit();

    // --- Send Email Notifications ---
    // Buyer (investor) email notification
    if (user.email) {
      await sendIcoBuyerEmail(user.email, {
        INVESTOR_NAME: `${user.firstName} ${user.lastName}`,
        OFFERING_NAME: offering.name,
        AMOUNT_INVESTED: amount.toFixed(2),
        TOKEN_AMOUNT: tokenAmountNormalized.toFixed(4),
        TOKEN_PRICE: tokenPrice.toFixed(4),
        TRANSACTION_ID: transactionId,
      });
    }
    
    // Seller (project owner) email notification
    const owner = await models.user.findByPk(offering.userId);
    if (owner && owner.email) {
      await sendIcoSellerEmail(owner.email, {
        SELLER_NAME: `${owner.firstName} ${owner.lastName}`,
        OFFERING_NAME: offering.name,
        INVESTOR_NAME: `${user.firstName} ${user.lastName}`,
        AMOUNT_INVESTED: amount.toFixed(2),
        TOKEN_AMOUNT: tokenAmountNormalized.toFixed(4),
        TRANSACTION_ID: transactionId,
      });
    }

    // --- Send In-App Notifications ---
    // Notify the investor (buyer)
    try {
      await createNotification({
        userId: user.id,
        relatedId: offering.id,
        type: "investment",
        title: "Investment Confirmed",
        message: `Your investment of ${amount} ${offering.purchaseWalletCurrency} in ${offering.name} has been confirmed.`,
        details: `You have purchased ${tokenAmountNormalized.toFixed(4)} tokens at ${tokenPrice} ${offering.purchaseWalletCurrency} per token. Transaction ID: ${transactionId}`,
        link: `/ico/dashboard?tab=transactions`,
        actions: [
          {
            label: "View Transaction",
            link: `/ico/dashboard?tab=transactions`,
            primary: true,
          },
        ],
      });
    } catch (notifErr) {
      console.error("Failed to create in-app notification for buyer", notifErr);
    }

    // Notify the seller (creator)
    try {
      await createNotification({
        userId: offering.userId,
        relatedId: offering.id,
        type: "system",
        title: "New Investment Received",
        message: `New investment of ${amount} ${offering.purchaseWalletCurrency} in ${offering.name}`,
        details: `Investor: ${user.firstName} ${user.lastName}\nAmount: ${amount} ${offering.purchaseWalletCurrency}\nTokens: ${tokenAmountNormalized.toFixed(4)}\nPhase: ${activePhase.name}`,
        link: `/ico/creator/token/${offering.id}?tab=transactions`,
        actions: [
          {
            label: "View Details",
            link: `/ico/creator/token/${offering.id}?tab=transactions`,
            primary: true,
          },
        ],
      });
    } catch (notifErr) {
      console.error("Failed to create in-app notification for seller", notifErr);
    }

    // Return a successful response
    return {
      message: "ICO investment transaction created successfully.",
      transactionId,
      tokenAmount: tokenAmountNormalized,
    };
  } catch (err: any) {
    await transaction.rollback();
    throw err;
  }
};