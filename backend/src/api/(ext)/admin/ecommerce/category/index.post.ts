// /api/admin/ecommerce/categories/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  ecommerceCategoryStoreSchema,
  ecommerceCategoryUpdateSchema,
} from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new E-commerce Category",
  operationId: "storeEcommerceCategory",
  tags: ["Admin", "Ecommerce Categories"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: ecommerceCategoryUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(
    ecommerceCategoryStoreSchema,
    "E-commerce Category"
  ),
  requiresAuth: true,
  permission: "create.ecommerce.category",
};

export default async (data: Handler) => {
  const { body } = data;
  const { name, description, image, status } = body;

  return await storeRecord({
    model: "ecommerceCategory",
    data: {
      name,
      description,
      image,
      status,
    },
  });
};
