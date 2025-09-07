import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { sliderUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates a specific Slider",
  operationId: "updateSlider",
  tags: ["Admin", "Sliders"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the Slider to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the Slider",
    content: {
      "application/json": {
        schema: sliderUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Slider"),
  requiresAuth: true,
  permission: "edit.slider",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { image, link, status } = body;

  return updateRecord("slider", id, {
    image,
    link,
    status,
  });
};
