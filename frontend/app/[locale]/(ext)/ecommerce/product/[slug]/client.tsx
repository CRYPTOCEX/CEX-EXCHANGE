"use client";

import type React from "react";

import { useState, useEffect, useRef, useCallback } from "react";
import { useEcommerceStore } from "@/store/ecommerce/ecommerce";
import { useUserStore } from "@/store/user";
import {
  Loader2,
  Heart,
  ArrowLeft,
  ChevronRight,
  Tag,
  ZoomIn,
  ShoppingBag,
  Star,
  Info,
  Shield,
  Truck,
  RefreshCw,
  ImageIcon,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { toast } from "sonner";
import ImageLightbox from "../../components/image-lightbox";
import ProductReviews from "../../components/product-reviews";
import { $fetch } from "@/lib/api";
import "./styles.css";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useTranslations } from "next-intl";

interface Tab {
  name: string;
  value: string;
  icon: React.ReactNode;
}

export default function ProductDetailClient() {
  const t = useTranslations("ext");
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();
  const { slug } = useParams() as { slug: string };
  const {
    selectedProduct,
    isLoadingProduct,
    error,
    fetchProductBySlug,
    addToCart,
    addToWishlist,
    isInWishlist,
    removeFromWishlist,
  } = useEcommerceStore();
  const { user } = useUserStore();
  const [quantity, setQuantity] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [usdPrice, setUsdPrice] = useState<number | null>(null);
  const [loadingUsdPrice, setLoadingUsdPrice] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("description");
  const [isSticky, setIsSticky] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Get product image or use a placeholder
  const productImage =
    selectedProduct?.image || "/placeholder.svg?height=400&width=400";

  // Function to check if user has purchased this product
  const checkUserPurchase = useCallback(
    async (productId: string) => {
      if (!user || !productId) {
        setHasPurchased(false);
        return;
      }

      setCheckingPurchase(true);
      try {
        const { data, error } = await $fetch({
          url: `/api/ecommerce/order/product/${productId}`,
          method: "GET",
          silent: true,
        });

        if (!error) {
          setHasPurchased(data && data.length > 0);
        }
      } catch (error) {
        // Only log unexpected errors, not normal "no purchase" cases
        if (error instanceof Error && !error.message?.includes("404")) {
          console.error("Error checking user purchase:", error);
        }
        setHasPurchased(false);
      } finally {
        setCheckingPurchase(false);
      }
    },
    [user]
  );

  // Function to fetch USD price
  const fetchUsdPrice = useCallback(
    async (walletType: string, currency: string) => {
      if (!walletType || !currency) return;

      setLoadingUsdPrice(true);
      try {
        const { data, error } = await $fetch({
          url: `/api/finance/currency/price?type=${walletType}&currency=${currency}`,
          method: "GET",
          silent: true,
        });

        if (!error) {
          setUsdPrice(data.data);
        }
      } catch (error) {
        console.error(`Error fetching price:`, error);
        setUsdPrice(null);
      } finally {
        setLoadingUsdPrice(false);
      }
    },
    []
  );

  // Initialize product data
  useEffect(() => {
    if (!slug || isInitialized) return;

    const initializeData = async () => {
      try {
        console.log(`Client: Initializing product detail for slug: ${slug}`);
        await fetchProductBySlug(slug);
        setIsInitialized(true);
      } catch (err) {
        console.error("Client: Error initializing product detail:", err);
        setIsInitialized(true);
      }
    };

    initializeData();
  }, [slug, isInitialized]);

  // Check user purchase when product is loaded
  useEffect(() => {
    if (selectedProduct?.id) {
      checkUserPurchase(selectedProduct.id);
    }
  }, [selectedProduct?.id, checkUserPurchase]);

  // Fetch USD price when product is loaded
  useEffect(() => {
    if (selectedProduct?.walletType && selectedProduct?.currency) {
      fetchUsdPrice(selectedProduct.walletType, selectedProduct.currency);
    }
  }, [selectedProduct?.walletType, selectedProduct?.currency, fetchUsdPrice]);

  // Handle scroll for sticky product info
  useEffect(() => {
    const handleScroll = () => {
      if (detailsRef.current) {
        const rect = detailsRef.current.getBoundingClientRect();
        setIsSticky(rect.top <= 0);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAddToCart = useCallback(() => {
    if (selectedProduct) {
      setIsAddingToCart(true);

      setTimeout(() => {
        addToCart(selectedProduct, quantity);
        toast.success(`${selectedProduct.name} added to cart`);
        setIsAddingToCart(false);
      }, 600);
    }
  }, [selectedProduct, quantity, addToCart]);

  // Reset image loading when product changes
  useEffect(() => {
    if (selectedProduct) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [selectedProduct]);

  const handleWishlistToggle = useCallback(() => {
    if (!selectedProduct) return;

    if (isInWishlist(selectedProduct.id)) {
      removeFromWishlist(selectedProduct.id);
      toast.success(`${selectedProduct.name} removed from wishlist`);
    } else {
      addToWishlist(selectedProduct);
      toast.success(`${selectedProduct.name} added to wishlist`);
    }
  }, [selectedProduct, isInWishlist, removeFromWishlist, addToWishlist]);

  const handleReviewSubmitted = useCallback(() => {
    // Refresh product data to get updated reviews
    if (slug) {
      fetchProductBySlug(slug);
    }
    // Also recheck purchase status
    if (selectedProduct?.id) {
      checkUserPurchase(selectedProduct.id);
    }
  }, [slug, selectedProduct?.id, fetchProductBySlug, checkUserPurchase]);

  if (!isInitialized || isLoadingProduct) {
    return (
      <div className="dark:bg-zinc-900 dark:text-zinc-100 pb-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb skeleton */}
          <nav className="flex py-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <div className="h-4 w-12 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse"></div>
              </li>
              <li className="flex items-center">
                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-zinc-600" />
                <div className="ml-2 h-4 w-16 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse"></div>
              </li>
              <li className="flex items-center">
                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-zinc-600" />
                <div className="ml-2 h-4 w-24 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse"></div>
              </li>
            </ol>
          </nav>

          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
            {/* Product image skeleton */}
            <div className="flex flex-col space-y-4">
              <div className="overflow-hidden rounded-xl relative bg-gradient-to-br from-indigo-50 to-white dark:from-zinc-800 dark:to-zinc-900 p-4">
                <div className="relative h-[400px] w-full rounded-lg overflow-hidden bg-gray-200 dark:bg-zinc-700 animate-pulse flex items-center justify-center">
                  <div className="text-gray-400 dark:text-zinc-500">
                    <svg
                      className="w-16 h-16"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Product badges skeleton */}
              <div className="flex space-x-2">
                <div className="h-6 w-20 bg-gray-200 dark:bg-zinc-700 rounded-full animate-pulse"></div>
                <div className="h-6 w-16 bg-gray-200 dark:bg-zinc-700 rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Product details skeleton */}
            <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
              <div className="space-y-6">
                {/* Title skeleton */}
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-3/4 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 dark:bg-zinc-700 rounded w-1/2 animate-pulse"></div>
                </div>

                {/* Price skeleton */}
                <div className="flex items-end space-x-2">
                  <div className="h-12 bg-gray-200 dark:bg-zinc-700 rounded w-32 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-20 animate-pulse mb-2"></div>
                </div>

                {/* Description skeleton */}
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-gray-100 dark:border-zinc-700/50">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-5/6 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-4/6 animate-pulse"></div>
                  </div>
                </div>

                {/* Features skeleton */}
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-100 dark:border-zinc-700"
                    >
                      <div className="w-5 h-5 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse mb-2"></div>
                      <div className="h-4 w-16 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>

                {/* Quantity and buttons skeleton */}
                <div className="space-y-6">
                  <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-gray-100 dark:border-zinc-700">
                    <div className="h-5 w-16 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse mb-3"></div>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-700 rounded-l-md animate-pulse"></div>
                      <div className="w-14 h-10 bg-gray-100 dark:bg-zinc-700 animate-pulse"></div>
                      <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-700 rounded-r-md animate-pulse"></div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <div className="flex-1 h-12 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse"></div>
                    <div className="flex-1 h-12 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs skeleton */}
          <div className="mt-16">
            <div className="border-b border-gray-200 dark:border-zinc-700">
              <div className="flex space-x-8">
                <div className="h-6 w-24 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse"></div>
                <div className="h-6 w-20 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="py-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-5/6 animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-4/6 animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-3/6 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !selectedProduct) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 dark:bg-zinc-900 dark:text-zinc-100">
        <div className="text-center py-16 bg-gray-50 rounded-lg shadow-sm mb-24 dark:bg-zinc-800">
          <Tag className="mx-auto h-16 w-16 text-gray-400 dark:text-zinc-500" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-zinc-100">
            {t("product_not_found")}
          </h2>
          <p className="mt-2 text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
            {t("the_product_youre_been_removed")}.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/ecommerce/product"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              {t("browse_all_products")}
            </Link>
            <Link
              href="/ecommerce"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("back_to_home")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasAccess = hasKyc() && canAccessFeature("order_ecommerce");

  if (kycEnabled && !hasAccess) {
    return <KycRequiredNotice feature="order_ecommerce" />;
  }

  // Check if product is in wishlist
  const productInWishlist = isInWishlist(selectedProduct.id);

  // Get reviews from product
  const productReviews = selectedProduct.ecommerceReviews || [];

  // Breadcrumbs
  const breadcrumbs = (
    <nav className="flex py-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link
            href="/ecommerce"
            className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            {t("Home")}
          </Link>
        </li>
        <li className="flex items-center">
          <ChevronRight className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
          <Link
            href="/ecommerce/product"
            className="ml-2 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            {t("Products")}
          </Link>
        </li>
        <li className="flex items-center">
          <ChevronRight className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
          <span className="ml-2 text-gray-900 font-medium dark:text-zinc-100">
            {selectedProduct.name}
          </span>
        </li>
      </ol>
    </nav>
  );

  const tabs: Tab[] = [
    {
      name: "Description",
      value: "description",
      icon: <Info className="h-4 w-4" />,
    },
    {
      name: `Reviews (${productReviews.length})`,
      value: "reviews",
      icon: <Star className="h-4 w-4" />,
    },
  ];

  // Product features
  const features = [
    { icon: <Shield className="h-5 w-5" />, text: "Secure Transaction" },
    { icon: <Truck className="h-5 w-5" />, text: "Fast Delivery" },
    { icon: <RefreshCw className="h-5 w-5" />, text: "30-Day Returns" },
  ];

  return (
    <div className="dark:bg-zinc-900 dark:text-zinc-100 pb-16">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {breadcrumbs}

        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
          {/* Product image gallery */}
          <div className="flex flex-col space-y-4">
            <div className="overflow-hidden rounded-xl relative group bg-gradient-to-br from-indigo-50 to-white dark:from-zinc-800 dark:to-zinc-900 p-4">
              {/* Loading state */}
              {imageLoading && (
                <div className="absolute inset-4 bg-gray-200 dark:bg-zinc-700 rounded-lg animate-pulse flex items-center justify-center z-10">
                  <div className="text-gray-400 dark:text-zinc-500">
                    <svg
                      className="w-12 h-12"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              )}

              {/* Error state */}
              {imageError && !imageLoading && (
                <div
                  className="relative h-[400px] w-full cursor-pointer rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 flex items-center justify-center"
                  onClick={() => setLightboxOpen(true)}
                >
                  <div className="text-center p-4">
                    <ImageIcon className="h-16 w-16 mx-auto text-gray-400 dark:text-zinc-500 mb-2" />
                    <p className="text-gray-500 dark:text-zinc-400">
                      {t("image_could_not_be_loaded")}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-zinc-500 mt-1">
                      {t("click_to_view_in_lightbox")}
                    </p>
                  </div>
                </div>
              )}

              {/* Image */}
              <div
                className={`relative h-[400px] w-full cursor-pointer rounded-lg overflow-hidden bg-transparent ${
                  imageLoading || imageError ? "hidden" : "block"
                }`}
                onClick={() => setLightboxOpen(true)}
              >
                <img
                  src={productImage || "/placeholder.svg"}
                  alt={selectedProduct.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-white/90 dark:bg-zinc-800/90 p-2 rounded-full shadow-lg backdrop-blur-sm">
                    <ZoomIn className="h-6 w-6 text-gray-700 dark:text-zinc-200" />
                  </div>
                </div>
              </div>
            </div>

            {/* Product badges */}
            <div className="flex space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                {selectedProduct.type}
              </span>
              {selectedProduct.walletType && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {selectedProduct.walletType}
                </span>
              )}
              {checkingPurchase && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {t("Checking")}.
                </span>
              )}
              {hasPurchased && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {t("✓_purchased")}
                </span>
              )}
            </div>
          </div>

          {/* Product details */}
          <div ref={detailsRef} className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
            <div
              className={`${isSticky ? "lg:sticky lg:top-4" : ""} transition-all duration-300`}
            >
              <h1 className="text-3xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
                {selectedProduct.name}
              </h1>

              <div className="mt-3 flex items-end">
                <h2 className="sr-only">Product information</h2>
                <p className="text-4xl font-bold text-gray-900 dark:text-zinc-100">
                  {selectedProduct.currency} {selectedProduct.price.toFixed(2)}
                </p>
                {loadingUsdPrice ? (
                  <div className="ml-2 mb-1">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse"></div>
                  </div>
                ) : usdPrice ? (
                  <p className="text-sm text-gray-500 ml-2 mb-1 dark:text-zinc-400">
                    ≈ $
                    {(selectedProduct.price * usdPrice).toLocaleString(
                      "en-US",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8,
                      }
                    )}{" "}
                    USD
                  </p>
                ) : null}
              </div>

              {/* Short description with styled box */}
              <div className="mt-6 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-gray-100 dark:border-zinc-700/50">
                <p className="text-base text-gray-700 dark:text-zinc-300 leading-relaxed">
                  {selectedProduct.shortDescription ||
                    selectedProduct.description}
                </p>
              </div>

              {/* Product features */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-100 dark:border-zinc-700"
                  >
                    <div className="text-indigo-600 dark:text-indigo-400 mb-2">
                      {feature.icon}
                    </div>
                    <span className="text-sm text-center font-medium text-gray-700 dark:text-zinc-300">
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-gray-100 dark:border-zinc-700">
                  <h3 className="text-base font-medium text-gray-900 dark:text-zinc-100 mb-3">
                    {t("Quantity")}
                  </h3>
                  <div className="flex items-center">
                    <button
                      type="button"
                      className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-zinc-700 rounded-l-md text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-600"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <span className="sr-only">Decrease quantity</span>
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M20 12H4"
                        />
                      </svg>
                    </button>
                    <div className="w-14 h-10 flex items-center justify-center border-t border-b border-gray-200 dark:border-zinc-600 text-gray-700 dark:text-zinc-300 font-medium">
                      {quantity}
                    </div>
                    <button
                      type="button"
                      className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-zinc-700 rounded-r-md text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-600"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <span className="sr-only">Increase quantity</span>
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex space-x-4">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={
                      isAddingToCart || selectedProduct.inventoryQuantity === 0
                    }
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isAddingToCart ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {t("Adding")}.
                      </>
                    ) : selectedProduct.inventoryQuantity === 0 ? (
                      "Out of Stock"
                    ) : (
                      <>
                        <ShoppingBag className="mr-2 h-5 w-5" />
                        {t("add_to_cart")}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleWishlistToggle}
                    className={`flex-1 border rounded-md py-3 px-8 flex items-center justify-center text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 ${
                      productInWishlist
                        ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 focus:ring-red-500 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/50"
                        : "bg-gray-100 text-gray-900 border-transparent hover:bg-gray-200 focus:ring-gray-500 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <Heart
                      className={`mr-2 h-5 w-5 transition-all ${productInWishlist ? "fill-red-500 text-red-500" : ""}`}
                    />
                    {productInWishlist
                      ? "Remove from wishlist"
                      : "Add to wishlist"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description and Reviews in a new row */}
        <div className="mt-16">
          {/* Tab navigation */}
          <div className="border-b border-gray-200 dark:border-zinc-700">
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`py-4 px-1 flex items-center text-base font-medium border-b-2 ${
                    activeTab === tab.value
                      ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-zinc-400 dark:hover:text-zinc-300 dark:hover:border-zinc-600"
                  }`}
                >
                  {tab.icon}
                  <span className="ml-2">{tab.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="py-6">
            <AnimatePresence mode="wait">
              {activeTab === "description" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div
                    className="prose max-w-none dark:prose-invert prose-indigo text-gray-700 dark:text-zinc-300"
                    dangerouslySetInnerHTML={{
                      __html:
                        selectedProduct.description ||
                        selectedProduct.shortDescription ||
                        "",
                    }}
                  />
                </motion.div>
              )}

              {activeTab === "reviews" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProductReviews
                    productId={selectedProduct.id}
                    hasPurchased={hasPurchased}
                    reviews={productReviews}
                    onReviewSubmitted={handleReviewSubmitted}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Lightbox */}
        <ImageLightbox
          src={
            productImage ||
            "/placeholder.svg?height=800&width=800&query=product"
          }
          alt={selectedProduct.name}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      </div>
    </div>
  );
}
