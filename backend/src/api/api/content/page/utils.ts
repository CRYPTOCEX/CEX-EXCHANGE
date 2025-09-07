import { RedisSingleton } from "@b/utils/redis";
import { getPages } from "./index.get";
const redis = RedisSingleton.getInstance();

export async function cachePages() {
  try {
    const pages = await getPages();
    await redis.set("pages", JSON.stringify(pages), "EX", 43200); // Cache for 12 hours (720 * 60)
  } catch (error) {}
}

cachePages();

import { baseStringSchema, baseDateTimeSchema } from "@b/utils/schema";

export const basePageSchema = {
  id: baseStringSchema("ID of the page"),
  title: baseStringSchema("Title of the page"),
  content: baseStringSchema("Content of the page"),
  description: baseStringSchema("Description of the page"),
  image: baseStringSchema("Image of the page", 255, 0, true),
  slug: baseStringSchema("Slug of the page"),
  status: baseStringSchema("Status of the page"),
  createdAt: baseDateTimeSchema("Date and time the page was created"),
  updatedAt: baseDateTimeSchema(
    "Date and time the page was last updated",
    true
  ),
};
