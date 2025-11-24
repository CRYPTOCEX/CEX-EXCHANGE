// /server/api/admin/binary/orders/[id].get.ts

import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { orderSchema } from "../utils"; // Ensure the schema is adjusted to include only the fields needed.
import { models } from "@b/db";

export const metadata = {
  summary: "Retrieves detailed information of a specific binary order by ID",
  operationId: "getBinaryOrderById",
  tags: ["Admin", "Binary Order"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the binary order to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Binary order details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: orderSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Binary Order"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.binary.order",
};

export default async (data: Handler) => {
  const { params } = data;

  const attributes = [
    "symbol",
    "price",
    "amount",
    "profit",
    "side",
    "type",
    "status",
    "isDemo",
    "closePrice",
  ];

  return await getRecord("binaryOrder", params.id, [
    {
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email", "avatar"],
    },
  ]);
};
