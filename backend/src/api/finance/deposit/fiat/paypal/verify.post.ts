// /server/api/deposit/paypal/verify.post.ts
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { sendFiatTransactionEmail } from "@b/utils/emails";
import { models, sequelize } from "@b/db";
import { paypalOrdersController } from "./utils";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Verifies a Stripe checkout session",
  description:
    "Confirms the validity of a Stripe checkout session by its session ID, ensuring the session is authenticated and retrieving associated payment intent and line items details.",
  operationId: "verifyStripeCheckoutSession",
  tags: ["Finance", "Deposit"],
  requiresAuth: true,
  logModule: "PAYPAL_DEPOSIT",
  logTitle: "Verify PayPal order",
  parameters: [
    {
      name: "orderId",
      in: "query",
      description: "The PayPal order ID",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    200: {
      description:
        "Checkout session verified successfully. Returns the session ID, payment intent status, and detailed line items.",
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
                  id: { type: "string", description: "Session ID" },
                  status: {
                    type: "string",
                    description: "Payment intent status",
                    nullable: true,
                  },
                  lineItems: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Line item ID" },
                        description: {
                          type: "string",
                          description: "Line item description",
                        },
                        amountSubtotal: {
                          type: "number",
                          description: "Subtotal amount",
                        },
                        amountTotal: {
                          type: "number",
                          description: "Total amount",
                        },
                        currency: {
                          type: "string",
                          description: "Currency code",
                        },
                      },
                    },
                    description:
                      "List of line items associated with the checkout session",
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Paypal"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, query, ctx } = data;

  if (!user?.id) throw new Error("User not authenticated");

  ctx?.step("Fetching user account");
  const userPk = await models.user.findByPk(user.id);
  if (!userPk) throw new Error("User not found");

  const { orderId } = query;

  ctx?.step("Checking for duplicate transaction");
    const existingTransaction = await models.transaction.findOne({
    where: { referenceId: orderId },
  });

  if (existingTransaction) {
      ctx?.warn("Transaction already exists");
      throw new Error("Transaction already exists");
  }

  const ordersController = paypalOrdersController();

  try {
    const { result: captureDetails } = await ordersController.captureOrder({
      id: orderId,
    });

    if (
      !captureDetails.purchaseUnits ||
      captureDetails.purchaseUnits.length === 0
    ) {
      throw new Error("No purchase units found in capture details.");
    }

    const purchaseUnit = captureDetails.purchaseUnits[0];
    const captures = purchaseUnit.payments?.captures;
    if (!captures || captures.length === 0) {
      throw new Error("No captures found in purchase unit.");
    }

    const capture = captures[0];
    const grossAmount = parseFloat(capture.amount?.value || "0");
    const currency = capture.amount?.currencyCode || "";

    ctx?.step("Fetching payment gateway configuration");
  const paypalGateway = await models.depositGateway.findOne({
      where: { name: "PAYPAL" },
    });

    if (!paypalGateway) {
    ctx?.fail("Payment gateway not found");
    throw new Error("PayPal gateway not found");
    }

    // Retrieve the user's wallet
    ctx?.step("Finding or creating wallet");
  let wallet = await models.wallet.findOne({
      where: { userId: user.id, currency: currency },
    });

    if (!wallet) {
      ctx?.step("Creating new wallet");
      wallet = await models.wallet.create({
        userId: user.id,
        currency: currency,
        type: "FIAT",
      });
    }

    ctx?.step("Validating currency");
  const currencyData = await models.currency.findOne({
      where: { id: wallet.currency },
    });
    if (!currencyData) {
    ctx?.fail("Currency not found");
    throw new Error("Currency not found");
    }

    ctx?.step("Calculating fees");
  const fixedFee = paypalGateway.fixedFee || 0;
    const percentageFee = paypalGateway.percentageFee || 0;

    ctx?.step("Calculating fees");
  const taxAmount = Number(
      ((grossAmount * percentageFee) / 100 + fixedFee).toFixed(
        currencyData.precision || 2
      )
    );
    const recievedAmount = Number(
      (grossAmount - taxAmount).toFixed(currencyData.precision || 2)
    );
    let newBalance = Number(wallet.balance);
    newBalance += recievedAmount;
    newBalance = Number(newBalance.toFixed(currencyData.precision || 2));

    // Start a transaction to create a new transaction record and update the wallet balance
    const createdTransaction = await sequelize.transaction(
      async (transaction) => {
        // Create a new transaction record
        ctx?.step("Creating transaction record");
      const newTransaction = await models.transaction.create(
          {
            userId: user.id,
            walletId: wallet.id,
            type: "DEPOSIT",
            amount: recievedAmount,
            fee: taxAmount,
            referenceId: orderId,
            status: "COMPLETED",
            description: `Deposit of ${recievedAmount} ${currency} to ${userPk.firstName} ${userPk.lastName} wallet by PayPal.`,
            metadata: JSON.stringify({ method: "PAYPAL", currency: currency }),
          },
          { transaction }
        );

        // Update the wallet balance
        ctx?.step("Updating wallet balance");
      await models.wallet.update(
          {
            balance: newBalance,
          },
          {
            where: { id: wallet.id },
            transaction,
          }
        );

        // **Admin Profit Recording:**
        // Create an admin profit record if there's a fee involved
        if (taxAmount > 0) {
      ctx?.step("Recording admin profit");
      await models.adminProfit.create(
            {
              amount: taxAmount,
              currency: wallet.currency,
              type: "DEPOSIT",
              transactionId: newTransaction.id,
              description: `Admin profit from PayPal deposit fee of ${taxAmount} ${wallet.currency} for user (${user.id})`,
            },
            { transaction }
          );
        }

        // Assuming you need to return or use the created transaction, you can return it here
        return newTransaction;
      }
    );

    try {
      ctx?.step("Sending notification email");
    await sendFiatTransactionEmail(
        userPk,
        createdTransaction,
        currency,
        newBalance
      );
    } catch (error) {
      logger.error("PAYPAL", "Error sending email", error);
    }

    ctx?.success("Paypal deposit completed successfully");

  return {
      transaction: createdTransaction,
      balance: newBalance.toFixed(2),
      currency,
      method: "PAYPAL",
    };
  } catch (error) {
    logger.error("PAYPAL", "Error verifying PayPal order", error);
    throw new Error(`Error verifying PayPal order: ${error.message}`);
  }
};
