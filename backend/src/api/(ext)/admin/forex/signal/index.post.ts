// /api/admin/forex/signals/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { forexSignalSchema, forexSignalUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Creates a new Forex signal",
  description: "Creates a new Forex trading signal configuration with title, image, and active status. Users can subscribe to active signals.",
  operationId: "createForexSignal",
  tags: ["Admin", "Forex", "Signal"],
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
  logModule: "ADMIN_FOREX",
  logTitle: "Create forex signal",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { title, image, status } = body;

  ctx?.step("Validating forex signal data");

  ctx?.step("Creating forex signal");
  const result = await storeRecord({
    model: "forexSignal",
    data: {
      title,
      image,
      status,
    },
  });

  ctx?.success("Forex signal created successfully");
  return result;
};
