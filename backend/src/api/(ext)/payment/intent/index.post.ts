import { Op } from "sequelize";
import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Creates a payment intent",
  operationId: "createPaymentIntent",
  tags: ["Payments"],
  requiresAuth: false, // No login required
  requiresApi: true, // API key required
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            amount: { type: "number", description: "Amount to be paid" },
            currency: { type: "string", description: "Payment currency" },
            successUrl: {
              type: "string",
              description: "URL for successful payment",
            },
            failUrl: { type: "string", description: "URL for failed payment" },
            description: {
              type: "string",
              description: "Optional description for the payment intent",
            },
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Product name" },
                  quantity: { type: "number", description: "Quantity" },
                  price: { type: "number", description: "Price" },
                  currency: { type: "string", description: "Product currency" },
                  sku: { type: "string", description: "Product SKU" },
                },
                required: ["name", "quantity", "price", "currency"],
              },
            },
          },
          required: ["amount", "currency", "successUrl", "failUrl", "products"],
        },
      },
    },
  },
  responses: {
    200: { description: "Payment intent created successfully" },
    400: { description: "Invalid request" },
  },
};

export default async (data: Handler) => {
  const { body, headers } = data;

  const apiKey = headers["x-api-key"];
  if (!apiKey) {
    throw createError({
      statusCode: 401,
      message: "API key is required",
    });
  }

  const {
    amount,
    currency,
    ipnUrl,
    successUrl,
    failUrl,
    description,
    products,
    tax,
    discount,
  } = body;

  if (!amount || amount <= 0) {
    throw createError({
      statusCode: 400,
      message: "Invalid amount",
    });
  }

  if (!currency) {
    throw createError({
      statusCode: 400,
      message: "Currency is required",
    });
  }

  if (!ipnUrl) {
    throw createError({
      statusCode: 400,
      message: "IPN URL is required",
    });
  }

  if (!successUrl) {
    throw createError({
      statusCode: 400,
      message: "Success URL is required",
    });
  }

  if (!failUrl) {
    throw createError({
      statusCode: 400,
      message: "Fail URL is required",
    });
  }

  if (!products || !products.length) {
    throw createError({
      statusCode: 400,
      message: "At least one product is required",
    });
  }

  // Cleanup stale intents
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  await models.paymentIntent.destroy({
    where: {
      [Op.or]: [
        { status: "PENDING", createdAt: { [Op.lt]: oneDayAgo } }, // Expired intents
      ],
    },
    individualHooks: true,
  });

  // Create the payment intent
  const paymentIntent = await models.paymentIntent.create({
    amount,
    currency,
    tax: tax || 0,
    discount: discount || 0,
    status: "PENDING",
    ipnUrl,
    successUrl,
    failUrl,
    apiKey,
    description: description || null,
    transactionId: null,
  });

  // Store product details with images
  await models.paymentIntentProduct.bulkCreate(
    products.map((product) => ({
      paymentIntentId: paymentIntent.id,
      name: product.name,
      quantity: product.quantity,
      price: product.price,
      currency: product.currency,
      sku: product.sku,
      image: product.image, // Add image to the model
    }))
  );

  return {
    paymentIntentId: paymentIntent.id,
    status: "created",
    currency,
  };
};
