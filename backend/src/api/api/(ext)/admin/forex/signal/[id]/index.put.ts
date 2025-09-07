import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { forexSignalUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific Forex Signal",
  operationId: "updateForexSignal",
  tags: ["Admin", "Forex Signals"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the Forex Signal to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the Forex Signal",
    content: {
      "application/json": {
        schema: forexSignalUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Forex Signal"),
  requiresAuth: true,
  permission: "edit.forex.signal",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { title, image, status } = body;

  return await updateRecord("forexSignal", id, {
    title,
    image,
    status,
  });
};
