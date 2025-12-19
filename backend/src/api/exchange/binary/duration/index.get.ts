// /server/api/exchange/binary/duration/index.get.ts

import { models } from "@b/db";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "List Available Binary Durations",
  operationId: "listBinaryDurations",
  tags: ["Exchange", "Binary"],
  description: "Retrieves a list of available durations for binary options.",
  logModule: "EXCHANGE",
  logTitle: "Get Binary Durations",
  responses: {
    200: {
      description: "A list of binary durations",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {}, // Define duration properties schema as needed.
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Binary Duration"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { ctx } = data;

  ctx?.step("Fetching binary durations");
  const durations = await models.binaryDuration.findAll({
    order: [["duration", "ASC"]], // Adjust order/column name as needed.
  });

  ctx?.success(`Retrieved ${durations.length} binary durations`);
  return durations;
};
