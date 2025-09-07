import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { mailwizardTemplateUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates a specific Mailwizard Template",
  operationId: "updateMailwizardTemplate",
  tags: ["Admin", "Mailwizard Templates"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the Mailwizard Template to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the Mailwizard Template",
    content: {
      "application/json": {
        schema: mailwizardTemplateUpdateSchema,
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
  const { content, design } = body;

  return await updateRecord("mailwizardTemplate", id, {
    content,
    design,
  });
};
