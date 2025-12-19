import { models } from "@b/db";
import { CacheManager } from "@b/utils/cache";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "List available gateway currencies",
  description: "Retrieves available wallet types (FIAT, SPOT, ECO) and their supported currencies for gateway payment configuration. Returns currencies filtered by enabled wallet types in system settings.",
  operationId: "listGatewayCurrencies",
  tags: ["Admin", "Gateway", "Currencies"],
  responses: {
    200: {
      description: "Available wallet types and currencies",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              walletTypes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    value: { type: "string", description: "Wallet type code (FIAT, SPOT, ECO)" },
                    label: { type: "string", description: "Display label" },
                    enabled: { type: "boolean", description: "Whether this wallet type is enabled" },
                    currencies: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          value: { type: "string", description: "Currency code" },
                          label: { type: "string", description: "Currency display label" },
                          icon: { type: "string", description: "Currency icon/symbol" },
                        },
                      },
                    },
                  },
                },
              },
              systemSettings: {
                type: "object",
                properties: {
                  kycEnabled: { type: "boolean", description: "Whether KYC is enabled" },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.gateway.settings",
  logModule: "ADMIN_GATEWAY",
  logTitle: "Get gateway currencies",
};

export default async (data: Handler) => {
  const { ctx } = data;

  ctx?.step("Fetching system configuration");

  const cacheManager = CacheManager.getInstance();
  const extensions = await cacheManager.getExtensions();
  const spotWalletsEnabled = await cacheManager.getSetting("spotWallets");
  const fiatWalletsEnabled = await cacheManager.getSetting("fiatWallets");

  const isSpotEnabled = spotWalletsEnabled === true || spotWalletsEnabled === "true";
  const isFiatEnabled = fiatWalletsEnabled === true || fiatWalletsEnabled === "true";
  const isEcosystemEnabled = extensions.has("ecosystem");

  ctx?.step("Loading available currencies by wallet type");

  const walletTypes: Array<{
    value: string;
    label: string;
    enabled: boolean;
    currencies: Array<{ value: string; label: string; icon?: string }>;
  }> = [];

  // FIAT currencies
  if (isFiatEnabled) {
    const fiatCurrencies = await models.currency.findAll({
      where: { status: true },
      attributes: ["id", "name", "symbol"],
      order: [["id", "ASC"]],
    });

    walletTypes.push({
      value: "FIAT",
      label: "Fiat",
      enabled: true,
      currencies: fiatCurrencies.map((c: any) => ({
        value: c.id,
        label: `${c.id} - ${c.name}`,
        icon: c.symbol,
      })),
    });
  }

  // SPOT currencies
  if (isSpotEnabled) {
    const spotCurrencies = await models.exchangeCurrency.findAll({
      where: { status: true },
      attributes: ["currency", "name"],
      order: [["currency", "ASC"]],
    });

    walletTypes.push({
      value: "SPOT",
      label: "Spot",
      enabled: true,
      currencies: spotCurrencies.map((c: any) => ({
        value: c.currency,
        label: `${c.currency} - ${c.name}`,
      })),
    });
  }

  // ECO currencies (ecosystem tokens)
  if (isEcosystemEnabled) {
    const ecoCurrencies = await models.ecosystemToken.findAll({
      where: { status: true },
      attributes: ["currency", "name", "icon"],
      order: [["currency", "ASC"]],
    });

    // Remove duplicates
    const seen = new Set();
    const uniqueEcoCurrencies = ecoCurrencies.filter((c: any) => {
      const duplicate = seen.has(c.currency);
      seen.add(c.currency);
      return !duplicate;
    });

    walletTypes.push({
      value: "ECO",
      label: "Ecosystem",
      enabled: true,
      currencies: uniqueEcoCurrencies.map((c: any) => ({
        value: c.currency,
        label: `${c.currency} - ${c.name}`,
        icon: c.icon,
      })),
    });
  }

  // Also return system settings for context
  const kycEnabled = await cacheManager.getSetting("kycStatus");

  ctx?.success(`Retrieved ${walletTypes.length} wallet types with currencies`);

  return {
    walletTypes,
    systemSettings: {
      kycEnabled: kycEnabled === true || kycEnabled === "true",
    },
  };
};
