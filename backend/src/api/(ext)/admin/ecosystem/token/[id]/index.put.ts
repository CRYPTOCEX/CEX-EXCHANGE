import {
  updateRecord,
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/query";
import {
  badRequestResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";
import { ecosystemTokenUpdateSchema, updateIconInCache } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Updates an ecosystem token",
  description:
    "Updates an existing ecosystem token's metadata including status, limits, fees, and icon. Validates that the associated blockchain is active before allowing status changes. Automatically updates the token icon cache when a new icon is provided.",
  operationId: "updateEcosystemToken",
  tags: ["Admin", "Ecosystem", "Token"],
  logModule: "ADMIN_ECO",
  logTitle: "Update token",
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
    description: "Updated ecosystem token data",
    content: {
      "application/json": {
        schema: ecosystemTokenUpdateSchema,
      },
    },
  },
  responses: {
    200: {
      description: "Ecosystem token updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Ecosystem Token"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ecosystem.token",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status, limits, fee, icon } = body;

  ctx?.step("Validating token exists");
  const token = await models.ecosystemToken.findByPk(id);
  if (!token) {
    throw new Error(`Token with ID ${id} not found`);
  }

  ctx?.step("Checking blockchain status");
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
    ctx?.step("Updating token record");
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
          ctx?.step("Updating token icon in cache");
          await updateIconInCache(updatedToken.currency, icon);
        } catch (error) {
          ctx?.warn(`Failed to update icon in cache: ${error.message}`);
          console.error(
            `Failed to update icon in cache for ${updatedToken.currency}:`,
            error
          );
        }
      }
    }

    ctx?.success("Token updated successfully");
    return updateResult;
  } catch (error) {
    ctx?.fail(error.message);
    console.error(`Error updating ecosystem token:`, error);
    throw error;
  }
};
