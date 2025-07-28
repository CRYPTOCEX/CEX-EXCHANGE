import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import { use2Checkout, verify2CheckoutSignature } from "./utils";

export const metadata: OperationObject = {
  summary: "2Checkout IPN webhook handler",
  description:
    "Handles Instant Payment Notifications (IPN) from 2Checkout to automatically process payment status updates",
  operationId: "handle2CheckoutWebhook",
  tags: ["Finance", "Webhook"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          description: "2Checkout IPN payload",
        },
      },
      "application/x-www-form-urlencoded": {
        schema: {
          type: "object",
          description: "2Checkout IPN form data",
        },
      },
    },
  },
  responses: {
    200: {
      description: "IPN processed successfully",
      content: {
        "text/plain": {
          schema: {
            type: "string",
            example: "OK",
          },
        },
      },
    },
    400: {
      description: "Invalid IPN data",
    },
    500: {
      description: "Server error processing IPN",
    },
  },
  requiresAuth: false,
};

export default async (data: Handler) => {
  const { body } = data;

  try {
    const config = use2Checkout();

    // Extract IPN data - 2Checkout sends form-encoded data
    const ipnData = body;
    
    // Required IPN fields for verification
    const {
      REFNO,
      ORDERNO,
      EXTERNAL_REFERENCE,
      ORDER_STATUS,
      PAYMENT_STATUS,
      SIGNATURE,
      TIMESTAMP,
      CURRENCY,
      TOTAL,
    } = ipnData;

    if (!REFNO && !ORDERNO) {
      console.error("2Checkout IPN: Missing required reference number");
      return { statusCode: 400, body: "Missing reference number" };
    }

    // Verify IPN signature
    if (SIGNATURE) {
      const verificationParams = {
        REFNO: REFNO || "",
        ORDERNO: ORDERNO || "",
        EXTERNAL_REFERENCE: EXTERNAL_REFERENCE || "",
        ORDER_STATUS: ORDER_STATUS || "",
        PAYMENT_STATUS: PAYMENT_STATUS || "",
        TIMESTAMP: TIMESTAMP || "",
        CURRENCY: CURRENCY || "",
        TOTAL: TOTAL || "",
      };

      const isValidSignature = verify2CheckoutSignature(
        verificationParams,
        SIGNATURE,
        config.secretKey
      );

      if (!isValidSignature) {
        console.error("2Checkout IPN: Invalid signature");
        return { statusCode: 400, body: "Invalid signature" };
      }
    }

    // Find transaction by external reference or order number
    const whereCondition = EXTERNAL_REFERENCE
      ? {
          description: {
            [Op.like]: `%${EXTERNAL_REFERENCE}%`,
          },
        }
      : {
          metadata: {
            [Op.like]: `%${REFNO || ORDERNO}%`,
          },
        };

    const transaction = await models.transaction.findOne({
      where: {
        ...whereCondition,
        type: "DEPOSIT",
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
      console.log(`2Checkout IPN: Transaction not found for reference ${EXTERNAL_REFERENCE || REFNO || ORDERNO}`);
      return { statusCode: 200, body: "OK" }; // Return OK to prevent retries
    }

    // Determine if payment is successful
    const isSuccessful = 
      ORDER_STATUS === "COMPLETE" || 
      ORDER_STATUS === "AUTHRECEIVED" ||
      PAYMENT_STATUS === "COMPLETE" ||
      PAYMENT_STATUS === "AUTHRECEIVED";

    // Update transaction in database
    await sequelize.transaction(async (t) => {
      if (isSuccessful) {
        // Update transaction status to completed
        await transaction.update(
          {
            status: "COMPLETED",
            metadata: JSON.stringify({
              ...JSON.parse(transaction.metadata || "{}"),
              refNo: REFNO,
              orderNo: ORDERNO,
              externalReference: EXTERNAL_REFERENCE,
              orderStatus: ORDER_STATUS,
              paymentStatus: PAYMENT_STATUS,
              gateway: "2checkout",
              ipnTimestamp: TIMESTAMP,
              processedAt: new Date().toISOString(),
              ipnData: ipnData,
            }),
          },
          { transaction: t }
        );

        // Update wallet balance
        const wallet = transaction.wallet;
        if (wallet) {
          const depositAmount = parseFloat(transaction.amount);
          const feeAmount = parseFloat(transaction.fee || "0");
          const netAmount = depositAmount - feeAmount;
          const newBalance = parseFloat(wallet.balance) + netAmount;
          
          await wallet.update(
            { balance: newBalance },
            { transaction: t }
          );

          console.log(`2Checkout IPN: Wallet ${wallet.id} balance updated by ${netAmount} ${wallet.currency}`);
        }

        console.log(`2Checkout IPN: Transaction ${transaction.id} completed successfully`);
      } else {
        // Update transaction status to failed
        await transaction.update(
          {
            status: "FAILED",
            metadata: JSON.stringify({
              ...JSON.parse(transaction.metadata || "{}"),
              refNo: REFNO,
              orderNo: ORDERNO,
              externalReference: EXTERNAL_REFERENCE,
              orderStatus: ORDER_STATUS,
              paymentStatus: PAYMENT_STATUS,
              gateway: "2checkout",
              ipnTimestamp: TIMESTAMP,
              failureReason: `Order status: ${ORDER_STATUS}, Payment status: ${PAYMENT_STATUS}`,
              processedAt: new Date().toISOString(),
              ipnData: ipnData,
            }),
          },
          { transaction: t }
        );

        console.log(`2Checkout IPN: Transaction ${transaction.id} marked as failed`);
      }
    });

    // Return success response to 2Checkout
    return { statusCode: 200, body: "OK" };

  } catch (error) {
    console.error("2Checkout IPN Error:", error);
    return { statusCode: 500, body: "Internal Server Error" };
  }
}; 