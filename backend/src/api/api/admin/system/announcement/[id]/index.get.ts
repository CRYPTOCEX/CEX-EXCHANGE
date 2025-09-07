// /server/api/announcement/index.get.ts

import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { announcementSchema } from "../utils";

export const metadata = {
  summary: "Retrieves detailed information of a specific announcement by ID",
  operationId: "getAnnouncementById",
  tags: ["Admin", "Announcements"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the announcement to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Announcement details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: announcementSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Announcement"),
    500: serverErrorResponse,
  },
  permission: "view.announcement",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("announcement", params.id);
};
