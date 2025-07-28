import { models } from "@b/db";
import { Op } from "sequelize";
import { getAdyenConfig, verifyHmacSignature } from "./utils";

export const metadata: OperationObject = {
  summary: "Handles Adyen webhook notifications",
  description:
    "Processes Adyen webhook notifications for payment events. This endpoint handles automatic payment status updates, wallet balance updates, and transaction processing based on Adyen's notification system.",
  operationId: "handleAdyenWebhook",
  tags: ["Finance", "Webhook"],
  requestBody: {
    description: "Adyen webhook notification data",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            live: {
              type: "string",
              description: "Whether this is a live notification",
            },
            notificationItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  NotificationRequestItem: {
                    type: "object",
                    properties: {
                      pspReference: {
                        type: "string",
                        description: "Adyen PSP reference",
                      },
                      merchantReference: {
                        type: "string",
                        description: "Merchant reference",
                      },
                      eventCode: {
                        type: "string",
                        description: "Event type",
                      },
                      success: {
                        type: "string",
                        description: "Success status",
                      },
                      amount: {
                        type: "object",
                        properties: {
                          value: {
                            type: "number",
                            description: "Amount in minor units",
                          },
                          currency: {
                            type: "string",
                            description: "Currency code",
                          },
                        },
                      },
                      additionalData: {
                        type: "object",
                        description: "Additional data including HMAC signature",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Webhook processed successfully",
      content: {
        "text/plain": {
          schema: {
            type: "string",
            example: "[accepted]",
          },
        },
      },
    },
    400: {
      description: "Invalid webhook data or signature verification failed",
    },
    500: {
      description: "Internal server error",
    },
  },
  requiresAuth: false,
};

export default async (data: Handler) => {
  const { body, headers } = data;

  try {
    // Get Adyen configuration
    const config = getAdyenConfig();

    // Verify HMAC signature if configured
    if (config.hmacKey && headers) {
      const hmacSignature = headers["hmac-signature"] || headers["HmacSignature"];
      
      if (hmacSignature) {
        const rawBody = JSON.stringify(body);
        const isValidSignature = verifyHmacSignature(
          rawBody,
          hmacSignature,
          config.hmacKey
        );

        if (!isValidSignature) {
          console.error("Adyen webhook: Invalid HMAC signature");
          throw new Error("Invalid HMAC signature");
        }
      }
    }

    // Process notification items
    if (body.notificationItems && Array.isArray(body.notificationItems)) {
      for (const item of body.notificationItems) {
        const notification = item.NotificationRequestItem;
        
        if (!notification) continue;

        const {
          pspReference,
          merchantReference,
          eventCode,
          success,
          amount,
          additionalData,
        } = notification;

        console.log(`Processing Adyen webhook: ${eventCode} for ${merchantReference}`);

        // Handle AUTHORISATION events
        if (eventCode === "AUTHORISATION") {
          await handleAuthorisation({
            pspReference,
            merchantReference,
            success: success === "true",
            amount,
            additionalData,
          });
        }
        
        // Handle CAPTURE events
        else if (eventCode === "CAPTURE") {
          await handleCapture({
            pspReference,
            merchantReference,
            success: success === "true",
            amount,
            additionalData,
          });
        }
        
        // Handle REFUND events
        else if (eventCode === "REFUND") {
          await handleRefund({
            pspReference,
            merchantReference,
            success: success === "true",
            amount,
            additionalData,
          });
        }
        
        // Handle CANCELLATION events
        else if (eventCode === "CANCELLATION") {
          await handleCancellation({
            pspReference,
            merchantReference,
            success: success === "true",
            amount,
            additionalData,
          });
        }
      }
    }

    // Return success response
    return "[accepted]";
  } catch (error) {
    console.error("Adyen webhook processing error:", error);
    throw new Error(`Webhook processing failed: ${error.message}`);
  }
};

// Handle authorization events
async function handleAuthorisation({
  pspReference,
  merchantReference,
  success,
  amount,
  additionalData,
}: {
  pspReference: string;
  merchantReference: string;
  success: boolean;
  amount: any;
  additionalData: any;
}) {
  try {
    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        uuid: merchantReference,
        type: "DEPOSIT",
        status: {
          [Op.in]: ["PENDING", "PROCESSING"],
        },
      },
      include: [
        {
          model: models.user,
          as: "user",
        },
      ],
    });

    if (!transaction) {
      console.log(`Transaction not found for reference: ${merchantReference}`);
      return;
    }

    const newStatus = success ? "COMPLETED" : "FAILED";

    // Update transaction
    await models.transaction.update(
      {
        status: newStatus,
        metadata: {
          ...transaction.metadata,
          pspReference,
          webhookProcessedAt: new Date().toISOString(),
          eventCode: "AUTHORISATION",
          success,
          additionalData,
        },
      },
      {
        where: { id: transaction.id },
      }
    );

    // Update wallet if payment was successful
    if (success) {
      const user = (transaction as any).user;
      const metadata = transaction.metadata as any;
      const currency = metadata?.currency || "USD";

      // Find or create wallet
      let wallet = await models.wallet.findOne({
        where: {
          userId: user.id,
          currency,
          type: "FIAT",
        },
      });

      if (!wallet) {
        wallet = await models.wallet.create({
          userId: user.id,
          type: "FIAT",
          currency,
          balance: 0,
        });
      }

      // Update wallet balance
      const depositAmount = transaction.amount - (transaction.fee || 0);
      await wallet.increment("balance", { by: depositAmount });

      // Create wallet transaction record
      await models.walletTransaction.create({
        walletId: wallet.id,
        type: "DEPOSIT",
        amount: depositAmount,
        balance: wallet.balance + depositAmount,
        description: `Adyen deposit - ${merchantReference}`,
        metadata: {
          transactionId: transaction.id,
          gateway: "adyen",
          pspReference,
          eventCode: "AUTHORISATION",
        },
      });

      console.log(
        `Adyen deposit completed: ${depositAmount} ${currency} for user ${user.id}`
      );
    }
  } catch (error) {
    console.error("Error handling Adyen authorisation:", error);
    throw error;
  }
}

// Handle capture events
async function handleCapture({
  pspReference,
  merchantReference,
  success,
  amount,
  additionalData,
}: {
  pspReference: string;
  merchantReference: string;
  success: boolean;
  amount: any;
  additionalData: any;
}) {
  // For most deposit flows, capture happens automatically after authorization
  // This is mainly for logging and metadata updates
  try {
    const transaction = await models.transaction.findOne({
      where: {
        uuid: merchantReference,
        type: "DEPOSIT",
      },
    });

    if (transaction) {
      await models.transaction.update(
        {
          metadata: {
            ...transaction.metadata,
            captureProcessedAt: new Date().toISOString(),
            captureSuccess: success,
            capturePspReference: pspReference,
          },
        },
        {
          where: { id: transaction.id },
        }
      );
    }
  } catch (error) {
    console.error("Error handling Adyen capture:", error);
  }
}

// Handle refund events
async function handleRefund({
  pspReference,
  merchantReference,
  success,
  amount,
  additionalData,
}: {
  pspReference: string;
  merchantReference: string;
  success: boolean;
  amount: any;
  additionalData: any;
}) {
  // Handle refund notifications
  console.log(`Adyen refund notification: ${pspReference} - ${success ? "Success" : "Failed"}`);
}

// Handle cancellation events
async function handleCancellation({
  pspReference,
  merchantReference,
  success,
  amount,
  additionalData,
}: {
  pspReference: string;
  merchantReference: string;
  success: boolean;
  amount: any;
  additionalData: any;
}) {
  try {
    const transaction = await models.transaction.findOne({
      where: {
        uuid: merchantReference,
        type: "DEPOSIT",
        status: {
          [Op.in]: ["PENDING", "PROCESSING"],
        },
      },
    });

    if (transaction) {
      await models.transaction.update(
        {
          status: "CANCELLED",
          metadata: {
            ...transaction.metadata,
            pspReference,
            cancelledAt: new Date().toISOString(),
            eventCode: "CANCELLATION",
          },
        },
        {
          where: { id: transaction.id },
        }
      );
    }
  } catch (error) {
    console.error("Error handling Adyen cancellation:", error);
  }
} 