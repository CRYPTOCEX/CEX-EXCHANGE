import { baseStringSchema, baseEnumSchema } from "@b/utils/schema"; // Adjust the import path as necessary

// Base schema components for support tickets
const id = {
  ...baseStringSchema("ID of the support ticket"),
  nullable: true, // Optional during creation
};
const userId = baseStringSchema("ID of the user who created the ticket");
const agentId = baseStringSchema("ID of the agent assigned to the ticket");
const subject = baseStringSchema("Subject of the ticket");
const importance = baseStringSchema("Importance of the ticket");
const status = baseEnumSchema("Status of the ticket", [
  "PENDING",
  "OPEN",
  "REPLIED",
  "CLOSED",
]);
const messages = {
  type: "object",
  description: "Messages associated with the chat",
};
const type = baseEnumSchema("Type of the ticket", ["LIVE", "TICKET"]);

// Base schema definition for support tickets
export const baseSupportTicketSchema = {
  id,
  userId,
  agentId,
  messages,
  subject,
  importance,
  status,
  type,
};

// Full schema for a support ticket including user and chat details
export const supportTicketSchema = {
  ...baseSupportTicketSchema,
  user: {
    type: "object",
    properties: {
      id: { type: "string", description: "ID of the user" },
      avatar: { type: "string", description: "Avatar of the user" },
      firstName: { type: "string", description: "First name of the user" },
      lastName: { type: "string", description: "Last name of the user" },
    },
    nullable: true,
  },
};

// Schema for updating a support ticket
export const supportTicketUpdateSchema = {
  type: "object",
  properties: {
    subject,
    importance,
    status,
  },
  required: ["subject", "importance", "status"],
};
