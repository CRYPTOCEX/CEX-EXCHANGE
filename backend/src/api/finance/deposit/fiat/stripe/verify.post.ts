// /server/api/deposit/stripeVerify.post.ts

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { useStripe } from "./utils";
import { models, sequelize } from "@b/db";
import { sendFiatTransactionEmail } from "@b/utils/emails";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Verifies a Stripe checkout session",
  description:
    "Confirms the validity of a Stripe checkout session by its session ID, ensuring the session is authenticated and retrieving associated payment intent and line items details.",
  operationId: "verifyStripeCheckoutSession",
  tags: ["Finance", "Deposit"],
  requiresAuth: true,
  logModule: "STRIPE_DEPOSIT",
  logTitle: "Verify Stripe checkout session",
  parameters: [
    {
      index: 0,
      name: "sessionId",
      in: "query",
      description: "Stripe checkout session ID",
      required: true,
      schema: { type: "string" },
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
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Stripe"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, query, ctx } = data;

  if (!user) throw new Error("User not authenticated");

  const { sessionId } = query;
  const stripe = useStripe();

  try {
    // Retrieve the Checkout Session
    ctx?.step("Retrieving Stripe checkout session");
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paymentIntentId = session.payment_intent;

    // Retrieve the associated Payment Intent, if needed
    const paymentIntent = paymentIntentId
      ? await stripe.paymentIntents.retrieve(paymentIntentId as string)
      : null;

    // Retrieve all line items for the session
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);

    // Map line items to the desired format
    const mappedLineItems = lineItems.data.map((item) => ({
      id: item.id,
      description: item.description,
      currency: item.currency,
      amount: item.amount_subtotal / 100,
    }));

    const status = paymentIntent ? paymentIntent.status : "unknown";

    // Check payment status before processing
    if (status === "canceled") {
      throw new Error("Payment was canceled by the user");
    }

    if (status === "requires_payment_method" || status === "requires_confirmation") {
      throw new Error("Payment was not completed");
    }

    if (status !== "succeeded") {
      ctx?.fail("Payment not succeeded");
      throw new Error(`Payment intent not succeeded. Status: ${status}`);
    }

    if (status === "succeeded") {
      ctx?.step("Fetching user account");
  const userPk = await models.user.findByPk(user.id);
      if (!userPk) {
    ctx?.fail("User not found");
    throw new Error("User not found");
      }

      ctx?.step("Checking for duplicate transaction");
    const existingTransaction = await models.transaction.findOne({
        where: { referenceId: sessionId },
      });

      if (existingTransaction) throw new Error("Transaction already exists");

      const { currency, amount } = mappedLineItems[0];

      ctx?.step("Finding or creating wallet");
  let wallet = await models.wallet.findOne({
        where: { userId: user.id, currency, type: "FIAT" },
      });

      if (!wallet) {
      ctx?.step("Creating new wallet");
      wallet = await models.wallet.create({
          userId: user.id,
          currency,
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
  const fee = mappedLineItems[1]?.amount || 0;
      let newBalance = wallet.balance;
      newBalance += Number(amount);
      newBalance = parseFloat(newBalance.toFixed(currencyData.precision || 2));

      // Sequelize transaction
      ctx?.step("Starting database transaction");
    const result = await sequelize.transaction(async (t) => {
        // Create a new transaction
        ctx?.step("Creating transaction record");
      const newTransaction = await models.transaction.create(
          {
            userId: user.id,
            walletId: wallet.id,
            type: "DEPOSIT",
            amount,
            fee,
            referenceId: sessionId,
            status: "COMPLETED",
            metadata: JSON.stringify({
              method: "STRIPE",
            }),
            description: `Deposit of ${amount} ${currency} to ${userPk?.firstName} ${userPk?.lastName} wallet by Stripe.`,
          } as transactionCreationAttributes,
          { transaction: t }
        );

        // Update the wallet's balance
        ctx?.step("Updating wallet balance");
      await models.wallet.update(
          {
            balance: newBalance,
          },
          {
            where: { id: wallet.id },
            transaction: t,
          }
        );

        // **Admin Profit Recording:**
        if (fee > 0) {
      ctx?.step("Recording admin profit");
      await models.adminProfit.create(
            {
              amount: fee,
              currency: wallet.currency,
              type: "DEPOSIT",
              transactionId: newTransaction.id,
              description: `Admin profit from Stripe deposit fee of ${fee} ${wallet.currency} for user (${user.id})`,
            },
            { transaction: t }
          );
        }

        return newTransaction;
      });

      try {
        ctx?.step("Sending notification email");
    await sendFiatTransactionEmail(userPk, result, currency, newBalance);
      } catch (error) {
        logger.error("STRIPE", "Error sending email", error);
      }

      ctx?.success("Stripe deposit completed successfully");

  return {
        transaction: result,
        balance: newBalance,
        currency,
        method: "Stripe",
      };
    }

  } catch (error) {
    throw new Error(
      `Error retrieving session and line items: ${error.message}`
    );
  }
};
