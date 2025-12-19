// /api/admin/ecommerce/categories/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  ecommerceCategoryStoreSchema,
  ecommerceCategoryUpdateSchema,
} from "./utils";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  conflictResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Creates a new ecommerce category",
  description:
    "Creates a new ecommerce category with the provided name, description, image, and status. The name must be unique across all categories.",
  operationId: "createEcommerceCategory",
  tags: ["Admin", "Ecommerce", "Category"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: ecommerceCategoryUpdateSchema,
      },
    },
  },
  responses: {
    200: {
      description: "Category created successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: ecommerceCategoryStoreSchema,
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    409: conflictResponse("Ecommerce category"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "create.ecommerce.category",
  logModule: "ADMIN_ECOM",
  logTitle: "Create category",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { name, description, image, status } = body;

  ctx?.step("Validating category data");
  ctx?.step("Creating category record");

  const result = await storeRecord({
    model: "ecommerceCategory",
    data: {
      name,
      description,
      image,
      status,
    },
  });

  ctx?.success(`Category created: ${name}`);
  return result;
};
