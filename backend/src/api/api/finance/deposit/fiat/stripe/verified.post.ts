// /server/api/deposit/stripeVerify.post.ts

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { useStripe } from "./utils";
import { models, sequelize } from "@b/db";
import { sendFiatTransactionEmail } from "@b/utils/emails";

export const metadata: OperationObject = {
  summary: "Verifies a Stripe checkout session",
  description:
    "Confirms the validity of a Stripe checkout session by its session ID, ensuring the session is authenticated and retrieving associated payment intent and line items details.",
  operationId: "verifyStripeCheckoutSession",
  tags: ["Finance", "Deposit"],
  requiresAuth: true,
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
  const { user, query } = data;
  if (!user) throw new Error("User not authenticated");

  const { sessionId } = query;
  const stripe = useStripe();

  try {
    // Retrieve the Checkout Session
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

    if (status === "succeeded") {
      const userPk = await models.user.findByPk(user.id);

      const existingTransaction = await models.transaction.findOne({
        where: { referenceId: sessionId },
      });

      if (existingTransaction)
        return {
          id: session.id,
          status,
          line_items: mappedLineItems,
        };

      const { currency, amount } = mappedLineItems[0];

      let wallet = await models.wallet.findOne({
        where: { userId: user.id, currency, type: "FIAT" },
      });

      if (!wallet) {
        wallet = await models.wallet.create({
          userId: user.id,
          currency,
          type: "FIAT",
        });
      }

      const currencyData = await models.currency.findOne({
        where: { id: wallet.currency },
      });
      if (!currencyData) {
        throw new Error("Currency not found");
      }

      const fee = mappedLineItems[1]?.amount || 0;
      let newBalance = wallet.balance;
      newBalance += Number(amount);
      newBalance = parseFloat(newBalance.toFixed(currencyData.precision || 2));

      // Sequelize transaction
      const result = await sequelize.transaction(async (t) => {
        // Create a new transaction
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
        // Create an admin profit record if there's a fee associated with the Stripe deposit
        if (fee > 0) {
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
        await sendFiatTransactionEmail(userPk, result, currency, newBalance);
      } catch (error) {
        console.error("Error sending email:", error);
      }
    }

    return {
      id: session.id,
      status,
      line_items: mappedLineItems,
    };
  } catch (error) {
    throw new Error(
      `Error retrieving session and line items: ${error.message}`
    );
  }
};
