import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseForexSignalSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific forex signal by ID",
  operationId: "getForexSignalById",
  tags: ["Admin", "Forex Signals"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the forex signal to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Forex signal details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseForexSignalSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Signal"),
    500: serverErrorResponse,
  },
  permission: "view.forex.signal",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("forexSignal", params.id);
};
