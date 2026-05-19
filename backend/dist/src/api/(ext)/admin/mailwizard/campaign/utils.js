"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailwizardCampaignStoreSchema = exports.mailwizardCampaignUpdateSchema = exports.baseMailwizardCampaignSchema = exports.mailwizardCampaignSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the Mailwizard Campaign");
const name = (0, schema_1.baseStringSchema)("Campaign Name");
const subject = (0, schema_1.baseStringSchema)("Campaign Subject");
const status = (0, schema_1.baseEnumSchema)("Campaign Status", [
    "PENDING",
    "PAUSED",
    "ACTIVE",
    "STOPPED",
    "COMPLETED",
    "CANCELLED",
]);
const speed = (0, schema_1.baseNumberSchema)("Speed of email sending");
const targets = (0, schema_1.baseStringSchema)("Email targets for the campaign", 10000, 0, true);
const templateId = (0, schema_1.baseStringSchema)("Associated template ID");
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the campaign");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the campaign", true);
exports.mailwizardCampaignSchema = {
    id,
    name,
    subject,
    speed,
    templateId,
};
exports.baseMailwizardCampaignSchema = {
    id,
    name,
    subject,
    speed,
    targets,
    templateId,
};
exports.mailwizardCampaignUpdateSchema = {
    type: "object",
    properties: {
        name,
        subject,
        speed,
        templateId,
    },
    required: ["name", "subject", "speed", "templateId"],
};
exports.mailwizardCampaignStoreSchema = {
    description: `Mailwizard Campaign created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.mailwizardCampaignSchema,
            },
        },
    },
};
