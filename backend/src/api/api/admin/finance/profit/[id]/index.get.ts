import { models } from "@b/db";
import { getRecord } from "@b/utils/query";
import { adminProfitSchema } from "../utils";

export const metadata = {
  summary: "Fetches a specific Admin Profit record",
  operationId: "getAdminProfitById",
  tags: ["Admin", "Finance", "Profits"],
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the Admin Profit to fetch",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    200: {
      description: "Admin Profit details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: adminProfitSchema,
          },
        },
      },
    },
  },
  requiresAuth: true,
  permission: "view.admin.profit",
};

export default async (data: Handler) => {
  const { params } = data;
  const { id } = params;

  return await getRecord("adminProfit", id);
};
