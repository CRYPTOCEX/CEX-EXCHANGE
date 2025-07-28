import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseEcommerceOrderSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific ecommerce order by ID",
  operationId: "getEcommerceOrderById",
  tags: ["Admin", "Ecommerce Orders"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the ecommerce order to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Ecommerce order details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseEcommerceOrderSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecommerce Order"),
    500: serverErrorResponse,
  },
  permission: "view.ecommerce.order",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  const order = await getRecord("ecommerceOrder", params.id, [
    {
      model: models.ecommerceProduct,
      as: "products",
      through: {
        attributes: ["quantity", "key", "filePath", "id", "instructions"],
      },
      attributes: [
        "name",
        "price",
        "status",
        "type",
        "image",
        "currency",
        "walletType",
      ],
      includeModels: [
        {
          model: models.ecommerceCategory,
          as: "category",
          attributes: ["name"],
        },
      ],
    },
    {
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email", "avatar"],
    },
    {
      model: models.ecommerceShippingAddress,
      as: "shippingAddress",
    },
    {
      model: models.ecommerceShipping,
      as: "shipping",
    },
  ]);

  // shpments not "DELIVERED" | "CANCELLED"
  const shipments = await models.ecommerceShipping.findAll({
    where: {
      loadStatus: "PENDING",
    },
  });

  return {
    order,
    shipments: shipments.map((shipment) => shipment.get({ plain: true })),
  };
};
