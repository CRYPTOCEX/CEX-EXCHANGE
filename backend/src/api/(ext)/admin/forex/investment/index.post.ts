// /api/admin/forex/investments/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  forexInvestmentStoreSchema,
  forexInvestmentUpdateSchema,
} from "./utils";

export const metadata: OperationObject = {
  summary: "Creates a new Forex investment",
  description: "Creates a new Forex investment for a user with specified plan, duration, amount, and expected profit. The investment status can be ACTIVE, COMPLETED, CANCELLED, or REJECTED.",
  operationId: "createForexInvestment",
  tags: ["Admin", "Forex", "Investment"],
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
  logModule: "ADMIN_FOREX",
  logTitle: "Create forex investment",
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

  ctx?.step("Validating forex investment data");

  ctx?.step("Creating forex investment");
  const investmentResult = await storeRecord({
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

  ctx?.success("Forex investment created successfully");
  return investmentResult;
};
