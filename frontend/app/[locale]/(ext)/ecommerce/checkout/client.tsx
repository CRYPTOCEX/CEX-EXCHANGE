"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { useEcommerceStore } from "@/store/ecommerce/ecommerce";
import { useUserStore } from "@/store/user";
import {
  Check,
  Wallet,
  Bitcoin,
  EclipseIcon as Ethereum,
  DollarSign,
  Truck,
  Download,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { $fetch } from "@/lib/api";
import { useConfigStore } from "@/store/config";
import { getBooleanSetting } from "@/utils/formatters";

// Define wallet types for selection
interface WalletOption {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  icon: React.ElementType;
}
interface WalletResponse {
  id: string;
  userId: string;
  type: string;
  currency: string;
  balance: number;
  inOrder?: number;
  address?: {
    [key: string]: {
      address: string;
      network: string;
      balance: number;
    };
  };
  status: boolean;
}
export default function CheckoutClient() {
  const { cart, clearCart, isProcessingOrder } = useEcommerceStore();
  const { user } = useUserStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [selectedWallets, setSelectedWallets] = useState<
    Record<string, string>
  >({});
  const [wallets, setWallets] = useState<Record<string, WalletOption[]>>({});
  const [isLoadingWallets, setIsLoadingWallets] = useState<
    Record<string, boolean>
  >({});
  const [walletErrors, setWalletErrors] = useState<
    Record<string, string | null>
  >({});
  const [activeTab, setActiveTab] = useState("payment");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState<any>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const { settings } = useConfigStore();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    address:
      user?.profile && typeof user.profile !== "string"
        ? user.profile.location.address
        : "",
    city:
      user?.profile && typeof user.profile !== "string"
        ? user.profile.location.city
        : "",
    postalCode:
      user?.profile && typeof user.profile !== "string"
        ? user.profile.location.zip
        : "",
    country:
      user?.profile && typeof user.profile !== "string"
        ? user.profile.location.country
        : "",
    walletAddress: user?.walletAddress || "",
    phone: user?.phone || "",
    company: "",
    apartment: "",
    state: "",
  });

  // Add this function after the component declaration but before any other code
  const hasPhysicalProductsValue = cart.some(
    (item) => item.product.type === "PHYSICAL"
  );
  const subtotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  // Check if cart has physical products
  const hasDigitalProducts = useMemo(() => {
    return cart.some((item) => item.product.type === "DOWNLOADABLE");
  }, [cart]);

  // Calculate tax based on settings
  const tax = useMemo(() => {
    if (settings && getBooleanSetting(settings.ecommerceTaxEnabled)) {
      return subtotal * (settings.ecommerceDefaultTaxRate / 100);
    }
    return 0;
  }, [subtotal, settings]);

  // Calculate shipping based on settings
  const shipping = useMemo(() => {
    if (settings && getBooleanSetting(settings.ecommerceShippingEnabled) && hasPhysicalProductsValue) {
      return settings.ecommerceDefaultShippingCost || 0;
    }
    return 0;
  }, [settings, hasPhysicalProductsValue]);

  let total = subtotal + tax + shipping;

  // Apply discount if available
  if (discount) {
    if (discount.type === "PERCENTAGE") {
      total -= subtotal * (discount.value / 100);
    } else if (discount.type === "FIXED") {
      total -= discount.value;
    }
  }

  // Group cart items by wallet type and currency
  const cartByWallet = cart.reduce(
    (acc, item) => {
      const key = `${item.product.walletType}-${item.product.currency}`;
      if (!acc[key]) {
        acc[key] = {
          walletType: item.product.walletType,
          currency: item.product.currency,
          items: [],
          total: 0,
        };
      }
      acc[key].items.push(item);
      acc[key].total += item.product.price * item.quantity;
      return acc;
    },
    {} as Record<
      string,
      {
        walletType: string;
        currency: string;
        items: typeof cart;
        total: number;
      }
    >
  );

  // Replace the fetchWalletByTypeAndCurrency function with this implementation
  const fetchWalletByTypeAndCurrency = async (
    type: string,
    currency: string,
    key: string
  ) => {
    setIsLoadingWallets((prev) => ({
      ...prev,
      [key]: true,
    }));
    setWalletErrors((prev) => ({
      ...prev,
      [key]: null,
    }));
    try {
      const { data, error } = await $fetch<WalletResponse>({
        url: `/api/finance/wallet/${type}/${currency}`,
        method: "GET",
        silent: true,
      });
      if (error) {
        setWalletErrors((prev) => ({
          ...prev,
          [key]: error,
        }));
        setIsLoadingWallets((prev) => ({
          ...prev,
          [key]: false,
        }));
        return;
      }
      if (!data) {
        setWalletErrors((prev) => ({
          ...prev,
          [key]: "No wallet found",
        }));
        setIsLoadingWallets((prev) => ({
          ...prev,
          [key]: false,
        }));
        return;
      }

      // Map icon based on currency
      let icon = DollarSign;
      if (currency === "BTC") icon = Bitcoin;
      else if (currency === "ETH") icon = Ethereum;
      const walletOption: WalletOption = {
        id: data.id,
        name: `${data.currency} Wallet`,
        type: data.type,
        currency: data.currency,
        balance: data.balance,
        icon,
      };
      setWallets((prev) => ({
        ...prev,
        [key]: [walletOption],
      }));

      // Auto-select the wallet if it's the only option
      setSelectedWallets((prev) => ({
        ...prev,
        [key]: walletOption.id,
      }));
      setIsLoadingWallets((prev) => ({
        ...prev,
        [key]: false,
      }));
    } catch (err) {
      console.error("Error fetching wallet:", err);
      setWalletErrors((prev) => ({
        ...prev,
        [key]: "Failed to fetch wallet",
      }));
      setIsLoadingWallets((prev) => ({
        ...prev,
        [key]: false,
      }));
    }
  };
  useEffect(() => {
    // Reset wallets when cart changes
    setWallets({});
    setSelectedWallets({});
    setIsLoadingWallets({});
    setWalletErrors({});

    // Fetch wallets for each unique wallet type and currency combination
    Object.entries(cartByWallet).forEach(([key, group]) => {
      fetchWalletByTypeAndCurrency(group.walletType, group.currency, key);
    });
  }, [cart]);
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleWalletChange = (walletId: string, key: string) => {
    setSelectedWallets((prev) => ({
      ...prev,
      [key]: walletId,
    }));
  };
  const hasPhysicalProducts = () => {
    return cart.some((item) => item.product.type === "PHYSICAL");
  };
  const validateShippingInfo = () => {
    if (!hasPhysicalProducts()) return true;
    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "address",
      "city",
      "postalCode",
      "country",
      "phone",
    ];
    const missingFields = requiredFields.filter(
      (field) => !formData[field as keyof typeof formData]
    );
    if (missingFields.length > 0) {
      toast.error(
        `Please fill in all required shipping fields: ${missingFields.join(", ")}`
      );
      return false;
    }
    return true;
  };

  // Replace the handleApplyCoupon function with this implementation
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/ecommerce/discount/validate",
        method: "POST",
        body: {
          code: couponCode,
        },
      });
      if (error) {
        toast.error(error || "Failed to apply coupon");
        setDiscount(null);
        return;
      }
      if (data) {
        setDiscount(data);
        toast.success("Coupon applied successfully!");
      } else {
        toast.error("Invalid coupon code.");
        setDiscount(null);
      }
    } catch (err) {
      console.error("Error applying coupon:", err);
      toast.error("Failed to apply coupon.");
      setDiscount(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check for wallet errors
    const hasWalletErrors = Object.values(walletErrors).some(
      (error) => error !== null
    );
    if (hasWalletErrors) {
      toast.error("You don't have the required wallets for some items");
      return;
    }

    // Validate wallet selections
    const missingWallets = Object.keys(cartByWallet).filter(
      (key) => !selectedWallets[key]
    );
    if (missingWallets.length > 0) {
      toast.error("Please select a wallet for all items");
      return;
    }

    // Validate shipping information for physical products
    if (hasPhysicalProductsValue) {
      if (
        !formData.address ||
        !formData.city ||
        !formData.postalCode ||
        !formData.country
      ) {
        toast.error(
          "Please provide shipping information for physical products"
        );
        return;
      }
    }
    setIsSubmitting(true);

    // Simulate order processing
    setTimeout(() => {
      setIsSubmitting(false);
      setOrderComplete(true);
      setOrderNumber(`ORD-${Math.floor(100000 + Math.random() * 900000)}`);
      clearCart();
    }, 2000);
  };
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  if (cart.length === 0 && !orderComplete) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Your cart is empty
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Add items to your cart before checking out.
          </p>
          <div className="mt-6">
            <Link
                                  href="/ecommerce/product"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (orderComplete) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-zinc-800 p-8 rounded-lg shadow-md max-w-3xl mx-auto">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" aria-hidden="true" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
              Order Complete!
            </h2>
            <p className="mt-2 text-lg text-gray-500 dark:text-zinc-400">
              Thank you for your order. We've received your payment and will
              process your order shortly.
            </p>

            <div className="mt-6 bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg inline-block">
              <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                Order Number:
              </p>
              <p className="text-xl font-bold text-indigo-600">{orderNumber}</p>
            </div>

            <div className="mt-6 border-t border-b border-gray-200 dark:border-zinc-700 py-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Order Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-zinc-400">
                    Subtotal:
                  </span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {hasPhysicalProducts() && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-zinc-400">
                      Shipping:
                    </span>
                    <span className="font-medium">${shipping.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-zinc-400">Tax:</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-zinc-700 mt-2">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {hasDigitalProducts && (
                <div className="bg-blue-50 p-4 rounded-lg text-left">
                  <div className="flex items-start">
                    <Download className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-blue-800">
                        Digital Products
                      </h4>
                      <p className="text-sm text-blue-600">
                        Your digital products are available for download in your
                        account.
                      </p>
                      <Button
                        variant="outline"
                        className="mt-2 bg-white dark:bg-zinc-800"
                      >
                        <Link href="/ecommerce/order">Go to My Account</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {hasPhysicalProducts() && (
                <div className="bg-amber-50 p-4 rounded-lg text-left">
                  <div className="flex items-start">
                    <Truck className="h-5 w-5 text-amber-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-amber-800">
                        Shipping Information
                      </h4>
                      <p className="text-sm text-amber-600">
                        Your items will be shipped to the address you provided.
                        You can track your order in your account.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8">
              <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-4">
                A confirmation email has been sent to {formData.email}.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="/ecommerce"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Continue Shopping
                </Link>
                <Link
                  href="/ecommerce/order"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-zinc-700 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  View Order History
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-zinc-900 dark:text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link
            href="/ecommerce/cart"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors duration-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to cart
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Checkout
          </h1>
        </div>

        <div className="mt-12 lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16">
          <div className="lg:col-span-7">
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="payment">
                  <div className="flex items-center">
                    <Wallet className="h-4 w-4 mr-2" />
                    Payment
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="shipping"
                  disabled={!hasPhysicalProducts() && activeTab !== "shipping"}
                >
                  <div className="flex items-center">
                    <Truck className="h-4 w-4 mr-2" />
                    Shipping
                  </div>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="shipping" className="mt-6">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                        Shipping information
                      </h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                        Enter your shipping details to complete your order.
                      </p>

                      <div className="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                        <div className="sm:col-span-3">
                          <Label
                            htmlFor="firstName"
                            className="block text-sm font-medium text-gray-700 dark:text-zinc-100"
                          >
                            First name
                          </Label>
                          <div className="mt-1">
                            <Input
                              type="text"
                              id="firstName"
                              name="firstName"
                              value={formData.firstName}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <Label
                            htmlFor="lastName"
                            className="block text-sm font-medium text-gray-700 dark:text-zinc-100"
                          >
                            Last name
                          </Label>
                          <div className="mt-1">
                            <Input
                              type="text"
                              id="lastName"
                              name="lastName"
                              value={formData.lastName}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-4">
                          <Label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700 dark:text-zinc-100"
                          >
                            Email address
                          </Label>
                          <div className="mt-1">
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <Label
                            htmlFor="phone"
                            className="block text-sm font-medium text-gray-700 dark:text-zinc-100"
                          >
                            Phone
                          </Label>
                          <div className="mt-1">
                            <Input
                              type="text"
                              id="phone"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <Label
                            htmlFor="address"
                            className="block text-sm font-medium text-gray-700 dark:text-zinc-100"
                          >
                            Address
                          </Label>
                          <div className="mt-1">
                            <Input
                              type="text"
                              id="address"
                              name="address"
                              value={formData.address}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <Label
                            htmlFor="apartment"
                            className="block text-sm font-medium text-gray-700 dark:text-zinc-100"
                          >
                            Apartment, suite, etc. (Optional)
                          </Label>
                          <div className="mt-1">
                            <Input
                              type="text"
                              id="apartment"
                              name="apartment"
                              value={formData.apartment}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <Label
                            htmlFor="city"
                            className="block text-sm font-medium text-gray-700 dark:text-zinc-100"
                          >
                            City
                          </Label>
                          <div className="mt-1">
                            <Input
                              type="text"
                              id="city"
                              name="city"
                              value={formData.city}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <Label
                            htmlFor="state"
                            className="block text-sm font-medium text-gray-700 dark:text-zinc-100"
                          >
                            State / Province
                          </Label>
                          <div className="mt-1">
                            <Input
                              type="text"
                              id="state"
                              name="state"
                              value={formData.state}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <Label
                            htmlFor="postalCode"
                            className="block text-sm font-medium text-gray-700 dark:text-zinc-100"
                          >
                            Postal code
                          </Label>
                          <div className="mt-1">
                            <Input
                              type="text"
                              id="postalCode"
                              name="postalCode"
                              value={formData.postalCode}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <Label
                            htmlFor="country"
                            className="block text-sm font-medium text-gray-700 dark:text-zinc-100"
                          >
                            Country
                          </Label>
                          <div className="mt-1">
                            <Input
                              type="text"
                              id="country"
                              name="country"
                              value={formData.country}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <Label
                            htmlFor="specialInstructions"
                            className="block text-sm font-medium text-gray-700 dark:text-zinc-100"
                          >
                            Special Instructions (Optional)
                          </Label>
                          <div className="mt-1">
                            <textarea
                              id="specialInstructions"
                              name="specialInstructions"
                              rows={3}
                              value={specialInstructions}
                              onChange={(e) =>
                                setSpecialInstructions(e.target.value)
                              }
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-gray-200 dark:border-zinc-700">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab("payment")}
                        className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Continue to Payment
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="payment" className="mt-6">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                        Payment method
                      </h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                        Select which wallet to use for each group of products
                      </p>

                      <div className="mt-6 space-y-6">
                        {Object.entries(cartByWallet).map(([key, group]) => {
                          return (
                            <div
                              key={key}
                              className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg dark:border-zinc-700 dark:text-zinc-100"
                            >
                              <div className="flex justify-between items-center mb-4">
                                <div>
                                  <h3 className="text-base font-medium text-gray-900 dark:text-white">
                                    {group.walletType} - {group.currency}
                                  </h3>
                                  <p className="text-sm text-gray-500 dark:text-zinc-400">
                                    {group.items.length} item(s) - Total:{" "}
                                    {group.total.toFixed(2)} {group.currency}
                                  </p>
                                </div>
                                <div className="flex items-center">
                                  <Wallet className="h-5 w-5 text-indigo-600 mr-2" />
                                  {isLoadingWallets[key] ? (
                                    <div
                                      key={`loading-${key}`}
                                      className="flex items-center space-x-2"
                                    >
                                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                      <span className="text-sm text-gray-500 dark:text-zinc-400">
                                        Loading wallet...
                                      </span>
                                    </div>
                                  ) : walletErrors[key] ? (
                                    <div
                                      key={`error-${key}`}
                                      className="text-sm text-red-500 dark:text-zinc-400"
                                    >
                                      {walletErrors[key]} - You need a{" "}
                                      {group.walletType} wallet with{" "}
                                      {group.currency}
                                    </div>
                                  ) : wallets[key]?.length === 0 ? (
                                    <div
                                      key={`empty-${key}`}
                                      className="text-sm text-red-500 dark:text-zinc-400"
                                    >
                                      No {group.walletType} wallet with{" "}
                                      {group.currency} available
                                    </div>
                                  ) : (
                                    <Select
                                      key={`select-${key}`}
                                      value={selectedWallets[key] || ""}
                                      onValueChange={(value) =>
                                        handleWalletChange(value, key)
                                      }
                                    >
                                      <SelectTrigger className="w-[250px] dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
                                        <SelectValue placeholder="Select a wallet" />
                                      </SelectTrigger>
                                      <SelectContent className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
                                        {wallets[key]?.map((wallet) => {
                                          return (
                                            <SelectItem
                                              key={wallet.id}
                                              value={wallet.id}
                                              className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                                            >
                                              <div className="flex items-center">
                                                <wallet.icon className="h-4 w-4 mr-2" />
                                                <span>
                                                  {wallet.name} (
                                                  {wallet.balance}{" "}
                                                  {wallet.currency})
                                                </span>
                                              </div>
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2">
                                {group.items.map((item) => {
                                  return (
                                    <div
                                      key={item.product.id}
                                      className="flex items-center text-sm"
                                    >
                                      <span className="w-8 h-8 bg-gray-200 dark:bg-zinc-700 rounded-full flex items-center justify-center mr-2 overflow-hidden">
                                        <Image
                                          src={
                                            item.product.image ||
                                            "/placeholder.svg"
                                          }
                                          alt=""
                                          width={32}
                                          height={32}
                                          className="object-cover"
                                        />
                                      </span>
                                      <span className="flex-1">
                                        {item.product.name}
                                      </span>
                                      <span className="font-medium">
                                        {item.product.price}{" "}
                                        {item.product.currency} ×{" "}
                                        {item.quantity}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <Label
                        htmlFor="couponCode"
                        className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
                      >
                        Coupon Code (optional)
                      </Label>
                      <div className="flex gap-3 mt-3">
                        <Input
                          type="text"
                          id="couponCode"
                          name="couponCode"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="Enter coupon code"
                          className="flex-1 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <Button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={isApplyingCoupon || !couponCode.trim()}
                          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 whitespace-nowrap"
                        >
                          {isApplyingCoupon ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Apply Coupon"
                          )}
                        </Button>
                      </div>
                      {discount && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                            <span className="text-sm text-green-800 dark:text-green-400 font-medium">
                              Coupon "{discount.code}" applied! You save{" "}
                              {discount.type === "PERCENTAGE"
                                ? `${discount.value}%`
                                : `$${discount.value.toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <div className="mt-16 lg:mt-0 lg:col-span-5">
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg px-4 py-6 sm:p-6 lg:p-8 dark:border-zinc-700 dark:text-zinc-100">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Order summary
                </h2>
              </div>
              <div className="mt-6 space-y-4">
                <div className="flow-root">
                  <ul
                    role="list"
                    className="-my-4 divide-y divide-gray-200 dark:divide-zinc-700"
                  >
                    {cart.map((item) => {
                      return (
                        <li key={item.product.id} className="py-4 flex">
                          <div className="flex-shrink-0 relative w-16 h-16 rounded-md overflow-hidden">
                            <Image
                              src={item.product.image || "/placeholder.svg"}
                              alt={item.product.name}
                              fill
                              className="object-cover object-center"
                              sizes="64px"
                            />
                          </div>
                          <div className="ml-4 flex-1 flex flex-col">
                            <div>
                              <div className="flex justify-between text-base font-medium text-gray-900 dark:text-white">
                                <h3>{item.product.name}</h3>
                              </div>
                              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                                {item.product.walletType} • {item.product.type}
                              </p>
                            </div>
                            <div className="flex-1 flex items-end justify-between text-sm">
                              <p className="text-gray-500 dark:text-zinc-400">
                                Qty {item.quantity}
                              </p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-zinc-400">
                    Subtotal
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ${subtotal.toFixed(2)}
                  </p>
                </div>
                {hasPhysicalProducts() && (
                  <div
                    key="shipping-row"
                    className="flex items-center justify-between"
                  >
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                      Shipping
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      ${shipping.toFixed(2)}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-zinc-400">
                    Tax
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ${tax.toFixed(2)}
                  </p>
                </div>
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-4 flex items-center justify-between">
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    Order total
                  </p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    ${total.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting || isProcessingOrder}
                  className="w-full flex items-center justify-center bg-indigo-600 border border-transparent rounded-md shadow-sm py-3 px-4 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting || isProcessingOrder ? (
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
                      Complete order <ArrowRight className="ml-2 h-5 w-5" />
                    </span>
                  )}
                </button>
              </div>

              {/* Secure checkout notice */}
              <div className="mt-6 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-gray-400" />
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
