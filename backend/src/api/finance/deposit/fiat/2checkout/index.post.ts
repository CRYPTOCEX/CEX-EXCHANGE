import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { use2Checkout, get2CheckoutApiUrl, TwoCheckoutOrderRequest } from "./utils";
import { models } from "@b/db";

const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isProduction = process.env.NODE_ENV === "production";

export const metadata: OperationObject = {
  summary: "Creates a 2Checkout payment session",
  description:
    "Initiates a 2Checkout payment process by creating a payment session. This endpoint supports hosted checkout integration for web applications.",
  operationId: "create2CheckoutPayment",
  tags: ["Finance", "Deposit"],
  requestBody: {
    description: "Payment information for 2Checkout",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            amount: {
              type: "number",
              description: "Payment amount in base currency unit",
            },
            currency: {
              type: "string",
              description: "Currency code (e.g., USD, EUR)",
            },
            customerInfo: {
              type: "object",
              description: "Customer billing information",
              properties: {
                firstName: { type: "string" },
                lastName: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                address: { type: "string" },
                city: { type: "string" },
                state: { type: "string" },
                zip: { type: "string" },
                country: { type: "string" },
              },
              required: ["firstName", "lastName", "email", "address", "city", "zip", "country"],
            },
          },
          required: ["amount", "currency", "customerInfo"],
        },
      },
    },
  },
  responses: {
    200: {
      description:
        "2Checkout payment session created successfully. Returns checkout URL for redirect.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              checkoutUrl: {
                type: "string",
                description: "2Checkout hosted checkout URL",
              },
              orderReference: {
                type: "string",
                description: "Order reference for tracking",
              },
              sessionId: {
                type: "string",
                description: "2Checkout session ID",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("2Checkout"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user) throw new Error("User not authenticated");

  const { amount, currency, customerInfo } = body;

  const gateway = await models.depositGateway.findOne({
    where: { alias: "2checkout", status: true },
  });

  if (!gateway) throw new Error("2Checkout gateway not found");

  if (!gateway.currencies?.includes(currency)) {
    throw new Error(`Currency ${currency} is not supported by 2Checkout`);
  }

  const { fixedFee, percentageFee } = gateway;
  const taxAmount = (amount * (percentageFee || 0)) / 100 + (fixedFee || 0);
  const totalAmount = amount + taxAmount;

  const config = use2Checkout();
  const apiUrl = get2CheckoutApiUrl(config.isProduction);

  // Generate unique order reference
  const orderReference = `deposit_${user.id}_${Date.now()}`;

  // Prepare 2Checkout order request
  const orderRequest: TwoCheckoutOrderRequest = {
    Country: customerInfo.country,
    Currency: currency,
    CustomerIP: "127.0.0.1", // Will be populated from request headers in production
    ExternalReference: orderReference,
    Language: "en",
    Source: config.accountReference || "API",
    BillingDetails: {
      Address1: customerInfo.address,
      City: customerInfo.city,
      CountryCode: customerInfo.country,
      Email: customerInfo.email,
      FirstName: customerInfo.firstName,
      LastName: customerInfo.lastName,
      Phone: customerInfo.phone || "",
      State: customerInfo.state || "",
      Zip: customerInfo.zip,
    },
    Items: [
      {
        Name: "Deposit",
        Description: `Deposit ${amount} ${currency}`,
        IsDynamic: true,
        Tangible: false,
        PurchaseType: "PRODUCT",
        Price: {
          Amount: amount,
          Type: "FIXED",
        },
        Quantity: 1,
      },
    ],
    PaymentDetails: {
      Type: "CC",
      Currency: currency,
      CustomerIP: "127.0.0.1", // Will be populated from request headers in production
    },
  };

  // Add fee as separate item if applicable
  if (taxAmount > 0) {
    orderRequest.Items.push({
      Name: "Processing Fee",
      Description: `Processing fee for ${currency} deposit`,
      IsDynamic: true,
      Tangible: false,
      PurchaseType: "PRODUCT",
      Price: {
        Amount: taxAmount,
        Type: "FIXED",
      },
      Quantity: 1,
    });
  }

  try {
    // Make API call to 2Checkout
    const response = await fetch(`${apiUrl}/rest/6.0/orders/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Avangate-Authentication": `code="${config.merchantCode}" date="${new Date().toISOString()}" hash=""`, // Signature will be added by 2Checkout SDK
      },
      body: JSON.stringify(orderRequest),
    });

    const result = await response.json();

    if (!response.ok || result.Errors) {
      throw new Error(
        `2Checkout API error: ${result.Errors?.[0]?.Message || "Unknown error"}`
      );
    }

    // Generate checkout URL
    const checkoutUrl = config.isProduction
      ? `https://secure.2checkout.com/checkout/buy?merchant=${config.merchantCode}&tco-currency=${currency}&tco-amount=${totalAmount}&external-reference=${orderReference}`
      : `https://sandbox.2checkout.com/checkout/buy?merchant=${config.merchantCode}&tco-currency=${currency}&tco-amount=${totalAmount}&external-reference=${orderReference}`;

    return {
      checkoutUrl,
      orderReference,
      sessionId: result.RefNo || result.OrderNo,
    };
  } catch (error) {
    throw new Error(`Error creating 2Checkout session: ${error.message}`);
  }
}; 