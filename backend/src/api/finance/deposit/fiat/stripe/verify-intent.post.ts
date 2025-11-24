import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { useStripe } from "./utils";
import { models, sequelize } from "@b/db";
import { sendFiatTransactionEmail } from "@b/utils/emails";

export const metadata: OperationObject = {
  summary: "Verifies a Stripe payment intent",
  description: "Confirms a completed Stripe payment intent and creates the corresponding wallet transaction",
  operationId: "verifyStripePaymentIntent",
  tags: ["Finance", "Deposit"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "intentId",
      in: "query",
      description: "Stripe payment intent ID (pi_xxxxx)",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Payment intent verified successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              transaction: {
                type: "object",
                description: "Created transaction object"
              },
              balance: {
                type: "number", 
                description: "Updated wallet balance"
              },
              currency: {
                type: "string",
                description: "Transaction currency"
              },
              method: {
                type: "string",
                description: "Payment method"
              },
              status: {
                type: "string",
                description: "Verification status"
              }
            }
          }
        }
      }
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Payment Intent"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user) throw new Error("User not authenticated");

  const { intentId } = query;
  const stripe = useStripe();

  try {
    // 1. Retrieve the Payment Intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(intentId);
    
    // 2. Check if payment succeeded
    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment intent status: ${paymentIntent.status}`);
    }

    // 3. Check for existing transaction to prevent duplicates
    const existingTransaction = await models.transaction.findOne({
      where: { referenceId: intentId },
    });

    if (existingTransaction) {
      return {
        transaction: existingTransaction,
        status: 'already_processed',
        message: 'Transaction already exists'
      };
    }

    // 4. Calculate amounts (same logic as checkout sessions)
    const totalAmount = paymentIntent.amount / 100; // Convert from cents
    const currency = paymentIntent.currency.toUpperCase();
    
    // Get gateway to calculate fees
    const gateway = await models.depositGateway.findOne({
      where: { alias: "stripe", status: true },
    });
    
    if (!gateway) throw new Error("Stripe gateway not found");
    
    const { fixedFee, percentageFee } = gateway;
    const fee = (totalAmount * (percentageFee || 0)) / 100 + (fixedFee || 0);
    const depositAmount = totalAmount - fee;

    // 5. Find or create user wallet
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

    // Get currency data for precision
    const currencyData = await models.currency.findOne({
      where: { id: wallet.currency },
    });
    if (!currencyData) {
      throw new Error("Currency not found");
    }

    let newBalance = wallet.balance + depositAmount;
    newBalance = parseFloat(newBalance.toFixed(currencyData.precision || 2));

    // 6. Create transaction and update wallet (use database transaction)
    const result = await sequelize.transaction(async (t) => {
      // Create transaction record
      const newTransaction = await models.transaction.create(
        {
          userId: user.id,
          walletId: wallet.id,
          type: "DEPOSIT",
          amount: depositAmount,
          fee,
          referenceId: intentId,
          status: "COMPLETED",
          metadata: JSON.stringify({
            method: "STRIPE_PAYMENT_INTENT",
            paymentIntentId: intentId,
            stripeAmount: totalAmount,
          }),
          description: `Stripe payment intent deposit of ${depositAmount} ${currency}`,
        } as transactionCreationAttributes,
        { transaction: t }
      );

      // Update wallet balance
      await models.wallet.update(
        { balance: newBalance },
        { where: { id: wallet.id }, transaction: t }
      );

      // Record admin profit if there's a fee
      if (fee > 0) {
        await models.adminProfit.create(
          {
            amount: fee,
            currency: wallet.currency,
            type: "DEPOSIT",
            transactionId: newTransaction.id,
            description: `Admin profit from Stripe payment intent fee of ${fee} ${currency} for user (${user.id})`,
          },
          { transaction: t }
        );
      }

      return newTransaction;
    });

    // 7. Send email notification
    const userPk = await models.user.findByPk(user.id);
    try {
      await sendFiatTransactionEmail(userPk, result, currency, newBalance);
    } catch (error) {
      console.error("Error sending email:", error);
    }

    return {
      transaction: result,
      balance: newBalance,
      currency,
      method: "Stripe Payment Intent",
      status: "succeeded"
    };

  } catch (error) {
    throw new Error(`Error verifying payment intent: ${error.message}`);
  }
}; 