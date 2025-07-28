import {
  baseStringSchema,
  baseBooleanSchema,
  baseDateTimeSchema,
  baseEnumSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the Announcement");
const type = baseEnumSchema("Type of the Announcement", [
  "GENERAL",
  "EVENT",
  "UPDATE",
]);
const title = baseStringSchema("Title of the Announcement", 255);
const message = {
  type: "string",
  description: "Message of the Announcement",
  nullable: false,
};
const link = baseStringSchema("Link of the Announcement", 255, 0, true);
const status = baseBooleanSchema("Status of the Announcement");
const createdAt = baseDateTimeSchema("Creation Date of the Announcement");
const updatedAt = baseDateTimeSchema(
  "Last Update Date of the Announcement",
  true
);
const deletedAt = baseDateTimeSchema("Deletion Date of the Announcement", true);

export const announcementSchema = {
  id,
  type,
  title,
  message,
  link,
  status,
  createdAt,
  updatedAt,
  deletedAt,
};

export const baseAnnouncementSchema = {
  id,
  type,
  title,
  message,
  link,
  status,
  createdAt,
  updatedAt,
  deletedAt,
};

export const announcementUpdateSchema = {
  type: "object",
  properties: {
    type,
    title,
    message,
    link,
    status,
  },
  required: ["type", "title", "message"],
};

export const announcementStoreSchema = {
  description: `Announcement created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseAnnouncementSchema,
      },
    },
  },
};
