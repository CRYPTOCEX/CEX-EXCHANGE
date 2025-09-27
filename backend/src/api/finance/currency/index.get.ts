// /server/api/currencies/index.get.ts

import { createError } from "@b/utils/error";
import { baseCurrencySchema, baseResponseSchema } from "./utils";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { models } from "@b/db";
import { Op } from "sequelize";
import { CacheManager } from "@b/utils/cache";

export const metadata: OperationObject = {
  summary: "Lists all currencies with their current rates",
  description:
    "This endpoint retrieves all available currencies along with their current rates.",
  operationId: "getCurrencies",
  tags: ["Finance", "Currency"],
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
      name: "walletType",
      in: "query",
      description: "The type of wallet to retrieve currencies for",
      required: true,
      schema: {
        type: "string",
        enum: ["FIAT", "SPOT", "ECO", "FUTURES"],
      },
    },
    {
      name: "targetWalletType",
      in: "query",
      description: "The type of wallet to transfer to (optional for transfer action)",
      required: false,
      schema: {
        type: "string",
        enum: ["FIAT", "SPOT", "ECO", "FUTURES"],
      },
    },
  ],
  requiresAuth: true,
  responses: {
    200: {
      description: "Currencies retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...baseResponseSchema,
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: baseCurrencySchema,
                },
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

const walletTypeToModel = {
  FIAT: async (where) => models.currency.findAll({ where }),
  SPOT: async (where) => models.exchangeCurrency.findAll({ where }),
  ECO: async (where) => models.ecosystemToken.findAll({ where }),
  FUTURES: async (where) => models.ecosystemToken.findAll({ where }),
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  const { action, walletType, targetWalletType } = query;
  
  // Check if spot wallets are disabled
  const cacheManager = CacheManager.getInstance();
  const spotWalletsEnabled = await cacheManager.getSetting("spotWallets");
  const isSpotEnabled = spotWalletsEnabled === true || spotWalletsEnabled === "true";
  
  // If SPOT is involved and disabled, return empty array or error
  if (!isSpotEnabled && (walletType === "SPOT" || targetWalletType === "SPOT")) {
    return [];
  }
  
  const where = { status: true };

  switch (action) {
    case "deposit":
      return handleDeposit(walletType, where);
    case "withdraw":
    case "payment":
      return handleWithdraw(walletType, user.id, isSpotEnabled);
    case "transfer":
      return handleTransfer(walletType, targetWalletType, user.id, isSpotEnabled);
    default:
      throw createError(400, "Invalid action");
  }
};

async function handleDeposit(walletType, where) {
  const getModel = walletTypeToModel[walletType];
  if (!getModel) throw createError(400, "Invalid wallet type");

  let currencies = await getModel(where);

  switch (walletType) {
    case "FIAT":
      return currencies
        .map((currency) => ({
          value: currency.id,
          label: `${currency.id} - ${currency.name}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    case "SPOT":
      return currencies
        .map((currency) => ({
          value: currency.currency,
          label: `${currency.currency} - ${currency.name}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    case "ECO":
    case "FUTURES": {
      const seen = new Set();
      currencies = currencies.filter((currency) => {
        const duplicate = seen.has(currency.currency);
        seen.add(currency.currency);
        return !duplicate;
      });
      return currencies
        .map((currency) => ({
          value: currency.currency,
          label: `${currency.currency} - ${currency.name}`,
          icon: currency.icon,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    default:
      throw createError(400, "Invalid wallet type");
  }
}

async function handleWithdraw(walletType, userId, isSpotEnabled = true) {
  const wallets = await models.wallet.findAll({
    where: { userId, type: walletType, balance: { [Op.gt]: 0 } },
  });

  if (!wallets.length)
    throw createError(404, `No ${walletType} wallets found to withdraw from`);

  // Filter wallets based on currency status
  const validWallets: walletAttributes[] = [];
  
  for (const wallet of wallets) {
    let isValidCurrency = false;
    
    try {
      switch (walletType) {
        case "FIAT": {
          const currency = await models.currency.findOne({
            where: { id: wallet.currency, status: true }
          });
          isValidCurrency = !!currency;
          break;
        }
        case "SPOT": {
          const currency = await models.exchangeCurrency.findOne({
            where: { currency: wallet.currency, status: true }
          });
          isValidCurrency = !!currency;
          break;
        }
        case "ECO":
        case "FUTURES": {
          const currency = await models.ecosystemToken.findOne({
            where: { currency: wallet.currency, status: true }
          });
          isValidCurrency = !!currency;
          break;
        }
        default:
          isValidCurrency = false;
      }
      
      if (isValidCurrency) {
        validWallets.push(wallet);
      }
    } catch (err) {
      console.warn(`Error checking currency status for ${wallet.currency}:`, err);
      // Skip this wallet if we can't verify currency status
    }
  }

  if (!validWallets.length) {
    throw createError(404, `No active ${walletType} currencies available for withdrawal`);
  }

  const currencies = validWallets
    .map((wallet) => ({
      value: wallet.currency,
      label: `${wallet.currency} - ${wallet.balance}`,
      balance: wallet.balance, // Include balance for better frontend validation
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return currencies;
}

async function handleTransfer(walletType, targetWalletType, userId, isSpotEnabled = true) {
  // Validate source wallet type
  const validWalletTypes = ["FIAT", "SPOT", "ECO", "FUTURES"];
  if (!validWalletTypes.includes(walletType)) {
    throw createError(400, `Invalid source wallet type: ${walletType}`);
  }

  const fromWallets = await models.wallet.findAll({
    where: { userId, type: walletType, balance: { [Op.gt]: 0 } },
  });

  if (!fromWallets.length)
    throw createError(404, `No ${walletType} wallets found to transfer from`);

  const currencies = fromWallets
    .map((wallet) => ({
      value: wallet.currency,
      label: `${wallet.currency} - ${wallet.balance}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // If no target wallet type specified, just return source currencies
  if (!targetWalletType) {
    return { from: currencies, to: [] };
  }

  // Validate target wallet type
  if (!validWalletTypes.includes(targetWalletType)) {
    throw createError(400, `Invalid target wallet type: ${targetWalletType}`);
  }

  let targetCurrencies: any[] = [];
  switch (targetWalletType) {
    case "FIAT": {
      const fiatCurrencies = await models.currency.findAll({
        where: { status: true },
      });
      targetCurrencies = fiatCurrencies
        .map((currency) => ({
          value: currency.id,
          label: `${currency.id} - ${currency.name}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      break;
    }
    case "SPOT":
      {
        const spotCurrencies = await models.exchangeCurrency.findAll({
          where: { status: true },
        });

        targetCurrencies = spotCurrencies
          .map((currency) => ({
            value: currency.currency,
            label: `${currency.currency} - ${currency.name}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
      }
      break;
    case "ECO":
    case "FUTURES":
      {
        const ecoCurrencies = await models.ecosystemToken.findAll({
          where: { status: true },
        });

        targetCurrencies = ecoCurrencies
          .map((currency) => ({
            value: currency.currency,
            label: `${currency.currency} - ${currency.name}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
      }
      break;
    default:
      throw createError(400, "Invalid wallet type");
  }

  return { from: currencies, to: targetCurrencies };
}
