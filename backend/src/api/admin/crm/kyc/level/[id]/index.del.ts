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
  logModule: "ADMIN_CRM",
  logTitle: "Delete KYC level",
};

export default async (data: Handler): Promise<any> => {
  const { params, ctx } = data;
  const { id } = params;

  if (!id) {
    throw createError({ statusCode: 400, message: "Missing level ID" });
  }

  ctx?.step(`Fetching KYC level ${id}`);
  const levelRecord = await models.kycLevel.findByPk(id);
  if (!levelRecord) {
    throw createError({ statusCode: 404, message: "KYC level not found" });
  }

  ctx?.step("Deleting KYC level");
  await levelRecord.destroy();

  ctx?.success("KYC level deleted successfully");
  return { message: "KYC level deleted successfully." };
};
