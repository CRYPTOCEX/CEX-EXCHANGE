import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Get Authorize.Net transaction status",
  description:
    "Retrieves the current status of an Authorize.Net transaction by its reference ID.",
  operationId: "getAuthorizeNetTransactionStatus",
  tags: ["Finance", "Deposit"],
  requiresAuth: true,
  parameters: [
    {
      name: "referenceId",
      in: "query",
      description: "The transaction reference ID",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    200: {
      description:
        "Transaction status retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              status: {
                type: "boolean",
                description: "Indicates if the request was successful",
              },
              statusCode: {
                type: "number",
                description: "HTTP status code",
                example: 200,
              },
              data: {
                type: "object",
                properties: {
                  transactionId: {
                    type: "string",
                    description: "Transaction ID",
                  },
                  referenceId: {
                    type: "string",
                    description: "Transaction reference ID",
                  },
                  status: {
                    type: "string",
                    description: "Transaction status",
                    enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"],
                  },
                  amount: {
                    type: "number",
                    description: "Transaction amount",
                  },
                  currency: {
                    type: "string",
                    description: "Currency code",
                  },
                  fee: {
                    type: "number",
                    description: "Transaction fee",
                  },
                  createdAt: {
                    type: "string",
                    format: "date-time",
                    description: "Transaction creation timestamp",
                  },
                  updatedAt: {
                    type: "string",
                    format: "date-time",
                    description: "Transaction last update timestamp",
                  },
                },
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
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) throw new Error("User not authenticated");

  const { referenceId } = query;

  if (!referenceId) {
    throw new Error("Reference ID is required");
  }

  try {
    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: { 
        referenceId: referenceId,
        userId: user.id 
      },
    });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const metadata = JSON.parse(transaction.metadata || "{}");

    return {
      status: true,
      statusCode: 200,
      data: {
        transactionId: transaction.id,
        referenceId: transaction.referenceId,
        status: transaction.status,
        amount: transaction.amount,
        currency: metadata.currency,
        fee: transaction.fee,
        description: transaction.description,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        metadata: {
          method: metadata.method,
          totalAmount: metadata.totalAmount,
          authorizationId: metadata.authorizationId,
          captureId: metadata.captureId,
          responseCode: metadata.responseCode,
          fraudStatus: metadata.fraudStatus,
        },
      },
    };

  } catch (error) {
    console.error("Authorize.Net status check error:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to get transaction status");
  }
}; 