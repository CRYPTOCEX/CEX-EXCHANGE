import { models } from "@b/db";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { binaryDurationSchema } from "./utils";

export const metadata = {
  summary: "Lists all binary durations with pagination and optional filtering",
  operationId: "listBinaryDurations",
  tags: ["Admin", "Binary", "Durations"],
  parameters: [
    ...crudParameters,
    {
      name: "duration",
      in: "query",
      description: "Filter durations by duration (seconds)",
      schema: { type: "number" },
      required: false,
    },
    {
      name: "status",
      in: "query",
      description: "Filter durations by status (active or not)",
      schema: { type: "boolean" },
      required: false,
    },
  ],
  responses: {
    200: {
      description: "List of binary durations with detailed information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: binaryDurationSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Binary Durations"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.binary.duration",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.binaryDuration,
    query,
    sortField: query.sortField || "duration",
    paranoid: false,
  });
};