import { baseStringSchema, baseDateTimeSchema } from "@b/utils/schema";

const id = baseStringSchema("ID of the Mailwizard Template");
const name = baseStringSchema("Template Name");
const content = {
  type: "string",
  description: "Content of the email template",
};
const design = {
  type: "string",
  description: "Design of the email template",
};
const createdAt = baseDateTimeSchema("Creation date of the template");
const updatedAt = baseDateTimeSchema("Last update date of the template", true);

export const mailwizardTemplateSchema = {
  id,
  name,
  content,
  design,
  createdAt,
  updatedAt,
};

export const baseMailwizardTemplateSchema = {
  id,
  name,
  content,
  design,
  createdAt,
  updatedAt,
  deletedAt: baseDateTimeSchema("Deletion date of the Template, if any"),
};

export const mailwizardTemplateCreateSchema = {
  type: "object",
  properties: {
    name,
  },
  required: ["name"],
};

export const mailwizardTemplateUpdateSchema = {
  type: "object",
  properties: {
    content,
    design,
  },
  required: ["content", "design"],
};

export const mailwizardTemplateStoreSchema = {
  description: `Mailwizard Template created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: mailwizardTemplateSchema,
      },
    },
  },
};
