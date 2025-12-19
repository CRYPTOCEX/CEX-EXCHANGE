// /api/admin/investment/investments/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { investmentStoreSchema, investmentUpdateSchema } from "./utils";

export const metadata = {
  summary: "Stores a new Investment",
  operationId: "storeInvestment",
  tags: ["Admin", "Investments"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: investmentUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(investmentStoreSchema, "Investment"),
  requiresAuth: true,
  permission: "create.investment",
  logModule: "ADMIN_FIN",
  logTitle: "Create Investment History",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const {
    userId,
    planId,
    durationId,
    amount,
    profit,
    result,
    status,
    endDate,
  } = body;

  ctx?.step("Validating investment data");

  ctx?.step("Creating new investment record");
  const record = await storeRecord({
    model: "investment",
    data: {
      userId,
      planId,
      durationId,
      amount,
      profit,
      result,
      status,
      endDate,
    },
  });

  ctx?.success();
  return record
};
