import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { exchangeUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates a specific exchange",
  operationId: "updateExchange",
  tags: ["Admin", "Exchanges"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the exchange to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the exchange",
    content: {
      "application/json": {
        schema: exchangeUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Exchange"),
  requiresAuth: true,
  permission: "edit.exchange",
  logModule: "ADMIN_FIN",
  logTitle: "Update Exchange Provider",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const {
    name,
    title,
    status,
    username,
    licenseStatus,
    version,
    productId,
    type,
  } = body;

  ctx?.step("Updating exchange provider");
  const result = await updateRecord("exchange", id, {
    name,
    title,
    status,
    username,
    licenseStatus,
    version,
    productId,
    type,
  });

  ctx?.success();
  return result;
};
