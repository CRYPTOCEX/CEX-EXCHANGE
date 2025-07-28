// /api/admin/authors/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { authorUpdateSchema, authorStoreSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new Author",
  operationId: "storeAuthor",
  tags: ["Admin", "Content", "Author"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: authorUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(authorStoreSchema, "Author"),
  requiresAuth: true,
  permission: "create.blog.author",
};

export default async (data: Handler) => {
  const { body } = data;
  const { userId, status } = body;

  return await storeRecord({
    model: "author",
    data: {
      userId,
      status,
    },
  });
};
