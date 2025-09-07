import {
  baseStringSchema,
  baseIntegerSchema,
  baseObjectSchema,
} from "@b/utils/schema";

// Base schema components for KYC applications
const id = {
  ...baseStringSchema("ID of the KYC application"),
  nullable: true, // Optional for creation
};
const userId = baseStringSchema("ID of the user");
const templateId = baseStringSchema("ID of the KYC template");
const data = {
  ...baseObjectSchema("Data associated with the KYC application"),
  additionalProperties: true,
};
const status = baseStringSchema("Current status of the KYC application");
const level = baseIntegerSchema("Level of the KYC verification");
const notes = {
  ...baseStringSchema("Administrative notes on the KYC application"),
  nullable: true,
};

// Base schema definition for KYC applications
export const baseKYCApplicationSchema = {
  id,
  userId,
  templateId,
  status,
  level,
  notes,
};

// Full schema for a KYC application including user and template details
export const kycApplicationSchema = {
  ...baseKYCApplicationSchema,
  user: {
    type: "object",
    properties: {
      id: { type: "string", description: "ID of the user" },
      email: { type: "string", description: "Email of the user" },
      firstName: { type: "string", description: "First name of the user" },
      lastName: { type: "string", description: "Last name of the user" },
      phone: { type: "string", description: "Phone number of the user" },
      country: {
        type: "string",
        description: "Country of residence of the user",
      },
      city: { type: "string", description: "City of residence of the user" },
      address: { type: "string", description: "Address of the user" },
      postalCode: {
        type: "string",
        description: "Postal code of the user's address",
      },
      dob: {
        type: "string",
        format: "date-time",
        description: "Date of birth of the user",
      },
      createdAt: {
        type: "string",
        format: "date-time",
        description: "Date and time when the user was created",
      },
      updatedAt: {
        type: "string",
        format: "date-time",
        description: "Date and time when the user was last updated",
      },
    },
    nullable: true,
  },
  template: {
    type: "object",
    properties: {
      id: { type: "string", description: "ID of the KYC template" },
      title: { type: "string", description: "Title of the KYC template" },
    },
    nullable: true,
  },
};

// Schema for updating a KYC application
export const kycUpdateSchema = {
  type: "object",
  properties: {
    status,
    level,
    notes,
  },
  required: ["status"],
};
