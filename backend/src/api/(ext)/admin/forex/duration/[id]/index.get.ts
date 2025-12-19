import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseForexDurationSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Gets a specific Forex duration",
  description: "Retrieves detailed information about a specific Forex duration configuration by its ID.",
  operationId: "getForexDuration",
  tags: ["Admin", "Forex", "Duration"],
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
  logModule: "ADMIN_FOREX",
  logTitle: "Get Forex Duration",
};

export default async (data) => {
  const { params, ctx } = data;

  ctx?.step("Fetching forex duration record");
  const result = await getRecord("forexDuration", params.id);

  ctx?.success("Retrieved forex duration");
  return result;
};
