import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import {
  getAdyenConfig,
  makeAdyenApiRequest,
  convertFromMinorUnits,
  AdyenPaymentResponse,
} from "./utils";
import { models } from "@b/db";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Verifies an Adyen payment",
  description:
    "Manually verifies an Adyen payment by checking the payment status and updating the transaction accordingly. This endpoint is used for manual verification when automatic webhook processing is not available.",
  operationId: "verifyAdyenPayment",
  tags: ["Finance", "Deposit"],
  requestBody: {
    description: "Payment verification data",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            reference: {
              type: "string",
              description: "Transaction reference",
            },
            pspReference: {
              type: "string",
              description: "Adyen PSP reference",
              nullable: true,
            },
          },
          required: ["reference"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Payment verification completed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                description: "Whether the verification was successful",
              },
              status: {
                type: "string",
                description: "Payment status",
              },
              message: {
                type: "string",
                description: "Verification message",
              },
              transaction: {
                type: "object",
                description: "Updated transaction details",
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
  const { user, body } = data;
  if (!user) throw new Error("User not authenticated");

  const { reference, pspReference } = body;

  try {
    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        uuid: reference,
        userId: user.id,
        type: "DEPOSIT",
        status: {
          [Op.in]: ["PENDING", "PROCESSING"],
        },
      },
    });

    if (!transaction) {
      throw new Error("Transaction not found or already processed");
    }

    // Get Adyen configuration
    const config = getAdyenConfig();

    let paymentData: AdyenPaymentResponse;

    if (pspReference) {
      // If PSP reference is provided, query payment details directly
      try {
        const paymentDetailsRequest = {
          pspReference,
        };

        paymentData = await makeAdyenApiRequest(
          "/payments/details",
          paymentDetailsRequest,
          config
        );
      } catch (error) {
        throw new Error(`Failed to fetch payment details: ${error.message}`);
      }
    } else {
      // If no PSP reference, we need to check if we have it in metadata
      const metadata = transaction.metadata as any;
      if (metadata?.pspReference) {
        const paymentDetailsRequest = {
          pspReference: metadata.pspReference,
        };

        paymentData = await makeAdyenApiRequest(
          "/payments/details",
          paymentDetailsRequest,
          config
        );
      } else {
        throw new Error(
          "PSP reference not provided and not found in transaction metadata"
        );
      }
    }

    // Process payment result
    const resultCode = paymentData.resultCode;
    let newStatus: string;
    let shouldUpdateWallet = false;

    switch (resultCode) {
      case "Authorised":
        newStatus = "COMPLETED";
        shouldUpdateWallet = true;
        break;
      case "Cancelled":
      case "Error":
      case "Refused":
        newStatus = "FAILED";
        break;
      case "Pending":
      case "Received":
        newStatus = "PROCESSING";
        break;
      default:
        newStatus = "FAILED";
        break;
    }

    // Update transaction
    const updatedTransaction = await models.transaction.update(
      {
        status: newStatus,
        metadata: {
          ...transaction.metadata,
          pspReference: paymentData.pspReference,
          resultCode,
          verifiedAt: new Date().toISOString(),
          verificationMethod: "manual",
        },
      },
      {
        where: { id: transaction.id },
        returning: true,
      }
    );

    // Update wallet if payment was successful
    if (shouldUpdateWallet) {
      const wallet = await models.wallet.findOne({
        where: {
          userId: user.id,
          currency: (transaction.metadata as any)?.currency || "USD",
          type: "FIAT",
        },
      });

      if (wallet) {
        await wallet.increment("balance", {
          by: transaction.amount - (transaction.fee || 0),
        });
      } else {
        // Create wallet if it doesn't exist
        await models.wallet.create({
          userId: user.id,
          type: "FIAT",
          currency: (transaction.metadata as any)?.currency || "USD",
          balance: transaction.amount - (transaction.fee || 0),
        });
      }

      // Create wallet transaction record
      await models.walletTransaction.create({
        walletId: wallet?.id,
        type: "DEPOSIT",
        amount: transaction.amount - (transaction.fee || 0),
        balance: wallet ? wallet.balance + (transaction.amount - (transaction.fee || 0)) : transaction.amount - (transaction.fee || 0),
        description: `Adyen deposit verification - ${reference}`,
        metadata: {
          transactionId: transaction.id,
          gateway: "adyen",
          pspReference: paymentData.pspReference,
        },
      });
    }

    return {
      success: shouldUpdateWallet,
      status: newStatus,
      message: shouldUpdateWallet
        ? "Payment verified and wallet updated successfully"
        : `Payment verification completed with status: ${resultCode}`,
      transaction: updatedTransaction[1][0],
      pspReference: paymentData.pspReference,
      resultCode,
    };
  } catch (error) {
    console.error("Adyen payment verification error:", error);
    throw new Error(`Payment verification failed: ${error.message}`);
  }
}; 