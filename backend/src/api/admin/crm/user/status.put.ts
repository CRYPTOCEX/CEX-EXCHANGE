// /server/api/admin/users/update-status/bulk.put.ts

import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of users",
  operationId: "bulkUpdateUserStatus",
  tags: ["Admin", "CRM", "User"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of user IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              description: "New status to apply",
              enum: ["ACTIVE", "INACTIVE", "BANNED"],
            },
          },
          required: ["users", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("User"),
  requiresAuth: true,
  permission: "edit.user",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { ids } = params;
  const { status } = body;
  return updateStatus("user", ids, status);
};
