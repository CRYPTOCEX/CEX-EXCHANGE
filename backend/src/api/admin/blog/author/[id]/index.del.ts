import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific author",
  operationId: "deleteAuthor",
  tags: ["Admin", "Content", "Author"],
  parameters: deleteRecordParams("Author"),
  responses: deleteRecordResponses("Author"),
  permission: "delete.blog.author",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "author",
    id: params.id,
    query,
  });
};
