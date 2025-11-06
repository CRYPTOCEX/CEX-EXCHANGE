import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { paymentIntentSchema } from "../utils";
import { models } from "@b/db";

export const metadata = {
  summary: "Retrieves detailed information of a specific Payment Intent by ID",
  operationId: "getPaymentIntentById",
  tags: ["Admin", "Payment"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Payment Intent to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Payment Intent details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: paymentIntentSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Payment Intent"),
    500: serverErrorResponse,
  },
  permission: "view.payment.intent",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("paymentIntent", params.id, [
    {
      model: models.user,
      as: "user",
      attributes: ["email", "firstName", "lastName"],
    },
    {
      model: models.wallet,
      as: "wallet",
      attributes: ["balance", "currency"],
    },
    {
      model: models.paymentIntentProduct,
      as: "products",
      attributes: ["name", "quantity", "price", "currency", "image"],
    },
  ]);
};
