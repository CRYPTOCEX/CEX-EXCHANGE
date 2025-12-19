import { models } from "@b/db";
import { statusUpdateResponses } from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update campaign status",
  operationId: "updateMailwizardCampaignStatus",
  tags: ["Admin", "Mailwizard", "Campaigns"],
  description:
    "Updates the status of a specific Mailwizard campaign. When status is set to STOPPED, all target statuses are automatically reset to PENDING to allow the campaign to be restarted from the beginning.",
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
  responses: statusUpdateResponses("Mailwizard Campaign"),
  requiresAuth: true,
  permission: "edit.mailwizard.campaign",
  logModule: "ADMIN_MAIL",
  logTitle: "Update campaign status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step(`Updating campaign status to ${status}`);

  if (status === "STOPPED") {
    ctx?.step("Resetting target statuses");
    // Find the campaign with its targets
    const campaign = await models.mailwizardCampaign.findByPk(id, {
      attributes: ["id", "targets"],
    });

    if (!campaign) {
      ctx?.fail("Campaign not found");
      throw new Error("Campaign not found");
    }

    if (!campaign.targets) {
      ctx?.fail("Campaign targets not found");
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

  ctx?.success("Campaign status updated successfully");
};
