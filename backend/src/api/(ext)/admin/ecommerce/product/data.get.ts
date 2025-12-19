// /api/admin/ecommerceProducts/structure.get.ts

import { structureSchema } from "@b/utils/constants";
import { models } from "@b/db";
import { imageStructure, imageStructureLg } from "@b/utils/schema/structure";
import { getCurrencyConditions } from "@b/utils/currency";
import { CacheManager } from "@b/utils/cache";

export const metadata = {
  summary: "Get form structure data for ecommerce products",
  operationId: "getEcommerceProductStructureData",
  tags: ["Admin", "Ecommerce", "Product"],
  description: "Retrieves form structure data including available categories, wallet types, and currency conditions for creating or editing ecommerce products",
  responses: {
    200: {
      description: "Form structure data retrieved successfully",
      content: structureSchema,
    },
  },
  requiresAuth: true,
  permission: "view.ecommerce.product",
};

export default async (data: Handler): Promise<object> => {
  const { ctx } = data;

  ctx?.step("Fetching product form structure data");
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

  ctx?.success("Retrieved product data successfully");

  return {
    categories,
    walletTypes,
    currencyConditions,
  };
};
