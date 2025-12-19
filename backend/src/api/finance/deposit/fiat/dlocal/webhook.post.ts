import {
  verifyWebhookSignature,
  getDLocalConfig,
  DLOCAL_STATUS_MAPPING,
  DLocalWebhookPayload
} from "./utils";
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "dLocal webhook handler",
  description: "Handles payment notifications from dLocal with HMAC signature verification",
  operationId: "dLocalWebhook",
  tags: ["Finance", "Webhook"],
  logModule: "WEBHOOK",
  logTitle: "dLocal webhook",
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
  const { body, headers, ctx } = data;

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
      logger.error("DLOCAL", "Webhook signature verification failed");
      throw new Error("Invalid webhook signature");
    }

    const payload: DLocalWebhookPayload = body;

    logger.info("DLOCAL", `Webhook received for payment ${payload.id}, order ${payload.order_id}, status: ${payload.status}`);

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
      logger.error("DLOCAL", `Transaction not found for order ID: ${payload.order_id}`);
      throw new Error("Transaction not found");
    }

    // Map dLocal status to internal status
    const internalStatus = DLOCAL_STATUS_MAPPING[payload.status] || "pending";
    const previousStatus = transaction.status;

    // Update transaction with webhook data
    await transaction.update({
      status: internalStatus.toUpperCase(),
      metadata: JSON.stringify({
        ...transaction.metadata,
        dlocal_payment_id: payload.id,
        dlocal_status: payload.status,
        dlocal_status_code: payload.status_code,
        dlocal_status_detail: payload.status_detail,
        payment_method_type: payload.payment_method_type,
        approved_date: payload.approved_date,
        webhook_received_at: new Date().toISOString(),
        live: payload.live,
      }),
    });

    // Handle successful payment
    if (payload.status === "PAID" && previousStatus !== "COMPLETED") {
      const user = transaction.user;
      const currency = payload.currency;

      // Find or create user wallet for this currency
      let wallet = user.wallets?.find((w) => w.currency === currency);
      
      if (!wallet) {
      ctx?.step("Creating new wallet");
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

      logger.success("DLOCAL", `Wallet updated for user ${user.id}: +${depositAmount} ${currency}`);

      // Send email notification
      try {
        await models.notification.create({
          userId: user.id,
          type: "alert",
          title: "Deposit Successful",
          message: `Your deposit of ${depositAmount} ${currency} via dLocal has been approved and credited to your wallet.`,
          link: "/wallet",
          read: false,
        });

        // TODO: Email service integration - when email service is configured, send email here
        logger.info("DLOCAL", `Email notification queued for ${user.email} - successful deposit of ${depositAmount} ${currency}`);
      } catch (emailError) {
        logger.error("DLOCAL", "Failed to send email notification", emailError);
      }

      // Log the successful deposit
      logger.success("DLOCAL", `Deposit completed: ${payload.id}, amount: ${depositAmount} ${currency}, user: ${user.id}`);
    }

    // Handle failed payment
    if (["REJECTED", "CANCELLED", "EXPIRED"].includes(payload.status)) {
      logger.warn("DLOCAL", `Payment failed: ${payload.id}, status: ${payload.status}, detail: ${payload.status_detail}`);

      // Send failure notification
      try {
        await models.notification.create({
          userId: transaction.user.id,
          type: "alert",
          title: "Deposit Failed",
          message: `Your dLocal deposit has failed. Status: ${payload.status}. ${payload.status_detail || "Please contact support for assistance."}`,
          link: "/wallet",
          read: false,
        });

        // TODO: Email service integration - when email service is configured, send email here
        logger.info("DLOCAL", `Failure notification queued for ${transaction.user.email} - deposit ${payload.id} failed`);
      } catch (emailError) {
        logger.error("DLOCAL", "Failed to send failure notification", emailError);
      }
    }

    // Handle refunds
    if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(payload.status) && previousStatus === "COMPLETED") {
      logger.info("DLOCAL", `Payment refunded: ${payload.id}, status: ${payload.status}`);

      const user = transaction.user;
      const currency = payload.currency;
      const refundAmount = payload.amount; // Full or partial amount from webhook

      // Find user wallet for this currency
      const wallet = user.wallets?.find((w) => w.currency === currency);

      if (wallet) {
        // Deduct refund amount from wallet balance
        const newBalance = Number(wallet.balance) - Number(refundAmount);

        await wallet.update({
          balance: Math.max(0, newBalance), // Don't allow negative balance
        });

        logger.info("DLOCAL", `Wallet updated for user ${user.id}: -${refundAmount} ${currency} (refund)`);

        // Notify user about refund
        try {
          await models.notification.create({
            userId: user.id,
            type: "alert",
            title: payload.status === "REFUNDED" ? "Deposit Refunded" : "Deposit Partially Refunded",
            message: `Your dLocal deposit of ${refundAmount} ${currency} has been ${payload.status === "REFUNDED" ? "fully" : "partially"} refunded and deducted from your wallet. ${payload.status_detail || ""}`,
            link: "/wallet",
            read: false,
          });
        } catch (notifError) {
          logger.error("DLOCAL", "Failed to send refund notification", notifError);
        }

        // Notify admins about refund
        try {
          const admins = await models.user.findAll({
            include: [{
              model: models.role,
              as: "role",
              where: {
                name: ["Admin", "Super Admin"],
              },
            }],
            attributes: ["id"],
          });

          const adminNotifications = admins.map(admin => ({
            userId: admin.id,
            type: "alert",
            title: "Deposit Refund Processed",
            message: `dLocal deposit refund processed: ${refundAmount} ${currency} for user ${user.id}. Payment ID: ${payload.id}`,
            link: `/admin/finance/transactions`,
            read: false,
          }));

          if (adminNotifications.length > 0) {
            await models.notification.bulkCreate(adminNotifications);
          }
        } catch (adminNotifError) {
          logger.error("DLOCAL", "Failed to send admin refund notification", adminNotifError);
        }
      } else {
        logger.error("DLOCAL", `Wallet not found for refund: user ${user.id}, currency ${currency}`);
      }
    }

    // Handle chargebacks
    if (payload.status === "CHARGEBACK" && previousStatus === "COMPLETED") {
      logger.warn("DLOCAL", `Payment chargeback: ${payload.id}`);

      const user = transaction.user;
      const currency = payload.currency;
      const chargebackAmount = payload.amount;

      // Find user wallet for this currency
      const wallet = user.wallets?.find((w) => w.currency === currency);

      if (wallet) {
        // Deduct chargeback amount from wallet balance
        const newBalance = Number(wallet.balance) - Number(chargebackAmount);

        await wallet.update({
          balance: Math.max(0, newBalance), // Don't allow negative balance
        });

        logger.warn("DLOCAL", `Wallet updated for user ${user.id}: -${chargebackAmount} ${currency} (chargeback)`);

        // Notify user about chargeback
        try {
          await models.notification.create({
            userId: user.id,
            type: "alert",
            title: "Deposit Chargeback",
            message: `Your dLocal deposit of ${chargebackAmount} ${currency} has been charged back and deducted from your wallet. ${payload.status_detail || "Please contact support if you have questions."}`,
            link: "/wallet",
            read: false,
          });
        } catch (notifError) {
          logger.error("DLOCAL", "Failed to send chargeback notification", notifError);
        }

        // Notify admins about chargeback - critical issue
        try {
          const admins = await models.user.findAll({
            include: [{
              model: models.role,
              as: "role",
              where: {
                name: ["Admin", "Super Admin"],
              },
            }],
            attributes: ["id", "email"],
          });

          const adminNotifications = admins.map(admin => ({
            userId: admin.id,
            type: "alert",
            title: "CRITICAL: Deposit Chargeback",
            message: `dLocal deposit chargeback detected: ${chargebackAmount} ${currency} for user ${user.id} (${user.email}). Payment ID: ${payload.id}. Immediate review required.`,
            link: `/admin/finance/transactions`,
            read: false,
          }));

          if (adminNotifications.length > 0) {
            await models.notification.bulkCreate(adminNotifications);
          }

          logger.warn("DLOCAL", `Admin chargeback notifications sent for payment ${payload.id}`);
        } catch (adminNotifError) {
          logger.error("DLOCAL", "Failed to send admin chargeback notification", adminNotifError);
        }
      } else {
        logger.error("DLOCAL", `Wallet not found for chargeback: user ${user.id}, currency ${currency}`);

        // Critical: notify admins even if wallet not found
        try {
          const admins = await models.user.findAll({
            include: [{
              model: models.role,
              as: "role",
              where: {
                name: ["Admin", "Super Admin"],
              },
            }],
            attributes: ["id"],
          });

          const adminNotifications = admins.map(admin => ({
            userId: admin.id,
            type: "alert",
            title: "CRITICAL: Chargeback Wallet Not Found",
            message: `Cannot process chargeback: wallet not found for user ${user.id}, currency ${currency}. Payment ID: ${payload.id}. Manual intervention required.`,
            link: `/admin/finance/transactions`,
            read: false,
          }));

          if (adminNotifications.length > 0) {
            await models.notification.bulkCreate(adminNotifications);
          }
        } catch (adminNotifError) {
          logger.error("DLOCAL", "Failed to send critical admin notification", adminNotifError);
        }
      }
    }

    return {
      message: "Webhook processed successfully",
      status: "ok",
    };

  } catch (error) {
    logger.error("DLOCAL", "Webhook processing error", error);

    // Return error response
    throw new Error(error.message || "Webhook processing failed");
  }
}; 