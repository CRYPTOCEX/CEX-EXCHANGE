import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { 
  makeDLocalRequest, 
  DLOCAL_STATUS_MAPPING,
  DLocalError 
} from "./utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Verify dLocal payment status",
  description: "Manually verify a dLocal payment status and update transaction accordingly",
  operationId: "verifyDLocalPayment",
  tags: ["Finance", "Verification"],
  requestBody: {
    description: "Payment verification request",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            payment_id: {
              type: "string",
              description: "dLocal payment ID to verify",
            },
            order_id: {
              type: "string",
              description: "Internal order ID to verify",
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Payment verification completed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              payment_id: { type: "string" },
              order_id: { type: "string" },
              status: { type: "string" },
              amount: { type: "number" },
              currency: { type: "string" },
              updated: { type: "boolean" },
              wallet_updated: { type: "boolean" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Payment"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user) throw new Error("User not authenticated");

  const { payment_id, order_id } = body;

  if (!payment_id && !order_id) {
    throw new Error("Either payment_id or order_id is required");
  }

  try {
    // Find transaction
    let transaction;
    if (order_id) {
      transaction = await models.transaction.findOne({
        where: { uuid: order_id },
        include: [
          {
            model: models.user,
            as: "user",
            include: [
              {
                model: models.wallet,
                as: "wallets",
              },
            ],
          },
        ],
      });
    } else if (payment_id) {
      transaction = await models.transaction.findOne({
        where: { referenceId: payment_id },
        include: [
          {
            model: models.user,
            as: "user",
            include: [
              {
                model: models.wallet,
                as: "wallets",
              },
            ],
          },
        ],
      });
    }

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    // Get payment ID from transaction metadata if not provided
    const dLocalPaymentId = payment_id || transaction.metadata?.dlocal_payment_id;
    
    if (!dLocalPaymentId) {
      throw new Error("dLocal payment ID not found in transaction");
    }

    // Query dLocal API for payment status
    const paymentData = await makeDLocalRequest(
      `/payments/${dLocalPaymentId}`,
      "GET"
    );

    console.log(`dLocal payment verification: ${dLocalPaymentId}, status: ${paymentData.status}`);

    // Map dLocal status to internal status
    const internalStatus = DLOCAL_STATUS_MAPPING[paymentData.status] || "pending";
    const previousStatus = transaction.status;
    let walletUpdated = false;

    // Update transaction with latest data
    await transaction.update({
      status: internalStatus.toUpperCase(),
      referenceId: paymentData.id,
      metadata: {
        ...transaction.metadata,
        dlocal_payment_id: paymentData.id,
        dlocal_status: paymentData.status,
        dlocal_status_code: paymentData.status_code,
        dlocal_status_detail: paymentData.status_detail,
        payment_method_type: paymentData.payment_method_type,
        verification_date: new Date().toISOString(),
        verified_by: user.id,
      },
    });

    // Handle successful payment - update wallet if not already done
    if (paymentData.status === "PAID" && previousStatus !== "COMPLETED") {
      const transactionUser = transaction.user;
      const currency = paymentData.currency;

      // Find or create user wallet for this currency
      let wallet = transactionUser.wallets?.find((w) => w.currency === currency);
      
      if (!wallet) {
        wallet = await models.wallet.create({
          userId: transactionUser.id,
          currency: currency,
          type: "FIAT",
          balance: 0,
          inOrder: 0,
        });
      }

      // Calculate the deposit amount (excluding fees)
      const depositAmount = transaction.amount;

      // Update wallet balance
      await wallet.update({
        balance: Number(wallet.balance) + Number(depositAmount),
      });

      walletUpdated = true;
      console.log(`Wallet updated for user ${transactionUser.id}: +${depositAmount} ${currency}`);

      // Log the successful deposit
      console.log(`dLocal deposit verified and completed: ${paymentData.id}, amount: ${depositAmount} ${currency}`);
    }

    return {
      payment_id: paymentData.id,
      order_id: transaction.uuid,
      status: paymentData.status,
      amount: paymentData.amount,
      currency: paymentData.currency,
      updated: true,
      wallet_updated: walletUpdated,
    };

  } catch (error) {
    console.error("dLocal payment verification error:", error);

    if (error instanceof DLocalError) {
      throw new Error(`dLocal API Error: ${error.message}`);
    }
    
    throw new Error(`Payment verification failed: ${error.message}`);
  }
}; 