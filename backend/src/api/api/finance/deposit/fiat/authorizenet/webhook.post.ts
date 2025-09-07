import {
  serverErrorResponse,
} from "@b/utils/query";
import { models, sequelize } from "@b/db";
import { sendFiatTransactionEmail } from "@b/utils/emails";
import {
  getAuthorizeNetConfig,
  verifyWebhookSignature,
  AuthorizeNetWebhookPayload,
} from "./utils";

export const metadata: OperationObject = {
  summary: "Handle Authorize.Net webhook notifications",
  description:
    "Processes Authorize.Net webhook notifications for payment events including authorizations, captures, refunds, and cancellations.",
  operationId: "handleAuthorizeNetWebhook",
  tags: ["Finance", "Webhook"],
  requiresAuth: false,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            notificationId: {
              type: "string",
              description: "Unique notification ID",
            },
            eventType: {
              type: "string",
              description: "Type of event (net.authorize.payment.authorization.created, etc.)",
            },
            eventDate: {
              type: "string",
              description: "Event timestamp",
            },
            webhookId: {
              type: "string",
              description: "Webhook configuration ID",
            },
            payload: {
              type: "object",
              description: "Event payload with transaction details",
            },
          },
          required: ["notificationId", "eventType", "eventDate", "webhookId", "payload"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Webhook processed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              status: {
                type: "string",
                example: "success",
              },
              message: {
                type: "string",
                example: "Webhook processed successfully",
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid webhook payload or signature",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: {
                type: "string",
                example: "Invalid webhook signature",
              },
            },
          },
        },
      },
    },
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { body, headers } = data;

  try {
    // Verify webhook signature if signature key is configured
    const config = getAuthorizeNetConfig();
    const signature = headers["x-anet-signature"] as string;
    const payload = JSON.stringify(body);

    if (config.signatureKey && signature) {
      const isValidSignature = verifyWebhookSignature(
        payload,
        signature,
        config.signatureKey
      );

      if (!isValidSignature) {
        console.error("Invalid Authorize.Net webhook signature");
        return {
          status: 400,
          body: { error: "Invalid webhook signature" },
        };
      }
    }

    const webhookData = body as AuthorizeNetWebhookPayload;
    const { eventType, payload: eventPayload } = webhookData;

    console.log(`Processing Authorize.Net webhook: ${eventType}`, {
      notificationId: webhookData.notificationId,
      entityName: eventPayload.entityName,
      id: eventPayload.id,
    });

    // Handle different event types
    switch (eventType) {
      case "net.authorize.payment.authorization.created":
        await handleAuthorizationCreated(eventPayload);
        break;

      case "net.authorize.payment.capture.created":
        await handleCaptureCreated(eventPayload);
        break;

      case "net.authorize.payment.refund.created":
        await handleRefundCreated(eventPayload);
        break;

      case "net.authorize.payment.void.created":
        await handleVoidCreated(eventPayload);
        break;

      case "net.authorize.payment.fraud.approved":
        await handleFraudApproved(eventPayload);
        break;

      case "net.authorize.payment.fraud.declined":
        await handleFraudDeclined(eventPayload);
        break;

      default:
        console.log(`Unhandled Authorize.Net webhook event type: ${eventType}`);
        break;
    }

    return {
      status: "success",
      message: "Webhook processed successfully",
    };

  } catch (error) {
    console.error("Authorize.Net webhook processing error:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to process webhook");
  }
};

// Handler for authorization created events
async function handleAuthorizationCreated(payload: any) {
  const { id: transactionId, merchantReferenceId, authAmount, responseCode } = payload;

  if (!merchantReferenceId) {
    console.log("No merchant reference ID found in authorization webhook");
    return;
  }

  const transaction = await models.transaction.findOne({
    where: { referenceId: merchantReferenceId },
  });

  if (!transaction) {
    console.log(`Transaction not found for reference ID: ${merchantReferenceId}`);
    return;
  }

  // Update transaction with authorization details
  await models.transaction.update(
    {
      status: responseCode === 1 ? "PENDING" : "FAILED",
      description: `${transaction.description} - Authorization ${responseCode === 1 ? "approved" : "declined"}`,
      metadata: JSON.stringify({
        ...JSON.parse(transaction.metadata || "{}"),
        authorizationId: transactionId,
        authAmount: authAmount,
        responseCode: responseCode,
      }),
    },
    {
      where: { id: transaction.id },
    }
  );

  console.log(`Authorization ${responseCode === 1 ? "approved" : "declined"} for transaction ${merchantReferenceId}`);
}

// Handler for capture created events (payment completed)
async function handleCaptureCreated(payload: any) {
  const { id: transactionId, merchantReferenceId, authAmount, responseCode } = payload;

  if (!merchantReferenceId) {
    console.log("No merchant reference ID found in capture webhook");
    return;
  }

  const transaction = await models.transaction.findOne({
    where: { referenceId: merchantReferenceId },
    include: [
      {
        model: models.user,
        as: "user",
      },
    ],
  });

  if (!transaction) {
    console.log(`Transaction not found for reference ID: ${merchantReferenceId}`);
    return;
  }

  if (transaction.status === "COMPLETED") {
    console.log(`Transaction ${merchantReferenceId} already completed`);
    return;
  }

  const metadata = JSON.parse(transaction.metadata || "{}");
  const currency = metadata.currency;

  // Get user's wallet
  let wallet = await models.wallet.findOne({
    where: { userId: transaction.userId, currency: currency },
  });

  if (!wallet) {
    wallet = await models.wallet.create({
      userId: transaction.userId,
      currency: currency,
      type: "FIAT",
    });
  }

  const currencyData = await models.currency.findOne({
    where: { id: wallet.currency },
  });

  if (!currencyData) {
    console.error(`Currency ${currency} not found`);
    return;
  }

  const depositAmount = transaction.amount;
  const feeAmount = transaction.fee || 0;

  let newBalance = Number(wallet.balance);
  newBalance += depositAmount;
  newBalance = Number(newBalance.toFixed(currencyData.precision || 2));

  // Update transaction and wallet in a database transaction
  await sequelize.transaction(async (dbTransaction) => {
    // Update transaction status
    await models.transaction.update(
      {
        status: "COMPLETED",
        description: `${transaction.description} - Payment captured`,
        metadata: JSON.stringify({
          ...metadata,
          captureId: transactionId,
          captureAmount: authAmount,
          captureResponseCode: responseCode,
        }),
      },
      {
        where: { id: transaction.id },
        transaction: dbTransaction,
      }
    );

    // Update wallet balance
    await models.wallet.update(
      {
        balance: newBalance,
      },
      {
        where: { id: wallet.id },
        transaction: dbTransaction,
      }
    );

    // Record admin profit if there's a fee
    if (feeAmount > 0) {
      try {
        await models.adminProfit.create(
          {
            amount: feeAmount,
            currency: wallet.currency,
            type: "DEPOSIT",
            description: `Authorize.Net deposit fee for transaction ${merchantReferenceId}`,
            transactionId: transaction.id,
          },
          { transaction: dbTransaction }
        );
      } catch (profitError) {
        console.error("Failed to record admin profit:", profitError);
        // Continue without failing the transaction
      }
    }
  });

  // Send confirmation email
  try {
    const user = transaction.user || await models.user.findByPk(transaction.userId);
    if (user) {
      await sendFiatTransactionEmail(
        user,
        {
          ...transaction.toJSON(),
          status: "COMPLETED",
        },
        currency,
        newBalance
      );
    }
  } catch (emailError) {
    console.error("Failed to send transaction email:", emailError);
  }

  console.log(`Payment captured for transaction ${merchantReferenceId}, amount: ${depositAmount} ${currency}`);
}

// Handler for refund created events
async function handleRefundCreated(payload: any) {
  const { id: refundId, merchantReferenceId, authAmount } = payload;

  if (!merchantReferenceId) {
    console.log("No merchant reference ID found in refund webhook");
    return;
  }

  const transaction = await models.transaction.findOne({
    where: { referenceId: merchantReferenceId },
  });

  if (!transaction) {
    console.log(`Transaction not found for reference ID: ${merchantReferenceId}`);
    return;
  }

  // Update transaction with refund details
  await models.transaction.update(
    {
      status: "REFUNDED",
      description: `${transaction.description} - Refunded`,
      metadata: JSON.stringify({
        ...JSON.parse(transaction.metadata || "{}"),
        refundId: refundId,
        refundAmount: authAmount,
      }),
    },
    {
      where: { id: transaction.id },
    }
  );

  console.log(`Refund processed for transaction ${merchantReferenceId}, amount: ${authAmount}`);
}

// Handler for void created events
async function handleVoidCreated(payload: any) {
  const { id: voidId, merchantReferenceId } = payload;

  if (!merchantReferenceId) {
    console.log("No merchant reference ID found in void webhook");
    return;
  }

  const transaction = await models.transaction.findOne({
    where: { referenceId: merchantReferenceId },
  });

  if (!transaction) {
    console.log(`Transaction not found for reference ID: ${merchantReferenceId}`);
    return;
  }

  // Update transaction with void details
  await models.transaction.update(
    {
      status: "CANCELLED",
      description: `${transaction.description} - Voided`,
      metadata: JSON.stringify({
        ...JSON.parse(transaction.metadata || "{}"),
        voidId: voidId,
      }),
    },
    {
      where: { id: transaction.id },
    }
  );

  console.log(`Transaction voided: ${merchantReferenceId}`);
}

// Handler for fraud approved events
async function handleFraudApproved(payload: any) {
  const { merchantReferenceId } = payload;

  if (!merchantReferenceId) {
    console.log("No merchant reference ID found in fraud approved webhook");
    return;
  }

  const transaction = await models.transaction.findOne({
    where: { referenceId: merchantReferenceId },
  });

  if (!transaction) {
    console.log(`Transaction not found for reference ID: ${merchantReferenceId}`);
    return;
  }

  // Update transaction metadata
  await models.transaction.update(
    {
      metadata: JSON.stringify({
        ...JSON.parse(transaction.metadata || "{}"),
        fraudStatus: "approved",
      }),
    },
    {
      where: { id: transaction.id },
    }
  );

  console.log(`Fraud check approved for transaction ${merchantReferenceId}`);
}

// Handler for fraud declined events
async function handleFraudDeclined(payload: any) {
  const { merchantReferenceId } = payload;

  if (!merchantReferenceId) {
    console.log("No merchant reference ID found in fraud declined webhook");
    return;
  }

  const transaction = await models.transaction.findOne({
    where: { referenceId: merchantReferenceId },
  });

  if (!transaction) {
    console.log(`Transaction not found for reference ID: ${merchantReferenceId}`);
    return;
  }

  // Update transaction status to failed due to fraud
  await models.transaction.update(
    {
      status: "FAILED",
      description: `${transaction.description} - Declined by fraud detection`,
      metadata: JSON.stringify({
        ...JSON.parse(transaction.metadata || "{}"),
        fraudStatus: "declined",
      }),
    },
    {
      where: { id: transaction.id },
    }
  );

  console.log(`Transaction declined by fraud detection: ${merchantReferenceId}`);
} 