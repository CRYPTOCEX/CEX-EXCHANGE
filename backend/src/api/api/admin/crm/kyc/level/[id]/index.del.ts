import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Delete a KYC Level",
  description: "Deletes a KYC level by its ID.",
  operationId: "deleteKycLevel",
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
    200: {
      description: "KYC level deleted successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: { message: { type: "string" } },
          },
        },
      },
    },
    404: { description: "KYC level not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "delete.kyc.level",
  requiresAuth: true,
};

export default async (data: Handler): Promise<any> => {
  const { params } = data;
  const { id } = params;
  if (!id) {
    throw createError({ statusCode: 400, message: "Missing level ID" });
  }
  const levelRecord = await models.kycLevel.findByPk(id);
  if (!levelRecord) {
    throw createError({ statusCode: 404, message: "KYC level not found" });
  }
  await levelRecord.destroy();
  return { message: "KYC level deleted successfully." };
};
