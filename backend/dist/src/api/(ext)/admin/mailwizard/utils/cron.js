"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMailwizardCampaigns = processMailwizardCampaigns;
exports.updateMailwizardCampaignTargets = updateMailwizardCampaignTargets;
exports.updateMailwizardCampaignStatus = updateMailwizardCampaignStatus;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const emails_1 = require("@b/utils/emails");
const broadcast_1 = require("@b/cron/broadcast");
async function processMailwizardCampaigns() {
    const cronName = "processMailwizardCampaigns";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting Mailwizard campaigns processing");
        const campaigns = await db_1.models.mailwizardCampaign.findAll({
            where: { status: "ACTIVE" },
            include: [
                {
                    model: db_1.models.mailwizardTemplate,
                    as: "template",
                },
            ],
        });
        (0, broadcast_1.broadcastLog)(cronName, `Found ${campaigns.length} active campaigns`);
        for (const campaign of campaigns) {
            (0, broadcast_1.broadcastLog)(cronName, `Processing campaign id ${campaign.id}`);
            let sentCount = 0;
            if (!campaign.targets) {
                (0, broadcast_1.broadcastLog)(cronName, `No targets found for campaign ${campaign.id}`, "info");
                continue;
            }
            let targets = [];
            try {
                targets = JSON.parse(campaign.targets);
                (0, broadcast_1.broadcastLog)(cronName, `Parsed ${targets.length} targets for campaign ${campaign.id}`);
            }
            catch (error) {
                console_1.logger.error("CRON", `Error parsing targets for campaign ${campaign.id}`, error);
                (0, broadcast_1.broadcastLog)(cronName, `Error parsing targets for campaign ${campaign.id}: ${error.message}`, "error");
                continue;
            }
            if (!campaign.template) {
                (0, broadcast_1.broadcastLog)(cronName, `Template not found for campaign ${campaign.id}`, "error");
                continue;
            }
            for (const target of targets) {
                if (target.status === "PENDING" && sentCount < campaign.speed) {
                    (0, broadcast_1.broadcastLog)(cronName, `Attempting to send email to ${target.email} for campaign ${campaign.id}`);
                    try {
                        await (0, emails_1.sendEmailToTargetWithTemplate)(target.email, campaign.subject, campaign.template.content);
                        target.status = "SENT";
                        sentCount++;
                        (0, broadcast_1.broadcastLog)(cronName, `Email sent to ${target.email} for campaign ${campaign.id}`, "success");
                    }
                    catch (error) {
                        console_1.logger.error("CRON", "Error sending email to target", error);
                        target.status = "FAILED";
                        (0, broadcast_1.broadcastLog)(cronName, `Error sending email to ${target.email} for campaign ${campaign.id}: ${error.message}`, "error");
                    }
                }
            }
            try {
                (0, broadcast_1.broadcastLog)(cronName, `Updating targets for campaign ${campaign.id}`);
                await updateMailwizardCampaignTargets(campaign.id, JSON.stringify(targets));
                (0, broadcast_1.broadcastLog)(cronName, `Targets updated for campaign ${campaign.id}`, "success");
                if (targets.every((target) => target.status !== "PENDING")) {
                    (0, broadcast_1.broadcastLog)(cronName, `All targets processed for campaign ${campaign.id}, updating status to COMPLETED`);
                    await updateMailwizardCampaignStatus(campaign.id, "COMPLETED");
                    (0, broadcast_1.broadcastLog)(cronName, `Campaign ${campaign.id} marked as COMPLETED`, "success");
                }
                else {
                    (0, broadcast_1.broadcastLog)(cronName, `Campaign ${campaign.id} still has pending targets`, "info");
                }
            }
            catch (error) {
                console_1.logger.error("CRON", `Error updating campaign ${campaign.id}`, error);
                (0, broadcast_1.broadcastLog)(cronName, `Error updating campaign ${campaign.id}: ${error.message}`, "error");
            }
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
        });
        (0, broadcast_1.broadcastLog)(cronName, "Mailwizard campaigns processing completed", "success");
    }
    catch (error) {
        console_1.logger.error("CRON", "Mailwizard campaigns processing failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Mailwizard campaigns processing failed: ${error.message}`, "error");
        throw error;
    }
}
async function updateMailwizardCampaignTargets(id, targets) {
    try {
        (0, broadcast_1.broadcastLog)("processMailwizardCampaigns", `Updating targets for campaign ${id}`);
        await db_1.models.mailwizardCampaign.update({ targets }, {
            where: { id },
        });
        (0, broadcast_1.broadcastLog)("processMailwizardCampaigns", `Targets updated for campaign ${id}`, "success");
    }
    catch (error) {
        console_1.logger.error("CRON", "Error updating mailwizard campaign targets", error);
        throw error;
    }
}
async function updateMailwizardCampaignStatus(id, status) {
    try {
        (0, broadcast_1.broadcastLog)("processMailwizardCampaigns", `Updating status to ${status} for campaign ${id}`);
        await db_1.models.mailwizardCampaign.update({ status }, {
            where: { id },
        });
        (0, broadcast_1.broadcastLog)("processMailwizardCampaigns", `Status updated to ${status} for campaign ${id}`, "success");
    }
    catch (error) {
        console_1.logger.error("CRON", "Error updating mailwizard campaign status", error);
        throw error;
    }
}
