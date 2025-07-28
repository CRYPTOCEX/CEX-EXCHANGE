import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { use2Checkout, verify2CheckoutSignature } from "./utils";

export const metadata: OperationObject = {
  summary: "Verifies a 2Checkout payment",
  description:
    "Verifies a 2Checkout payment using the order reference and updates the transaction status accordingly",
  operationId: "verify2CheckoutPayment",
  tags: ["Finance", "Deposit"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            orderReference: {
              type: "string",
              description: "2Checkout order reference",
            },
            refNo: {
              type: "string", 
              description: "2Checkout reference number",
            },
            signature: {
              type: "string",
              description: "2Checkout signature for verification",
            },
            status: {
              type: "string",
              description: "Payment status from 2Checkout",
            },
          },
          required: ["orderReference", "refNo"],
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
              success: { type: "boolean" },
              transaction: { type: "object" },
              message: { type: "string" },
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
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { orderReference, refNo, signature, status } = body;

  try {
    const config = use2Checkout();

    // Find the transaction by order reference
    const transaction = await models.transaction.findOne({
      where: {
        userId: user.id,
        description: {
          [Op.like]: `%${orderReference}%`,
        },
        status: "PENDING",
      },
      include: [
        {
          model: models.wallet,
          as: "wallet",
        },
      ],
    });

    if (!transaction) {
      throw createError({
        statusCode: 404,
        message: "Transaction not found or already processed",
      });
    }

    // Verify signature if provided
    if (signature) {
      const verificationParams = {
        orderReference,
        refNo,
        status: status || "COMPLETE",
      };

      const isValidSignature = verify2CheckoutSignature(
        verificationParams,
        signature,
        config.secretKey
      );

      if (!isValidSignature) {
        throw createError({
          statusCode: 400,
          message: "Invalid signature",
        });
      }
    }

    // Update transaction based on status
    const isSuccessful = status === "COMPLETE" || status === "AUTHRECEIVED";
    
    await sequelize.transaction(async (t) => {
      if (isSuccessful) {
        // Update transaction status to completed
        await transaction.update(
          {
            status: "COMPLETED",
            metadata: JSON.stringify({
              ...JSON.parse(transaction.metadata || "{}"),
              refNo,
              orderReference,
              gateway: "2checkout",
              verifiedAt: new Date().toISOString(),
            }),
          },
          { transaction: t }
        );

        // Update wallet balance
        const wallet = transaction.wallet;
        if (wallet) {
          const newBalance = parseFloat(wallet.balance) + parseFloat(transaction.amount) - parseFloat(transaction.fee || "0");
          await wallet.update(
            { balance: newBalance },
            { transaction: t }
          );
        }
      } else {
        // Update transaction status to failed
        await transaction.update(
          {
            status: "FAILED",
            metadata: JSON.stringify({
              ...JSON.parse(transaction.metadata || "{}"),
              refNo,
              orderReference,
              gateway: "2checkout",
              failureReason: status,
              verifiedAt: new Date().toISOString(),
            }),
          },
          { transaction: t }
        );
      }
    });

    return {
      success: isSuccessful,
      transaction: await transaction.reload(),
      message: isSuccessful 
        ? "Payment verified and processed successfully"
        : `Payment failed with status: ${status}`,
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: `Error verifying 2Checkout payment: ${error.message}`,
    });
  }
}; 