import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { forexSignalUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a Forex signal",
  description: "Updates an existing Forex trading signal by its ID. Can modify title, image, and active status.",
  operationId: "updateForexSignal",
  tags: ["Admin", "Forex", "Signal"],
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
  logModule: "ADMIN_FOREX",
  logTitle: "Update forex signal",
};

export default async (data) => {
  const { body, params , ctx } = data;
  const { id } = params;
  const { title, image, status } = body;

  ctx?.step("Validating data");

  ctx?.step(`Updating record ${id}`);

  const result = await updateRecord("forexSignal", id, {
    title,
    image,
    status,
  });

  ctx?.success("Record updated successfully");
  return result;
};
