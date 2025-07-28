import { models } from "@b/db";
import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates the status of an Ecosystem Token",
  operationId: "updateEcosystemTokenStatus",
  tags: ["Admin", "Tokens"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the token to update",
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
                "New status to apply (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Ecosystem Token"),
  requiresAuth: true,
  permission: "edit.ecosystem.token",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;

  const token = await models.ecosystemToken.findByPk(id);
  if (!token) {
    throw new Error(`Token with ID ${id} not found`);
  }
  const blockchain = await models.ecosystemBlockchain.findOne({
    where: { chain: token.chain },
  });

  if (blockchain && !blockchain.status) {
    if (blockchain.version === "0.0.1") {
      throw new Error(
        `Please install the latest version of the blockchain ${token.chain} to enable this token`
      );
    } else {
      throw new Error(`${token.chain} Blockchain is disabled`);
    }
  }
  return updateStatus("ecosystemToken", id, status);
};
