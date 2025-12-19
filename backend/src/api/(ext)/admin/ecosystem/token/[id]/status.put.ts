import { models } from "@b/db";
import {
  updateStatus,
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/query";
import {
  badRequestResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Updates an ecosystem token status",
  description:
    "Updates the status (active/inactive) of a specific ecosystem token. Validates that the associated blockchain is active before allowing the token to be enabled.",
  operationId: "updateEcosystemTokenStatus",
  tags: ["Admin", "Ecosystem", "Token"],
  logModule: "ADMIN_ECO",
  logTitle: "Update token status",
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
  responses: {
    200: {
      description: "Ecosystem token status updated successfully",
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
  const { status } = body;

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

  ctx?.step(`Updating token status to ${status}`);
  const result = await updateStatus("ecosystemToken", id, status);

  ctx?.success("Token status updated successfully");
  return result;
};
