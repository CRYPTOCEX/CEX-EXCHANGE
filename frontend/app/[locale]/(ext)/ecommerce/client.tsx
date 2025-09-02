"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useEcommerceStore } from "@/store/ecommerce/ecommerce";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";

import HeroSection from "./components/landing/hero-section";
import TrendingProductsSection from "./components/landing/trending-products-section";
import FeaturesSection from "./components/landing/features-section";
import CategoriesSection from "./components/landing/categories-section";
import CTASection from "./components/landing/cta-section";
import Footer from "@/components/partials/footer";

interface ClientProps {
  children?: React.ReactNode;
}

export default function Client({ children }: ClientProps) {
  const { fetchCategories, fetchProducts, categories, products } =
    useEcommerceStore();
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();

  // State for loading status
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchCategories(), fetchProducts()]);
      setIsLoading(false);
    };

    loadData();
  }, [fetchCategories, fetchProducts]);

  // Gating: block unless user has KYC & view_ecommerce feature
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasAccess = hasKyc() && canAccessFeature("view_ecommerce");

  if (kycEnabled && !hasAccess) {
    return <KycRequiredNotice feature="view_ecommerce" />;
  }

  // Get trending products (first 4 products)
  const trendingProducts = products.slice(0, 4);

  // Get featured categories (first 3 categories)
  const featuredCategories = categories.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <HeroSection />
        <TrendingProductsSection
          products={trendingProducts}
          isLoading={isLoading}
        />
        <FeaturesSection />
        <CategoriesSection
          categories={featuredCategories}
          isLoading={isLoading}
        />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
