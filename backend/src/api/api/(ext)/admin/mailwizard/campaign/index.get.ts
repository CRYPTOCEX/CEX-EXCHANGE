// /server/api/mailwizard/campaigns/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { mailwizardCampaignSchema } from "./utils";

export const metadata = {
  summary:
    "Lists all Mailwizard Campaigns with pagination and optional filtering",
  operationId: "listMailwizardCampaigns",
  tags: ["Admin", "Mailwizard", "Campaigns"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of Mailwizard Campaigns with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: mailwizardCampaignSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Mailwizard Campaigns"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.mailwizard.campaign",
};

export default async (data: Handler) => {
  const { query } = data;

  // Call the generic fetch function
  return getFiltered({
    model: models.mailwizardCampaign,
    query,
    sortField: query.sortField || "createdAt",
    customStatus: [
      {
        key: "status",
        true: "ACTIVE",
        false: "PENDING",
      },
    ],
    includeModels: [
      {
        model: models.mailwizardTemplate,
        as: "template",
        attributes: ["id", "name"],
      },
    ],
  });
};
