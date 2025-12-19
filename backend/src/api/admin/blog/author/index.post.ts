// /api/admin/authors/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { authorCreateSchema, authorStoreSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new Author",
  operationId: "storeAuthor",
  tags: ["Admin", "Content", "Author"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: authorCreateSchema,
      },
    },
  },
  responses: storeRecordResponses(authorStoreSchema, "Author"),
  requiresAuth: true,
  permission: "create.blog.author",
  logModule: "ADMIN_BLOG",
  logTitle: "Create author",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { userId, status } = body;

  ctx?.step("Validating author data");

  ctx?.step("Creating author");
  const result = await storeRecord({
    model: "author",
    data: {
      userId,
      status,
    },
  });

  ctx?.success("Author created successfully");
  return result;
};
