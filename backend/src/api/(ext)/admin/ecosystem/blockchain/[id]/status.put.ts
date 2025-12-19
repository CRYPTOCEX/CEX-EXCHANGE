import { models } from "@b/db";
import {
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
  unauthorizedResponse,
  successMessageResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update ecosystem blockchain status",
  description:
    "Updates the active status of an ecosystem blockchain. This allows administrators to enable or disable specific blockchain integrations within the ecosystem.",
  operationId: "updateEcosystemBlockchainStatus",
  tags: ["Admin", "Ecosystem", "Blockchain"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "Product ID of the blockchain to update",
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
                "New status to apply to the blockchain (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: {
    200: successMessageResponse("Blockchain status updated successfully"),
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Blockchain"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ecosystem.blockchain",
  logModule: "ADMIN_ECO",
  logTitle: "Update blockchain status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step(`Updating blockchain status to ${status}`);
  // Update the status of the blockchain in the database
  await models.ecosystemBlockchain.update(
    { status },
    { where: { productId: id } }
  );

  ctx?.success("Blockchain status updated successfully");
  return { message: "Blockchain status updated successfully" };
};
