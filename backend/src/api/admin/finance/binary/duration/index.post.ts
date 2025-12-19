import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { BinaryDurationStoreSchema, BinaryDurationUpdateSchema } from "./utils";

export const metadata = {
  summary: "Stores a new Binary Duration",
  operationId: "storeBinaryDuration",
  tags: ["Admin", "Binary Durations"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: BinaryDurationUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(BinaryDurationStoreSchema, "Binary Duration"),
  requiresAuth: true,
  permission: "create.binary.duration",
  logModule: "ADMIN_BINARY",
  logTitle: "Create binary duration",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { duration, profitPercentage, status } = body;

  ctx?.step("Validating binary duration data");

  ctx?.step("Creating binary duration record");
  const result = await storeRecord({
    model: "binaryDuration",
    data: {
      duration,
      profitPercentage,
      status: status !== undefined ? status : true,
    },
  });

  ctx?.success("Binary duration created successfully");
  return result;
};