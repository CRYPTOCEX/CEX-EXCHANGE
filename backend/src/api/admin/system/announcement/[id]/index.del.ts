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
  logModule: "ADMIN_SYS",
  logTitle: "Delete announcement",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;
  const { id } = params;

  ctx?.step(`Deleting announcement ${id}`);
  const message = handleSingleDelete({
    model: "announcement",
    id,
    query,
  });

  ctx?.step("Broadcasting announcement deletion");
  handleBroadcastMessage({
    type: "announcements",
    method: "delete",
    id,
  });

  ctx?.success("Announcement deleted successfully");
  return message;
};
