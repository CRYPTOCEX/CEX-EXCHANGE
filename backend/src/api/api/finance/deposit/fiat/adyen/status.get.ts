import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Checks Adyen payment status",
  description:
    "Retrieves the current status of an Adyen payment by transaction reference. This endpoint provides real-time payment status information for tracking and reconciliation purposes.",
  operationId: "checkAdyenPaymentStatus",
  tags: ["Finance", "Deposit"],
  parameters: [
    {
      name: "reference",
      in: "query",
      required: true,
      schema: {
        type: "string",
        description: "Transaction reference to check status for",
      },
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
              reference: {
                type: "string",
                description: "Transaction reference",
              },
              status: {
                type: "string",
                description: "Current payment status",
              },
              amount: {
                type: "number",
                description: "Payment amount",
              },
              currency: {
                type: "string",
                description: "Payment currency",
              },
              fee: {
                type: "number",
                description: "Transaction fee",
                nullable: true,
              },
              pspReference: {
                type: "string",
                description: "Adyen PSP reference",
                nullable: true,
              },
              sessionId: {
                type: "string",
                description: "Adyen session ID",
                nullable: true,
              },
              createdAt: {
                type: "string",
                description: "Transaction creation timestamp",
              },
              updatedAt: {
                type: "string",
                description: "Transaction last update timestamp",
              },
              metadata: {
                type: "object",
                description: "Additional transaction metadata",
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
  if (!user) throw new Error("User not authenticated");

  const { reference } = query;

  if (!reference) {
    throw new Error("Transaction reference is required");
  }

  try {
    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        uuid: reference,
        userId: user.id,
        type: "DEPOSIT",
      },
    });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    // Extract metadata
    const metadata = transaction.metadata as any;
    const gateway = metadata?.gateway;

    if (gateway !== "adyen") {
      throw new Error("Transaction is not an Adyen payment");
    }

    // Return transaction status
    return {
      reference: transaction.uuid,
      status: transaction.status,
      amount: transaction.amount,
      currency: metadata?.currency || "USD",
      fee: transaction.fee,
      pspReference: metadata?.pspReference || null,
      sessionId: metadata?.sessionId || null,
      resultCode: metadata?.resultCode || null,
      eventCode: metadata?.eventCode || null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      metadata: {
        gateway: metadata?.gateway,
        originalAmount: metadata?.originalAmount,
        feeAmount: metadata?.feeAmount,
        countryCode: metadata?.countryCode,
        verifiedAt: metadata?.verifiedAt,
        verificationMethod: metadata?.verificationMethod,
        webhookProcessedAt: metadata?.webhookProcessedAt,
        captureProcessedAt: metadata?.captureProcessedAt,
        captureSuccess: metadata?.captureSuccess,
        cancelledAt: metadata?.cancelledAt,
      },
    };
  } catch (error) {
    console.error("Adyen payment status check error:", error);
    throw new Error(`Failed to check payment status: ${error.message}`);
  }
}; 