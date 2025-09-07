import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseCategorySchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific category by ID",
  operationId: "getCategoryById",
  tags: ["Admin", "Content", "Category"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the category to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Category details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseCategorySchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Category"),
    500: serverErrorResponse,
  },
  permission: "view.blog.category",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("category", params.id);
};
