import { 
  verifyWebhookSignature, 
  getDLocalConfig, 
  DLOCAL_STATUS_MAPPING,
  DLocalWebhookPayload 
} from "./utils";
import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "dLocal webhook handler",
  description: "Handles payment notifications from dLocal with HMAC signature verification",
  operationId: "dLocalWebhook",
  tags: ["Finance", "Webhook"],
  requestBody: {
    description: "dLocal webhook payload",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            id: { type: "string" },
            amount: { type: "number" },
            currency: { type: "string" },
            payment_method_id: { type: "string" },
            payment_method_type: { type: "string" },
            country: { type: "string" },
            status: { type: "string" },
            status_code: { type: "number" },
            status_detail: { type: "string" },
            order_id: { type: "string" },
            created_date: { type: "string" },
            approved_date: { type: "string", nullable: true },
            live: { type: "boolean" },
          },
          required: ["id", "amount", "currency", "status", "order_id"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Webhook processed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              status: { type: "string" },
            },
          },
        },
      },
    },
    400: {
      description: "Bad request or invalid signature",
    },
    404: {
      description: "Transaction not found",
    },
    500: {
      description: "Internal server error",
    },
  },
  requiresAuth: false,
};

export default async (data: Handler) => {
  const { body, headers } = data;

  try {
    // Get dLocal configuration
    const config = getDLocalConfig();

    // Extract headers for signature verification
    const xDate = headers["x-date"] as string;
    const authorization = headers["authorization"] as string;

    if (!xDate || !authorization) {
      throw new Error("Missing required headers for signature verification");
    }

    // Verify webhook signature
    const requestBody = JSON.stringify(body);
    const isValidSignature = verifyWebhookSignature(
      authorization,
      config.xLogin,
      xDate,
      requestBody,
      config.secretKey
    );

    if (!isValidSignature) {
      console.error("dLocal webhook signature verification failed");
      throw new Error("Invalid webhook signature");
    }

    const payload: DLocalWebhookPayload = body;
    
    console.log(`dLocal webhook received for payment ${payload.id}, order ${payload.order_id}, status: ${payload.status}`);

    // Find the transaction by order ID
    const transaction = await models.transaction.findOne({
      where: { uuid: payload.order_id },
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

    if (!transaction) {
      console.error(`Transaction not found for order ID: ${payload.order_id}`);
      throw new Error("Transaction not found");
    }

    // Map dLocal status to internal status
    const internalStatus = DLOCAL_STATUS_MAPPING[payload.status] || "pending";
    const previousStatus = transaction.status;

    // Update transaction with webhook data
    await transaction.update({
      status: internalStatus.toUpperCase(),
      metadata: {
        ...transaction.metadata,
        dlocal_payment_id: payload.id,
        dlocal_status: payload.status,
        dlocal_status_code: payload.status_code,
        dlocal_status_detail: payload.status_detail,
        payment_method_type: payload.payment_method_type,
        approved_date: payload.approved_date,
        webhook_received_at: new Date().toISOString(),
        live: payload.live,
      },
    });

    // Handle successful payment
    if (payload.status === "PAID" && previousStatus !== "COMPLETED") {
      const user = transaction.user;
      const currency = payload.currency;

      // Find or create user wallet for this currency
      let wallet = user.wallets?.find((w) => w.currency === currency);
      
      if (!wallet) {
        wallet = await models.wallet.create({
          userId: user.id,
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

      console.log(`Wallet updated for user ${user.id}: +${depositAmount} ${currency}`);

      // Send email notification
      try {
        // TODO: Implement email notification
        console.log(`Email notification should be sent to ${user.email} for successful deposit`);
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }

      // Log the successful deposit
      console.log(`dLocal deposit completed: ${payload.id}, amount: ${depositAmount} ${currency}, user: ${user.id}`);
    }

    // Handle failed payment
    if (["REJECTED", "CANCELLED", "EXPIRED"].includes(payload.status)) {
      console.log(`dLocal payment failed: ${payload.id}, status: ${payload.status}, detail: ${payload.status_detail}`);
      
      // TODO: Send failure notification email
      try {
        console.log(`Failure notification should be sent to ${transaction.user.email}`);
      } catch (emailError) {
        console.error("Failed to send failure notification:", emailError);
      }
    }

    // Handle refunds
    if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(payload.status)) {
      console.log(`dLocal payment refunded: ${payload.id}, status: ${payload.status}`);
      
      // TODO: Handle refund logic - deduct from wallet if needed
      // This would depend on the refund amount provided in the webhook
    }

    // Handle chargebacks
    if (payload.status === "CHARGEBACK") {
      console.log(`dLocal payment chargeback: ${payload.id}`);
      
      // TODO: Handle chargeback logic - may need to deduct from wallet
      // and notify relevant teams
    }

    return {
      message: "Webhook processed successfully",
      status: "ok",
    };

  } catch (error) {
    console.error("dLocal webhook processing error:", error);
    
    // Return error response
    throw new Error(error.message || "Webhook processing failed");
  }
}; 