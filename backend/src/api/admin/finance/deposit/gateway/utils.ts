import {
  baseBooleanSchema,
  baseNumberSchema,
  baseStringSchema,
} from "@b/utils/schema";

// Basic component definitions
const name = baseStringSchema("Name of the deposit gateway", 100);
const title = baseStringSchema("Title of the deposit gateway", 100);
const description = baseStringSchema("Description of the deposit gateway", 500);
const image = baseStringSchema(
  "URL to an image representing the deposit gateway",
  255,
  0,
  true
);

const fixedFee = {
  ...baseNumberSchema("Fixed fee for transactions through this gateway"),
  nullable: true,
  minimum: 0,
};
const percentageFee = {
  ...baseNumberSchema("Percentage fee for transactions through this gateway"),
  nullable: true,
  minimum: 0,
  maximum: 100,
};
const minAmount = {
  ...baseNumberSchema("Minimum amount allowed through this gateway"),
  nullable: true,
  minimum: 0,
};
const maxAmount = {
  ...baseNumberSchema("Maximum amount allowed through this gateway"),
  nullable: true,
  minimum: 0,
};
const status = baseBooleanSchema(
  "Current status of the deposit gateway (active or inactive)"
);

// Now using these components in your base schema
export const baseGatewaySchema = {
  id: {
    ...baseStringSchema("ID of the deposit gateway"),
    nullable: true,
  },
  name,
  title,
  description,
  image,
  alias: {
    ...baseStringSchema("Unique alias for the deposit gateway"),
    nullable: true,
  },
  currencies: {
    type: "object",
    description: "Supported currencies in JSON format",
    nullable: true,
  },
  fixedFee,
  percentageFee,
  minAmount,
  maxAmount,
  type: {
    ...baseStringSchema("Type of the deposit gateway"),
    nullable: true,
  },
  status,
  version: {
    ...baseStringSchema("Version of the deposit gateway"),
    nullable: true,
  },
  productId: {
    ...baseStringSchema("Product ID associated with the deposit gateway"),
    nullable: true,
  },
};

// Schema for updating an existing deposit gateway
export const gatewayUpdateSchema = {
  type: "object",
  properties: {
    title,
    description,
    image,
    alias: {
      ...baseStringSchema("Unique alias for the deposit gateway"),
      nullable: true,
    },
    currencies: {
      type: "array",
      items: { type: "string" },
      description: "Supported currencies array",
      nullable: true,
    },
    fixedFee: {
      oneOf: [
        {
          type: "null"
        },
        {
          type: "number",
          minimum: 0,
          description: "Global fixed fee for all currencies"
        },
        {
          type: "object",
          patternProperties: {
            "^[A-Z]{3,4}$": {
              type: "number",
              minimum: 0
            }
          },
          additionalProperties: false,
          description: "Currency-specific fixed fees"
        }
      ]
    },
    percentageFee: {
      oneOf: [
        {
          type: "null"
        },
        {
          type: "number",
          minimum: 0,
          maximum: 100,
          description: "Global percentage fee for all currencies"
        },
        {
          type: "object",
          patternProperties: {
            "^[A-Z]{3,4}$": {
              type: "number",
              minimum: 0,
              maximum: 100
            }
          },
          additionalProperties: false,
          description: "Currency-specific percentage fees"
        }
      ]
    },
    minAmount: {
      oneOf: [
        {
          type: "null"
        },
        {
          type: "number",
          minimum: 0,
          description: "Global minimum amount for all currencies"
        },
        {
          type: "object",
          patternProperties: {
            "^[A-Z]{3,4}$": {
              type: "number",
              minimum: 0
            }
          },
          additionalProperties: false,
          description: "Currency-specific minimum amounts"
        }
      ]
    },
    maxAmount: {
      oneOf: [
        {
          type: "null"
        },
        {
          type: "number",
          minimum: 0,
          description: "Global maximum amount for all currencies"
        },
        {
          type: "object",
          patternProperties: {
            "^[A-Z]{3,4}$": {
              type: "number",
              minimum: 0
            }
          },
          additionalProperties: false,
          description: "Currency-specific maximum amounts"
        }
      ]
    },
    status,
  },
  required: ["title", "description"],
};
