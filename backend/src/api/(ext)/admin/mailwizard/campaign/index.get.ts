// /server/api/mailwizard/campaigns/index.get.ts

import { models } from "@b/db";
import { crudParameters } from "@b/utils/constants";
import { getFiltered } from "@b/utils/query";
import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  paginatedResponse,
} from "@b/utils/schema/errors";
import { mailwizardCampaignSchema } from "./utils";

export const metadata = {
  summary: "List Mailwizard campaigns",
  operationId: "listMailwizardCampaigns",
  tags: ["Admin", "Mailwizard", "Campaigns"],
  description:
    "Retrieves a paginated list of all Mailwizard campaigns with optional filtering and sorting. Includes associated template information for each campaign. Supports filtering by status, name, subject, and date ranges.",
  parameters: crudParameters,
  responses: {
    200: paginatedResponse(
      {
        type: "object",
        properties: {
          ...mailwizardCampaignSchema,
          template: {
            type: "object",
            properties: {
              id: { type: "string", description: "Template ID" },
              name: { type: "string", description: "Template name" },
            },
          },
        },
      },
      "Mailwizard campaigns retrieved successfully"
    ),
    401: unauthorizedResponse,
    404: notFoundResponse("Mailwizard Campaign"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  logModule: "ADMIN_MAIL",
  logTitle: "Get Mail Campaigns",
  permission: "view.mailwizard.campaign",
};

export default async (data: Handler) => {
  const { query, ctx } = data;
  ctx?.step("Process request");

  // Call the generic fetch function
  ctx?.success("Get Mail Campaigns retrieved successfully");
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
