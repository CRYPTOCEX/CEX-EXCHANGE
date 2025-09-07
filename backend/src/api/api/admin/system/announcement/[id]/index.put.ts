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
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { type, title, message, link, status } = body;

  const msg = await updateRecord("announcement", id, {
    type,
    title,
    message,
    link,
    status,
  });

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

  return msg;
};
