import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Block a user account",
  description: "Block a user account with reason and optional duration",
  operationId: "blockUser",
  tags: ["Admin", "CRM", "User"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the user to block",
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
            reason: {
              type: "string",
              description: "Reason for blocking the user",
            },
            isTemporary: {
              type: "boolean",
              description: "Whether this is a temporary block",
              default: false,
            },
            duration: {
              type: "number",
              description: "Duration in hours (only for temporary blocks)",
            },
          },
          required: ["reason"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "User blocked successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              blockId: { type: "string" },
            },
          },
        },
      },
    },
    400: { description: "Bad request" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "User not found" },
  },
  requiresAuth: true,
  permission: "edit.user",
};

export default async (data: Handler) => {
  const { params, body, user } = data;
  const { id } = params;
  const { reason, isTemporary = false, duration } = body;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  // Validate duration for temporary blocks
  if (isTemporary && (!duration || duration < 1 || duration > 8760)) {
    throw createError({
      statusCode: 400,
      message: "Duration must be between 1 and 8760 hours for temporary blocks",
    });
  }

  // Find the target user
  const targetUser = await models.user.findOne({
    where: { id },
    include: [
      {
        model: models.role,
        as: "role",
        attributes: ["name"],
      },
    ],
  });

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  // Prevent blocking super admins
  if (targetUser.role && targetUser.role.name === "Super Admin") {
    throw createError({
      statusCode: 403,
      message: "Cannot block Super Admin accounts",
    });
  }

  // Prevent self-blocking
  if (targetUser.id === user.id) {
    throw createError({
      statusCode: 403,
      message: "You cannot block your own account",
    });
  }

  // Check if user is already blocked
  const existingBlock = await models.userBlock.findOne({
    where: {
      userId: id,
      isActive: true,
      [Op.or]: [
        { isTemporary: false },
        {
          isTemporary: true,
          blockedUntil: {
            [Op.gt]: new Date(),
          },
        },
      ],
    },
  });

  if (existingBlock) {
    throw createError({
      statusCode: 400,
      message: "User is already blocked",
    });
  }

  // Calculate blocked until date for temporary blocks
  let blockedUntil: Date | null = null;
  if (isTemporary && duration) {
    blockedUntil = new Date(Date.now() + duration * 60 * 60 * 1000);
  }

  // Create block record
  const blockRecord = await models.userBlock.create({
    userId: id,
    adminId: user.id,
    reason,
    isTemporary,
    duration: isTemporary ? duration : null,
    blockedUntil,
    isActive: true,
  });

  // Update user status
  const newStatus = isTemporary ? "SUSPENDED" : "BANNED";
  await models.user.update(
    { status: newStatus },
    { where: { id } }
  );

  return {
    message: `User ${isTemporary ? "temporarily blocked" : "blocked"} successfully`,
    blockId: blockRecord.id,
  };
}; 