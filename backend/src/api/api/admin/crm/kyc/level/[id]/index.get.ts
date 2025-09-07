import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get a KYC Level by ID",
  description: "Retrieves a specific KYC level by its ID.",
  operationId: "getKycLevelById",
  tags: ["KYC", "Levels"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "KYC level ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: { description: "KYC level retrieved successfully." },
    404: { description: "KYC level not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "view.kyc.level",
  requiresAuth: true,
};

export default async (data: { params: { id: string } }): Promise<any> => {
  const { id } = data.params;
  const level = await models.kycLevel.findByPk(id);
  if (!level) {
    throw createError({ statusCode: 404, message: "KYC level not found" });
  }
  return level;
};
