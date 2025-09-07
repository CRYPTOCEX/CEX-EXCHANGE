import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of Mailwizard Templates",
  operationId: "bulkUpdateMailwizardTemplateStatus",
  tags: ["Admin", "Mailwizard Templates"],
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
  responses: updateRecordResponses("Mailwizard Template"),
  requiresAuth: true,
  permission: "edit.mailwizard.template",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("mailwizardTemplate", ids, status);
};
