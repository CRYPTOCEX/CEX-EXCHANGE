import { messageBroker } from "@b/handler/Websocket";
import { MatchingEngine } from "@b/api/(ext)/ecosystem/utils/matchingEngine";

export const metadata = {
  logModule: "ECOSYSTEM",
  logTitle: "Ticker WebSocket connection"
};

export default async (data: Handler, message) => {
  const { ctx } = data;

  ctx?.step("Processing ticker WebSocket message");
  if (typeof message === "string") {
    message = JSON.parse(message);
  }

  ctx?.step("Fetching tickers from matching engine");
  const engine = await MatchingEngine.getInstance();
  const tickers = await engine.getTickers();

  ctx?.step("Broadcasting tickers to subscribers");
  messageBroker.broadcastToSubscribedClients(
    `/api/ecosystem/ticker`,
    { type: "tickers" },
    {
      stream: "tickers",
      data: tickers,
    }
  );

  ctx?.success(`Broadcasted ${Object.keys(tickers || {}).length} tickers`);
};
