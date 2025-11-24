import { updateRecord, updateRecordResponses } from "@b/utils/query";

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
        schema: {
          type: "object",
          properties: {
            targets: {
              type: "string",
              description: "Email targets for the campaign",
            },
          },
        },
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
  const { targets } = body;

  return await updateRecord("mailwizardCampaign", id, {
    targets,
  });
};
