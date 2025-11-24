import { models } from "@b/db";
import { updateRecordResponses } from "@b/utils/query";

export const metadata = {
  summary: "Update Status for a Blockchain",
  operationId: "updateBlockchainStatus",
  tags: ["Admin", "Blockchains"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Blockchain to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description:
                "New status to apply to the Blockchain (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Blockchain"),
  requiresAuth: true,
  permission: "edit.ecosystem.blockchain",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;

  // Update the status of the blockchain in the database
  await models.ecosystemBlockchain.update(
    { status },
    { where: { productId: id } }
  );

  return { message: "Blockchain status updated successfully" };
};
