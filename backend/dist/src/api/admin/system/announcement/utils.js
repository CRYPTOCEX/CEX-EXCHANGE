"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.announcementStoreSchema = exports.announcementUpdateSchema = exports.baseAnnouncementSchema = exports.announcementSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the Announcement");
const type = (0, schema_1.baseEnumSchema)("Type of the Announcement", [
    "GENERAL",
    "EVENT",
    "UPDATE",
]);
const title = (0, schema_1.baseStringSchema)("Title of the Announcement", 255);
const message = {
    type: "string",
    description: "Message of the Announcement",
    nullable: false,
};
const link = (0, schema_1.baseStringSchema)("Link of the Announcement", 255, 0, true);
const status = (0, schema_1.baseBooleanSchema)("Status of the Announcement");
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation Date of the Announcement");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last Update Date of the Announcement", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion Date of the Announcement", true);
exports.announcementSchema = {
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
exports.baseAnnouncementSchema = {
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
exports.announcementUpdateSchema = {
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
exports.announcementStoreSchema = {
    description: `Announcement created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseAnnouncementSchema,
            },
        },
    },
};
