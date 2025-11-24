// /server/api/admin/users/index.post.ts

import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { hashPassword } from "@b/utils/passwords";
import { userStoreSchema, userUpdateSchema } from "./utils";
import { storeRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Creates a new user",
  operationId: "createUser",
  tags: ["Admin", "CRM", "User"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: userUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(userStoreSchema, "Page"),
  requiresAuth: true,
  permission: "create.user",
};

export default async (data: Handler) => {
  const { body, user } = data;
  const {
    firstName,
    lastName,
    email,
    roleId,
    avatar,
    phone,
    emailVerified,
    status = "ACTIVE",
    profile,
  } = body;

  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized access" });

  const existingUser = await models.user.findOne({
    where: { email },
    include: [{ model: models.role, as: "role" }],
  });

  if (existingUser)
    throw createError({ statusCode: 400, message: "User already exists" });

  const password = await hashPassword("12345678");

  const superAdminRole = await models.role.findOne({
    where: { name: "Super Admin" },
  });

  // prevent making super admin
  if (roleId === superAdminRole?.id)
    throw createError({
      statusCode: 400,
      message: "You cannot create a Super Admin",
    });

  await models.user.create({
    firstName,
    lastName,
    email,
    roleId: Number(roleId),
    password,
    avatar,
    phone,
    emailVerified,
    status,
    profile,
  });

  return {
    message: "User created successfully, Password is 12345678",
  };
};
