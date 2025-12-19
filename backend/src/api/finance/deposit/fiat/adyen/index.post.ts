import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { logger } from "@b/utils/console";
import {
  getAdyenConfig,
  makeAdyenApiRequest,
  convertToMinorUnits,
  AdyenSessionRequest,
  AdyenSessionResponse,
} from "./utils";
import { models } from "@b/db";

const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isProduction = process.env.NODE_ENV === "production";

export const metadata: OperationObject = {
  summary: "Creates an Adyen payment session",
  description:
    "Initiates an Adyen payment process by creating a payment session using Adyen's Sessions flow. This endpoint supports web checkout with multiple payment methods including cards, digital wallets, and local payment methods.",
  operationId: "createAdyenPayment",
  tags: ["Finance", "Deposit"],
  logModule: "ADYEN_DEPOSIT",
  logTitle: "Create Adyen payment session",
  requestBody: {
    description: "Payment information for Adyen session creation",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            amount: {
              type: "number",
              description: "Payment amount in base currency units",
            },
            currency: {
              type: "string",
              description: "Currency code (e.g., USD, EUR)",
            },
            countryCode: {
              type: "string",
              description: "Country code for payment method localization",
              nullable: true,
            },
          },
          required: ["amount", "currency"],
        },
      },
    },
  },
  responses: {
    200: {
      description:
        "Adyen payment session created successfully. Returns session data for Adyen Web Drop-in integration.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              sessionId: {
                type: "string",
                description: "Adyen session ID",
              },
              sessionData: {
                type: "string",
                description: "Adyen session data for client-side integration",
              },
              amount: {
                type: "object",
                properties: {
                  value: {
                    type: "number",
                    description: "Payment amount in minor units",
                  },
                  currency: {
                    type: "string",
                    description: "Currency code",
                  },
                },
              },
              reference: {
                type: "string",
                description: "Payment reference",
              },
              returnUrl: {
                type: "string",
                description: "Return URL after payment completion",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Adyen"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, body, query, ctx } = data;

  if (!user) throw new Error("User not authenticated");

  const { amount, currency, countryCode = "US" } = body;

  // Validate gateway
  ctx?.step("Fetching payment gateway configuration");
  const gateway = await models.depositGateway.findOne({
    where: { alias: "adyen", status: true },
  });

  if (!gateway) throw new Error("Adyen gateway not found or disabled");

  if (!gateway.currencies?.includes(currency)) {
    throw new Error(`Currency ${currency} is not supported by Adyen`);
  }

  // Calculate fees
  const { fixedFee, percentageFee } = gateway;
  const feeAmount = (amount * (percentageFee || 0)) / 100 + (fixedFee || 0);
  const totalAmount = amount + feeAmount;

  try {
    // Get Adyen configuration
    const config = getAdyenConfig();

    // Convert amount to minor units
    const amountInMinorUnits = convertToMinorUnits(totalAmount, currency);

    // Generate unique reference
    const reference = `DEP-${user.id}-${Date.now()}`;

    // Prepare session request
    const sessionRequest: AdyenSessionRequest = {
      amount: {
        value: amountInMinorUnits,
        currency: currency.toUpperCase(),
      },
      reference,
      merchantAccount: config.merchantAccount,
      returnUrl: `${publicUrl}${
        isProduction ? "" : ":3000"
      }/finance/deposit?gateway=adyen&status=success&reference=${reference}`,
      countryCode: countryCode.toUpperCase(),
      shopperEmail: user.email,
      shopperReference: user.id.toString(),
      channel: "Web",
    };

    // Create Adyen session
    const sessionResponse: AdyenSessionResponse = await makeAdyenApiRequest(
      "/sessions",
      sessionRequest,
      config
    );

    // Create transaction record
    ctx?.step("Creating transaction record");
      const transaction = await models.transaction.create({
      uuid: reference,
      userId: user.id,
      type: "DEPOSIT",
      status: "PENDING",
      amount: totalAmount,
      fee: feeAmount,
      description: `Adyen deposit of ${totalAmount} ${currency}`,
      metadata: JSON.stringify({
        gateway: "adyen",
        sessionId: sessionResponse.id,
        pspReference: null,
        currency,
        originalAmount: amount,
        feeAmount,
        countryCode,
      }),
    });

    ctx?.success("Adyen deposit completed successfully");

  return {
      sessionId: sessionResponse.id,
      sessionData: sessionResponse.sessionData,
      amount: sessionResponse.amount,
      reference: sessionResponse.reference,
      returnUrl: sessionResponse.returnUrl,
      transactionId: transaction.uuid,
    };
  } catch (error) {
    logger.error("ADYEN", "Payment session creation error", error);
    throw new Error(
      `Failed to create Adyen payment session: ${error.message}`
    );
  }
}; 