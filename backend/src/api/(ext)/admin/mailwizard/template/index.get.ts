// /server/api/mailwizard/templates/index.get.ts

import { models } from "@b/db";
import { crudParameters } from "@b/utils/constants";
import { getFiltered } from "@b/utils/query";
import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  paginatedResponse,
} from "@b/utils/schema/errors";
import { mailwizardTemplateSchema } from "./utils";

export const metadata = {
  summary: "List Mailwizard templates",
  operationId: "listMailwizardTemplates",
  tags: ["Admin", "Mailwizard", "Templates"],
  description:
    "Retrieves a paginated list of all Mailwizard email templates with optional filtering and sorting. Templates can be filtered by name, creation date, and other criteria.",
  parameters: crudParameters,
  responses: {
    200: paginatedResponse(
      {
        type: "object",
        properties: mailwizardTemplateSchema,
      },
      "Mailwizard templates retrieved successfully"
    ),
    401: unauthorizedResponse,
    404: notFoundResponse("Mailwizard Template"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  logModule: "ADMIN_MAIL",
  logTitle: "Get Mail Templates",
  permission: "view.mailwizard.template",
};

export default async (data: Handler) => {
  const { query, ctx } = data;
  ctx?.step("Fetch mail templates with filters");

  // Call the generic fetch function
  const result = await getFiltered({
    model: models.mailwizardTemplate,
    query,
    sortField: query.sortField || "createdAt",
    // Assuming sensitive fields might be hidden
  });

  ctx?.success("Get Mail Templates retrieved successfully");
  return result;
};
