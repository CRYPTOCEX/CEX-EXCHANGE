// /api/admin/categories/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { categoryStoreSchema, categoryUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new Category",
  operationId: "storeCategory",
  tags: ["Admin", "Content", "Category"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: categoryUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(categoryStoreSchema, "Category"),
  requiresAuth: true,
  permission: "create.blog.category",
  logModule: "ADMIN_BLOG",
  logTitle: "Create category",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { name, slug, image, description } = body;

  ctx?.step("Validating category data");

  ctx?.step("Creating category");
  const result = await storeRecord({
    model: "category",
    data: {
      name,
      slug,
      image,
      description,
    },
  });

  ctx?.success("Category created successfully");
  return result;
};
