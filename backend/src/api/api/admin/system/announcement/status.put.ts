// /server/api/announcement/status.put.ts

import { handleBroadcastMessage } from "@b/handler/Websocket";
import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of announcements",
  operationId: "bulkUpdateAnnouncementStatus",
  tags: ["Admin", "Announcements"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of announcement IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the announcements (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Announcement"),
  requiresAuth: true,
  permission: "edit.announcement",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  const msg = updateStatus("announcement", ids, status);

  handleBroadcastMessage({
    type: "announcements",
    model: "announcement",
    method: "update",
    status,
    id: ids,
  });

  return msg;
};
