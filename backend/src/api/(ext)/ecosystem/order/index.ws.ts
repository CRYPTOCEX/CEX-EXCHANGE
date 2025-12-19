import { createError } from "@b/utils/error";

export const metadata = {
  logModule: "ECOSYSTEM",
  logTitle: "Order WebSocket connection"
};

export default async (data: Handler, message) => {
  const { user, ctx } = data;

  if (!user?.id) throw createError(401, "Unauthorized");

  ctx?.step("Processing order WebSocket message");
  if (typeof message === "string") {
    message = JSON.parse(message);
  }

  ctx?.success("Order WebSocket message processed");
};
