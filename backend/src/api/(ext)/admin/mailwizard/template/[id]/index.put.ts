import { updateRecord } from "@b/utils/query";
import { updateResponses } from "@b/utils/schema/errors";
import { mailwizardTemplateUpdateSchema } from "../utils";

export const metadata = {
  summary: "Update a Mailwizard template",
  operationId: "updateMailwizardTemplate",
  tags: ["Admin", "Mailwizard", "Templates"],
  description:
    "Updates the content and design configuration of a specific Mailwizard template. Both content and design fields must be provided as JSON strings representing the template structure.",
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
  responses: updateResponses("Mailwizard Template"),
  requiresAuth: true,
  permission: "edit.mailwizard.template",
  logModule: "ADMIN_MAIL",
  logTitle: "Update template",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { content, design } = body;

  ctx?.step("Updating template");
  const result = await updateRecord("mailwizardTemplate", id, {
    content,
    design,
  });

  ctx?.success("Template updated successfully");
  return result;
};
