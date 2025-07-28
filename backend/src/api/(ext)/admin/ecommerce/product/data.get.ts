// /api/admin/ecommerceProducts/structure.get.ts

import { structureSchema } from "@b/utils/constants";
import { models } from "@b/db";
import { imageStructure, imageStructureLg } from "@b/utils/schema/structure";
import { getCurrencyConditions } from "@b/utils/currency";
import { CacheManager } from "@b/utils/cache";

export const metadata = {
  summary: "Get form structure for E-commerce Products",
  operationId: "getEcommerceProductStructure",
  tags: ["Admin", "Ecommerce Products"],
  responses: {
    200: {
      description: "Form structure for managing E-commerce Products",
      content: structureSchema,
    },
  },
  permission: "view.ecommerce.product",
};

export default async (): Promise<object> => {
  const categoriesRes = await models.ecommerceCategory.findAll();

  const categories = categoriesRes.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const walletTypes = [
    { value: "FIAT", label: "Fiat" },
    { value: "SPOT", label: "Spot" },
  ];

  const currencyConditions = await getCurrencyConditions();
  const cacheManager = CacheManager.getInstance();
  const extensions = await cacheManager.getExtensions();
  if (extensions.has("ecosystem")) {
    walletTypes.push({ value: "ECO", label: "Funding" });
  }

  return {
    categories,
    walletTypes,
    currencyConditions,
  };
};
