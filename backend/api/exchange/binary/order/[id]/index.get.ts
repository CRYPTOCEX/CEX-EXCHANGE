// /server/api/exchange/binary/orders/show.get.ts

import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseBinaryOrderSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Show Binary Order",
  operationId: "showBinaryOrder",
  tags: ["Binary", "Orders"],
  description:
    "Retrieves a specific binary order by ID for the authenticated user.",
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the binary order to retrieve.",
      required: true,
      schema: { type: "string", format: "uuid" },
    },
  ],
  responses: {
    200: {
      description: "Binary order data",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseBinaryOrderSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Binary Order"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  if (!data.user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });
  const { user, params } = data;
  const { id } = params;

  if (!id) {
    throw new Error("Order not found");
  }

  if (!user) {
    throw new Error("Unauthorized");
  }

  const binaryOrder = await getBinaryOrder(user.id, id);

  if (!binaryOrder) {
    throw new Error(`Binary order with ID ${id} not found`);
  }

  return binaryOrder;
};

export async function getBinaryOrder(
  userId: string,
  id: string
): Promise<BinaryOrder> {
  const response = await models.binaryOrder.findOne({
    where: {
      id,
      userId,
    },
  });

  if (!response) {
    throw new Error(`Binary order with ID ${id} not found`);
  }

  return response.get({ plain: true }) as unknown as BinaryOrder;
}
