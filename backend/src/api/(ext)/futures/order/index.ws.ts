import { createError } from "@b/utils/error";

export const metadata = {
  logModule: "FUTURES",
  logTitle: "Order WebSocket connection"
};

export default async (data: Handler, message) => {
  const { user, ctx } = data;

  if (!user?.id) throw createError(401, "Unauthorized");

  ctx?.step("Processing futures order WebSocket message");
  if (typeof message === "string") {
    message = JSON.parse(message);
  }

  ctx?.success("Futures order WebSocket message processed");
};
