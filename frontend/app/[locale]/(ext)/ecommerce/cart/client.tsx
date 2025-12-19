"use client";

import { useState, useEffect } from "react";
import { useEcommerceStore } from "@/store/ecommerce/ecommerce";
import { useConfigStore } from "@/store/config";
import { getBooleanSetting } from "@/utils/formatters";
import {
  Trash2,
  ShoppingBag,
  ArrowRight,
  ChevronRight,
  CreditCard,
  Wallet,
  Truck,
  ShieldCheck,
  Home,
  Loader2,
  MinusCircle,
  PlusCircle,
} from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
interface DiscountData {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
  value: number;
  message: string;
}
export default function CartClient() {
  const t = useTranslations("ext_ecommerce");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { cart, removeFromCart, updateCartItemQuantity, clearCart } =
    useEcommerceStore();
  const { settings } = useConfigStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState<DiscountData | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const subtotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );
  
  // Check if cart has physical products
  const hasPhysicalProducts = cart.some((item) => item.product.type === "PHYSICAL");
  
  // Calculate shipping based on settings
  const shipping = (() => {
    if (subtotal === 0) return 0;
    if (settings && getBooleanSetting(settings.ecommerceShippingEnabled) && hasPhysicalProducts) {
      return settings.ecommerceDefaultShippingCost || 0;
    }
    return 0;
  })();
  
  // Calculate tax based on settings
  const tax = (() => {
    if (settings && getBooleanSetting(settings.ecommerceTaxEnabled)) {
      return subtotal * (settings.ecommerceDefaultTaxRate / 100);
    }
    return 0;
  })();

  // Calculate discount amount
  useEffect(() => {
    if (!discount) {
      setDiscountAmount(0);
      return;
    }
    let calculatedDiscount = 0;
    switch (discount.type) {
      case "PERCENTAGE":
        calculatedDiscount = subtotal * (discount.value / 100);
        break;
      case "FIXED":
        calculatedDiscount = Math.min(discount.value, subtotal); // Don't discount more than the subtotal
        break;
      case "FREE_SHIPPING":
        calculatedDiscount = shipping;
        break;
    }
    setDiscountAmount(calculatedDiscount);
  }, [discount, subtotal, shipping]);

  // Calculate total (now without state updates)
  const total = subtotal + shipping + tax - discountAmount;

  // Save cart to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(cart));
    }
  }, [cart]);
  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateCartItemQuantity(productId, newQuantity);
  };
  const handleRemoveItem = (productId: string) => {
    removeFromCart(productId);
    toast.success("Item removed from cart");
  };
  const handleCheckout = () => {
    setIsProcessing(true);
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      window.location.href = "/ecommerce/checkout";
    }, 1000);
  };
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    try {
      const response = await fetch("/api/ecommerce/discount/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: couponCode,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to apply coupon");
        setDiscount(null);
        return;
      }
      setDiscount(data);
      toast.success(data.message || "Coupon applied successfully!");
    } catch (error) {
      console.error("Error applying coupon:", error);
      toast.error("Failed to apply coupon. Please try again.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };
  const handleClearDiscount = () => {
    setDiscount(null);
    setCouponCode("");
    setDiscountAmount(0);
    toast.info("Discount removed");
  };
  if (cart.length === 0) {
    return (
      <div className={`bg-linear-to-b from-amber-50 to-white dark:from-zinc-900 dark:to-zinc-800 min-h-screen pb-12 pt-24`}>
        {/* Subtle decorative background glows */}
        <div className={`absolute top-20 right-0 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none`} />
        <div className={`absolute top-1/2 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none`} />

        <div className="relative container py-16">
        <div className={`text-center py-16 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-700`}>
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-linear-to-br from-amber-500/20 to-emerald-500/20 dark:from-amber-600/30 dark:to-emerald-600/30 mb-6`}>
            <ShoppingBag className={`h-10 w-10 text-amber-600 dark:text-amber-400`} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-4">
            {t("your_cart_is_empty")}
          </h2>
          <p className="text-gray-600 dark:text-zinc-400 max-w-md mx-auto text-lg mb-8">
            {t("looks_like_you_havent_added_any")} {t("start_shopping_to_add_items_to_your_cart_1")}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/ecommerce/product"
              className={`inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-linear-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 transition-all duration-200`}
            >
              {tCommon("browse_products")}
            </Link>
            <Link
              href="/ecommerce"
              className={`inline-flex items-center justify-center px-6 py-3 border border-amber-600/30 dark:border-amber-700 text-base font-medium rounded-xl text-amber-700 dark:text-amber-400 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm hover:bg-amber-500/10 dark:hover:bg-amber-600/20 transition-all duration-200`}
            >
              <Home className="mr-2 h-5 w-5" />
              {tCommon("back_to_home")}
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 max-w-3xl mx-auto">
            <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-amber-200 dark:border-amber-700`}>
              <ShoppingBag className={`h-8 w-8 text-amber-600 dark:text-amber-400 mb-4`} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
                {t("wide_selection")}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                {t("browse_our_extensive_collection_of_products")}
              </p>
            </div>
            <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-amber-200 dark:border-amber-700`}>
              <CreditCard className={`h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-4`} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
                {t("secure_payments")}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                {t("pay_with_confidence_using_our_secure")}
              </p>
            </div>
            <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-amber-200 dark:border-amber-700`}>
              <Truck className={`h-8 w-8 text-amber-600 dark:text-amber-400 mb-4`} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
                {t("fast_delivery")}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                {t("get_your_products_delivered_quickly_and")}
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`bg-linear-to-b from-amber-50 to-white dark:from-zinc-900 dark:to-zinc-800 min-h-screen pb-12 pt-24`}>
      {/* Subtle decorative background glows */}
      <div className={`absolute top-20 right-0 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none`} />
      <div className={`absolute top-1/2 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none`} />

      <div className="relative container">
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="pb-4"
      >
        <ol className="flex items-center space-x-2 text-sm text-gray-500 dark:text-zinc-400">
          <li>
            <Link
              href="/ecommerce"
              className={`hover:text-amber-600 dark:hover:text-amber-400 transition-colors`}
            >
              Home
            </Link>
          </li>
          <li>
            <ChevronRight className="h-4 w-4" />
          </li>
          <li className="font-medium text-gray-900 dark:text-zinc-100">
            {t("shopping_cart")}
          </li>
        </ol>
      </nav>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8">
          <span className={`bg-clip-text text-transparent bg-linear-to-r from-amber-600 to-emerald-600`}>
            {t("shopping_cart")}
          </span>
        </h1>
        <div className="mt-8 lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16">
          <div className="lg:col-span-7">
            <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-700 p-6`}>
              <div className="flow-root">
                <ul
                  role="list"
                  className="-my-6 divide-y divide-gray-200 dark:divide-zinc-700"
                >
                  {cart.map((item) => {
                    return (
                      <li key={item.product.id} className="py-6 flex">
                        <div className="shrink-0 relative w-24 h-24 rounded-md overflow-hidden border border-gray-200 dark:border-zinc-700">
                          <Image
                            src={item.product.image || "/placeholder.svg"}
                            alt={item.product.name}
                            fill
                            className="object-cover object-center"
                            sizes="96px"
                          />
                        </div>

                        <div className="ml-4 flex-1 flex flex-col">
                          <div>
                            <div className="flex justify-between text-base font-medium text-gray-900 dark:text-zinc-100">
                              <h3>
                                <Link
                                  href={`/ecommerce/product/${item.product.slug}`}
                                  className={`hover:text-amber-600 dark:hover:text-amber-400`}
                                >
                                  {item.product.name}
                                </Link>
                              </h3>
                              <p className="ml-4">
                                {(item.product.price * item.quantity).toFixed(
                                  2
                                )}{" "}
                                {item.product.currency}
                              </p>
                            </div>
                            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                              {item.product.shortDescription}
                            </p>
                            <div className="mt-1 flex items-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300">
                                {item.product.type}
                              </span>
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300">
                                {item.product.walletType}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 flex items-end justify-between text-sm">
                            {/* Improved quantity selector */}
                            <div className="flex items-center">
                              <button
                                type="button"
                                className={`text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-500 focus:outline-none`}
                                onClick={() =>
                                  handleQuantityChange(
                                    item.product.id,
                                    item.quantity - 1
                                  )
                                }
                                disabled={item.quantity <= 1}
                              >
                                <MinusCircle
                                  className={`h-5 w-5 ${item.quantity <= 1 ? "text-gray-300 dark:text-zinc-600" : ""}`}
                                />
                                <span className="sr-only">
                                  Decrease quantity
                                </span>
                              </button>
                              <span className="mx-3 w-8 text-center font-medium text-gray-700 dark:text-zinc-300">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                className={`text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-500 focus:outline-none`}
                                onClick={() =>
                                  handleQuantityChange(
                                    item.product.id,
                                    item.quantity + 1
                                  )
                                }
                              >
                                <PlusCircle className="h-5 w-5" />
                                <span className="sr-only">
                                  Increase quantity
                                </span>
                              </button>
                            </div>

                            <div className="flex">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveItem(item.product.id)
                                }
                                className={`font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-500 flex items-center`}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => clearCart()}
                  className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                >
                  {t("clear_cart")}
                </button>
                <Link
                  href="/ecommerce/product"
                  className={`text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-500 flex items-center transition-colors`}
                >
                  {tExt("continue_shopping")} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Trust badges */}
            <div className={`mt-8 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200 dark:border-amber-700 p-6`}>
              <h2 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
                {t("we_value_your_trust")}
              </h2>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="flex items-start">
                  <div className="shrink-0">
                    <ShieldCheck className={`h-6 w-6 text-emerald-600 dark:text-emerald-400`} />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                      {t("secure_payments")}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
                      {t("your_payment_information_is_processed_securely_1")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="shrink-0">
                    <Truck className={`h-6 w-6 text-amber-600 dark:text-amber-400`} />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                      {t("fast_delivery")}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
                      {t("we_aim_to_deliver_physical_products")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 lg:mt-0 lg:col-span-5">
            <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-700 px-6 py-8`}>
              <h2 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
                {tExt("order_summary")}
              </h2>

              {/* Improved coupon code input */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="coupon-code"
                    className="block text-sm font-medium text-gray-700 dark:text-zinc-300"
                  >
                    {t("discount_code")}
                  </label>
                </div>
                {discount ? (
                  <div className="mt-2 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                          {discount.code}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                          {discount.message}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearDiscount}
                        className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex space-x-2">
                    <input
                      type="text"
                      id="coupon-code"
                      name="coupon-code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="block w-full border-gray-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm px-4 py-2"
                      placeholder={t("enter_coupon_code")}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon || !couponCode}
                      className="bg-gray-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-300 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 rounded-md disabled:opacity-50 whitespace-nowrap"
                    >
                      {isApplyingCoupon ? (
                        <span className="flex items-center">
                          <Loader2 className="animate-spin h-4 w-4 mr-1" />
                          {t("applying_ellipsis")}
                        </span>
                      ) : (
                        "Apply"
                      )}
                    </button>
                  </div>
                )}
                {!discount && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                    {t("enter_a_valid_coupon_code_to_apply_discounts")}
                  </p>
                )}
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-zinc-700 pt-4">
                  <div className="text-sm text-gray-600 dark:text-zinc-400">
                    Subtotal
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                    {subtotal.toFixed(2)} USD
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-zinc-400">
                    Shipping
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                    {shipping.toFixed(2)} USD
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-zinc-400">
                    Tax
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                    {tax.toFixed(2)} USD
                  </div>
                </div>
                {discount && (
                  <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                    <div className="text-sm">Discount</div>
                    <div className="text-sm font-medium">
                      -{discountAmount.toFixed(2)} USD
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-zinc-700 pt-4">
                  <div className="text-base font-medium text-gray-900 dark:text-zinc-100">
                    {t("order_total")}
                  </div>
                  <div className="text-base font-medium text-gray-900 dark:text-zinc-100">
                    {total.toFixed(2)} USD
                  </div>
                </div>
              </div>

              {/* Payment options */}
              <div className="mt-6">
                <div className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-2">
                  {tExt("payment_methods")}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-center py-2 px-3 border rounded-md border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm text-sm font-medium text-gray-700 dark:text-zinc-300">
                    <CreditCard className="h-5 w-5 mr-2 text-gray-400 dark:text-zinc-500" />
                    {tExt("credit_card")}
                  </div>
                  <div className="flex items-center justify-center py-2 px-3 border rounded-md border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm text-sm font-medium text-gray-700 dark:text-zinc-300">
                    <Wallet className="h-5 w-5 mr-2 text-gray-400 dark:text-zinc-500" />
                    Crypto
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className={`w-full flex items-center justify-center bg-linear-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 border border-transparent rounded-xl shadow-lg py-4 px-4 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500/50 disabled:opacity-50 transition-all duration-200`}
                >
                  {isProcessing ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {tCommon('processing')}
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Checkout <ArrowRight className="ml-2 h-5 w-5" />
                    </span>
                  )}
                </button>
              </div>

              {/* Secure checkout notice */}
              <div className="mt-6 flex items-center justify-center">
                <ShieldCheck className={`h-5 w-5 text-emerald-600 dark:text-emerald-400`} />
                <p className="ml-2 text-xs text-gray-600 dark:text-zinc-400">
                  {t("secure_checkout_with_encryption")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
