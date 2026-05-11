"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forexSignalStoreSchema = exports.forexSignalUpdateSchema = exports.baseForexSignalSchema = exports.forexSignalSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the Forex Signal");
const title = (0, schema_1.baseStringSchema)("Title of the Forex Signal", 191);
const image = (0, schema_1.baseStringSchema)("Image of the Forex Signal", 191);
const status = (0, schema_1.baseBooleanSchema)("Status of the Plan");
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation Date of the Signal");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last Update Date of the Signal", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion Date of the Signal", true);
exports.forexSignalSchema = {
    id,
    title,
    image,
    status,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.baseForexSignalSchema = {
    id,
    title,
    image,
    status,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.forexSignalUpdateSchema = {
    type: "object",
    properties: {
        title,
        image,
        status,
    },
    required: ["title", "image", "status"],
};
exports.forexSignalStoreSchema = {
    description: `Forex Signal created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseForexSignalSchema,
            },
        },
    },
};
