// /server/api/announcement/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

const announcementSchema = {
  id: { type: "string", format: "uuid" },
  type: { type: "string", enum: ["GENERAL", "EVENT", "UPDATE"] },
  title: { type: "string" },
  message: { type: "string" },
  link: { type: "string", nullable: true },
  status: { type: "boolean", nullable: true },
  createdAt: { type: "string", format: "date-time" },
  updatedAt: { type: "string", format: "date-time" },
  deletedAt: { type: "string", format: "date-time", nullable: true },
};

export const metadata = {
  summary: "Lists all Announcements with pagination and optional filtering",
  operationId: "listAnnouncements",
  tags: ["Admin","Announcements"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of Announcements with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: announcementSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Announcements"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "access.announcement",
};

export default async (data: Handler) => {
  const { query } = data;

  // Using the getFiltered function which processes all CRUD parameters, including sorting and filtering
  return getFiltered({
    model: models.announcement,
    query,
    sortField: query.sortField || "createdAt",
  });
};
