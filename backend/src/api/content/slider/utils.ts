import {
  baseStringSchema,
  baseDateTimeSchema,
  baseBooleanSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the Slider");
const image = baseStringSchema("Image URL of the Slider");
const link = baseStringSchema("Link URL of the Slider");
const status = baseBooleanSchema("Status of the Slider");
const createdAt = baseDateTimeSchema("Creation date of the Slider");
const updatedAt = baseDateTimeSchema("Last update date of the Slider");
const deletedAt = baseDateTimeSchema(
  "Deletion date of the Slider, if applicable"
);

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
