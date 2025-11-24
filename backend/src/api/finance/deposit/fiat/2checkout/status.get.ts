import { models } from "@b/db";
import { Op } from "sequelize";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Check 2Checkout payment status",
  description:
    "Retrieves the current status of a 2Checkout payment using the order reference",
  operationId: "check2CheckoutStatus",
  tags: ["Finance", "Deposit"],
  parameters: [
    {
      name: "orderReference",
      in: "query",
      required: true,
      schema: {
        type: "string",
      },
      description: "2Checkout order reference to check status for",
    },
  ],
  responses: {
    200: {
      description: "Payment status retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["PENDING", "COMPLETED", "FAILED"],
                description: "Current transaction status",
              },
              transaction: {
                type: "object",
                description: "Transaction details",
              },
              paymentDetails: {
                type: "object",
                description: "2Checkout payment details from metadata",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Transaction"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { orderReference } = query;

  if (!orderReference) {
    throw createError({
      statusCode: 400,
      message: "Order reference is required",
    });
  }

  try {
    // Find the transaction by order reference
    const transaction = await models.transaction.findOne({
      where: {
        userId: user.id,
        description: {
          [Op.like]: `%${orderReference}%`,
        },
        type: "DEPOSIT",
      },
      include: [
        {
          model: models.wallet,
          as: "wallet",
          attributes: ["id", "currency", "balance"],
        },
      ],
      order: [["createdAt", "DESC"]], // Get the most recent transaction
    });

    if (!transaction) {
      throw createError({
        statusCode: 404,
        message: "Transaction not found",
      });
    }

    // Parse metadata to extract payment details
    let paymentDetails = {};
    try {
      const metadata = JSON.parse(transaction.metadata || "{}");
      paymentDetails = {
        gateway: metadata.gateway,
        refNo: metadata.refNo,
        orderNo: metadata.orderNo,
        externalReference: metadata.externalReference,
        orderStatus: metadata.orderStatus,
        paymentStatus: metadata.paymentStatus,
        processedAt: metadata.processedAt,
        verifiedAt: metadata.verifiedAt,
        failureReason: metadata.failureReason,
      };
    } catch (error) {
      console.error("Error parsing transaction metadata:", error);
    }

    return {
      status: transaction.status,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        fee: transaction.fee,
        currency: transaction.wallet?.currency,
        description: transaction.description,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
      paymentDetails,
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: `Error checking payment status: ${error.message}`,
    });
  }
}; 