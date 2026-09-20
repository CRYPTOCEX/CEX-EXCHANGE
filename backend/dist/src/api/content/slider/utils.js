"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sliderStoreSchema = exports.sliderUpdateSchema = exports.baseSliderSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the Slider");
const image = (0, schema_1.baseStringSchema)("Image URL of the Slider");
const link = (0, schema_1.baseStringSchema)("Link URL of the Slider");
const status = (0, schema_1.baseBooleanSchema)("Status of the Slider");
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the Slider");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the Slider");
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion date of the Slider, if applicable");
exports.baseSliderSchema = {
    id,
    image,
    link,
    status,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.sliderUpdateSchema = {
    type: "object",
    properties: {
        image,
        link,
        status,
    },
    required: ["image"],
};
exports.sliderStoreSchema = {
    description: `Slider created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseSliderSchema,
            },
        },
    },
};
