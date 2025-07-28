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
interface DiscountData {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
  value: number;
  message: string;
}
export default function CartClient() {
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
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center py-16 bg-gray-50 dark:bg-zinc-800 rounded-lg shadow-sm">
          <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 dark:text-zinc-500" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-zinc-100">
            Your cart is empty
          </h2>
          <p className="mt-2 text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
            Looks like you haven't added any products to your cart yet. Start
            shopping to add items to your cart.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/ecommerce/product"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Browse Products
            </Link>
            <Link
              href="/ecommerce"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-zinc-600 text-sm font-medium rounded-md text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 max-w-3xl mx-auto">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm">
              <ShoppingBag className="h-8 w-8 text-indigo-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
                Wide Selection
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
                Browse our extensive collection of products across multiple
                categories.
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm">
              <CreditCard className="h-8 w-8 text-indigo-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
                Secure Payments
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
                Pay with confidence using our secure payment processing system.
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm">
              <Truck className="h-8 w-8 text-indigo-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
                Fast Delivery
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
                Get your products delivered quickly and efficiently to your
                doorstep.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-zinc-900">
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"
      >
        <ol className="flex items-center space-x-2 text-sm text-gray-500 dark:text-zinc-400">
          <li>
            <Link
              href="/ecommerce"
              className="hover:text-gray-700 dark:hover:text-zinc-300"
            >
              Home
            </Link>
          </li>
          <li>
            <ChevronRight className="h-4 w-4" />
          </li>
          <li className="font-medium text-gray-900 dark:text-zinc-100">
            Shopping Cart
          </li>
        </ol>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-100">
          Shopping Cart
        </h1>
        <div className="mt-12 lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16">
          <div className="lg:col-span-7">
            <div className="border-t border-gray-200 dark:border-zinc-700 px-4 py-6 sm:px-6">
              <div className="flow-root">
                <ul
                  role="list"
                  className="-my-6 divide-y divide-gray-200 dark:divide-zinc-700"
                >
                  {cart.map((item) => {
                    return (
                      <li key={item.product.id} className="py-6 flex">
                        <div className="flex-shrink-0 relative w-24 h-24 rounded-md overflow-hidden border border-gray-200 dark:border-zinc-700">
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
                                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
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
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300">
                                {item.product.type}
                              </span>
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                                {item.product.walletType}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 flex items-end justify-between text-sm">
                            {/* Improved quantity selector */}
                            <div className="flex items-center">
                              <button
                                type="button"
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 focus:outline-none"
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
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 focus:outline-none"
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
                                className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center"
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
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                >
                  Clear Cart
                </button>
                <Link
                  href="/ecommerce/product"
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center"
                >
                  Continue Shopping <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-12 bg-gray-50 dark:bg-zinc-800 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
                We value your trust
              </h2>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <ShieldCheck className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                      Secure Payments
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                      Your payment information is processed securely.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Truck className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                      Fast Delivery
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                      We aim to deliver physical products within 2-5 business
                      days.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 lg:mt-0 lg:col-span-5">
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg px-4 py-6 sm:p-6 lg:p-8">
              <h2 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
                Order summary
              </h2>

              {/* Improved coupon code input */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="coupon-code"
                    className="block text-sm font-medium text-gray-700 dark:text-zinc-300"
                  >
                    Discount code
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
                      className="block w-full border-gray-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2"
                      placeholder="Enter coupon code"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon || !couponCode}
                      className="bg-gray-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-300 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md disabled:opacity-50 whitespace-nowrap"
                    >
                      {isApplyingCoupon ? (
                        <span className="flex items-center">
                          <Loader2 className="animate-spin h-4 w-4 mr-1" />
                          Applying...
                        </span>
                      ) : (
                        "Apply"
                      )}
                    </button>
                  </div>
                )}
                {!discount && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                    Enter a valid coupon code to apply discounts
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
                    Order total
                  </div>
                  <div className="text-base font-medium text-gray-900 dark:text-zinc-100">
                    {total.toFixed(2)} USD
                  </div>
                </div>
              </div>

              {/* Payment options */}
              <div className="mt-6">
                <div className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-2">
                  Payment methods
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-center py-2 px-3 border rounded-md border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm text-sm font-medium text-gray-700 dark:text-zinc-300">
                    <CreditCard className="h-5 w-5 mr-2 text-gray-400 dark:text-zinc-500" />
                    Credit Card
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
                  className="w-full flex items-center justify-center bg-indigo-600 border border-transparent rounded-md shadow-sm py-3 px-4 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
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
                      Processing...
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
                <ShieldCheck className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
                <p className="ml-2 text-xs text-gray-500 dark:text-zinc-400">
                  Secure checkout with encryption
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
