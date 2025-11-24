import { models } from "@b/db";
import { updateRecordResponses } from "@b/utils/query";

export const metadata = {
  summary: "Update Status for a Mailwizard Campaign",
  operationId: "updateMailwizardCampaignStatus",
  tags: ["Admin", "Mailwizard Campaigns"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Mailwizard Campaign to update",
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
              enum: [
                "PENDING",
                "PAUSED",
                "ACTIVE",
                "STOPPED",
                "COMPLETED",
                "CANCELLED",
              ],
              description: "New status to apply to the Mailwizard Campaign",
            },
          },
          required: ["status"],
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
  const { status } = body;

  if (status === "STOPPED") {
    // Find the campaign with its targets
    const campaign = await models.mailwizardCampaign.findByPk(id, {
      attributes: ["id", "targets"],
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (!campaign.targets) {
      throw new Error("Campaign targets not found");
    }

    const targets = JSON.parse(campaign.targets);
    if (targets) {
      const updatedTargets = targets.map((target) => ({
        ...target,
        status: "PENDING",
      }));

      await models.mailwizardCampaign.update(
        { status, targets: JSON.stringify(updatedTargets) },
        {
          where: { id },
        }
      );
    }
  } else {
    // For other statuses, just update the campaign status
    await models.mailwizardCampaign.update(
      { status },
      {
        where: { id },
      }
    );
  }
};
