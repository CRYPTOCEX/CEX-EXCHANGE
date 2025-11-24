// /api/admin/forex/investments/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  forexInvestmentStoreSchema,
  forexInvestmentUpdateSchema,
} from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new Forex Investment",
  operationId: "storeForexInvestment",
  tags: ["Admin", "Forex Investments"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: forexInvestmentUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(
    forexInvestmentStoreSchema,
    "Forex Investment"
  ),
  requiresAuth: true,
  permission: "create.forex.investment",
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
    model: "forexInvestment",
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
