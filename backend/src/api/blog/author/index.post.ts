// /server/api/blog/authors/store.post.ts

import { CacheManager } from "@b/utils/cache";
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Creates a new author",
  description: "This endpoint creates a new author.",
  operationId: "createAuthor",
  tags: ["Content", "Author"],
  logModule: "BLOG",
  logTitle: "Apply as author",
  requiresAuth: true,
  responses: createRecordResponses("Author"),
};

export default async (data: Handler) => {
  const { user, ctx } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  ctx?.step("Checking author application settings");
  const cacheManager = CacheManager.getInstance();
  const settings = await cacheManager.getSettings();
  const autoApproveAuthorsRaw = settings.has("autoApproveAuthors")
    ? settings.get("autoApproveAuthors")
    : null;
  const autoApproveAuthors =
    typeof autoApproveAuthorsRaw === "boolean"
      ? autoApproveAuthorsRaw
      : Boolean(autoApproveAuthorsRaw);

  ctx?.step("Checking for existing author profile");
  const author = await models.author.findOne({
    where: {
      userId: user.id,
    },
  });

  if (author)
    throw createError({
      statusCode: 400,
      message: "Author profile already exists",
    });

  ctx?.step("Creating author profile");
  await models.author.create({
    userId: user.id,
    status: autoApproveAuthors ? "APPROVED" : "PENDING",
  });

  ctx?.success(`Author profile created for user ${user.id} - ${autoApproveAuthors ? "auto-approved" : "pending approval"}`);
  return {
    message: "Author created successfully",
  };
};
