import {
  baseBooleanSchema,
  baseNumberSchema,
  baseStringSchema,
} from "@b/utils/schema";

// Basic component definitions
const id = {
  ...baseStringSchema("ID of the deposit method"),
  nullable: true,
};
const title = baseStringSchema("Title of the deposit method");
const instructions = baseStringSchema(
  "Instructions for using the deposit method",
  5000,
  10
);
const image = {
  ...baseStringSchema("URL to an image representing the deposit method"),
  nullable: true,
};
const fixedFee = {
  ...baseNumberSchema("Fixed transaction fee for the method"),
  nullable: true,
};
const percentageFee = {
  ...baseNumberSchema("Percentage fee of the transaction amount"),
  nullable: true,
};
const minAmount = baseNumberSchema(
  "Minimum amount that can be deposited using this method"
);

const maxAmount = baseNumberSchema(
  "Maximum amount that can be deposited using this method"
);

const customFields = {
  description: "Custom JSON fields relevant to the deposit method",
  type: "array",
  items: {
    type: "object",
    required: ["title", "type"],
    properties: {
      title: {
        type: "string",
        description: "The title of the field",
      },
      type: {
        type: "string",
        description: "The type of the field (e.g., input)",
        enum: ["input", "textarea", "file", "image"],
      },
      required: {
        type: "boolean",
        description: "Whether the field is required or not",
        default: false,
      },
    },
  },
  nullable: true,
};

const status = baseBooleanSchema(
  "Current status of the deposit method (active or inactive)"
);

export const baseDepositMethodSchema = {
  id,
  title,
  instructions,
  image,
  fixedFee,
  percentageFee,
  minAmount,
  maxAmount,
  customFields,
  status,
};

export const DepositMethodSchema = {
  description: `Deposit method created successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseDepositMethodSchema,
      },
    },
  },
};

export const depositMethodUpdateSchema = {
  type: "object",
  properties: {
    title,
    instructions,
    image,
    fixedFee,
    percentageFee,
    minAmount,
    maxAmount,
    customFields,
  },
  required: [
    "title",
    "instructions",
    "fixedFee",
    "percentageFee",
    "minAmount",
    "maxAmount",
  ],
};

export const methodSchema = {
  type: "object",
  properties: { ...baseDepositMethodSchema },
};
