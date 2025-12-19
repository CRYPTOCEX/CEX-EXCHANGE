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
  logModule: "ADMIN_FIN",
  logTitle: "Create Withdraw Method",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
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

  ctx?.step("Creating withdraw method");
  const result = await storeRecord({
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

  ctx?.success("Withdraw method created successfully");
  return result;
};
