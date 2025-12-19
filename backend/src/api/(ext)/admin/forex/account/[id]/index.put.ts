import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { forexAccountUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a Forex account",
  operationId: "updateForexAccount",
  tags: ["Admin", "Forex", "Account"],
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
  logModule: "ADMIN_FOREX",
  logTitle: "Update forex account",
};

export default async (data) => {
  const { body, params, ctx } = data;
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

  ctx?.step("Validating forex account data");

  ctx?.step(`Updating forex account ${id}`);
  const result = await updateRecord("forexAccount", id, {
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

  ctx?.success("Forex account updated successfully");
  return result;
};
