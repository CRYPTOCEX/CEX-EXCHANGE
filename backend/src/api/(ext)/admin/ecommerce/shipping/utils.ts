import {
  baseStringSchema,
  baseEnumSchema,
  baseNumberSchema,
  baseDateTimeSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the e-commerce shipping");
const loadId = baseStringSchema("Load ID of the shipping");
const loadStatus = baseEnumSchema("Load status of the shipping", [
  "PENDING",
  "TRANSIT",
  "DELIVERED",
  "CANCELLED",
]);
const shipper = baseStringSchema("Shipper name");
const transporter = baseStringSchema("Transporter name");
const goodsType = baseStringSchema("Type of goods being shipped");
const weight = baseNumberSchema("Weight of the goods");
const volume = baseNumberSchema("Volume of the goods");
const description = baseStringSchema("Description of the shipment");
const vehicle = baseStringSchema("Vehicle used for shipping");
const cost = baseNumberSchema("Shipping cost", false);
const tax = baseNumberSchema("Shipping tax", false);
const deliveryDate = baseDateTimeSchema("Expected delivery date", false);
const createdAt = baseDateTimeSchema("Creation date of the shipping", true);
const updatedAt = baseDateTimeSchema("Last update date of the shipping", true);

export const ecommerceShippingSchema = {
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

export const ecommerceShippingStoreSchema = {
  type: "object",
  properties: ecommerceShippingSchema,
};

export const ecommerceShippingUpdateSchema = {
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
