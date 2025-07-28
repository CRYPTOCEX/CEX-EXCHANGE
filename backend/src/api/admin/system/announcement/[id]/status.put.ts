// /server/api/announcement/status.put.ts

import { handleBroadcastMessage } from "@b/handler/Websocket";
import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Updates the status of an announcement",
  operationId: "updateAnnouncementStatus",
  tags: ["Admin", "Announcements"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the announcement to update",
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
  responses: updateRecordResponses("Announcement"),
  requiresAuth: true,
  permission: "edit.announcement",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  const message = updateStatus("announcement", id, status);

  handleBroadcastMessage({
    type: "announcements",
    model: "announcement",
    method: "update",
    status,
    id,
  });

  return message;
};
