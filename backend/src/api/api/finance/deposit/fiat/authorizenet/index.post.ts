import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { models } from "@b/db";
import {
  getAuthorizeNetConfig,
  makeAuthorizeNetRequest,
  generateHostedPaymentSettings,
  GetHostedPaymentPageRequest,
  GetHostedPaymentPageResponse,
} from "./utils";

export const metadata: OperationObject = {
  summary: "Create Authorize.Net hosted payment page",
  description:
    "Creates an Authorize.Net Accept Hosted payment page for secure deposit processing. Returns a payment token for hosted payment form integration.",
  operationId: "createAuthorizeNetPayment",
  tags: ["Finance", "Deposit"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            amount: {
              type: "number",
              description: "Deposit amount",
            },
            currency: {
              type: "string",
              description: "Currency code (USD, CAD, EUR, etc.)",
              example: "USD",
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
        "Hosted payment page created successfully. Returns payment token and form URL.",
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
                  token: {
                    type: "string",
                    description: "Payment token for hosted form",
                  },
                  formUrl: {
                    type: "string",
                    description: "URL for hosted payment form",
                  },
                  referenceId: {
                    type: "string",
                    description: "Transaction reference ID",
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Authorize.Net"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) throw new Error("User not authenticated");

  const userPk = await models.user.findByPk(user.id);
  if (!userPk) throw new Error("User not found");

  const { amount, currency } = body;

  // Validate amount
  if (!amount || amount <= 0) {
    throw new Error("Invalid amount");
  }

  // Validate currency
  const supportedCurrencies = ["USD", "CAD", "GBP", "EUR", "AUD", "NZD", "DKK", "NOK", "PLN", "SEK"];
  if (!supportedCurrencies.includes(currency)) {
    throw new Error(`Currency ${currency} is not supported by Authorize.Net`);
  }

  // Get Authorize.Net gateway configuration
  const authorizeNetGateway = await models.depositGateway.findOne({
    where: { name: "AUTHORIZENET" },
  });

  if (!authorizeNetGateway) {
    throw new Error("Authorize.Net gateway not found");
  }

  if (!authorizeNetGateway.status) {
    throw new Error("Authorize.Net gateway is currently disabled");
  }

  // Check currency support
  if (!authorizeNetGateway.currencies.includes(currency)) {
    throw new Error(`Currency ${currency} is not supported by this gateway`);
  }

  // Validate amount limits
  if (amount < (authorizeNetGateway.minAmount || 1)) {
    throw new Error(`Minimum deposit amount is ${authorizeNetGateway.minAmount || 1} ${currency}`);
  }

  if (amount > (authorizeNetGateway.maxAmount || 10000)) {
    throw new Error(`Maximum deposit amount is ${authorizeNetGateway.maxAmount || 10000} ${currency}`);
  }

  try {
    const config = getAuthorizeNetConfig();
    
    // Calculate fees
    const fixedFee = authorizeNetGateway.fixedFee || 0;
    const percentageFee = authorizeNetGateway.percentageFee || 0;
    const feeAmount = Number(((amount * percentageFee) / 100 + fixedFee).toFixed(2));
    const totalAmount = Number((amount + feeAmount).toFixed(2));

    // Generate unique reference ID
    const referenceId = `deposit_${user.id.toString()}_${Date.now()}`;

    // Create transaction record
    const transaction = await models.transaction.create({
      userId: user.id,
      type: "DEPOSIT",
      amount: amount,
      fee: feeAmount,
      referenceId: referenceId,
      status: "PENDING",
      description: `Authorize.Net deposit of ${amount} ${currency}`,
      metadata: JSON.stringify({
        method: "AUTHORIZENET",
        currency: currency,
        totalAmount: totalAmount,
      }),
    });

    // Prepare hosted payment request
    const hostedPaymentRequest: GetHostedPaymentPageRequest = {
      merchantAuthentication: {
        name: config.apiLoginId,
        transactionKey: config.transactionKey,
      },
      refId: referenceId,
      transactionRequest: {
        transactionType: "authCaptureTransaction",
        amount: totalAmount.toString(),
        currencyCode: currency,
        customer: {
          id: user.id.toString(),
          email: userPk.email,
        },
        billTo: {
          firstName: userPk.firstName || "",
          lastName: userPk.lastName || "",
        },
        order: {
          invoiceNumber: referenceId,
          description: `Deposit to wallet - ${amount} ${currency}`,
        },
      },
      hostedPaymentSettings: generateHostedPaymentSettings({
        returnUrl: `${process.env.FRONTEND_URL}/finance/deposit?status=success&ref=${referenceId}`,
        cancelUrl: `${process.env.FRONTEND_URL}/finance/deposit?status=cancelled&ref=${referenceId}`,
        showReceipt: false,
      }),
    };

    // Create hosted payment page
    const response = await makeAuthorizeNetRequest<{ getHostedPaymentPageResponse: GetHostedPaymentPageResponse }>(
      { getHostedPaymentPageRequest: hostedPaymentRequest },
      config
    );

    const hostedPaymentResponse = response.getHostedPaymentPageResponse;

    if (hostedPaymentResponse.messages.resultCode !== "Ok") {
      const errorMessage = hostedPaymentResponse.messages.message
        .map(msg => msg.text)
        .join(", ");
      throw new Error(`Authorize.Net error: ${errorMessage}`);
    }

    if (!hostedPaymentResponse.token) {
      throw new Error("Failed to create hosted payment page - no token received");
    }

    // Construct form URL
    const formUrl = `https://${config.environment === "production" ? "accept" : "test"}.authorize.net/payment/payment?token=${hostedPaymentResponse.token}`;

    return {
      status: true,
      statusCode: 200,
      data: {
        token: hostedPaymentResponse.token,
        formUrl: formUrl,
        referenceId: referenceId,
        amount: amount,
        currency: currency,
        fee: feeAmount,
        totalAmount: totalAmount,
      },
    };

  } catch (error) {
    console.error("Authorize.Net payment creation error:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to create Authorize.Net payment");
  }
}; 