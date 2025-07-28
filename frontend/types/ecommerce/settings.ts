export interface Settings {
  // Tax settings
  ecommerceTaxEnabled: boolean;
  ecommerceDefaultTaxRate: number;

  // Shipping settings
  ecommerceShippingEnabled: boolean;
  ecommerceDefaultShippingCost: number;
  ecommerceFreeShippingThreshold: number;
  ecommerceAllowInternationalShipping: boolean;

  // Display settings
  ecommerceProductsPerPage: number;
  ecommerceShowOutOfStockProducts: boolean;
  ecommerceShowProductRatings: boolean;
  ecommerceShowRelatedProducts: boolean;
  ecommerceShowFeaturedProducts: boolean;
}
