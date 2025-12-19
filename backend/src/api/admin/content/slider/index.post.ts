import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { sliderSchema } from "./utils";

export const metadata = {
  summary: "Stores a new Slider",
  operationId: "storeSlider",
  tags: ["Admin", "Sliders"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: sliderSchema,
          required: ["image"],
        },
      },
    },
  },
  responses: storeRecordResponses(sliderSchema, "Slider"),
  requiresAuth: true,
  permission: "create.slider",
  logModule: "ADMIN_CMS",
  logTitle: "Create slider",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { image, link, status } = body;

  ctx?.step("Validating slider data");
  ctx?.step("Creating slider");
  const result = await storeRecord({
    model: "slider",
    data: {
      image,
      link,
      status,
    },
    returnResponse: true,
  });

  ctx?.success("Slider created successfully");
  return result;
};
