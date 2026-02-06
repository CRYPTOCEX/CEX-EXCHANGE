"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Update campaign status",
    operationId: "updateMailwizardCampaignStatus",
    tags: ["Admin", "Mailwizard", "Campaigns"],
    description: "Updates the status of a specific Mailwizard campaign. When status is set to STOPPED, all target statuses are automatically reset to PENDING to allow the campaign to be restarted from the beginning.",
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
    responses: (0, errors_1.statusUpdateResponses)("Mailwizard Campaign"),
    requiresAuth: true,
    permission: "edit.mailwizard.campaign",
    logModule: "ADMIN_MAIL",
    logTitle: "Update campaign status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating campaign status to ${status}`);
    if (status === "STOPPED") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Resetting target statuses");
        const campaign = await db_1.models.mailwizardCampaign.findByPk(id, {
            attributes: ["id", "targets"],
        });
        if (!campaign) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Campaign not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Campaign not found" });
        }
        if (!campaign.targets) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Campaign targets not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Campaign targets not found" });
        }
        const targets = JSON.parse(campaign.targets);
        if (targets) {
            const updatedTargets = targets.map((target) => ({
                ...target,
                status: "PENDING",
            }));
            await db_1.models.mailwizardCampaign.update({ status, targets: JSON.stringify(updatedTargets) }, {
                where: { id },
            });
        }
    }
    else {
        await db_1.models.mailwizardCampaign.update({ status }, {
            where: { id },
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Campaign status updated successfully");
};
