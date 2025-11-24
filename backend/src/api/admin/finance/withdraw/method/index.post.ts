// /api/admin/withdraw/methods/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { baseWithdrawMethodSchema, withdrawalMethodStoreSchema } from "./utils";

export const metadata = {
  summary: "Stores a new withdrawal method",
  operationId: "storeWithdrawMethod",
  tags: ["Admin", "Withdraw Methods"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: baseWithdrawMethodSchema,
          required: [
            "title",
            "processingTime",
            "instructions",
            "fixedFee",
            "percentageFee",
            "minAmount",
            "maxAmount",
            "status",
          ],
        },
      },
    },
  },
  responses: storeRecordResponses(
    withdrawalMethodStoreSchema,
    "Withdraw Method"
  ),
  requiresAuth: true,
  permission: "create.withdraw.method",
};

export default async (data: Handler) => {
  const { body } = data;
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

  return await storeRecord({
    model: "withdrawMethod",
    data: {
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
    },
  });
};
