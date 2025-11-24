import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a slider",
  operationId: "deleteSlider",
  tags: ["Admin", "Sliders"],
  parameters: deleteRecordParams("slider"),
  responses: deleteRecordResponses("Slider"),
  permission: "delete.slider",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  const { id } = params;

  return handleSingleDelete({
    model: "slider",
    id,
    query,
  });
};
