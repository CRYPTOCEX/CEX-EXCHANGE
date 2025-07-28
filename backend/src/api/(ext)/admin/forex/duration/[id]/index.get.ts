import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseForexDurationSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific forex duration by ID",
  operationId: "getForexDurationById",
  tags: ["Admin", "Forex Durations"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the forex duration to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Forex duration details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseForexDurationSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Duration"),
    500: serverErrorResponse,
  },
  permission: "view.forex.duration",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("forexDuration", params.id);
};
