// /server/api/announcement/index.put.ts

import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { announcementUpdateSchema } from "../utils";
import { handleBroadcastMessage } from "@b/handler/Websocket";

export const metadata = {
  summary: "Updates a specific Announcement",
  operationId: "updateAnnouncement",
  tags: ["Admin", "Announcements"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the Announcement to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the Announcement",
    content: {
      "application/json": {
        schema: announcementUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Announcement"),
  requiresAuth: true,
  permission: "edit.announcement",
  logModule: "ADMIN_SYS",
  logTitle: "Update announcement",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { type, title, message, link, status } = body;

  ctx?.step("Validating announcement data");

  ctx?.step(`Updating announcement ${id}`);
  const msg = await updateRecord("announcement", id, {
    type,
    title,
    message,
    link,
    status,
  });

  ctx?.step("Broadcasting announcement update");
  handleBroadcastMessage({
    type: "announcements",
    model: "announcement",
    method: "update",
    data: {
      type,
      title,
      message,
      link,
      status,
    },
    id,
  });

  ctx?.success("Announcement updated successfully");
  return msg;
};
