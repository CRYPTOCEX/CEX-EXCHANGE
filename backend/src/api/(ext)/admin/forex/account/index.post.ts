// /api/admin/forex/accounts/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { forexAccountStoreSchema, forexAccountUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new Forex Account",
  operationId: "storeForexAccount",
  tags: ["Admin", "Forex Accounts"],
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
};

export default async (data: Handler) => {
  const { body } = data;
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

  return await storeRecord({
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
};
