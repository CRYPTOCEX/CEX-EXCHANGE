import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { mailwizardCampaignUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates a specific Mailwizard Campaign",
  operationId: "updateMailwizardCampaign",
  tags: ["Admin","Mailwizard Campaigns"],
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
  responses: updateRecordResponses("Mailwizard Campaign"),
  requiresAuth: true,
  permission: "edit.mailwizard.campaign",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { name, subject, status, speed, targets, templateId } = body;

  return await updateRecord("mailwizardCampaign", id, {
    name,
    subject,
    status,
    speed,
    targets,
    templateId,
  });
};
