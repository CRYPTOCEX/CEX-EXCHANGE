import { models } from "@b/db";
import { logger } from "@b/utils/console";
import { sendEmailToTargetWithTemplate } from "@b/utils/emails";
import { broadcastStatus, broadcastLog } from "@b/cron/broadcast";

export async function processMailwizardCampaigns() {
  const cronName = "processMailwizardCampaigns";
  const startTime = Date.now();
  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting Mailwizard campaigns processing");

    const campaigns = await models.mailwizardCampaign.findAll({
      where: { status: "ACTIVE" },
      include: [
        {
          model: models.mailwizardTemplate,
          as: "template",
        },
      ],
    });
    broadcastLog(cronName, `Found ${campaigns.length} active campaigns`);

    for (const campaign of campaigns) {
      broadcastLog(cronName, `Processing campaign id ${campaign.id}`);
      let sentCount = 0;
      if (!campaign.targets) {
        broadcastLog(
          cronName,
          `No targets found for campaign ${campaign.id}`,
          "info"
        );
        continue;
      }

      let targets: { email: string; status: string }[] = [];
      try {
        targets = JSON.parse(campaign.targets);
        broadcastLog(
          cronName,
          `Parsed ${targets.length} targets for campaign ${campaign.id}`
        );
      } catch (error: any) {
        logger.error("CRON", `Error parsing targets for campaign ${campaign.id}`, error);
        broadcastLog(
          cronName,
          `Error parsing targets for campaign ${campaign.id}: ${error.message}`,
          "error"
        );
        continue;
      }

      for (const target of targets) {
        if (target.status === "PENDING" && sentCount < campaign.speed) {
          broadcastLog(
            cronName,
            `Attempting to send email to ${target.email} for campaign ${campaign.id}`
          );
          try {
            await sendEmailToTargetWithTemplate(
              target.email,
              campaign.subject,
              campaign.template.content
            );
            target.status = "SENT";
            sentCount++;
            broadcastLog(
              cronName,
              `Email sent to ${target.email} for campaign ${campaign.id}`,
              "success"
            );
          } catch (error: any) {
            logger.error("CRON", "Error sending email to target", error);
            target.status = "FAILED";
            broadcastLog(
              cronName,
              `Error sending email to ${target.email} for campaign ${campaign.id}: ${error.message}`,
              "error"
            );
          }
        }
      }

      try {
        broadcastLog(cronName, `Updating targets for campaign ${campaign.id}`);
        await updateMailwizardCampaignTargets(
          campaign.id,
          JSON.stringify(targets)
        );
        broadcastLog(
          cronName,
          `Targets updated for campaign ${campaign.id}`,
          "success"
        );

        if (targets.every((target) => target.status !== "PENDING")) {
          broadcastLog(
            cronName,
            `All targets processed for campaign ${campaign.id}, updating status to COMPLETED`
          );
          await updateMailwizardCampaignStatus(campaign.id, "COMPLETED");
          broadcastLog(
            cronName,
            `Campaign ${campaign.id} marked as COMPLETED`,
            "success"
          );
        } else {
          broadcastLog(
            cronName,
            `Campaign ${campaign.id} still has pending targets`,
            "info"
          );
        }
      } catch (error: any) {
        logger.error("CRON", `Error updating campaign ${campaign.id}`, error);
        broadcastLog(
          cronName,
          `Error updating campaign ${campaign.id}: ${error.message}`,
          "error"
        );
      }
    }

    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
    });
    broadcastLog(
      cronName,
      "Mailwizard campaigns processing completed",
      "success"
    );
  } catch (error: any) {
    logger.error("CRON", "Mailwizard campaigns processing failed", error);
    broadcastStatus(cronName, "failed");
    broadcastLog(
      cronName,
      `Mailwizard campaigns processing failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}

export async function updateMailwizardCampaignTargets(id: string, targets: string) {
  try {
    broadcastLog(
      "processMailwizardCampaigns",
      `Updating targets for campaign ${id}`
    );
    await models.mailwizardCampaign.update(
      { targets },
      {
        where: { id },
      }
    );
    broadcastLog(
      "processMailwizardCampaigns",
      `Targets updated for campaign ${id}`,
      "success"
    );
  } catch (error) {
    logger.error("CRON", "Error updating mailwizard campaign targets", error);
    throw error;
  }
}

export async function updateMailwizardCampaignStatus(id: string, status: string) {
  try {
    broadcastLog(
      "processMailwizardCampaigns",
      `Updating status to ${status} for campaign ${id}`
    );
    await models.mailwizardCampaign.update(
      { status },
      {
        where: { id },
      }
    );
    broadcastLog(
      "processMailwizardCampaigns",
      `Status updated to ${status} for campaign ${id}`,
      "success"
    );
  } catch (error) {
    logger.error("CRON", "Error updating mailwizard campaign status", error);
    throw error;
  }
}
