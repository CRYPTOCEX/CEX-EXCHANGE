// /server/api/admin/users/[id]/update.put.ts

import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { updateRecordResponses } from "@b/utils/query";
import { userUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific user by UUID",
  operationId: "updateUserByUuid",
  tags: ["Admin", "CRM", "User"],
  logModule: "ADMIN_CRM",
  logTitle: "Update user",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the user to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: userUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("User"),
  requiresAuth: true,
  permission: "edit.user",
};

export default async (data: Handler) => {
  const { params, body, user, ctx } = data;
  const { id } = params;
  const {
    firstName,
    lastName,
    email,
    roleId,
    avatar,
    phone,
    emailVerified,
    twoFactor,
    status,
    profile,
  } = body;

  ctx?.step("Validating user authorization");
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const userPk = await models.user.findOne({
    where: { id: user.id },
    include: [{ model: models.role, as: "role" }],
  });

  ctx?.step("Fetching target user");
  const existingUser = await models.user.findOne({
    where: { id },
    include: [{ model: models.role, as: "role" }],
  });
  if (!existingUser) {
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  if (existingUser.id === userPk.id && userPk.role.name !== "Super Admin") {
    throw createError({
      statusCode: 400,
      message: "You cannot update your own account",
    });
  }

  ctx?.step("Updating user details");
  await models.user.update(
    {
      firstName,
      lastName,
      email,
      avatar,
      phone,
      emailVerified,
      status,
      profile,
      ...(userPk.role.name === "Super Admin" && { roleId }),
    },
    {
      where: { id },
    }
  );

  if (twoFactor) {
    ctx?.step("Disabling two-factor authentication");
    await models.twoFactor.update(
      { enabled: false },
      { where: { userId: id } }
    );
  }

  ctx?.success();
  return {
    message: "User updated successfully",
  };
};
