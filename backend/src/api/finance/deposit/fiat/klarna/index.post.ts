import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { 
  makeKlarnaRequest,
  validateCurrency,
  convertToKlarnaAmount,
  generateKlarnaReference,
  KLARNA_COUNTRY_CURRENCY_MAP,
  KLARNA_LOCALE_MAP,
  KlarnaError,
  type KlarnaPaymentSession,
  type KlarnaOrderLine,
  type KlarnaMerchantUrls
} from "./utils";
import { models } from "@b/db";

const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isProduction = process.env.NODE_ENV === "production";

export const metadata: OperationObject = {
  summary: "Creates a Klarna payment session",
  description:
    "Initiates a Klarna payment process by creating a payment session with Buy Now, Pay Later options. Supports multiple payment methods including Pay Now, Pay Later, and Pay in Installments.",
  operationId: "createKlarnaPayment",
  tags: ["Finance", "Deposit"],
  requestBody: {
    description: "Payment information for Klarna session",
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
              description: "Currency code (e.g., USD, EUR, GBP)",
            },
            country: {
              type: "string", 
              description: "Purchase country code (e.g., US, GB, DE)",
              nullable: true,
            },
            payment_method: {
              type: "string",
              description: "Preferred Klarna payment method",
              enum: ["pay_now", "pay_later", "pay_over_time"],
              nullable: true,
            },
            customer: {
              type: "object",
              description: "Customer information",
              properties: {
                email: { type: "string", format: "email" },
                phone: { type: "string" },
                given_name: { type: "string" },
                family_name: { type: "string" },
                date_of_birth: { type: "string", format: "date" },
              },
              nullable: true,
            },
            billing_address: {
              type: "object",
              description: "Billing address information",
              properties: {
                given_name: { type: "string" },
                family_name: { type: "string" },
                email: { type: "string", format: "email" },
                phone: { type: "string" },
                street_address: { type: "string" },
                postal_code: { type: "string" },
                city: { type: "string" },
                region: { type: "string" },
                                 country: { type: "string" },
              },
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
        "Klarna payment session created successfully. Returns session details and client token for frontend integration.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              session_id: {
                type: "string",
                description: "Klarna session ID",
              },
              client_token: {
                type: "string", 
                description: "Client token for Klarna SDK",
              },
              payment_method_categories: {
                type: "array",
                description: "Available payment methods",
                items: {
                  type: "object",
                  properties: {
                    identifier: { type: "string" },
                    name: { type: "string" },
                    asset_urls: {
                      type: "object",
                      properties: {
                        descriptive: { type: "string" },
                        standard: { type: "string" },
                      },
                    },
                  },
                },
              },
              purchase_country: {
                type: "string",
                description: "Purchase country code",
              },
              purchase_currency: {
                type: "string", 
                description: "Purchase currency code",
              },
              order_amount: {
                type: "number",
                description: "Total order amount in minor units",
              },
              reference: {
                type: "string",
                description: "Merchant reference for this payment",
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid request parameters",
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

  const { 
    amount, 
    currency, 
    country, 
    payment_method,
    customer,
    billing_address 
  } = body;

  // Validate amount
  if (!amount || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  // Validate currency
  if (!validateCurrency(currency)) {
    throw new Error(`Currency ${currency} is not supported by Klarna`);
  }

  // Check if Klarna gateway is available
  const gateway = await models.depositGateway.findOne({
    where: { alias: "klarna", status: true },
  });

  if (!gateway) {
    throw new Error("Klarna gateway not found or disabled");
  }

  if (!gateway.currencies?.includes(currency)) {
    throw new Error(`Currency ${currency} is not supported by Klarna gateway`);
  }

  // Determine purchase country based on currency if not provided
  let purchaseCountry = country;
  if (!purchaseCountry) {
    // Find country that supports this currency
    for (const [countryCode, currencies] of Object.entries(KLARNA_COUNTRY_CURRENCY_MAP)) {
      if (currencies.includes(currency)) {
        purchaseCountry = countryCode;
        break;
      }
    }
  }

  if (!purchaseCountry) {
    throw new Error(`No supported country found for currency ${currency}`);
  }

  // Validate country-currency combination
  const supportedCurrencies = KLARNA_COUNTRY_CURRENCY_MAP[purchaseCountry];
  if (!supportedCurrencies || !supportedCurrencies.includes(currency)) {
    throw new Error(`Currency ${currency} is not supported in country ${purchaseCountry}`);
  }

  // Get locale for the country
  const locale = KLARNA_LOCALE_MAP[purchaseCountry] || "en-US";

  // Calculate fees
  const { fixedFee, percentageFee } = gateway;
  const feeAmount = (amount * (percentageFee || 0)) / 100 + (fixedFee || 0);
  const totalAmount = amount + feeAmount;

  // Convert amounts to Klarna format (minor units)
  const orderAmount = convertToKlarnaAmount(totalAmount);
  const taxAmount = convertToKlarnaAmount(feeAmount);

  // Generate unique reference
  const merchantReference = generateKlarnaReference();

  // Create order lines
  const orderLines: KlarnaOrderLine[] = [
    {
      type: "physical",
      reference: "deposit",
      name: "Account Deposit",
      quantity: 1,
      unit_price: convertToKlarnaAmount(amount),
      tax_rate: 0,
      total_amount: convertToKlarnaAmount(amount),
      total_tax_amount: 0,
    },
  ];

  // Add fee as separate line item if applicable
  if (feeAmount > 0) {
    orderLines.push({
      type: "fee",
      reference: "processing_fee",
      name: "Processing Fee",
      quantity: 1,
      unit_price: convertToKlarnaAmount(feeAmount),
      tax_rate: 0,
      total_amount: convertToKlarnaAmount(feeAmount),
      total_tax_amount: 0,
    });
  }

  // Configure merchant URLs
  const baseUrl = `${publicUrl}${isProduction ? "" : ":3000"}`;
  const merchantUrls: KlarnaMerchantUrls = {
    terms: `${baseUrl}/terms`,
    confirmation: `${baseUrl}/api/finance/deposit/fiat/klarna/verify?session_id={checkout.order.id}`,
    push: `${baseUrl}/api/finance/deposit/fiat/klarna/webhook`,
    authorization: `${baseUrl}/api/finance/deposit/fiat/klarna/authorize`,
  };

  // Prepare payment session data
  const sessionData: KlarnaPaymentSession = {
    purchase_country: purchaseCountry,
    purchase_currency: currency,
    locale,
    order_amount: orderAmount,
    order_tax_amount: taxAmount,
    order_lines: orderLines,
    merchant_urls: merchantUrls,
    merchant_reference1: merchantReference,
    merchant_reference2: user.id,
    options: {
      allow_separate_shipping_address: false,
      date_of_birth_mandatory: false,
      title_mandatory: false,
      phone_mandatory: false,
      show_subtotal_detail: true,
      allowed_customer_types: ["person"],
      purchase_type: "buy",
    },
  };

  // Add customer information if provided
  if (customer || user.email) {
    sessionData.customer = {
      type: "person",
      ...customer,
    };

    // Add billing address
    sessionData.billing_address = {
      given_name: customer?.given_name || user.firstName || "",
      family_name: customer?.family_name || user.lastName || "",
      email: customer?.email || user.email,
      country: purchaseCountry,
      ...billing_address,
    };
  }

  try {
    // Create payment session with Klarna
    const response = await makeKlarnaRequest(
      "/payments/v1/sessions",
      "POST",
      sessionData
    );

    // Store transaction record for tracking
    await models.transaction.create({
      userId: user.id,
      type: "DEPOSIT",
      amount: totalAmount,
      fee: feeAmount,
      referenceId: response.session_id,
      status: "PENDING",
      metadata: JSON.stringify({
        method: "KLARNA",
        session_id: response.session_id,
        merchant_reference: merchantReference,
        purchase_country: purchaseCountry,
        purchase_currency: currency,
        payment_method: payment_method || "auto",
        klarna_reference: response.klarna_reference,
      }),
      description: `Klarna deposit of ${amount} ${currency} initiated by ${user.firstName} ${user.lastName}`,
    } as transactionCreationAttributes);

    return {
      session_id: response.session_id,
      client_token: response.client_token,
      payment_method_categories: response.payment_method_categories,
      purchase_country: purchaseCountry,
      purchase_currency: currency,
      order_amount: orderAmount,
      reference: merchantReference,
      html_snippet: response.html_snippet, // For embedded checkout
    };

  } catch (error) {
    if (error instanceof KlarnaError) {
      throw new Error(`Klarna payment session creation failed: ${error.message}`);
    }
    throw new Error(`Failed to create Klarna payment session: ${error.message}`);
  }
};