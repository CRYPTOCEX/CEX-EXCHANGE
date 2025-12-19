import { updateStatus } from "@b/utils/query";
import { statusUpdateResponses } from "@b/utils/schema/errors";

export const metadata = {
  summary: "Bulk update template status",
  operationId: "bulkUpdateMailwizardTemplateStatus",
  tags: ["Admin", "Mailwizard", "Templates"],
  description:
    "Updates the status of multiple Mailwizard templates simultaneously. Valid statuses: ACTIVE, INACTIVE, ARCHIVED. This allows for efficient batch status management of templates.",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of Mailwizard Template IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE", "ARCHIVED"],
              description: "New status to apply to the Mailwizard Templates",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: statusUpdateResponses("Mailwizard Template"),
  requiresAuth: true,
  permission: "edit.mailwizard.template",
  logModule: "ADMIN_MAIL",
  logTitle: "Bulk update template status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Updating status of ${ids.length} templates to ${status}`);
  const result = await updateStatus("mailwizardTemplate", ids, status);

  ctx?.success(`${ids.length} templates status updated successfully`);
  return result;
};
