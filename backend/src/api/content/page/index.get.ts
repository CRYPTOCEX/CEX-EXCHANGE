// /server/api/pages/index.get.ts

import { models } from "@b/db";
import { RedisSingleton } from "@b/utils/redis";
const redis = RedisSingleton.getInstance();

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { basePageSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all pages",
  description:
    "Fetches a comprehensive list of all pages available on the platform.",
  operationId: "listAllPages",
  tags: ["Page"],
  requiresAuth: false,
  responses: {
    200: {
      description: "Pages retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: basePageSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Pages"),
    500: serverErrorResponse,
  },
};

export default async () => {
  try {
    const cachedPages = await redis.get("pages");
    if (cachedPages) return JSON.parse(cachedPages);
  } catch (err) {
    console.error("Redis error:", err);
  }
  const pages = await getPages();
  await redis.set("pages", JSON.stringify(pages), "EX", 43200);
  return pages;
};

export async function getPages(): Promise<pageAttributes[]> {
  return (
    await models.page.findAll({
      where: {
        status: true,
      },
    })
  ).map((page) => page.get({ plain: true })) as pageAttributes[];
}
