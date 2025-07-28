import { models } from "@b/db";
import { logError } from "../logger";
import { sendEmailToTargetWithTemplate } from "../emails";
import { broadcastStatus, broadcastProgress, broadcastLog } from "./broadcast";

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
        logError(`processMailwizardCampaigns`, error, __filename);
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
            logError(`processMailwizardCampaigns`, error, __filename);
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
        logError(`processMailwizardCampaigns`, error, __filename);
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
    logError("processMailwizardCampaigns", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(
      cronName,
      `Mailwizard campaigns processing failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}

export async function updateMailwizardCampaignTargets(id, targets) {
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
    logError(`updateMailwizardCampaignTargets`, error, __filename);
    throw error;
  }
}

export async function updateMailwizardCampaignStatus(id, status) {
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
    logError(`updateMailwizardCampaignStatus`, error, __filename);
    throw error;
  }
}
