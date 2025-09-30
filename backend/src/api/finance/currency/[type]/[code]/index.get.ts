import ExchangeManager from "@b/utils/exchange";
// /server/api/currencies/show.get.ts

import { baseCurrencySchema, baseResponseSchema } from "../../utils";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { Op, Sequelize } from "sequelize";

export const metadata: OperationObject = {
  summary: "Retrieves a single currency by its ID",
  description: "This endpoint retrieves a single currency by its ID.",
  operationId: "getCurrencyById",
  tags: ["Finance", "Currency"],
  requiresAuth: true,
  parameters: [
    {
      name: "action",
      in: "query",
      description: "The action to perform",
      required: false,
      schema: {
        type: "string",
      },
    },
    {
      index: 0,
      name: "type",
      in: "path",
      required: true,
      schema: {
        type: "string",
        enum: ["FIAT", "SPOT", "ECO", "FUTURES"],
      },
    },
    {
      index: 1,
      name: "code",
      in: "path",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    200: {
      description: "Currency retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...baseResponseSchema,
              data: {
                type: "object",
                properties: baseCurrencySchema,
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Currency"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, params, query } = data;
  if (!user?.id) throw createError(401, "Unauthorized");
  const { action } = query;

  const { type, code } = params;
  if (!type || !code) throw createError(400, "Invalid type or code");

  switch (action) {
    case "deposit":
      return handleDeposit(type, code);
    case "withdraw":
      return handleWithdraw(type, code);
    default:
      throw createError(400, "Invalid action");
  }
};

async function handleDeposit(type: string, code: string) {
  switch (type) {
    case "FIAT": {
      const gateways = await models.depositGateway.findAll({
        where: {
          status: true,
          [Op.and]: Sequelize.literal(`JSON_CONTAINS(currencies, '"${code}"')`),
        },
      });

      const methods = await models.depositMethod.findAll({
        where: { status: true },
      });
      return { gateways, methods };
    }
    case "SPOT":
      {
        const exchange = await ExchangeManager.startExchange();
        const provider = await ExchangeManager.getProvider();
        if (!exchange) throw createError(500, "Exchange not found");

        const currencies: Record<string, any> =
          await exchange.fetchCurrencies();

        let currency: any | undefined = undefined;
        switch (provider) {
          case "xt":
            currency = Object.values(currencies).find((c) => c.code === code);
            break;
          default:
            currency = Object.values(currencies).find((c) => c.id === code);
            break;
        }

        if (!currency) throw createError(404, "Currency not found");
        if (!currency.active)
          throw createError(400, "Withdrawal not enabled for this currency");

        switch (provider) {
          case "binance":
          case "kucoin":
            if (
              !currency.networks ||
              typeof currency.networks !== "object" ||
              !Object.keys(currency.networks).length
            ) {
              throw createError(400, "Networks data is missing or invalid");
            }

            return Object.values(currency.networks)
              .filter((network: any) => network.active && network.deposit)
              .map((network: any) => ({
                id: network.id,
                chain: network.network || network.name,
                fee: network.fee,
                precision: network.precision,
                limits: network.limits,
              }))
              .sort((a, b) => a.chain.localeCompare(b.chain));
          case "kraken": {
            const depositMethods = await exchange.fetchDepositMethods(code);
            return depositMethods;
          }
          case "xt":
            if (
              !currency.networks ||
              typeof currency.networks !== "object" ||
              !Object.keys(currency.networks).length
            ) {
              throw createError(400, "Networks data is missing or invalid");
            }

            return Object.values(currency.networks)
              .filter((network: any) => network.active && network.deposit)
              .map((network: any) => ({
                id: network.id,
                chain: network.network || network.name,
                fee: network.fee,
                precision: network.precision,
                limits: network.limits,
              }))
              .sort((a, b) => a.chain.localeCompare(b.chain));
          default:
            break;
        }
      }
      break;
    case "ECO":
      {
        const tokens = await models.ecosystemToken.findAll({
          where: { status: true, currency: code },
          attributes: [
            "name",
            "chain",
            "icon",
            "limits",
            "fee",
            "type",
            "contractType",
          ],
          order: [["chain", "ASC"]],
        });
        
        return tokens.map((token) => {
          const tokenData = token.get({ plain: true }) as any;

          // Parse fee and limits if they are strings
          let fee = { min: 0, percentage: 0 };
          let limits = { deposit: { min: 1, max: 1000000 } };

          try {
            if (tokenData.fee) {
              fee = typeof tokenData.fee === "string" ? JSON.parse(tokenData.fee) : tokenData.fee;
              fee = fee || { min: 0, percentage: 0 };
            }
          } catch (err) {
            console.warn(`[WARN] Failed to parse fee for token ${tokenData.name} (${tokenData.chain}):`, err.message);
            console.warn(`[WARN] Raw fee value: ${JSON.stringify(tokenData.fee)}`);
          }

          try {
            if (tokenData.limits) {
              limits = typeof tokenData.limits === "string" ? JSON.parse(tokenData.limits) : tokenData.limits;
              limits = limits || { deposit: { min: 1, max: 1000000 } };
            }
          } catch (err) {
            console.warn(`[WARN] Failed to parse limits for token ${tokenData.name} (${tokenData.chain}):`, err.message);
            console.warn(`[WARN] Raw limits value: ${JSON.stringify(tokenData.limits)}`);
          }

          return {
            id: `${tokenData.chain}_${tokenData.type}`,
            chain: tokenData.chain,
            network: tokenData.chain,
            name: tokenData.name,
            icon: tokenData.icon,
            type: tokenData.type,
            contractType: tokenData.contractType,
            fee: fee,
            limits: limits,
            precision: 8 // Default precision
          };
        });
      }
    default:
      throw createError(400, "Invalid wallet type");
  }
}

async function handleWithdraw(type: string, code: string) {
  switch (type) {
    case "FIAT": {
      const methods = await models.withdrawMethod.findAll({
        where: { status: true },
      });

      return { methods };
    }
    case "SPOT": {
      const exchange = await ExchangeManager.startExchange();
      const provider = await ExchangeManager.getProvider();
      if (!exchange) throw createError(500, "Exchange not found");

      const currencyData = await models.exchangeCurrency.findOne({
        where: { currency: code, status: true },
      });
      if (!currencyData) {
        throw new Error("Currency not found");
      }
      const percentageFee = currencyData.fee || 0;

      const currencies: Record<string, any> = await exchange.fetchCurrencies();

      let currency: any | undefined = undefined;
      switch (provider) {
        case "xt":
          currency = Object.values(currencies).find((c) => c.code === code);
          break;
        default:
          currency = Object.values(currencies).find((c) => c.id === code);
          break;
      }

      if (!currency) throw createError(404, "Currency not found");
      if (!currency.active)
        throw createError(400, "Withdrawal not enabled for this currency");

      if (
        !currency.networks ||
        typeof currency.networks !== "object" ||
        !Object.keys(currency.networks).length
      ) {
        throw createError(400, "Networks data is missing or invalid");
      }

      return Object.values(currency.networks)
        .filter((network: any) => network.active && network.withdraw)
        .map((network: any) => ({
          id: network.id,
          chain: network.network || network.name,
          fixedFee: network.fee || network.fees?.withdraw || 0,
          percentageFee: percentageFee,
          precision: network.precision,
          limits: network.limits,
        }))
        .sort((a, b) => a.chain.localeCompare(b.chain));
    }

    case "ECO": {
      const tokens = await models.ecosystemToken.findAll({
        where: { status: true, currency: code },
        attributes: ["name", "chain", "icon", "limits", "fee", "type", "contractType"],
        order: [["chain", "ASC"]],
      });
      
      return tokens.map((token) => {
        const tokenData = token.get({ plain: true }) as any;
        
        // Parse fee and limits if they are strings
        let fee = { min: 0, percentage: 0 };
        let limits = { withdraw: { min: 1, max: 1000000 } };
        
        try {
          if (tokenData.fee) {
            fee = typeof tokenData.fee === "string" ? JSON.parse(tokenData.fee) : tokenData.fee;
            fee = fee || { min: 0, percentage: 0 };
          }
        } catch (err) {
          console.warn(`Failed to parse fee for token ${tokenData.name}:`, err);
        }
        
        try {
          if (tokenData.limits) {
            limits = typeof tokenData.limits === "string" ? JSON.parse(tokenData.limits) : tokenData.limits;
            limits = limits || { withdraw: { min: 1, max: 1000000 } };
          }
        } catch (err) {
          console.warn(`Failed to parse limits for token ${tokenData.name}:`, err);
        }
        
        // Convert to withdrawal method format expected by frontend
        return {
          id: `${tokenData.chain}_${tokenData.type}`, // Unique identifier
          title: `${tokenData.name} (${tokenData.chain})`,
          network: tokenData.chain,
          chain: tokenData.chain,
          type: tokenData.type,
          contractType: tokenData.contractType,
          image: tokenData.icon,
          fixedFee: typeof fee.min === 'number' ? fee.min : parseFloat(fee.min) || 0,
          percentageFee: typeof fee.percentage === 'number' ? fee.percentage : parseFloat(fee.percentage) || 0,
          minAmount: typeof limits.withdraw?.min === 'number' ? limits.withdraw.min : parseFloat(limits.withdraw?.min) || 1,
          maxAmount: typeof limits.withdraw?.max === 'number' ? limits.withdraw.max : parseFloat(limits.withdraw?.max) || 1000000,
          processingTime: "1-3", // Default processing time
          instructions: `Withdraw ${tokenData.name} to your ${tokenData.chain} wallet address.`,
          customFields: JSON.stringify([
            {
              name: "address",
              title: `${tokenData.chain} Address`,
              type: "text",
              required: true,
              placeholder: `Enter your ${tokenData.chain} wallet address`,
              validation: {
                pattern: "^[a-zA-Z0-9]{25,}$",
                message: "Invalid wallet address format"
              }
            }
          ])
        };
      });
    }
    default:
      throw createError(400, "Invalid wallet type");
  }
}
