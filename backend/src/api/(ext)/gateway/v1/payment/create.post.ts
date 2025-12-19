import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  authenticateGatewayApi,
  checkApiPermission,
  calculateFees,
  generatePaymentIntentId,
  generateCheckoutUrl,
  validateAmount,
  validateCurrency,
  validateWalletType,
  validateUrl,
  sendWebhook,
  validatePaymentAgainstSettings,
  getGatewaySettings,
} from "@b/utils/gateway";
import { createPaymentSchema, paymentResponseSchema } from "../utils";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Create a payment session",
  description:
    "Creates a new payment session that customers can use to complete a payment. Returns a checkout URL to redirect customers to.",
  operationId: "createPayment",
  tags: ["Gateway", "Payment"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: createPaymentSchema,
      },
    },
  },
  responses: {
    201: {
      description: "Payment session created successfully",
      content: {
        "application/json": {
          schema: paymentResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request parameters",
    },
    401: {
      description: "Invalid or missing API key",
    },
    403: {
      description: "Insufficient permissions",
    },
  },
  requiresAuth: false, // Uses API key auth instead
  logModule: "GATEWAY",
  logTitle: "Create Payment Session",
};

export default async (data: Handler) => {
  const { body, headers, ctx } = data;

  // Log incoming request for debugging
  logger.debug("GATEWAY_PAYMENT", `Payment create request received - Amount: ${body?.amount}, Currency: ${body?.currency}`);

  ctx?.step("Authenticate API key");

  // Authenticate using API key
  const apiKeyHeader = headers?.["x-api-key"] || headers?.["X-API-Key"];
  // Get client IP for whitelist validation
  const clientIp = headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
                   headers?.["x-real-ip"] ||
                   headers?.["cf-connecting-ip"] || // Cloudflare
                   null;
  const { merchant, apiKey, isTestMode, isSecretKey } =
    await authenticateGatewayApi(apiKeyHeader, clientIp);

  // Only secret keys can create payments
  if (!isSecretKey) {
    ctx?.fail("Secret key required");
    throw createError({
      statusCode: 403,
      message: "Secret key required to create payments",
    });
  }

  // Check permission
  checkApiPermission(apiKey, "payment.create");

  ctx?.step("Validate request fields");

  // Validate required fields
  if (!body.amount || !body.currency || !body.returnUrl) {
    ctx?.fail("Missing required fields");
    throw createError({
      statusCode: 400,
      message: "Missing required fields: amount, currency, returnUrl",
    });
  }

  // Validate and parse amount
  const amount = validateAmount(body.amount);

  // Validate currency
  const currency = body.currency.toUpperCase();
  validateCurrency(currency, merchant.allowedCurrencies);

  // Validate wallet type
  const walletType = body.walletType || "FIAT";
  validateWalletType(walletType, merchant.allowedWalletTypes);

  ctx?.step("Validate against gateway settings and limits");

  // Validate against system gateway settings (limits, allowed wallet types/currencies)
  await validatePaymentAgainstSettings(amount, currency, walletType);

  // Validate URLs
  validateUrl(body.returnUrl, "returnUrl");
  if (body.cancelUrl) {
    validateUrl(body.cancelUrl, "cancelUrl");
  }
  if (body.webhookUrl) {
    validateUrl(body.webhookUrl, "webhookUrl");
  }

  // Check transaction limit
  if (amount > merchant.transactionLimit) {
    ctx?.fail("Amount exceeds transaction limit");
    throw createError({
      statusCode: 400,
      message: `Amount exceeds transaction limit of ${merchant.transactionLimit} ${currency}`,
    });
  }

  ctx?.step("Calculate fees and generate payment ID");

  // Calculate fees
  const { feeAmount, netAmount } = calculateFees(
    amount,
    merchant.feeType,
    merchant.feePercentage,
    merchant.feeFixed
  );

  // Generate payment intent ID
  const paymentIntentId = generatePaymentIntentId();

  // Get gateway settings for expiration
  const gatewaySettings = await getGatewaySettings();

  // Calculate expiration - use provided value or gateway setting or default 1 hour
  const defaultExpirationSeconds = (gatewaySettings.gatewayPaymentExpirationMinutes || 30) * 60;
  const expiresIn = body.expiresIn || defaultExpirationSeconds;
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  // Generate checkout URL
  const checkoutUrl = generateCheckoutUrl(paymentIntentId);

  ctx?.step("Create payment record");

  // Create payment record
  const payment = await models.gatewayPayment.create({
    merchantId: merchant.id,
    paymentIntentId,
    merchantOrderId: body.merchantOrderId || null,
    amount,
    currency,
    walletType,
    feeAmount,
    netAmount,
    status: "PENDING",
    checkoutUrl,
    returnUrl: body.returnUrl,
    cancelUrl: body.cancelUrl || null,
    webhookUrl: body.webhookUrl || null,
    description: body.description || null,
    metadata: body.metadata || null,
    lineItems: body.lineItems || null,
    customerEmail: body.customerEmail || null,
    customerName: body.customerName || null,
    expiresAt,
    testMode: isTestMode,
  });

  ctx?.step("Send payment.created webhook");

  // Send webhook for payment.created (if webhook URL provided)
  if (body.webhookUrl) {
    try {
      await sendWebhook(
        merchant.id,
        payment.id,
        null,
        "payment.created",
        body.webhookUrl,
        {
          id: `evt_${paymentIntentId}`,
          type: "payment.created",
          createdAt: new Date().toISOString(),
          data: {
            id: paymentIntentId,
            merchantOrderId: body.merchantOrderId || null,
            amount,
            currency,
            status: "PENDING",
            checkoutUrl,
            expiresAt: expiresAt.toISOString(),
          },
        },
        merchant.webhookSecret
      );
    } catch (error) {
      // Don't fail the payment creation if webhook fails
      logger.error("GATEWAY_PAYMENT", "Failed to send payment.created webhook", error);
    }
  }

  ctx?.success("Payment created successfully");
  logger.success("GATEWAY_PAYMENT", `Payment created successfully - ID: ${paymentIntentId}, Amount: ${amount} ${currency}`);

  return {
    id: paymentIntentId,
    status: "PENDING",
    amount,
    currency,
    walletType,
    merchantOrderId: body.merchantOrderId || null,
    description: body.description || null,
    feeAmount,
    netAmount,
    checkoutUrl,
    expiresAt: expiresAt.toISOString(),
    createdAt: payment.createdAt,
  };
};
