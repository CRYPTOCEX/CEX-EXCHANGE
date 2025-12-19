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
  summary: "Import a Mailwizard template",
  operationId: "importMailwizardTemplate",
  tags: ["Admin", "Mailwizard", "Templates"],
  description:
    "Imports a new Mailwizard email template with content and design configuration. This endpoint is used to import pre-designed templates with both HTML content and visual design data.",
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
      "Mailwizard template imported successfully"
    ),
    400: badRequestResponse,
    401: unauthorizedResponse,
    409: conflictResponse("Mailwizard Template"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "create.mailwizard.template",
  logModule: "ADMIN_MAIL",
  logTitle: "Import template",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { name, content, design } = body;

  ctx?.step("Importing template");
  const result = await storeRecord({
    model: "mailwizardTemplate",
    data: {
      name,
      content,
      design,
    },
  });

  ctx?.success("Template imported successfully");
  return result;
};
