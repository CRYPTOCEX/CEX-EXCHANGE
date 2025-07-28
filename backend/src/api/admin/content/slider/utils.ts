import {
  baseStringSchema,
  baseBooleanSchema,
  baseDateTimeSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the Slider");
const image = baseStringSchema("Image URL of the Slider", 255);
const link = baseStringSchema("Link URL of the Slider", 255, 0, true);
const status = baseBooleanSchema("Status of the Slider");
const createdAt = baseDateTimeSchema("Creation Date of the Slider");
const updatedAt = baseDateTimeSchema("Last Update Date of the Slider", true);
const deletedAt = baseDateTimeSchema("Deletion Date of the Slider", true);

export const sliderSchema = {
  id,
  image,
  link,
  status,
  createdAt,
  updatedAt,
  deletedAt,
};

export const baseSliderSchema = {
  id,
  image,
  link,
  status,
  createdAt,
  updatedAt,
  deletedAt,
};

export const sliderUpdateSchema = {
  type: "object",
  properties: {
    image,
    link,
    status,
  },
  required: ["image"],
};

export const sliderStoreSchema = {
  description: `Slider created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseSliderSchema,
      },
    },
  },
};
