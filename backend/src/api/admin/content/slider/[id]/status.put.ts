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
  logModule: "ADMIN_CMS",
  logTitle: "Update slider status",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step(`Updating slider status to ${status ? 'active' : 'inactive'}`);
  const result = await updateStatus("slider", id, status);

  ctx?.success("Slider status updated successfully");
  return result;
};
