import { storeRecord } from "@b/utils/query";
import { adminProfitStoreSchema } from "./utils";

export const metadata = {
  summary: "Stores a new Admin Profit",
  operationId: "storeAdminProfit",
  tags: ["Admin", "Finance", "Profits"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: adminProfitStoreSchema,
      },
    },
  },
  responses: {
    200: {
      description: "Admin Profit created successfully",
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
  permission: "create.admin.profit",
};

export default async (data: Handler) => {
  const { body } = data;
  return await storeRecord({
    model: "adminProfit",
    data: body,
  });
};
