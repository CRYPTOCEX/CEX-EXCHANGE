import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { forexAccountUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific Forex Account",
  operationId: "updateForexAccount",
  tags: ["Admin", "Forex Accounts"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the Forex Account to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the Forex Account",
    content: {
      "application/json": {
        schema: forexAccountUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Forex Account"),
  requiresAuth: true,
  permission: "edit.forex.account",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
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

  return await updateRecord("forexAccount", id, {
    userId,
    accountId,
    password,
    broker,
    mt,
    balance,
    leverage,
    type,
    status,
  });
};
