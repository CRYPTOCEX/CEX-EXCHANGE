// /server/api/mailwizard/templates/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { mailwizardTemplateSchema } from "./utils";

export const metadata = {
  summary:
    "Lists all Mailwizard Templates with pagination and optional filtering",
  operationId: "listMailwizardTemplates",
  tags: ["Admin", "Mailwizard", "Templates"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of Mailwizard Templates with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: mailwizardTemplateSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Mailwizard Templates"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.mailwizard.template",
};

export default async (data: Handler) => {
  const { query } = data;

  // Call the generic fetch function
  return getFiltered({
    model: models.mailwizardTemplate,
    query,
    sortField: query.sortField || "createdAt",
    // Assuming sensitive fields might be hidden
  });
};
