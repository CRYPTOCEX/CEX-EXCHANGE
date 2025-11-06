import { models } from "@b/db";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { paymentIntentSchema } from "./utils";

export const metadata = {
  summary: "Lists all Payment Intents with optional filtering and pagination",
  operationId: "listPaymentIntents",
  tags: ["Admin", "Payment"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of Payment Intents with pagination info",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: { type: "object", properties: paymentIntentSchema },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Payment Intents"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.payment.intent",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.paymentIntent,
    query,
    sortField: query.sortField || "createdAt",
    paranoid: false,
    includeModels: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
      {
        model: models.paymentIntentProduct,
        as: "products",
        attributes: ["name", "quantity", "price", "currency"],
      },
    ],
  });
};
