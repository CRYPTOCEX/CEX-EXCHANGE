import { models } from "@b/db";
import { getFiltered } from "@b/utils/query";
import { paginationSchema, structureSchema } from "@b/utils/constants";
import { adminProfitSchema } from "./utils";

export const metadata = {
  summary: "Fetches a list of Admin Profits",
  operationId: "getAdminProfits",
  tags: ["Admin", "Finance", "Profits"],
  responses: {
    200: {
      description: "List of Admin Profits",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: adminProfitSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
  },
  requiresAuth: true,
  permission: "view.admin.profit",
};

export default async (data: Handler) => {
  const { query } = data;

  return await getFiltered({
    model: models.adminProfit,
    query,
    numericFields: ["amount"],
    excludeFields: [],
    paranoid: false,
  });
};
