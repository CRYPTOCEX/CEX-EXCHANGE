"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecommerceCategoryStoreSchema = exports.ecommerceCategoryUpdateSchema = exports.baseEcommerceCategorySchema = exports.ecommerceCategorySchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the e-commerce category");
const name = (0, schema_1.baseStringSchema)("Name of the e-commerce category", 191);
const description = (0, schema_1.baseStringSchema)("Description of the e-commerce category");
const image = (0, schema_1.baseStringSchema)("URL to the image of the e-commerce category", 191, 0, true, null, "URL");
const status = (0, schema_1.baseBooleanSchema)("Status of the e-commerce category");
exports.ecommerceCategorySchema = {
    id,
    name,
    description,
    image,
    status,
};
exports.baseEcommerceCategorySchema = {
    id,
    name,
    description,
    image,
    status,
};
exports.ecommerceCategoryUpdateSchema = {
    type: "object",
    properties: {
        name,
        description,
        image,
        status,
    },
    required: ["name", "description", "status"],
};
exports.ecommerceCategoryStoreSchema = exports.baseEcommerceCategorySchema;
