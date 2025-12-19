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
  logModule: "ADMIN_CMS",
  logTitle: "Delete slider",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;
  const { id } = params;

  ctx?.step(`Deleting slider with ID: ${id}`);
  const result = await handleSingleDelete({
    model: "slider",
    id,
    query,
  });

  ctx?.success("Slider deleted successfully");
  return result;
};
