import {
  notFoundMetadataResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { 
  makeEwayRequest, 
  EWAY_STATUS_MAPPING,
  EwayTransactionQueryResponse,
  EwayError 
} from "./utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Verify eWAY payment status",
  description: "Verify an eWAY payment status using access code and update transaction accordingly",
  operationId: "verifyEwayPayment",
  tags: ["Finance", "Verification"],
  requestBody: {
    description: "Payment verification request",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            access_code: {
              type: "string",
              description: "eWAY access code from redirect",
            },
            transaction_id: {
              type: "string", 
              description: "Internal transaction ID",
            },
            reference: {
              type: "string",
              description: "Payment reference ID",
            },
          },
          required: ["access_code"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Payment verification result",
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
                  status: { type: "string" },
                  amount: { type: "number" },
                  currency: { type: "string" },
                  gateway_transaction_id: { type: "string" },
                  authorisation_code: { type: "string" },
                  response_code: { type: "string" },
                  response_message: { type: "string" },
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
  const { user, body } = data;
  if (!user?.id) {
    throw new Error("User not authenticated");
  }

  try {
    const { access_code, transaction_id, reference } = body;

    if (!access_code) {
      throw new Error("Access code is required");
    }

    // Find transaction by ID or reference
    let transaction;
    if (transaction_id) {
      transaction = await models.transaction.findOne({
        where: { 
          id: transaction_id, 
          userId: user.id,
          status: "PENDING" 
        },
        include: [{ model: models.wallet, as: "wallet" }],
      });
    } else if (reference) {
      transaction = await models.transaction.findOne({
        where: { 
          referenceId: reference, 
          userId: user.id,
          status: "PENDING" 
        },
        include: [{ model: models.wallet, as: "wallet" }],
      });
    }

    if (!transaction) {
      throw new Error("Transaction not found or already processed");
    }

    // Query eWAY for transaction details
    const ewayResponse = await makeEwayRequest(
      `/GetAccessCodeResult/${access_code}`,
      "GET"
    ) as EwayTransactionQueryResponse;

    if (ewayResponse.Errors) {
      console.error("eWAY verification error:", ewayResponse.Errors);
      
      // Update transaction status to failed
      await transaction.update({
        status: "FAILED",
        metadata: {
          ...transaction.metadata,
          eway_errors: ewayResponse.Errors,
          eway_response_code: ewayResponse.ResponseCode,
          eway_response_message: ewayResponse.ResponseMessage,
          verified_at: new Date().toISOString(),
        },
      });

      return {
        success: false,
        data: {
          transaction_id: transaction.id,
          status: "FAILED",
          amount: transaction.amount,
          currency: transaction.metadata.currency,
          response_code: ewayResponse.ResponseCode,
          response_message: ewayResponse.ResponseMessage,
          errors: ewayResponse.Errors,
        },
      };
    }

    // Check if payment was successful
    const isSuccessful = ewayResponse.TransactionStatus === true;
    const newStatus = isSuccessful ? "COMPLETED" : "FAILED";

    if (isSuccessful) {
      // Update wallet balance
      const wallet = transaction.wallet;
      await wallet.update({
        balance: Number(wallet.balance) + Number(transaction.amount),
      });

      // Send notification email
      try {
        await models.mailWizard.create({
          userId: user.id,
          type: "DEPOSIT_CONFIRMATION",
          subject: "Deposit Confirmation - eWAY",
          body: `Your deposit of ${transaction.amount} ${transaction.metadata.currency} has been successfully processed via eWAY.`,
          status: "PENDING",
        });
      } catch (emailError) {
        console.error("Failed to send deposit confirmation email:", emailError);
      }
    }

    // Update transaction with eWAY response
    await transaction.update({
      status: newStatus,
      metadata: {
        ...transaction.metadata,
        eway_transaction_id: ewayResponse.TransactionID,
        eway_authorisation_code: ewayResponse.AuthorisationCode,
        eway_response_code: ewayResponse.ResponseCode,
        eway_response_message: ewayResponse.ResponseMessage,
        eway_transaction_type: ewayResponse.TransactionType,
        eway_beagle_score: ewayResponse.BeagleScore,
        verified_at: new Date().toISOString(),
      },
    });

    return {
      success: true,
      data: {
        transaction_id: transaction.id,
        status: newStatus,
        amount: transaction.amount,
        currency: transaction.metadata.currency,
        gateway_transaction_id: ewayResponse.TransactionID?.toString(),
        authorisation_code: ewayResponse.AuthorisationCode,
        response_code: ewayResponse.ResponseCode,
        response_message: ewayResponse.ResponseMessage,
        beagle_score: ewayResponse.BeagleScore,
      },
    };

  } catch (error) {
    console.error("eWAY verification error:", error);
    
    if (error instanceof EwayError) {
      throw new Error(`eWAY Error: ${error.message}`);
    }
    
    throw new Error(error.message || "Failed to verify eWAY payment");
  }
}; 