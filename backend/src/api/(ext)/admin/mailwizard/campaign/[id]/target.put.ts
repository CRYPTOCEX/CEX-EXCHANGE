import { updateRecord } from "@b/utils/query";
import { updateResponses } from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update campaign targets",
  operationId: "updateMailwizardCampaignTargets",
  tags: ["Admin", "Mailwizard", "Campaigns"],
  description:
    "Updates the email target list for a specific Mailwizard campaign. Targets should be provided as a JSON string containing an array of email recipient objects with their delivery status.",
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
  responses: updateResponses("Mailwizard Campaign"),
  requiresAuth: true,
  permission: "edit.mailwizard.campaign",
  logModule: "ADMIN_MAIL",
  logTitle: "Update campaign targets",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { targets } = body;

  ctx?.step("Updating campaign targets");
  const result = await updateRecord("mailwizardCampaign", id, {
    targets,
  });

  ctx?.success("Campaign targets updated successfully");
  return result;
};
