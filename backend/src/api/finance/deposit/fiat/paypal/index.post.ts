// /server/api/deposit/paypal.post.ts

import { models } from "@b/db";
import { paypalOrdersController } from "./utils";
// @ts-ignore - PayPal SDK types issue
// import {
//   OrderRequest,
//   CheckoutPaymentIntent,
//   ItemCategory
// } from "@paypal/paypal-server-sdk";
const { OrderRequest, CheckoutPaymentIntent, ItemCategory } = require("@paypal/paypal-server-sdk");
import { createRecordResponses } from "@b/utils/query";

const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isProduction = process.env.NODE_ENV === "production";
const siteName = process.env.NEXT_PUBLIC_SITE_NAME;

export const metadata: OperationObject = {
  summary: "Creates a PayPal payment",
  description: "Initiates a PayPal payment process by creating a new order.",
  operationId: "createPayPalPayment",
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
          },
          required: ["amount", "currency"],
        },
      },
    },
  },
  responses: createRecordResponses("PayPal Order"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) throw new Error("Unauthorized");

  const { amount, currency } = body;

  const paypalGateway = await models.depositGateway.findOne({
    where: { alias: "paypal", status: true },
  });

  if (!paypalGateway) {
    throw new Error("PayPal gateway not found");
  }

  const fixedFee = paypalGateway.fixedFee || 0;
  const percentageFee = paypalGateway.percentageFee || 0;
  const taxAmount = Math.max(
    (parseFloat(amount) * percentageFee) / 100 + fixedFee,
    0
  );

  const itemAmount = parseFloat(amount) - taxAmount;
  if (itemAmount < 0) {
    throw new Error("Invalid amount");
  }
  const totalAmount = parseFloat(amount).toFixed(2); // Total amount includes tax

  const orderRequest: any = {
    intent: CheckoutPaymentIntent.Capture,
    purchaseUnits: [
      {
        amount: {
          currencyCode: currency,
          value: totalAmount,
          breakdown: {
            itemTotal: {
              currencyCode: currency,
              value: itemAmount.toFixed(2),
            },
            taxTotal: {
              currencyCode: currency,
              value: taxAmount.toFixed(2),
            },
          },
        },
        items: [
          {
            name: "Deposit",
            unitAmount: {
              currencyCode: currency,
              value: itemAmount.toFixed(2),
            },
            quantity: "1",
            category: ItemCategory.DigitalGoods,
          },
        ],
      },
    ],
    paymentSource: {
      paypal: {
        experienceContext: {
          brandName: siteName,
          returnUrl: `${publicUrl}${
            isProduction ? "" : ":3000"
          }/finance/deposit/paypal`,
          cancelUrl: `${publicUrl}${
            isProduction ? "" : ":3000"
          }/finance/deposit`,
        },
      },
    },
  };

  try {
    const ordersController = paypalOrdersController();
    const { result: order } = await ordersController.createOrder({
      body: orderRequest,
    });
    
    return {
      id: order.id,
      links: order.links,
    };
  } catch (error) {
    throw new Error(`Error creating PayPal order: ${error.message}`);
  }
};
