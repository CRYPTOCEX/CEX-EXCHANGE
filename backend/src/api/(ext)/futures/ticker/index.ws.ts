import { messageBroker } from "@b/handler/Websocket";
import { FuturesMatchingEngine } from "@b/api/(ext)/futures/utils/matchingEngine";

export const metadata = {};

export default async (data: Handler, message) => {
  if (typeof message === "string") {
    message = JSON.parse(message);
  }

  const engine = await FuturesMatchingEngine.getInstance();
  const tickers = await engine.getTickers();

  messageBroker.broadcastToSubscribedClients(
    `/api/futures/ticker`,
    { type: "tickers" },
    {
      stream: "tickers",
      data: tickers,
    }
  );
};
