import { messageBroker } from "@b/handler/Websocket";
import { FuturesMatchingEngine } from "@b/api/(ext)/futures/utils/matchingEngine";

export const metadata = {
  logModule: "FUTURES",
  logTitle: "Futures ticker websocket",
};

export default async (data: Handler, message) => {
  const { ctx } = data;

  if (typeof message === "string") {
    message = JSON.parse(message);
  }

  ctx?.step?.("Initializing futures matching engine");
  const engine = await FuturesMatchingEngine.getInstance();

  ctx?.step?.("Fetching all futures tickers");
  const tickers = await engine.getTickers();

  ctx?.step?.("Broadcasting tickers to subscribed clients");
  messageBroker.broadcastToSubscribedClients(
    `/api/futures/ticker`,
    { type: "tickers" },
    {
      stream: "tickers",
      data: tickers,
    }
  );

  ctx?.success?.("Ticker data broadcasted successfully");
};
