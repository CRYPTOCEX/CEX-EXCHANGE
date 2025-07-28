import {
  baseNumberSchema,
  baseStringSchema,
  baseBooleanSchema,
} from "@b/utils/schema";

// Base schema components for withdrawal methods
const id = {
  ...baseStringSchema("ID of the withdrawal method"),
  nullable: true,
};
const title = baseStringSchema("Title of the withdrawal method");
const processingTime = baseStringSchema(
  "Expected processing time for the method"
);
const instructions = baseStringSchema(
  "Instructions for using the withdrawal method"
);
const image = {
  ...baseStringSchema("URL to an image representing the withdrawal method"),
  nullable: true,
};
const fixedFee = baseNumberSchema("Fixed transaction fee for the method");
const percentageFee = baseNumberSchema(
  "Percentage fee of the transaction amount"
);
const minAmount = baseNumberSchema(
  "Minimum amount that can be collected using this method"
);
const maxAmount = {
  ...baseNumberSchema("Maximum amount that can be collected using this method"),
  nullable: true,
};

const customFields = {
  description: "Custom JSON fields relevant to the withdrawal method",
  type: "array",
  items: {
    type: "object",
    required: ["title", "type"],
    properties: {
      title: {
        type: "string",
        description: "The title of the field",
        nullable: false,
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

const status = {
  ...baseBooleanSchema(
    "Current status of the withdrawal method (active or inactive)"
  ),
  nullable: true,
};

// Base schema definition for withdrawal methods
export const baseWithdrawMethodSchema = {
  id,
  title,
  processingTime,
  instructions,
  image,
  fixedFee,
  percentageFee,
  minAmount,
  maxAmount,
  customFields,
  status,
};

// Schema for updating a withdrawal method
export const withdrawalMethodUpdateSchema = {
  type: "object",
  properties: {
    title,
    processingTime,
    instructions,
    image,
    fixedFee,
    percentageFee,
    minAmount,
    maxAmount,
    customFields,
    status,
  },
  required: [
    "title",
    "processingTime",
    "instructions",
    "fixedFee",
    "percentageFee",
    "minAmount",
    "maxAmount",
    "status",
  ],
};

export const withdrawalMethodStoreSchema = {
  description: `Withdraw method created successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseWithdrawMethodSchema,
      },
    },
  },
};
