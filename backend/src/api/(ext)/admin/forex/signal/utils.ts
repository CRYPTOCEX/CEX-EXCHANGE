import {
  baseStringSchema,
  baseBooleanSchema,
  baseDateTimeSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the Forex Signal");
const title = baseStringSchema("Title of the Forex Signal", 191);
const image = baseStringSchema("Image of the Forex Signal", 191);
const status = baseBooleanSchema("Status of the Plan");
const createdAt = baseDateTimeSchema("Creation Date of the Signal");
const updatedAt = baseDateTimeSchema("Last Update Date of the Signal", true);
const deletedAt = baseDateTimeSchema("Deletion Date of the Signal", true);

export const forexSignalSchema = {
  id,
  title,
  image,
  status,
  createdAt,
  updatedAt,
  deletedAt,
};

export const baseForexSignalSchema = {
  id,
  title,
  image,
  status,
  createdAt,
  updatedAt,
  deletedAt,
};

export const forexSignalUpdateSchema = {
  type: "object",
  properties: {
    title,
    image,
    status,
  },
  required: ["title", "image", "status"], // Adjust as necessary based on actual required fields
};

export const forexSignalStoreSchema = {
  description: `Forex Signal created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseForexSignalSchema,
      },
    },
  },
};
