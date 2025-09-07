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
};

export default async (data: Handler) => {
  const { body } = data;
  const { name, slug, image, description } = body;

  return await storeRecord({
    model: "tag",
    data: {
      name,
      slug,
      image,
      description,
    },
  });
};
