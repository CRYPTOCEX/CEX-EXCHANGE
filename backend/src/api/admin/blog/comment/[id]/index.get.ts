import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseCommentSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific comment by ID",
  operationId: "getCommentById",
  tags: ["Admin", "Content", "Comment"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the comment to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Comment details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseCommentSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Comment"),
    500: serverErrorResponse,
  },
  permission: "view.blog.comment",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("comment", params.id);
};
