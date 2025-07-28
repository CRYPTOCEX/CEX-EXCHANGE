// /api/admin/withdraw/methods/[id]/update.put.ts
import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { withdrawalMethodUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates an existing withdrawal method",
  operationId: "updateWithdrawMethod",
  tags: ["Admin", "Withdraw Methods"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the withdrawal method to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated data for the withdrawal method",
    content: {
      "application/json": {
        schema: withdrawalMethodUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Withdraw Method"),
  requiresAuth: true,
  permission: "edit.withdraw.method",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const {
    title,
    processingTime,
    instructions,
    image,
    fixedFee,
    percentageFee,
    minAmount,
    maxAmount,
    customFields,
    status,
  } = body;

  return await updateRecord("withdrawMethod", id, {
    title,
    processingTime,
    instructions,
    image,
    fixedFee,
    percentageFee,
    minAmount,
    maxAmount,
    customFields,
    status,
  });
};
