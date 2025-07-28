import { models } from "@b/db";
import { binaryDurationSchema } from "../utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";

export const metadata = {
  summary:
    "Retrieves detailed information of a specific binary duration by ID",
  operationId: "getBinaryDurationById",
  tags: ["Admin", "Binary Durations"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the binary duration to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Binary duration details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: binaryDurationSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Binary Duration"),
    500: serverErrorResponse,
  },
  permission: "view.binary.duration",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params } = data;
  const { id } = params;

  const binaryDuration = await models.binaryDuration.findOne({
    where: { id },
  });

  if (!binaryDuration) {
    throw new Error("Binary duration not found");
  }

  return binaryDuration;
};