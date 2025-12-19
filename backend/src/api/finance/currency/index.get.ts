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
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Lists all currencies with their current rates",
  description:
    "This endpoint retrieves all available currencies along with their current rates.",
  operationId: "getCurrencies",
  tags: ["Finance", "Currency"],
  logModule: "FINANCE",
  logTitle: "Get currencies by action",
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
  const { user, query, ctx } = data;

  if (!user?.id) {
    ctx?.fail("User not authenticated");
    throw createError(401, "Unauthorized");
  }

  const { action, walletType, targetWalletType } = query;

  ctx?.step("Checking wallet configuration");
  const cacheManager = CacheManager.getInstance();
  const spotWalletsEnabled = await cacheManager.getSetting("spotWallets");
  const fiatWalletsEnabled = await cacheManager.getSetting("fiatWallets");
  const extensions = await cacheManager.getExtensions();
  const isSpotEnabled = spotWalletsEnabled === true || spotWalletsEnabled === "true";
  const isFiatEnabled = fiatWalletsEnabled === true || fiatWalletsEnabled === "true";
  const isEcosystemEnabled = extensions.has("ecosystem");

  // If SPOT is involved and disabled, return empty array
  if (!isSpotEnabled && (walletType === "SPOT" || targetWalletType === "SPOT")) {
    ctx?.warn("SPOT wallets are disabled");
    return [];
  }

  // If FIAT is involved and disabled, return empty array
  if (!isFiatEnabled && (walletType === "FIAT" || targetWalletType === "FIAT")) {
    ctx?.warn("FIAT wallets are disabled");
    return [];
  }

  // If ECO is involved and ecosystem extension is not enabled, return empty array
  if (!isEcosystemEnabled && (walletType === "ECO" || targetWalletType === "ECO")) {
    ctx?.warn("Ecosystem extension is not enabled");
    return [];
  }

  const where = { status: true };

  ctx?.step(`Processing ${action} action for ${walletType} wallet`);
  switch (action) {
    case "deposit":
      return handleDeposit(walletType, where, ctx);
    case "withdraw":
    case "payment":
      return handleWithdraw(walletType, user.id, isSpotEnabled, ctx);
    case "transfer":
      return handleTransfer(walletType, targetWalletType, user.id, isSpotEnabled, ctx);
    default:
      ctx?.fail(`Invalid action: ${action}`);
      throw createError(400, "Invalid action");
  }
};

async function handleDeposit(walletType, where, ctx?) {
  const getModel = walletTypeToModel[walletType];
  if (!getModel) {
    ctx?.fail(`Invalid wallet type: ${walletType}`);
    throw createError(400, "Invalid wallet type");
  }

  let currencies = await getModel(where);

  switch (walletType) {
    case "FIAT":
      const fiatResult = currencies
        .map((currency) => ({
          value: currency.id,
          label: `${currency.id} - ${currency.name}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      ctx?.success(`Retrieved ${fiatResult.length} FIAT currencies for deposit`);
      return fiatResult;

    case "SPOT":
      const spotResult = currencies
        .map((currency) => ({
          value: currency.currency,
          label: `${currency.currency} - ${currency.name}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      ctx?.success(`Retrieved ${spotResult.length} SPOT currencies for deposit`);
      return spotResult;

    case "ECO":
    case "FUTURES": {
      const seen = new Set();
      currencies = currencies.filter((currency) => {
        const duplicate = seen.has(currency.currency);
        seen.add(currency.currency);
        return !duplicate;
      });
      const ecoResult = currencies
        .map((currency) => ({
          value: currency.currency,
          label: `${currency.currency} - ${currency.name}`,
          icon: currency.icon,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      ctx?.success(`Retrieved ${ecoResult.length} ${walletType} currencies for deposit`);
      return ecoResult;
    }
    default:
      ctx?.fail(`Invalid wallet type: ${walletType}`);
      throw createError(400, "Invalid wallet type");
  }
}

async function handleWithdraw(walletType, userId, isSpotEnabled = true, ctx?) {
  const wallets = await models.wallet.findAll({
    where: { userId, type: walletType, balance: { [Op.gt]: 0 } },
  });

  if (!wallets.length) {
    ctx?.fail(`No ${walletType} wallets found to withdraw from`);
    throw createError(404, `No ${walletType} wallets found to withdraw from`);
  }

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
      logger.warn("WALLET", `Error checking currency status for ${wallet.currency}`, err);
      ctx?.warn(`Error checking currency status for ${wallet.currency}`);
    }
  }

  if (!validWallets.length) {
    ctx?.fail(`No active ${walletType} currencies available for withdrawal`);
    throw createError(404, `No active ${walletType} currencies available for withdrawal`);
  }

  const currencies = validWallets
    .map((wallet) => ({
      value: wallet.currency,
      label: `${wallet.currency} - ${wallet.balance}`,
      balance: wallet.balance,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  ctx?.success(`Retrieved ${currencies.length} ${walletType} currencies for withdrawal`);
  return currencies;
}

async function handleTransfer(walletType, targetWalletType, userId, isSpotEnabled = true, ctx?) {
  // Validate source wallet type
  const validWalletTypes = ["FIAT", "SPOT", "ECO", "FUTURES"];
  if (!validWalletTypes.includes(walletType)) {
    ctx?.fail(`Invalid source wallet type: ${walletType}`);
    throw createError(400, `Invalid source wallet type: ${walletType}`);
  }

  const fromWallets = await models.wallet.findAll({
    where: { userId, type: walletType, balance: { [Op.gt]: 0 } },
  });

  if (!fromWallets.length) {
    ctx?.fail(`No ${walletType} wallets found to transfer from`);
    throw createError(404, `No ${walletType} wallets found to transfer from`);
  }

  const currencies = fromWallets
    .map((wallet) => ({
      value: wallet.currency,
      label: `${wallet.currency} - ${wallet.balance}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // If no target wallet type specified, just return source currencies
  if (!targetWalletType) {
    ctx?.success(`Retrieved ${currencies.length} source currencies for transfer`);
    return { from: currencies, to: [] };
  }

  // Validate target wallet type
  if (!validWalletTypes.includes(targetWalletType)) {
    ctx?.fail(`Invalid target wallet type: ${targetWalletType}`);
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
      ctx?.fail(`Invalid wallet type: ${targetWalletType}`);
      throw createError(400, "Invalid wallet type");
  }

  ctx?.success(`Retrieved ${currencies.length} source and ${targetCurrencies.length} target currencies for transfer`);
  return { from: currencies, to: targetCurrencies };
}
