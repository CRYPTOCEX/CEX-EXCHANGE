// /api/admin/mailwizard/templates/store.post.ts

import { storeRecord } from "@b/utils/query";
import {
  badRequestResponse,
  unauthorizedResponse,
  conflictResponse,
  serverErrorResponse,
  singleItemResponse,
} from "@b/utils/schema/errors";
import {
  mailwizardTemplateCreateSchema,
  mailwizardTemplateSchema,
} from "./utils";

export const metadata = {
  summary: "Create a new Mailwizard template",
  operationId: "createMailwizardTemplate",
  tags: ["Admin", "Mailwizard", "Templates"],
  description:
    "Creates a new empty Mailwizard email template with default content and design configuration. The template can be edited later using the update endpoint. Default values are empty JSON objects for both content and design.",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: mailwizardTemplateCreateSchema,
      },
    },
  },
  responses: {
    200: singleItemResponse(
      {
        type: "object",
        properties: mailwizardTemplateSchema,
      },
      "Mailwizard template created successfully"
    ),
    400: badRequestResponse,
    401: unauthorizedResponse,
    409: conflictResponse("Mailwizard Template"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "create.mailwizard.template",
  logModule: "ADMIN_MAIL",
  logTitle: "Create template",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { name } = body;

  ctx?.step("Creating template");
  const result = await storeRecord({
    model: "mailwizardTemplate",
    data: {
      name,
      content: "{}",
      design: "{}",
    },
  });

  ctx?.success("Template created successfully");
  return result;
};
