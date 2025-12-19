import { updateRecord } from "@b/utils/query";
import { updateResponses } from "@b/utils/schema/errors";
import { mailwizardCampaignUpdateSchema } from "../utils";

export const metadata = {
  summary: "Update a Mailwizard campaign",
  operationId: "updateMailwizardCampaign",
  tags: ["Admin", "Mailwizard", "Campaigns"],
  description:
    "Updates the configuration of a specific Mailwizard campaign including name, subject, status, speed, targets, and template. All fields are optional and only provided fields will be updated.",
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the Mailwizard Campaign to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the Mailwizard Campaign",
    content: {
      "application/json": {
        schema: mailwizardCampaignUpdateSchema,
      },
    },
  },
  responses: updateResponses("Mailwizard Campaign"),
  requiresAuth: true,
  permission: "edit.mailwizard.campaign",
  logModule: "ADMIN_MAIL",
  logTitle: "Update campaign",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { name, subject, status, speed, targets, templateId } = body;

  ctx?.step("Updating campaign");
  const result = await updateRecord("mailwizardCampaign", id, {
    name,
    subject,
    status,
    speed,
    targets,
    templateId,
  });

  ctx?.success("Campaign updated successfully");
  return result;
};
