import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific API key by ID",
  operationId: "getApiKeyById",
  tags: ["Admin", "API Keys"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the API key to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "API Key details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              userId: { type: "string" },
              name: { type: "string" },
              key: { type: "string" },
              permissions: {
                type: "array",
                items: { type: "string" },
              },
              ipWhitelist: {
                type: "array",
                items: { type: "string" },
              },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
              user: {
                type: "object",
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string" },
                  avatar: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("API Key"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.api.key",
};

export default async (data: Handler) => {
  const { params } = data;

  return await getRecord(
    "apiKey",
    params.id,
    [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
        required: false,
      },
    ],
    ["createdAt", "updatedAt"]
  );
};
