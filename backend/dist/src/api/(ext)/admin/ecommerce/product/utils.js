"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecommerceProductStoreSchema = exports.ecommerceProductUpdateSchema = exports.baseEcommerceProductSchema = exports.ecommerceProductSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the e-commerce product");
const name = (0, schema_1.baseStringSchema)("Name of the e-commerce product");
const description = (0, schema_1.baseStringSchema)("Description of the e-commerce product", 5000, 0, true);
const shortDescription = (0, schema_1.baseStringSchema)("Short description of the e-commerce product", 500, 0, true);
const type = (0, schema_1.baseStringSchema)("Type of the e-commerce product");
const price = (0, schema_1.baseNumberSchema)("Price of the e-commerce product");
const categoryId = (0, schema_1.baseStringSchema)("Category ID associated with the e-commerce product");
const inventoryQuantity = (0, schema_1.baseNumberSchema)("Inventory quantity of the e-commerce product");
const filePath = (0, schema_1.baseStringSchema)("File path for the product image", 191, 0, true, null, "URL");
const status = (0, schema_1.baseBooleanSchema)("Status of the e-commerce product");
const image = (0, schema_1.baseStringSchema)("URL to the image of the e-commerce product", 191, 0, true, null, "URL");
const currency = (0, schema_1.baseStringSchema)("Currency used for the e-commerce product");
const walletType = (0, schema_1.baseEnumSchema)("Wallet type associated with the e-commerce product", ["FIAT", "SPOT", "ECO"]);
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the e-commerce product", true);
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the e-commerce product", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion date of the e-commerce product", true);
exports.ecommerceProductSchema = {
    id,
    name,
    description,
    shortDescription,
    type,
    price,
    categoryId,
    inventoryQuantity,
    filePath,
    status,
    image,
    currency,
    walletType,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.baseEcommerceProductSchema = {
    id,
    name,
    description,
    shortDescription,
    type,
    price,
    categoryId,
    inventoryQuantity,
    filePath,
    status,
    image,
    currency,
    walletType,
    createdAt,
    deletedAt,
    updatedAt,
};
exports.ecommerceProductUpdateSchema = {
    type: "object",
    properties: {
        name,
        description,
        shortDescription,
        type,
        price,
        categoryId,
        status,
        image,
        currency,
        walletType,
        inventoryQuantity,
    },
    required: ["name", "description", "type", "price", "categoryId", "currency", "walletType", "inventoryQuantity"],
};
exports.ecommerceProductStoreSchema = {
    description: `E-commerce product created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseEcommerceProductSchema,
            },
        },
    },
};
