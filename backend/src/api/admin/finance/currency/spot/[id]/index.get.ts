import { models } from "@b/db";
import { baseExchangeCurrencySchema } from "../utils";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata = {
  summary: "Get a single exchange currency",
  operationId: "getCurrency",
  tags: ["Admin", "Exchange Currencies"],
  description: "Retrieve details of a single exchange currency by ID",
  parameters: [
    {
      in: "path",
      name: "id",
      required: true,
      schema: {
        type: "string",
      },
      description: "ID of the exchange currency",
    },
  ],
  responses: {
    200: {
      description: "Details of the exchange currency",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseExchangeCurrencySchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Exchange Currency"),
    500: serverErrorResponse,
  },
  permission: "view.spot.currency",
};

export default async (params: { id: string }) => {
  const currency = await models.exchangeCurrency.findOne({
    where: { id: parseInt(params.id) },
  });

  if (!currency) {
    throw new Error("Currency not found");
  }
  return currency.get({ plain: true });
};

// model exchangeCurrency {
//   id        String  @id @unique @default(uuid())
//   currency  String  @unique
//   name      String  @db.VarChar(255)
//   precision Float   @default(8)
//   price     Float?  @default(0)
//   status    Boolean @default(true)
//   chains    Json?   @db.Json
// }
