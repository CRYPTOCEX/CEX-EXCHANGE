"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecommerceShippingUpdateSchema = exports.ecommerceShippingStoreSchema = exports.ecommerceShippingSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the e-commerce shipping");
const loadId = (0, schema_1.baseStringSchema)("Load ID of the shipping");
const loadStatus = (0, schema_1.baseEnumSchema)("Load status of the shipping", [
    "PENDING",
    "TRANSIT",
    "DELIVERED",
    "CANCELLED",
]);
const shipper = (0, schema_1.baseStringSchema)("Shipper name");
const transporter = (0, schema_1.baseStringSchema)("Transporter name");
const goodsType = (0, schema_1.baseStringSchema)("Type of goods being shipped");
const weight = (0, schema_1.baseNumberSchema)("Weight of the goods");
const volume = (0, schema_1.baseNumberSchema)("Volume of the goods");
const description = (0, schema_1.baseStringSchema)("Description of the shipment");
const vehicle = (0, schema_1.baseStringSchema)("Vehicle used for shipping");
const cost = (0, schema_1.baseNumberSchema)("Shipping cost", false);
const tax = (0, schema_1.baseNumberSchema)("Shipping tax", false);
const deliveryDate = (0, schema_1.baseDateTimeSchema)("Expected delivery date", false);
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the shipping", true);
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the shipping", true);
exports.ecommerceShippingSchema = {
    id,
    loadId,
    loadStatus,
    shipper,
    transporter,
    goodsType,
    weight,
    volume,
    description,
    vehicle,
    cost,
    tax,
    deliveryDate,
    createdAt,
    updatedAt,
};
exports.ecommerceShippingStoreSchema = {
    type: "object",
    properties: exports.ecommerceShippingSchema,
};
exports.ecommerceShippingUpdateSchema = {
    type: "object",
    properties: {
        loadId,
        loadStatus,
        shipper,
        transporter,
        goodsType,
        weight,
        volume,
        description,
        vehicle,
        cost,
        tax,
        deliveryDate,
    },
    required: [
        "loadId",
        "loadStatus",
        "shipper",
        "transporter",
        "goodsType",
        "weight",
        "volume",
        "description",
        "vehicle",
    ],
};
