import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Deletes a specific user by UUID",
  operationId: "deleteUserByUuid",
  tags: ["Admin", "CRM", "User"],
  logModule: "ADMIN_CRM",
  logTitle: "Delete user",
  parameters: deleteRecordParams("user"),
  responses: deleteRecordResponses("User"),
  requiresAuth: true,
  permission: "delete.user",
};

export default async (data: Handler) => {
  const { params, query, user, ctx } = data;

  ctx?.step("Validating user authorization");
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  // Check if the request is from a Super Admin
  const userPk = await models.user.findByPk(user.id, {
    include: [{ model: models.role, as: "role" }],
  });
  if (!userPk || !userPk.role || userPk.role.name !== "Super Admin") {
    throw createError({
      statusCode: 403,
      message: "Forbidden - Only Super Admins can delete users",
    });
  }

  const { id } = params;

  ctx?.step("Validating target user");
  // Optional: Check if user to be deleted is also a super admin
  // and prevent that if desired. For example:
  const targetUser = await models.user.findOne({
    where: { id },
    include: [{ model: models.role, as: "role" }],
  });
  if (targetUser && targetUser.role && targetUser.role.name === "Super Admin") {
    throw createError({
      statusCode: 403,
      message: "Forbidden - You cannot delete another Super Admin account",
    });
  }

  ctx?.step("Deleting user");
  const result = await handleSingleDelete({
    model: "user",
    id,
    query,
  });
  ctx?.success();
  return result;
};
