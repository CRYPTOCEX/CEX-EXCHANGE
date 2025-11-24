import {
  notFoundMetadataResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { 
  makeEwayRequest, 
  EwayTransactionQueryResponse,
  EwayError 
} from "./utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Get eWAY payment status",
  description: "Retrieve current payment status from eWAY API without updating local database",
  operationId: "getEwayPaymentStatus",
  tags: ["Finance", "Status"],
  parameters: [
    {
      name: "access_code",
      in: "query",
      description: "eWAY access code to check",
      schema: { type: "string" },
    },
    {
      name: "transaction_id", 
      in: "query",
      description: "eWAY transaction ID to check",
      schema: { type: "string" },
    },
    {
      name: "reference",
      in: "query",
      description: "Internal reference ID to check",
      schema: { type: "string" },
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
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  transaction_id: { type: "string" },
                  transaction_status: { type: "boolean" },
                  transaction_type: { type: "string" },
                  authorisation_code: { type: "string" },
                  response_code: { type: "string" },
                  response_message: { type: "string" },
                  amount: { type: "number" },
                  currency: { type: "string" },
                  customer: { type: "object" },
                  beagle_score: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid request parameters",
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Transaction"),
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) {
    throw new Error("User not authenticated");
  }

  try {
    const { access_code, transaction_id, reference } = query;

    if (!access_code && !transaction_id && !reference) {
      throw new Error("Access code, transaction ID, or reference is required");
    }

    let ewayResponse: EwayTransactionQueryResponse;

    if (access_code) {
      // Query by access code
      ewayResponse = await makeEwayRequest(
        `/GetAccessCodeResult/${access_code}`,
        "GET"
      ) as EwayTransactionQueryResponse;
    } else if (transaction_id) {
      // Query by transaction ID
      ewayResponse = await makeEwayRequest(
        `/Transaction/${transaction_id}`,
        "GET"
      ) as EwayTransactionQueryResponse;
    } else {
      // Find transaction by reference to get eWAY transaction ID
      const transaction = await models.transaction.findOne({
        where: { 
          referenceId: reference, 
          userId: user.id 
        },
      });

      if (!transaction || !transaction.metadata?.eway_transaction_id) {
        throw new Error("Transaction not found or does not have eWAY transaction ID");
      }

      ewayResponse = await makeEwayRequest(
        `/Transaction/${transaction.metadata.eway_transaction_id}`,
        "GET"
      ) as EwayTransactionQueryResponse;
    }

    if (ewayResponse.Errors) {
      throw new EwayError("eWAY API Error", 400, { errors: ewayResponse.Errors });
    }

    return {
      success: true,
      data: {
        transaction_id: ewayResponse.TransactionID?.toString(),
        transaction_status: ewayResponse.TransactionStatus,
        transaction_type: ewayResponse.TransactionType,
        authorisation_code: ewayResponse.AuthorisationCode,
        response_code: ewayResponse.ResponseCode,
        response_message: ewayResponse.ResponseMessage,
        amount: ewayResponse.Payment?.TotalAmount,
        currency: ewayResponse.Payment?.CurrencyCode,
        customer: ewayResponse.Customer,
        beagle_score: ewayResponse.BeagleScore,
        transaction_datetime: ewayResponse.TransactionDateTime,
        max_refund: ewayResponse.MaxRefund,
        original_transaction_id: ewayResponse.OriginalTransactionId,
        source: ewayResponse.Source,
      },
    };

  } catch (error) {
    console.error("eWAY status check error:", error);
    
    if (error instanceof EwayError) {
      throw new Error(`eWAY Error: ${error.message}`);
    }
    
    throw new Error(error.message || "Failed to check eWAY payment status");
  }
}; 