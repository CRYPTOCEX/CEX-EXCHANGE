import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Validate recipient for transfer",
  description: "Validates if a recipient UUID exists for transfer operations",
  operationId: "validateTransferRecipient",
  tags: ["Finance", "Transfer"],
  requiresAuth: true,
  parameters: [
    {
      name: "uuid",
      in: "query",
      required: true,
      schema: {
        type: "string",
        description: "The UUID of the recipient to validate",
      },
    },
  ],
  responses: {
    200: {
      description: "Recipient validation result",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              exists: {
                type: "boolean",
                description: "Whether the recipient exists",
              },
              recipient: {
                type: "object",
                description: "Recipient information if found",
                properties: {
                  id: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Recipient"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, query } = data;
  
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { uuid } = query;

  if (!uuid || typeof uuid !== "string") {
    throw createError({
      statusCode: 400,
      message: "Recipient UUID is required",
    });
  }

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    return {
      exists: false,
      message: "Invalid UUID format",
    };
  }

  try {
    // Check if recipient exists and is not the same as sender
    const recipient = await models.user.findOne({
      where: {
        uuid: uuid,
      },
      attributes: ["id", "uuid", "firstName", "lastName", "email", "status"],
    });

    if (!recipient) {
      return {
        exists: false,
        message: "Recipient not found",
      };
    }

    // Check if user is trying to transfer to themselves
    if (recipient.id === user.id) {
      return {
        exists: false,
        message: "Cannot transfer to yourself",
      };
    }

    // Check if recipient account is active
    if (!recipient.status) {
      return {
        exists: false,
        message: "Recipient account is inactive",
      };
    }

    return {
      exists: true,
      recipient: {
        id: recipient.id,
        uuid: recipient.uuid,
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        email: recipient.email,
      },
    };
  } catch (error) {
    console.error("Error validating recipient:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to validate recipient",
    });
  }
}; 