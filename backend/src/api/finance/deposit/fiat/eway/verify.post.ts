import {
  notFoundMetadataResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { logger } from "@b/utils/console";
import {
  makeEwayRequest,
  EWAY_STATUS_MAPPING,
  EwayTransactionQueryResponse,
  EwayError
} from "./utils";
import { models } from "@b/db";
import { sendFiatTransactionEmail } from "@b/utils/emails";

export const metadata: OperationObject = {
  summary: "Verify eWAY payment status",
  description: "Verify an eWAY payment status using access code and update transaction accordingly",
  operationId: "verifyEwayPayment",
  tags: ["Finance", "Verification"],
  logModule: "EWAY_DEPOSIT",
  logTitle: "Verify eWAY payment",
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
  const { user, body, ctx } = data;

  if (!user?.id) {
    ctx?.fail("User not authenticated");
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
      logger.error("EWAY", "Verification error", ewayResponse.Errors);

      // Update transaction status to failed
      await transaction.update({
        status: "FAILED",
        metadata: JSON.stringify({
          ...transaction.metadata,
          eway_errors: ewayResponse.Errors,
          eway_response_code: ewayResponse.ResponseCode,
          eway_response_message: ewayResponse.ResponseMessage,
          verified_at: new Date().toISOString(),
        }),
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

      // Send notification email using email utility
      try {
        const currency = transaction.metadata?.currency || 'AUD';
        const newBalance = wallet.balance;
        ctx?.step("Sending notification email");
    await sendFiatTransactionEmail(user, transaction, currency, newBalance);
      } catch (emailError) {
        logger.error("EWAY", "Failed to send deposit confirmation email", emailError);
      }
    }

    // Update transaction with eWAY response
    await transaction.update({
      status: newStatus,
      metadata: JSON.stringify({
        ...transaction.metadata,
        eway_transaction_id: ewayResponse.TransactionID,
        eway_authorisation_code: ewayResponse.AuthorisationCode,
        eway_response_code: ewayResponse.ResponseCode,
        eway_response_message: ewayResponse.ResponseMessage,
        eway_transaction_type: ewayResponse.TransactionType,
        eway_beagle_score: ewayResponse.BeagleScore,
        verified_at: new Date().toISOString(),
      }),
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
    logger.error("EWAY", "Verification error", error);

    if (error instanceof EwayError) {
      throw new Error(`eWAY Error: ${error.message}`);
    }
    
    throw new Error(error.message || "Failed to verify eWAY payment");
  }
}; 