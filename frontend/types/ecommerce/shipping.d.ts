import type { Optional } from "sequelize";

interface ecommerceShippingAttributes {
  id: string;
  loadId: string;
  loadStatus: "PENDING" | "TRANSIT" | "DELIVERED" | "CANCELLED";
  shipper: string;
  transporter: string;
  goodsType: string;
  weight: number;
  volume: number;
  description: string;
  vehicle: string;
  cost?: number;
  tax?: number;
  deliveryDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

type ecommerceShippingPk = "id";
type ecommerceShippingId = ecommerceShippingAttributes[ecommerceShippingPk];
type ecommerceShippingOptionalAttributes =
  | "id"
  | "cost"
  | "tax"
  | "deliveryDate"
  | "createdAt"
  | "updatedAt";
type ecommerceShippingCreationAttributes = Optional<
  ecommerceShippingAttributes,
  ecommerceShippingOptionalAttributes
>;
