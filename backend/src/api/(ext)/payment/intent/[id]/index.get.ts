import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  serverErrorResponse,
  unauthorizedResponse,
  notFoundMetadataResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Get Payment Intent Details",
  description: "Retrieve details of a specific payment intent.",
  operationId: "getPaymentIntentDetails",
  tags: ["Payments"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "The ID of the payment intent to retrieve.",
      schema: { type: "string" },
    },
  ],
  requiresAuth: false,
  responses: {
    200: {
      description: "Payment Intent details retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Payment intent ID." },
              userId: {
                type: "string",
                description: "User associated with the payment intent.",
              },
              walletId: {
                type: "string",
                description: "Wallet used for the payment.",
              },
              amount: { type: "number", description: "Amount of the payment." },
              currency: { type: "string", description: "Payment currency." },
              status: {
                type: "string",
                enum: ["PENDING", "COMPLETED", "FAILED", "EXPIRED"],
                description: "Payment status.",
              },
              successUrl: {
                type: "string",
                description: "URL for successful payment.",
              },
              failUrl: {
                type: "string",
                description: "URL for failed payment.",
              },
              metadata: {
                type: "object",
                description: "Additional metadata for the payment.",
              },
              createdAt: {
                type: "string",
                format: "date-time",
                description: "Creation timestamp.",
              },
              products: {
                type: "array",
                description:
                  "List of products associated with the payment intent.",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "Product ID." },
                    name: { type: "string", description: "Product name." },
                    quantity: {
                      type: "integer",
                      description: "Quantity purchased.",
                    },
                    price: {
                      type: "number",
                      description: "Price of the product.",
                    },
                    currency: {
                      type: "string",
                      description: "Currency of the product.",
                    },
                    sku: { type: "string", description: "SKU of the product." },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Payment Intent"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { params } = data;
  const { id } = params;

  try {
    // Retrieve the payment intent by ID and include the associated products
    const paymentIntent = await models.paymentIntent.findByPk(id, {
      include: [
        {
          model: models.paymentIntentProduct,
          as: "products",
          attributes: [
            "id",
            "name",
            "quantity",
            "price",
            "currency",
            "sku",
            "image",
          ],
        },
      ],
      attributes: {
        exclude: ["apiKey", "updatedAt"],
      },
    });

    // If the payment intent is not found, throw a 404 error
    if (!paymentIntent) {
      throw createError(404, "Payment Intent not found");
    }

    // Calculate total, tax, and discount for the response
    const totalAmount =
      paymentIntent.amount +
      (paymentIntent.tax || 0) -
      (paymentIntent.discount || 0);

    const { products, ...paymentIntentData } = paymentIntent.toJSON();
    const response = {
      ...paymentIntentData,
      totalAmount,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        price: product.price,
        currency: product.currency,
        sku: product.sku,
        image: product.image,
      })),
    };

    return response;
  } catch (error) {
    // Handle server error
    throw createError({
      statusCode: 500,
      message:
        error.message ||
        "An error occurred while retrieving payment intent details.",
    });
  }
};
