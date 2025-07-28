import { createError } from "@b/utils/error";

export const metadata = {};

export default async (data: Handler, message) => {
  const { user } = data;

  if (!user?.id) throw createError(401, "Unauthorized");
  if (typeof message === "string") {
    message = JSON.parse(message);
  }
};
