import { models } from "@b/db";
import { CacheManager } from "@b/utils/cache";

export const getCurrencyConditions = async () => {
  // Retrieve FIAT currencies
  const fiatCurrency = await models.currency.findAll({
    where: { status: true },
    attributes: ["id"],
  });

  // Retrieve SPOT currencies
  const spotCurrency = await models.exchangeCurrency.findAll({
    where: { status: true },
    attributes: ["currency"],
  });

  let fundingCurrency: { value: string; label: string }[] = [];

  // Check if the ecosystem extension is enabled
  const cacheManager = CacheManager.getInstance();
  const extensions = await cacheManager.getExtensions();
  if (extensions.has("ecosystem")) {
    // Retrieve ecosystem tokens for funding currencies
    const allFundingCurrencies = await models.ecosystemToken.findAll({
      where: { status: true },
      attributes: ["currency"],
    });

    // Filter and map the unique funding currencies
    const uniqueFundingCurrencies = Array.from(
      new Set(
        allFundingCurrencies
          .filter((c) => c.currency && c.currency.trim().length > 0)
          .map((c) => c.currency)
      )
    ) as string[]; // Add type assertion here

    // Map the currencies to the required structure
    fundingCurrency = uniqueFundingCurrencies.map((currency) => ({
      value: currency,
      label: currency,
    }));
  }

  // Return the structured currency conditions
  return {
    FIAT: fiatCurrency.map((c) => ({ value: c.id, label: c.id })),
    SPOT: spotCurrency.map((c) => ({ value: c.currency, label: c.currency })),
    ECO: fundingCurrency,
  };
};
