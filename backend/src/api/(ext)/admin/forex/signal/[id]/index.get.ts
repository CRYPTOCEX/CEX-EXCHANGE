import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseForexSignalSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Gets a specific Forex signal",
  description: "Retrieves detailed information about a specific Forex trading signal by its ID, including title, image, and status.",
  operationId: "getForexSignal",
  tags: ["Admin", "Forex", "Signal"],
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
  logModule: "ADMIN_FOREX",
  logTitle: "Get Forex Signal",
};

export default async (data) => {
  const { params, ctx } = data;

  ctx?.step("Fetching forex signal record");
  const result = await getRecord("forexSignal", params.id);

  ctx?.success("Retrieved forex signal");
  return result;
};
