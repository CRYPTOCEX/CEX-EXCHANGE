import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseEcosystemTokenSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific ecosystem token by ID",
  operationId: "getEcosystemTokenById",
  tags: ["Admin", "Ecosystem Tokens"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the ecosystem token to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Ecosystem token details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseEcosystemTokenSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecosystem Token"),
    500: serverErrorResponse,
  },
  permission: "view.ecosystem.token",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("ecosystemToken", params.id);
};
