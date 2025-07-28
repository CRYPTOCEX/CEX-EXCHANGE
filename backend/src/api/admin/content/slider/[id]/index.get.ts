import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { sliderSchema } from "../utils";

export const metadata = {
  summary: "Retrieves detailed information of a specific slider by ID",
  operationId: "getSliderById",
  tags: ["Admin", "Sliders"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the slider to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Slider details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: sliderSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Slider"),
    500: serverErrorResponse,
  },
  permission: "view.slider",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params } = data;

  return getRecord("slider", params.id);
};
