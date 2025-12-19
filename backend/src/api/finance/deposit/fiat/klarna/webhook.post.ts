import {
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";

import {
  makeKlarnaRequest,
  KLARNA_STATUS_MAPPING,
  KlarnaError,
  type KlarnaOrder
} from "./utils";
import { models, sequelize } from "@b/db";
import { sendFiatTransactionEmail } from "@b/utils/emails";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Handles Klarna webhook notifications",
  description:
    "Processes webhook notifications from Klarna for order status updates and payment confirmations.",
  operationId: "klarnaWebhook",
  tags: ["Finance", "Webhook"],
  logModule: "WEBHOOK",
  logTitle: "Klarna webhook",
  requestBody: {
    description: "Klarna webhook notification data",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            order_id: {
              type: "string",
              description: "Klarna order ID",
            },
            event_type: {
              type: "string",
              description: "Type of webhook event",
            },
            event_id: {
              type: "string", 
              description: "Unique event identifier",
            },
            timestamp: {
              type: "string",
              description: "Event timestamp",
            },
          },
          required: ["order_id", "event_type"],
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
              status: {
                type: "string",
                description: "Processing status",
              },
              message: {
                type: "string",
                description: "Response message",
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid webhook data",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    404: notFoundMetadataResponse("Order"),
    500: serverErrorResponse,
  },
  requiresAuth: false,
};

export default async (data: Handler) => {
  const { body, headers, ctx } = data;
  
  logger.info("KLARNA", `Webhook received - event: ${body.event_type}, order: ${body.order_id}`);

  const { order_id, event_type, event_id, timestamp } = body;

  if (!order_id || !event_type) {
    throw new Error("Missing required webhook data: order_id and event_type");
  }

  try {
    // Find the transaction associated with this order
    const transaction = await models.transaction.findOne({
      where: {
        type: "DEPOSIT",
        status: ["PENDING", "PROCESSING"],
      },
      include: [
        {
          model: models.user,
          as: "user",
          required: true,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!transaction) {
      logger.warn("KLARNA", `No pending transaction found for order: ${order_id}`);
      ctx?.success("Klarna deposit completed successfully");

  return {
        status: "ignored",
        message: "No matching transaction found",
      };
    }

    const transactionMetadata = JSON.parse(transaction.metadata || "{}");
    
    // Check if this order belongs to this transaction
    if (transactionMetadata.order_id !== order_id) {
      logger.debug("KLARNA", `Order ID mismatch: expected ${transactionMetadata.order_id}, got ${order_id}`);
      return {
        status: "ignored", 
        message: "Order ID does not match transaction",
      };
    }

    // Check for duplicate processing
    if (transactionMetadata.processed_events &&
        transactionMetadata.processed_events.includes(event_id)) {
      logger.debug("KLARNA", `Event ${event_id} already processed for order ${order_id}`);
      return {
        status: "duplicate",
        message: "Event already processed",
      };
    }

    // Get current order status from Klarna
    const orderDetails: KlarnaOrder = await makeKlarnaRequest(
      `/ordermanagement/v1/orders/${order_id}`,
      "GET"
    );

    if (!orderDetails) {
      throw new Error(`Failed to retrieve order details for ${order_id}`);
    }

    logger.info("KLARNA", `Order ${order_id} status: ${orderDetails.status}`);

    // Map Klarna status to our internal status
    const mappedStatus = orderDetails.status ? KLARNA_STATUS_MAPPING[orderDetails.status] || "PENDING" : "PENDING";

    // Update transaction metadata with event processing
    const updatedMetadata = {
      ...transactionMetadata,
      last_event_type: event_type,
      last_event_id: event_id,
      last_event_timestamp: timestamp,
      current_klarna_status: orderDetails.status,
      processed_events: [
        ...(transactionMetadata.processed_events || []),
        event_id
      ],
      webhook_updated_at: new Date().toISOString(),
    };

    // Process based on order status
    if (mappedStatus === "COMPLETED" || orderDetails.status === "CAPTURED") {
      // Payment successful - complete the transaction
      const user = transaction.user;
      const currency = transactionMetadata.purchase_currency;

      // Find or create wallet
      ctx?.step("Finding or creating wallet");
  let wallet = await models.wallet.findOne({
        where: { userId: user.id, currency, type: "FIAT" },
      });

      if (!wallet) {
      ctx?.step("Creating new wallet");
      wallet = await models.wallet.create({
          userId: user.id,
          currency,
          type: "FIAT",
        });
      }

      ctx?.step("Validating currency");
  const currencyData = await models.currency.findOne({
        where: { id: wallet.currency },
      });

      if (!currencyData) {
    ctx?.fail("Currency not found");
    throw new Error("Currency not found");
      }

      const depositAmount = transaction.amount - transaction.fee;
      let newBalance = wallet.balance + depositAmount;
      newBalance = parseFloat(newBalance.toFixed(currencyData.precision || 2));

      // Use database transaction for consistency
      await sequelize.transaction(async (t) => {
        // Update transaction status
        await models.transaction.update(
          {
            status: "COMPLETED",
            metadata: JSON.stringify({
              ...updatedMetadata,
              completed_at: new Date().toISOString(),
            }),
            description: `Klarna deposit of ${depositAmount} ${currency} completed by ${user.firstName} ${user.lastName}`,
          },
          {
            where: { id: transaction.id },
            transaction: t,
          }
        );

        // Update wallet balance
        ctx?.step("Updating wallet balance");
      await models.wallet.update(
          { balance: newBalance },
          {
            where: { id: wallet.id },
            transaction: t,
          }
        );

        // Record admin profit if fee > 0
        if (transaction.fee > 0) {
          await models.adminProfit.create(
            {
              amount: transaction.fee,
              currency: wallet.currency,
              type: "DEPOSIT",
              description: `Klarna deposit fee from ${user.firstName} ${user.lastName}`,
            },
            { transaction: t }
          );
        }
      });

      // Send confirmation email
      try {
        ctx?.step("Sending notification email");
    await sendFiatTransactionEmail(
          user,
          {
            ...transaction.dataValues,
            type: "DEPOSIT",
            amount: depositAmount,
            status: "COMPLETED",
            description: `Klarna deposit of ${depositAmount} ${currency} completed`,
          },
          currency,
          newBalance
        );
      } catch (emailError) {
        logger.error("KLARNA", "Failed to send confirmation email", emailError);
        // Don't throw error for email failure
      }

      logger.success("KLARNA", `Payment completed for user ${user.id}, order ${order_id}`);

      return {
        status: "completed",
        message: "Payment processed successfully",
        order_id,
        transaction_id: transaction.id,
      };

    } else if (mappedStatus === "FAILED" || orderDetails.status === "CANCELLED") {
      // Payment failed - update transaction
      await models.transaction.update(
        {
          status: "FAILED",
          metadata: JSON.stringify({
            ...updatedMetadata,
            failure_reason: `Klarna order status: ${orderDetails.status}`,
            failed_at: new Date().toISOString(),
          }),
        },
        {
          where: { id: transaction.id },
        }
      );

      logger.warn("KLARNA", `Payment failed for order ${order_id}, status: ${orderDetails.status}`);

      return {
        status: "failed",
        message: "Payment failed",
        order_id,
        reason: orderDetails.status,
      };

    } else {
      // Status update - just update metadata
      await models.transaction.update(
        {
          metadata: JSON.stringify(updatedMetadata),
        },
        {
          where: { id: transaction.id },
        }
      );

      logger.info("KLARNA", `Order ${order_id} status updated to: ${orderDetails.status}`);

      return {
        status: "updated",
        message: "Status updated",
        order_id,
        current_status: orderDetails.status,
      };
    }

  } catch (error) {
    logger.error("KLARNA", "Webhook processing error", error);
    
    if (error instanceof KlarnaError) {
      throw new Error(`Klarna webhook error: ${error.message}`);
    }
    
    throw new Error(`Webhook processing failed: ${error.message}`);
  }
};