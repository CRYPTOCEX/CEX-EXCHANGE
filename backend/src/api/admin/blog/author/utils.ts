import {
  baseStringSchema,
  baseEnumSchema,
  baseDateTimeSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the author");
const userId = baseStringSchema("User ID associated with the author");
const status = baseEnumSchema("Current status of the author", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);
const createdAt = baseDateTimeSchema("Creation date of the author", true);
const deletedAt = baseDateTimeSchema("Deletion date of the author", true);
const updatedAt = baseDateTimeSchema("Last update date of the author", true);

export const baseAuthorSchema = {
  id,
  userId,
  status,
  createdAt,
  deletedAt,
  updatedAt,
};

export const authorUpdateSchema = {
  type: "object",
  properties: {
    status,
  },
  required: ["status"],
};

export const authorStoreSchema = {
  description: `Author created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseAuthorSchema,
      },
    },
  },
};
