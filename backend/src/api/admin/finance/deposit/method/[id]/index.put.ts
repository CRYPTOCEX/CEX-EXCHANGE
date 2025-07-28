import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { depositMethodUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates an existing deposit method",
  operationId: "updateDepositMethod",
  tags: ["Admin", "Deposit Methods"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the deposit method to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "New data for the deposit method",
    content: {
      "application/json": {
        schema: depositMethodUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Deposit Method"),
  requiresAuth: true,
  permission: "edit.deposit.method",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const {
    image,
    title,
    instructions,
    fixedFee,
    percentageFee,
    minAmount,
    maxAmount,
    customFields,
  } = body;

  // Parse customFields if it is a string
  let parsedCustomFields = customFields;
  if (typeof customFields === "string") {
    try {
      parsedCustomFields = JSON.parse(customFields);
    } catch (error) {
      throw new Error("Invalid JSON format for customFields");
    }
  }

  return await updateRecord("depositMethod", id, {
    image,
    title,
    instructions,
    fixedFee,
    percentageFee,
    minAmount,
    maxAmount,
    customFields: parsedCustomFields,
  });
};
