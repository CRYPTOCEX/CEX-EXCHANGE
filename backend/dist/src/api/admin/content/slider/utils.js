"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sliderStoreSchema = exports.sliderUpdateSchema = exports.baseSliderSchema = exports.sliderSchema = void 0;
exports.validateSliderLink = validateSliderLink;
const schema_1 = require("@b/utils/schema");
const error_1 = require("@b/utils/error");
function validateSliderLink(link) {
    if (link === undefined || link === null)
        return undefined;
    const trimmed = String(link).trim();
    if (trimmed === "")
        return "";
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
        return trimmed;
    }
    let parsed;
    try {
        parsed = new URL(trimmed);
    }
    catch (_a) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid slider link. Use an http(s):// URL or a site-relative path.",
        });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid slider link scheme. Only http(s) links are allowed.",
        });
    }
    return trimmed;
}
const id = (0, schema_1.baseStringSchema)("ID of the Slider");
const image = (0, schema_1.baseStringSchema)("Image URL of the Slider", 255);
const link = (0, schema_1.baseStringSchema)("Link URL of the Slider", 255, 0, true);
const status = (0, schema_1.baseBooleanSchema)("Status of the Slider");
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation Date of the Slider");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last Update Date of the Slider", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion Date of the Slider", true);
exports.sliderSchema = {
    id,
    image,
    link,
    status,
    createdAt,
    updatedAt,
    deletedAt,
};
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
