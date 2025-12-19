import { getRecord } from "@b/utils/query";
import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  singleItemResponse,
} from "@b/utils/schema/errors";
import { baseMailwizardTemplateSchema } from "../utils";

export const metadata = {
  summary: "Get a Mailwizard template",
  operationId: "getMailwizardTemplateById",
  tags: ["Admin", "Mailwizard", "Templates"],
  description:
    "Retrieves detailed information about a specific Mailwizard template including its complete content and design configuration. The response includes all template data needed for editing or preview.",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Mailwizard Template to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: singleItemResponse(
      {
        type: "object",
        properties: baseMailwizardTemplateSchema,
      },
      "Mailwizard template retrieved successfully"
    ),
    401: unauthorizedResponse,
    404: notFoundResponse("Mailwizard Template"),
    500: serverErrorResponse,
  },
  permission: "view.mailwizard.template",
  requiresAuth: true,
  logModule: "ADMIN_MAIL",
  logTitle: "Get Mail Template",
};

export default async (data) => {
  const { params, ctx } = data;
  ctx?.step("Process request");

  ctx?.success("Get Mail Template retrieved successfully");
  return await getRecord("mailwizardTemplate", params.id);
};
