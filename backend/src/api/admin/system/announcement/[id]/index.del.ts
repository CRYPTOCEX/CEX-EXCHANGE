// /server/api/announcement/index.del.ts

import { handleBroadcastMessage } from "@b/handler/Websocket";
import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes an announcement",
  operationId: "deleteAnnouncement",
  tags: ["Admin", "Announcements"],
  parameters: deleteRecordParams("announcement"),
  responses: deleteRecordResponses("Announcement"),
  permission: "delete.announcement",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  const { id } = params;

  const message = handleSingleDelete({
    model: "announcement",
    id,
    query,
  });

  handleBroadcastMessage({
    type: "announcements",
    method: "delete",
    id,
  });

  return message;
};
