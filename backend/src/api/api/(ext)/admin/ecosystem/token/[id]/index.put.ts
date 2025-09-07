import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { ecosystemTokenUpdateSchema, updateIconInCache } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Updates a specific ecosystem token",
  operationId: "updateEcosystemToken",
  tags: ["Admin", "Ecosystem", "Tokens"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the token to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the ecosystem token",
    content: {
      "application/json": {
        schema: ecosystemTokenUpdateSchema,
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
  const { status, limits, fee, icon } = body;

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

  try {
    const updateResult = await updateRecord(
      "ecosystemToken",
      id,
      {
        status,
        limits: JSON.stringify(limits),
        fee: JSON.stringify(fee),
        icon,
      },
      true
    );

    if (updateResult && icon) {
      const updatedToken = await models.ecosystemToken.findByPk(id);
      if (updatedToken && updatedToken.currency) {
        try {
          await updateIconInCache(updatedToken.currency, icon);
        } catch (error) {
          console.error(
            `Failed to update icon in cache for ${updatedToken.currency}:`,
            error
          );
        }
      }
    }

    return updateResult;
  } catch (error) {
    console.error(`Error updating ecosystem token:`, error);
    throw error;
  }
};
