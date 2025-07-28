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
  id: {
    type: "string",
    description: "Unique identifier for the support ticket",
  },
  userId: {
    type: "string",
    description: "ID of the user who created the ticket",
  },
  agentId: {
    type: "string",
    nullable: true,
    description: "ID of the agent assigned to the ticket",
  },
  agentName: {
    type: "string",
    nullable: true,
    description: "Name of the assigned agent",
  },
  subject: {
    type: "string",
    description: "Subject/title of the ticket",
  },
  importance: {
    type: "string",
    enum: ["LOW", "MEDIUM", "HIGH"],
    description: "Priority level of the ticket",
  },
  status: {
    type: "string",
    enum: ["PENDING", "OPEN", "REPLIED", "CLOSED"],
    description: "Current status of the ticket",
  },
  messages: {
    type: "array",
    description: "Array of messages in the ticket conversation",
    items: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["client", "agent"] },
        text: { type: "string" },
        time: { type: "string", format: "date-time" },
        userId: { type: "string" },
        attachment: { type: "string", nullable: true },
      },
    },
  },
  type: {
    type: "string",
    enum: ["LIVE", "TICKET"],
    description: "Type of support interaction",
  },
  tags: {
    type: "array",
    description: "Tags associated with the ticket",
    items: { type: "string" },
  },
  responseTime: {
    type: "number",
    nullable: true,
    description: "Response time in minutes",
  },
  satisfaction: {
    type: "number",
    nullable: true,
    description: "User satisfaction rating (1-5)",
  },
  createdAt: {
    type: "string",
    format: "date-time",
    description: "Date and time when the ticket was created",
  },
  updatedAt: {
    type: "string",
    format: "date-time",
    description: "Date and time when the ticket was last updated",
  },
  deletedAt: {
    type: "string",
    format: "date-time",
    nullable: true,
    description: "Date and time when the ticket was deleted (soft delete)",
  },
};

// Schema for updating a support ticket
export const supportTicketUpdateSchema = {
  type: "object",
  properties: {
    subject,
    importance,
    status,
    type,
  },
  required: ["subject", "importance", "status"],
};
