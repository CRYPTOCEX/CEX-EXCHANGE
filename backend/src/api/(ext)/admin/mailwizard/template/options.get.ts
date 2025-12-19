import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Get template options",
  operationId: "getMailwizardTemplateOptions",
  tags: ["Admin", "Mailwizard", "Templates"],
  description:
    "Retrieves a simplified list of all Mailwizard templates (ID and name only) for use in dropdown selections and UI components. This endpoint is optimized for quick loading in form selects.",
  requiresAuth: true,
  logModule: "ADMIN_MAIL",
  logTitle: "Get Mail Template Options",
  responses: {
    200: {
      description: "Mailwizard template options retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "Template ID" },
                name: { type: "string", description: "Template name" },
              },
              required: ["id", "name"],
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Mailwizard Template"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, ctx } = data;
  ctx?.step("Validate user authentication");
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    const templates = await models.mailwizardTemplate.findAll();
    const formatted = templates.map((template) => ({
      id: template.id,
      name: template.name,
    }));

    ctx?.success("Get Mail Template Options retrieved successfully");
    return formatted;
  } catch (error) {
    throw createError(
      500,
      "An error occurred while fetching mailwizard templates"
    );
  }
};
