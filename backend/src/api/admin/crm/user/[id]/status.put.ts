// /server/api/admin/users/[id]/status.put.ts

import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates the status of a user",
  operationId: "updateUserStatus",
  tags: ["Admin", "CRM", "User"],
  logModule: "ADMIN_CRM",
  logTitle: "Update user status",
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
        schema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              description: "New status to apply",
              enum: ["ACTIVE", "INACTIVE", "BANNED"],
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("User"),
  requiresAuth: true,
  permission: "edit.user",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step(`Updating user status to ${status}`);
  const result = await updateStatus("user", id, status);
  ctx?.success();
  return result;
};
