import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { getWallet } from "@b/api/finance/wallet/utils";
import crypto from "crypto";
import {
  sendIcoBuyerEmail,
  sendIcoSellerEmail,
} from "@b/api/(ext)/admin/ico/utils";
import { createNotification } from "@b/utils/notifications";

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

export default async (data: Handler) => {
  const { body, user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { offeringId, amount, walletAddress } = body;
  if (!offeringId || !amount || !walletAddress) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }

  // Retrieve the ICO offering record by ID.
  const offering = await models.icoTokenOffering.findByPk(offeringId);
  if (!offering) {
    throw createError({ statusCode: 400, message: "Offering not found" });
  }

  // Get the investor's wallet based on the offering's purchase parameters.
  const wallet = await getWallet(
    user.id,
    offering.purchaseWalletType,
    offering.purchaseWalletCurrency
  );
  if (!wallet || wallet.balance < amount) {
    throw createError({
      statusCode: 400,
      message: "Insufficient wallet balance for investment.",
    });
  }

  // Start a transaction to ensure atomic operations.
  const transaction = await sequelize.transaction();
  try {
    // Lock the wallet record to prevent race conditions.
    const walletForUpdate = await models.wallet.findOne({
      where: { id: wallet.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!walletForUpdate || walletForUpdate.balance < amount) {
      throw createError({
        statusCode: 400,
        message: "Insufficient wallet balance at transaction time.",
      });
    }

    // Deduct the investment amount from the investor's wallet.
    await walletForUpdate.update(
      { balance: walletForUpdate.balance - amount },
      { transaction }
    );

    // Calculate the token amount based on the offering's token price.
    const tokenAmount = amount / offering.tokenPrice;

    // Generate a unique transaction ID.
    const transactionId = crypto.randomBytes(16).toString("hex");

    // Create the icoTransaction record with the provided walletAddress.
    await models.icoTransaction.create(
      {
        userId: user.id,
        offeringId: offering.id,
        amount: tokenAmount,
        price: offering.tokenPrice,
        status: "PENDING",
        transactionId,
        walletAddress,
      },
      { transaction }
    );

    // Update the offering's raised amount and increment the participant count.
    await offering.update(
      {
        participants: offering.participants + 1,
      },
      { transaction }
    );

    // Commit the transaction after successful operations.
    await transaction.commit();

    // --- Send Email Notifications ---
    // Buyer (investor) email notification.
    if (user.email) {
      await sendIcoBuyerEmail(user.email, {
        INVESTOR_NAME: `${user.firstName} ${user.lastName}`,
        OFFERING_NAME: offering.name,
        AMOUNT_INVESTED: amount.toString(),
        TOKEN_AMOUNT: tokenAmount.toString(),
        TOKEN_PRICE: offering.tokenPrice.toString(),
        TRANSACTION_ID: transactionId,
      });
    }
    // Seller (project owner) email notification.
    const owner = await models.user.findByPk(offering.submittedBy);
    if (owner && owner.email) {
      await sendIcoSellerEmail(owner.email, {
        SELLER_NAME: `${owner.firstName} ${owner.lastName}`,
        OFFERING_NAME: offering.name,
        INVESTOR_NAME: `${user.firstName} ${user.lastName}`,
        AMOUNT_INVESTED: amount.toString(),
        TOKEN_AMOUNT: tokenAmount.toString(),
        TRANSACTION_ID: transactionId,
      });
    }
    // --- End Email Notifications ---

    // --- Send In-App Notifications to Both Buyer and Seller ---
    // Notify the investor (buyer)
    try {
      await createNotification({
        userId: user.id,
        relatedId: offering.id,
        type: "investment",
        title: "Investment Received",
        message: `Your investment of $${amount} in ${offering.name} has been received.`,
        details: `You have invested $${amount}, acquiring ${tokenAmount} tokens at a price of $${offering.tokenPrice} per token. Your transaction ID is ${transactionId}.`,
        link: `/ico/investor/transactions/${transactionId}`,
        actions: [
          {
            label: "View Transaction",
            link: `/ico/investor/transactions/${transactionId}`,
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
        userId: offering.submittedBy,
        relatedId: offering.id,
        type: "system",
        title: "New Investment",
        message: `A new investment has been made in your offering ${offering.name}.`,
        details: `Investor ${user.firstName} ${user.lastName} invested $${amount} acquiring ${tokenAmount} tokens. Transaction ID: ${transactionId}.`,
        link: `/ico/creator/token/${offering.id}?tab=transactions`,
        actions: [
          {
            label: "View Transaction",
            link: `/ico/creator/token/${offering.id}?tab=transactions`,
            primary: true,
          },
        ],
      });
    } catch (notifErr) {
      console.error(
        "Failed to create in-app notification for seller",
        notifErr
      );
    }
    // --- End In-App Notifications ---

    // Return a successful response.
    return {
      message: "ICO investment transaction created successfully.",
    };
  } catch (err: any) {
    await transaction.rollback();
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
