import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseAuthorSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific author by ID",
  operationId: "getAuthorById",
  tags: ["Admin", "Content", "Author"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the author to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Author details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseAuthorSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Author"),
    500: serverErrorResponse,
  },
  permission: "view.blog.author",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("author", params.id);
};
