// /api/admin/ecommerce/products/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  ecommerceProductStoreSchema,
  ecommerceProductUpdateSchema,
} from "./utils";
import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Stores a new E-commerce Product",
  operationId: "storeEcommerceProduct",
  tags: ["Admin", "Ecommerce Products"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: ecommerceProductUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(
    ecommerceProductStoreSchema,
    "E-commerce Product"
  ),
  requiresAuth: true,
  permission: "create.ecommerce.product",
};

export default async (data: Handler) => {
  const { body } = data;
  const {
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
  } = body;

  // Validate required fields
  if (!categoryId) {
    throw createError({
      statusCode: 400,
      message: "Category ID is required",
    });
  }

  // Check if category exists and is active
  const category = await models.ecommerceCategory.findOne({
    where: { id: categoryId, status: true },
  });

  if (!category) {
    throw createError({
      statusCode: 400,
      message: "Invalid category ID or category is inactive",
    });
  }

  const existingProduct = await models.ecommerceProduct.findOne({
    where: { name },
  });

  if (existingProduct) {
    throw createError({
      statusCode: 400,
      message: "Product with this name already exists",
    });
  }

  return await storeRecord({
    model: "ecommerceProduct",
    data: {
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
    },
  });
};
