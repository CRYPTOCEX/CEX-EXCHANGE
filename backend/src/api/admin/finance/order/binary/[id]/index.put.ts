// /api/admin/binary/orders/[id]/update.put.ts
import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { binaryOrderUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates an existing binary order",
  operationId: "updateBinaryOrder",
  tags: ["Admin", "Binary Order"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "The ID of the binary order to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated data for the binary order",
    content: {
      "application/json": {
        schema: binaryOrderUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Binary Order"),
  requiresAuth: true,
  permission: "edit.binary.order",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const {
    symbol,
    price,
    amount,
    profit,
    side,
    type,
    status,
    isDemo,
    closePrice,
  } = body;

  return await updateRecord("binaryOrder", id, {
    symbol,
    price,
    amount,
    profit,
    side,
    type,
    status,
    isDemo,
    closePrice,
  });
};
