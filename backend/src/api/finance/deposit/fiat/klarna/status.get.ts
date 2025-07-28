import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { 
  makeKlarnaRequest,
  KLARNA_STATUS_MAPPING,
  KlarnaError,
  type KlarnaOrder
} from "./utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Checks Klarna order status",
  description:
    "Retrieves the current status of a Klarna order and updates the local transaction record.",
  operationId: "checkKlarnaOrderStatus",
  tags: ["Finance", "Deposit"],
  parameters: [
    {
      name: "order_id",
      in: "query",
      description: "Klarna order ID to check status for",
      required: true,
      schema: {
        type: "string",
      },
    },
    {
      name: "transaction_id",
      in: "query", 
      description: "Local transaction ID (optional, for validation)",
      required: false,
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    200: {
      description: "Order status retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              order_id: {
                type: "string",
                description: "Klarna order ID",
              },
              status: {
                type: "string",
                description: "Current order status",
              },
              fraud_status: {
                type: "string",
                description: "Fraud check status",
                nullable: true,
              },
              klarna_reference: {
                type: "string",
                description: "Klarna reference number",
                nullable: true,
              },
              order_amount: {
                type: "number",
                description: "Order amount in minor units",
              },
              purchase_currency: {
                type: "string",
                description: "Purchase currency",
              },
              remaining_authorized_amount: {
                type: "number",
                description: "Remaining authorized amount",
                nullable: true,
              },
              captured_amount: {
                type: "number", 
                description: "Amount captured",
                nullable: true,
              },
              refunded_amount: {
                type: "number",
                description: "Amount refunded",
                nullable: true,
              },
              expires_at: {
                type: "string",
                description: "Authorization expiration time",
                nullable: true,
              },
              local_status: {
                type: "string",
                description: "Local transaction status",
              },
              transaction_id: {
                type: "string",
                description: "Local transaction ID",
                nullable: true,
              },
              updated_at: {
                type: "string",
                description: "Last update timestamp",
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid order ID or request parameters",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: { type: "string" },
              details: { type: "object" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Order"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user) throw new Error("User not authenticated");

  const { order_id, transaction_id } = query;

  if (!order_id) {
    throw new Error("Order ID is required");
  }

  try {
    // Find the local transaction first
    const whereClause: any = {
      userId: user.id,
      type: "DEPOSIT",
    };

    if (transaction_id) {
      whereClause.id = transaction_id;
    }

    const transaction = await models.transaction.findOne({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const transactionMetadata = JSON.parse(transaction.metadata || "{}");

    // Validate that the order belongs to this transaction
    if (transactionMetadata.order_id && transactionMetadata.order_id !== order_id) {
      throw new Error("Order ID does not match transaction");
    }

    let orderDetails: KlarnaOrder | null = null;
    let apiError: string | null = null;

    // Try to get current status from Klarna
    try {
      orderDetails = await makeKlarnaRequest(
        `/ordermanagement/v1/orders/${order_id}`,
        "GET"
      );
    } catch (error) {
      console.error(`Failed to retrieve Klarna order ${order_id}:`, error);
      apiError = error instanceof KlarnaError ? error.message : "API request failed";
    }

    if (orderDetails) {
      // Update local transaction with latest status
      const updatedMetadata = {
        ...transactionMetadata,
        order_id: orderDetails.order_id || order_id,
        klarna_reference: orderDetails.klarna_reference,
        current_klarna_status: orderDetails.status,
        fraud_status: orderDetails.fraud_status,
        remaining_authorized_amount: (orderDetails as any).remaining_authorized_amount,
        captured_amount: (orderDetails as any).captured_amount,
        refunded_amount: (orderDetails as any).refunded_amount,
        expires_at: (orderDetails as any).expires_at,
        status_checked_at: new Date().toISOString(),
      };

      // Map Klarna status to internal status
      const mappedStatus = orderDetails.status ? KLARNA_STATUS_MAPPING[orderDetails.status] || transaction.status : transaction.status;

      // Update transaction if status changed
      if (mappedStatus !== transaction.status) {
        await models.transaction.update(
          {
            status: mappedStatus,
            metadata: JSON.stringify(updatedMetadata),
          },
          {
            where: { id: transaction.id },
          }
        );
        
        console.log(`Updated transaction ${transaction.id} status from ${transaction.status} to ${mappedStatus}`);
      } else {
        // Just update metadata
        await models.transaction.update(
          {
            metadata: JSON.stringify(updatedMetadata),
          },
          {
            where: { id: transaction.id },
          }
        );
      }

      return {
        order_id: orderDetails.order_id || order_id,
        status: orderDetails.status,
        fraud_status: orderDetails.fraud_status,
        klarna_reference: orderDetails.klarna_reference,
        order_amount: orderDetails.order_amount,
        purchase_currency: orderDetails.purchase_currency,
        remaining_authorized_amount: (orderDetails as any).remaining_authorized_amount,
        captured_amount: (orderDetails as any).captured_amount,
        refunded_amount: (orderDetails as any).refunded_amount,
        expires_at: (orderDetails as any).expires_at,
        local_status: mappedStatus,
        transaction_id: transaction.id,
        updated_at: new Date().toISOString(),
      };

    } else {
      // API failed, return local status
      console.log(`Using local status for order ${order_id} due to API error: ${apiError}`);

      return {
        order_id,
        status: transactionMetadata.current_klarna_status || "UNKNOWN",
        fraud_status: transactionMetadata.fraud_status,
        klarna_reference: transactionMetadata.klarna_reference,
        order_amount: Math.round(transaction.amount * 100), // Convert to minor units
        purchase_currency: transactionMetadata.purchase_currency,
        remaining_authorized_amount: transactionMetadata.remaining_authorized_amount,
        captured_amount: transactionMetadata.captured_amount,
        refunded_amount: transactionMetadata.refunded_amount,
        expires_at: transactionMetadata.expires_at,
        local_status: transaction.status,
        transaction_id: transaction.id,
        updated_at: transactionMetadata.status_checked_at || transaction.updatedAt,
        api_error: apiError,
        note: "Status retrieved from local database due to API unavailability",
      };
    }

  } catch (error) {
    if (error instanceof KlarnaError) {
      throw new Error(`Klarna status check failed: ${error.message}`);
    }
    throw new Error(`Status check failed: ${error.message}`);
  }
};