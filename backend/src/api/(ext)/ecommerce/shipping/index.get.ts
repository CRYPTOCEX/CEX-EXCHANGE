import { models } from "@b/db";
import { createError } from "@b/utils/error";

// Metadata (OpenAPI style, optional)
export const metadata = {
  summary: "Get user's shipping records",
  description:
    "Returns all shipping records for the current user, including all related order, items, products, and addresses.",
  operationId: "getUserShippingRecords",
  tags: ["Ecommerce", "Shipping", "User"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Shipping records for user",
      content: { "application/json": { schema: { type: "object" } } },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "access.ecommerce.shipping",
};

export default async function handler({ user }) {
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    const shippings = await models.ecommerceShipping.findAll({
      include: [
        {
          model: models.ecommerceOrder,
          as: "ecommerceOrders", // association alias!
          where: { userId: user.id },
          required: true, // Only shippings with at least one order for this user
          include: [
            {
              model: models.ecommerceOrderItem,
              as: "ecommerceOrderItems",
              // You can also include product if you want
              include: [
                {
                  model: models.ecommerceProduct,
                  as: "product",
                },
              ],
            },
            {
              model: models.ecommerceShippingAddress,
              as: "shippingAddress",
            },
            {
              model: models.user,
              as: "user",
            },
            {
              model: models.ecommerceProduct,
              as: "products", // if you have many-to-many between order and products
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      paranoid: false, // include soft-deleted if needed
    });

    // No additional processing, raw Sequelize structure
    return shippings;
  } catch (err) {
    console.error("Failed to fetch shipping records", err);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch shipping records",
    });
  }
}
