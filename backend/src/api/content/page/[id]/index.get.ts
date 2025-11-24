// /server/api/pages/show.get.ts

import { models } from "@b/db";
import { RedisSingleton } from "@b/utils/redis";
const redis = RedisSingleton.getInstance();

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { basePageSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves a single page by ID",
  description:
    "Fetches detailed information about a specific page based on its unique identifier.",
  operationId: "getPage",
  tags: ["Page"],
  requiresAuth: false,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "The ID of the page to retrieve",
      schema: { type: "number" },
    },
  ],
  responses: {
    200: {
      description: "Page retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: basePageSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Page"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  try {
    const cachedPages = await redis.get("pages");
    if (cachedPages) {
      const pages = JSON.parse(cachedPages);
      const page = pages.find((p) => p.id === data.params.id);
      if (page) return page;
    }
  } catch (err) {
    console.error("Redis error:", err);
  }
  return getPage(data.params.id);
};

export async function getPage(id: string): Promise<pageAttributes> {
  const response = await models.page.findOne({
    where: { id },
  });

  if (!response) {
    throw new Error("Page not found");
  }

  return response.get({ plain: true }) as unknown as pageAttributes;
}
