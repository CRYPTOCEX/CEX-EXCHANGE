import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Updates the status of a slider",
  operationId: "updateSliderStatus",
  tags: ["Admin", "Sliders"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the slider to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description:
                "New status to apply (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
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
  const { status } = body;

  return updateStatus("slider", id, status);
};
