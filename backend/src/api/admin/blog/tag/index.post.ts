// /api/admin/categories/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { tagStoreSchema, tagUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new Tag",
  operationId: "storeTag",
  tags: ["Admin", "Content", "Category"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: tagUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(tagStoreSchema, "Tag"),
  requiresAuth: true,
  permission: "create.blog.tag",
  logModule: "ADMIN_BLOG",
  logTitle: "Create tag",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { name, slug, image, description } = body;

  ctx?.step("Validating tag data");

  ctx?.step("Creating tag");
  const result = await storeRecord({
    model: "tag",
    data: {
      name,
      slug,
      image,
      description,
    },
  });

  ctx?.success("Tag created successfully");
  return result;
};
