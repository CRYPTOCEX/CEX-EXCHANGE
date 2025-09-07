import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves mailwizard template options",
  description:
    "This endpoint retrieves mailwizard templates for selection in the UI.",
  operationId: "getMailwizardTemplateOptions",
  tags: ["Mailwizard", "Template"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Mailwizard templates retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("MailwizardTemplate"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    const templates = await models.mailwizardTemplate.findAll();
    const formatted = templates.map((template) => ({
      id: template.id,
      name: template.name,
    }));

    return formatted;
  } catch (error) {
    throw createError(
      500,
      "An error occurred while fetching mailwizard templates"
    );
  }
};
