import { messageBroker } from "@b/handler/Websocket";
import { MatchingEngine } from "@b/api/(ext)/ecosystem/utils/matchingEngine";

export const metadata = {};

export default async (data: Handler, message) => {
  if (typeof message === "string") {
    message = JSON.parse(message);
  }

  const engine = await MatchingEngine.getInstance();
  const tickers = await engine.getTickers();

  messageBroker.broadcastToSubscribedClients(
    `/api/ecosystem/ticker`,
    { type: "tickers" },
    {
      stream: "tickers",
      data: tickers,
    }
  );
};
