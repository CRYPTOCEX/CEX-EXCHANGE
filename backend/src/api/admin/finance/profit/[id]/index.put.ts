import { updateRecord } from "@b/utils/query";
import { adminProfitUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates a specific Admin Profit record",
  operationId: "updateAdminProfit",
  tags: ["Admin", "Finance", "Profits"],
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the Admin Profit to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the Admin Profit",
    content: {
      "application/json": {
        schema: adminProfitUpdateSchema,
      },
    },
  },
  responses: {
    200: {
      description: "Admin Profit updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
  },
  requiresAuth: true,
  permission: "edit.admin.profit",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;

  return await updateRecord("adminProfit", id, body);
};
