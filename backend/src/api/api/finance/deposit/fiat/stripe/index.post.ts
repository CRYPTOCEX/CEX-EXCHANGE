// /server/api/deposit/stripe.post.ts
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { useStripe } from "./utils";
import { models } from "@b/db";

const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isProduction = process.env.NODE_ENV === "production";

export const metadata: OperationObject = {
  summary: "Creates a Stripe payment intent or checkout session",
  description:
    "Initiates a Stripe payment process by creating either a payment intent or a checkout session, based on the request parameters. This endpoint supports different workflows for web and Flutter applications.",
  operationId: "createStripePayment",
  tags: ["Finance", "Deposit"],
  requestBody: {
    description: "Payment information and application type",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            amount: {
              type: "number",
              description:
                "Payment amount in smallest currency unit (e.g., cents)",
            },
            currency: {
              type: "string",
              description: "Currency code (e.g., USD)",
            },
            intent: {
              type: "boolean",
              description:
                "Flag indicating if the request is from a mobile app",
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
        "Payment intent or checkout session created successfully. The response structure varies based on the request context: for Flutter applications, `id` and `clientSecret` are returned; for web applications, `version`, `id`, and `url` are provided.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "Payment intent or session ID",
              },
              clientSecret: {
                type: "string",
                description: "Client secret for payment intent",
                nullable: true,
              },
              version: {
                type: "string",
                description: "Stripe API version",
                nullable: true,
              },
              url: {
                type: "string",
                description: "Checkout session URL",
                nullable: true,
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
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user) throw new Error("User not authenticated");

  const { amount, currency, intent } = body;
  const amountCent = amount * 100;

  const gateway = await models.depositGateway.findOne({
    where: { alias: "stripe", status: true },
  });

  if (!gateway) throw new Error("Stripe gateway not found");

  if (!gateway.currencies?.includes(currency)) {
    throw new Error(`Currency ${currency} is not supported by Stripe`);
  }

  // Use the new gateway methods for currency-specific fees
  const fixedFee = gateway.getFixedFee(currency);
  const percentageFee = gateway.getPercentageFee(currency);

  const taxAmount = (amount * percentageFee) / 100 + fixedFee;
  const taxAmountCent = taxAmount * 100;

  const stripe = useStripe();

  if (intent) {
    const totalAmount = amountCent + taxAmountCent;
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: currency,
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      throw new Error(`Error creating payment intent: ${error.message}`);
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: "Deposit",
            },
            unit_amount: amountCent,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: currency,
            product_data: {
              name: "Tax",
            },
            unit_amount: taxAmountCent,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${publicUrl}${
        isProduction ? "" : ":3000"
      }/stripe-popup-success.html?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${publicUrl}${
        isProduction ? "" : ":3000"
      }/stripe-popup-cancel.html`,
    });

    return {
      version: (stripe as any).VERSION,
      id: session.id,
      url: session.url,
    };
  } catch (error) {
    throw new Error(`Error creating checkout session: ${error.message}`);
  }
};
