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
  logModule: "ADMIN_BLOG",
  logTitle: "Create blog post",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
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

  ctx?.step("Validating blog post data");

  ctx?.step("Creating blog post");
  const result = await storeRecord({
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

  ctx?.success("Blog post created successfully");
  return result;
};
