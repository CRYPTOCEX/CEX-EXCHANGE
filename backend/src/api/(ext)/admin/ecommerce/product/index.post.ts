// /api/admin/ecommerce/products/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  ecommerceProductStoreSchema,
  ecommerceProductUpdateSchema,
} from "./utils";
import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Creates a new ecommerce product",
  operationId: "createEcommerceProduct",
  tags: ["Admin", "Ecommerce", "Product"],
  description: "Creates a new ecommerce product with the provided details. Validates category existence and status, checks for duplicate product names, and automatically generates a unique slug from the product name.",
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
    "Ecommerce Product"
  ),
  requiresAuth: true,
  permission: "create.ecommerce.product",
  logModule: "ADMIN_ECOM",
  logTitle: "Create Ecommerce Product",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
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

  ctx?.step("Validating category");
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

  ctx?.step("Checking for duplicate product");
  const existingProduct = await models.ecommerceProduct.findOne({
    where: { name },
  });

  if (existingProduct) {
    throw createError({
      statusCode: 400,
      message: "Product with this name already exists",
    });
  }

  ctx?.step("Creating E-commerce product");
  const result = await storeRecord({
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

  ctx?.success("Successfully created E-commerce product");
  return result;
};
