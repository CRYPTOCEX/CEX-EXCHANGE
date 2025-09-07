// /api/admin/forex/signals/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { forexSignalSchema, forexSignalUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new Forex Signal",
  operationId: "storeForexSignal",
  tags: ["Admin", "Forex Signals"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: forexSignalUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(forexSignalSchema, "Forex Signal"),
  requiresAuth: true,
  permission: "create.forex.signal",
};

export default async (data: Handler) => {
  const { body } = data;
  const { title, image, status } = body;

  return await storeRecord({
    model: "forexSignal",
    data: {
      title,
      image,
      status,
    },
  });
};
