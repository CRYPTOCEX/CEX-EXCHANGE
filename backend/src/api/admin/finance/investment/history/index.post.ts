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
};

export default async (data: Handler) => {
  const { body } = data;
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

  return await storeRecord({
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
};
