import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

const sliderSchema = {
  id: { type: "string", format: "uuid" },
  image: { type: "string" },
  link: { type: "string", nullable: true },
  status: { type: "boolean", nullable: true },
  createdAt: { type: "string", format: "date-time" },
  updatedAt: { type: "string", format: "date-time" },
  deletedAt: { type: "string", format: "date-time", nullable: true },
};

export const metadata = {
  summary: "Lists all Sliders with pagination and optional filtering",
  operationId: "listSliders",
  tags: ["Admin", "Sliders"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of Sliders with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: sliderSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Sliders"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.slider",
};

export default async (data: Handler) => {
  const { query } = data;

  // Using the getFiltered function which processes all CRUD parameters, including sorting and filtering
  return getFiltered({
    model: models.slider,
    query,
    sortField: query.sortField || "createdAt",
  });
};
