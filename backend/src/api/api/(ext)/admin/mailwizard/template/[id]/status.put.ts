import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata = {
  summary: "Update Status for a Mailwizard Template",
  operationId: "updateMailwizardTemplateStatus",
  tags: ["Admin", "Mailwizard Templates"],
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
  responses: updateRecordResponses("Mailwizard Template"),
  requiresAuth: true,
  permission: "edit.mailwizard.template",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  return updateStatus("mailwizardTemplate", id, status);
};
