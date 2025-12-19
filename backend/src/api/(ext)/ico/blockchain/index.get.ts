import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Active Blockchain Configurations",
  description: "Retrieves all active blockchain configurations for users.",
  operationId: "getActiveBlockchainConfigs",
  tags: ["ICO", "Blockchain"],
  logModule: "ICO",
  logTitle: "Get active blockchains",
  responses: {
    200: {
      description: "Active blockchain configurations retrieved successfully.",
      content: {
        "application/json": {
          schema: { type: "array", items: { type: "object" } },
        },
      },
    },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { ctx } = data;

  ctx?.step("Fetching active blockchain configurations");
  const activeBlockchains = await models.icoBlockchain.findAll({
    where: { status: true },
  });

  ctx?.success(`Retrieved ${activeBlockchains.length} active blockchains`);
  return activeBlockchains;
};
