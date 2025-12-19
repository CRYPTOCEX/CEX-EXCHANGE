// /server/api/announcement/delete.del.ts

import { handleBroadcastMessage } from "@b/handler/Websocket";
import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes announcements by IDs",
  operationId: "bulkDeleteAnnouncements",
  tags: ["Admin", "Announcements"],
  parameters: commonBulkDeleteParams("Announcements"),
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of announcement IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Announcements"),
  requiresAuth: true,
  permission: "delete.announcement",
  logModule: "ADMIN_SYS",
  logTitle: "Bulk delete announcements",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Deleting ${ids.length} announcements`);
  const message = handleBulkDelete({
    model: "announcement",
    ids,
    query,
  });

  ctx?.step("Broadcasting bulk deletion");
  handleBroadcastMessage({
    type: "announcements",
    method: "delete",
    id: ids,
  });

  ctx?.success(`${ids.length} announcements deleted successfully`);
  return message;
};
