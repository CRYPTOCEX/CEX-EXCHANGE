// /api/admin/forex/accounts/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { forexAccountStoreSchema, forexAccountUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Creates a new Forex account",
  operationId: "storeForexAccount",
  tags: ["Admin", "Forex", "Account"],
  description:
    "Creates a new Forex account for a user with specified broker, MetaTrader version, balance, leverage, and account type (DEMO/LIVE).",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: forexAccountUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(forexAccountStoreSchema, "Forex Account"),
  requiresAuth: true,
  permission: "create.forex.account",
  logModule: "ADMIN_FOREX",
  logTitle: "Create forex account",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const {
    userId,
    accountId,
    password,
    broker,
    mt,
    balance,
    leverage,
    type,
    status,
  } = body;

  ctx?.step("Validating forex account data");

  ctx?.step("Creating forex account");
  const result = await storeRecord({
    model: "forexAccount",
    data: {
      userId,
      accountId,
      password,
      broker,
      mt,
      balance,
      leverage,
      type,
      status,
    },
  });

  ctx?.success("Forex account created successfully");
  return result;
};
