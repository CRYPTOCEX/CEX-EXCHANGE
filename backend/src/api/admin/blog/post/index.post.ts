// /api/posts/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { postStoreSchema, postUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new Blog Post",
  operationId: "storePost",
  tags: ["Admin", "Content", "Posts"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: postUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(postStoreSchema, "Blog Post"),
  requiresAuth: true,
  permission: "create.blog.post",
};

export default async (data: Handler) => {
  const { body } = data;
  const {
    title,
    content,
    categoryId,
    authorId,
    slug,
    description,
    status,
    image,
  } = body;

  return await storeRecord({
    model: "post",
    data: {
      title,
      content,
      categoryId,
      authorId,
      slug,
      description,
      status,
      image,
    },
  });
};
