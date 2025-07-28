import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseSliderSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "List all sliders",
  operationId: "listSliders",
  tags: ["Sliders"],
  responses: {
    200: {
      description: "Sliders retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseSliderSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Sliders"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  return await models.slider.findAll({
    where: { status: true },
  });
};
