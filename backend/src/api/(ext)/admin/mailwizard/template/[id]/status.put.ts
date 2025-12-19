import { updateStatus } from "@b/utils/query";
import { statusUpdateResponses } from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update template status",
  operationId: "updateMailwizardTemplateStatus",
  tags: ["Admin", "Mailwizard", "Templates"],
  description:
    "Updates the status of a specific Mailwizard template. Valid statuses: ACTIVE, INACTIVE, ARCHIVED. Changing status to INACTIVE or ARCHIVED may affect campaigns using this template.",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Mailwizard Template to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE", "ARCHIVED"],
              description: "New status to apply to the Mailwizard Template",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: statusUpdateResponses("Mailwizard Template"),
  requiresAuth: true,
  permission: "edit.mailwizard.template",
  logModule: "ADMIN_MAIL",
  logTitle: "Update template status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step(`Updating template status to ${status}`);
  const result = await updateStatus("mailwizardTemplate", id, status);

  ctx?.success("Template status updated successfully");
  return result;
};
