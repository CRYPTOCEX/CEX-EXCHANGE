import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { 
  makeKlarnaRequest,
  convertFromKlarnaAmount,
  KLARNA_STATUS_MAPPING,
  KlarnaError,
  type KlarnaOrder,
  type KlarnaAuthorization
} from "./utils";
import { models, sequelize } from "@b/db";
import { sendFiatTransactionEmail } from "@b/utils/emails";

export const metadata: OperationObject = {
  summary: "Verifies and creates a Klarna order",
  description:
    "Handles the return URL from Klarna checkout, verifies the authorization token, and creates an order to complete the payment process.",
  operationId: "verifyKlarnaPayment",
  tags: ["Finance", "Deposit"],
  requestBody: {
    description: "Authorization token from Klarna checkout",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            authorization_token: {
              type: "string",
              description: "Authorization token from Klarna checkout",
            },
            session_id: {
              type: "string",
              description: "Klarna session ID",
              nullable: true,
            },
          },
          required: ["authorization_token"],
        },
      },
    },
  },
  responses: {
    200: {
      description:
        "Klarna payment verified and order created successfully. Returns order details and payment status.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              order_id: {
                type: "string",
                description: "Klarna order ID",
              },
              status: {
                type: "string",
                description: "Order status",
              },
              fraud_status: {
                type: "string",
                description: "Fraud check status",
              },
              klarna_reference: {
                type: "string",
                description: "Klarna reference number",
              },
              order_amount: {
                type: "number",
                description: "Order amount in minor units",
              },
              purchase_currency: {
                type: "string",
                description: "Purchase currency",
              },
              payment_method: {
                type: "object",
                description: "Selected payment method details",
              },
              transaction_id: {
                type: "string",
                description: "Local transaction ID",
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid authorization token or payment failed",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: { type: "string" },
              details: { type: "object" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Klarna"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user) throw new Error("User not authenticated");

  const { authorization_token, session_id } = body;

  if (!authorization_token) {
    throw new Error("Authorization token is required");
  }

  try {
    // First, get the authorization details
    const authResponse: KlarnaAuthorization = await makeKlarnaRequest(
      `/payments/v1/authorizations/${authorization_token}`,
      "GET"
    );

    if (!authResponse) {
      throw new Error("Failed to retrieve authorization details");
    }

    // Find the pending transaction
    const transaction = await models.transaction.findOne({
      where: { 
        userId: user.id,
        referenceId: session_id || authorization_token,
        status: "PENDING",
        type: "DEPOSIT"
      },
      order: [["createdAt", "DESC"]],
    });

    if (!transaction) {
      throw new Error("No pending transaction found for this authorization");
    }

    const transactionMetadata = JSON.parse(transaction.metadata || "{}");

    // Create order with Klarna
    const orderData = {
      purchase_country: transactionMetadata.purchase_country,
      purchase_currency: transactionMetadata.purchase_currency,
      locale: transactionMetadata.locale || "en-US",
      order_amount: Math.round(transaction.amount * 100), // Convert to minor units
      order_lines: [
        {
          type: "physical",
          reference: "deposit",
          name: "Account Deposit",
          quantity: 1,
          unit_price: Math.round((transaction.amount - transaction.fee) * 100),
          tax_rate: 0,
          total_amount: Math.round((transaction.amount - transaction.fee) * 100),
          total_tax_amount: 0,
        },
      ],
      merchant_reference1: transactionMetadata.merchant_reference,
      merchant_reference2: user.id,
    };

    // Add fee line if applicable
    if (transaction.fee > 0) {
      orderData.order_lines.push({
        type: "fee",
        reference: "processing_fee",
        name: "Processing Fee",
        quantity: 1,
        unit_price: Math.round(transaction.fee * 100),
        tax_rate: 0,
        total_amount: Math.round(transaction.fee * 100),
        total_tax_amount: 0,
      });
    }

    // Create the order
    const orderResponse: KlarnaOrder = await makeKlarnaRequest(
      `/payments/v1/authorizations/${authorization_token}/order`,
      "POST",
      orderData
    );

    if (!orderResponse || !orderResponse.order_id) {
      throw new Error("Failed to create Klarna order");
    }

    // Check order status
    const orderStatus = orderResponse.status ? KLARNA_STATUS_MAPPING[orderResponse.status] || "PENDING" : "PENDING";

    // Process the payment based on status
    if (orderStatus === "COMPLETED" || orderResponse.status === "AUTHORIZED") {
      // Find or create wallet
      const currency = transactionMetadata.purchase_currency;
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

      const depositAmount = transaction.amount - transaction.fee;
      let newBalance = wallet.balance + depositAmount;
      newBalance = parseFloat(newBalance.toFixed(currencyData.precision || 2));

      // Use database transaction for consistency
      const result = await sequelize.transaction(async (t) => {
        // Update transaction status
        await models.transaction.update(
          {
            status: "COMPLETED",
            metadata: JSON.stringify({
              ...transactionMetadata,
              order_id: orderResponse.order_id,
              klarna_reference: orderResponse.klarna_reference,
              fraud_status: orderResponse.fraud_status,
              payment_method: authResponse.authorized_payment_method,
              completed_at: new Date().toISOString(),
            }),
            description: `Klarna deposit of ${depositAmount} ${currency} completed by ${user.firstName} ${user.lastName}`,
          },
          {
            where: { id: transaction.id },
            transaction: t,
          }
        );

        // Update wallet balance
        await models.wallet.update(
          { balance: newBalance },
          {
            where: { id: wallet.id },
            transaction: t,
          }
        );

        // Record admin profit if fee > 0
        if (transaction.fee > 0) {
          await models.adminProfit.create(
            {
              amount: transaction.fee,
              currency: wallet.currency,
              type: "DEPOSIT",
              description: `Klarna deposit fee from ${user.firstName} ${user.lastName}`,
            },
            { transaction: t }
          );
        }

        return {
          transactionId: transaction.id,
          newBalance,
        };
      });

             // Send confirmation email
       try {
         await sendFiatTransactionEmail(
           user,
           {
             ...transaction.dataValues,
             type: "DEPOSIT",
             amount: depositAmount,
             status: "COMPLETED",
             description: `Klarna deposit of ${depositAmount} ${currency} completed`,
           },
           currency,
           newBalance
         );
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        // Don't throw error for email failure
      }

      return {
        order_id: orderResponse.order_id,
        status: orderResponse.status,
        fraud_status: orderResponse.fraud_status,
        klarna_reference: orderResponse.klarna_reference,
        order_amount: orderResponse.order_amount,
        purchase_currency: orderResponse.purchase_currency,
        payment_method: authResponse.authorized_payment_method,
        transaction_id: transaction.id,
        wallet_balance: newBalance,
      };

    } else if (orderStatus === "FAILED" || orderResponse.status === "CANCELLED") {
      // Update transaction as failed
      await models.transaction.update(
        {
          status: "FAILED",
          metadata: JSON.stringify({
            ...transactionMetadata,
            order_id: orderResponse.order_id,
            klarna_reference: orderResponse.klarna_reference,
            fraud_status: orderResponse.fraud_status,
            failure_reason: `Order status: ${orderResponse.status}`,
            failed_at: new Date().toISOString(),
          }),
        },
        {
          where: { id: transaction.id },
        }
      );

      throw new Error(`Payment failed with status: ${orderResponse.status}`);

    } else {
      // Update transaction with current status (pending)
      await models.transaction.update(
        {
          metadata: JSON.stringify({
            ...transactionMetadata,
            order_id: orderResponse.order_id,
            klarna_reference: orderResponse.klarna_reference,
            fraud_status: orderResponse.fraud_status,
            current_status: orderResponse.status,
            updated_at: new Date().toISOString(),
          }),
        },
        {
          where: { id: transaction.id },
        }
      );

      return {
        order_id: orderResponse.order_id,
        status: orderResponse.status,
        fraud_status: orderResponse.fraud_status,
        klarna_reference: orderResponse.klarna_reference,
        order_amount: orderResponse.order_amount,
        purchase_currency: orderResponse.purchase_currency,
        payment_method: authResponse.authorized_payment_method,
        transaction_id: transaction.id,
        message: "Payment is being processed. You will be notified when completed.",
      };
    }

  } catch (error) {
    if (error instanceof KlarnaError) {
      throw new Error(`Klarna verification failed: ${error.message}`);
    }
    throw new Error(`Payment verification failed: ${error.message}`);
  }
};