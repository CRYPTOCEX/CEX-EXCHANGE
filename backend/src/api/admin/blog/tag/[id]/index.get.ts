import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseTagSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific tag by ID",
  operationId: "getTagById",
  tags: ["Admin", "Content", "Category"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the tag to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Tag details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseTagSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Tag"),
    500: serverErrorResponse,
  },
  permission: "view.blog.tag",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("tag", params.id);
};
