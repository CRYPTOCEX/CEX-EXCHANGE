"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailwizardTemplateStoreSchema = exports.mailwizardTemplateUpdateSchema = exports.mailwizardTemplateCreateSchema = exports.baseMailwizardTemplateSchema = exports.mailwizardTemplateSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the Mailwizard Template");
const name = (0, schema_1.baseStringSchema)("Template Name");
const content = {
    type: "string",
    description: "Content of the email template",
};
const design = {
    type: "string",
    description: "Design of the email template",
};
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the template");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the template", true);
exports.mailwizardTemplateSchema = {
    id,
    name,
    content,
    design,
    createdAt,
    updatedAt,
};
exports.baseMailwizardTemplateSchema = {
    id,
    name,
    content,
    design,
    createdAt,
    updatedAt,
    deletedAt: (0, schema_1.baseDateTimeSchema)("Deletion date of the Template, if any"),
};
exports.mailwizardTemplateCreateSchema = {
    type: "object",
    properties: {
        name,
    },
    required: ["name"],
};
exports.mailwizardTemplateUpdateSchema = {
    type: "object",
    properties: {
        content,
        design,
    },
    required: ["content", "design"],
};
exports.mailwizardTemplateStoreSchema = {
    description: `Mailwizard Template created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.mailwizardTemplateSchema,
            },
        },
    },
};
