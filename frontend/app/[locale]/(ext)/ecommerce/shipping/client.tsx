"use client";

import { useState, useEffect } from "react";
import { useUserStore } from "@/store/user";
import {
  Loader2,
  Truck,
  Package,
  ChevronRight,
  ArrowLeft,
  Home,
  ShoppingBag,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  Calendar,
  Weight,
  User,
  Phone,
  Mail,
  Box,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import { Link } from "@/i18n/routing";

// Updated types based on actual API response
interface ShippingAttributes {
  id: string;
  loadId: string;
  loadStatus: "PENDING" | "TRANSIT" | "DELIVERED" | "CANCELLED";
  shipper: string;
  transporter: string;
  goodsType: string;
  weight: number;
  volume: number;
  description: string;
  vehicle: string;
  cost?: number;
  tax?: number;
  deliveryDate?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date;
  ecommerceOrders: EcommerceOrder[];
}
interface EcommerceOrder {
  id: string;
  userId: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "REJECTED";
  shippingId: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date;
  productId?: string | null;
  ecommerceOrderItems: EcommerceOrderItem[];
  shippingAddress?: ShippingAddressAttributes | null;
  user: UserAttributes;
  products: ProductAttributes[];
}
interface EcommerceOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  key?: string;
  filePath?: string;
  instructions?: string;
  product: ProductAttributes;
}
interface ShippingAddressAttributes {
  id: string;
  userId: string;
  orderId: string;
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
interface ProductAttributes {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  type: "DOWNLOADABLE" | "PHYSICAL";
  price: number;
  categoryId: string;
  inventoryQuantity: number;
  status: boolean;
  image?: string;
  currency: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date;
  ecommerceOrderItem?: {
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    key?: string;
    filePath?: string;
    instructions?: string;
  };
}
interface UserAttributes {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profile?: string;
  avatar?: string;
}
export default function ShippingClient() {
  const { user } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);
  const [shippings, setShippings] = useState<ShippingAttributes[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchShippings = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const { data, error } = await $fetch({
          url: "/api/ecommerce/shipping",
          silentSuccess: true,
        });
        if (error) {
          setError(error);
          toast.error("Failed to load shipping information");
        } else {
          // Handle the actual API response structure - data is directly an array
          let shippingsArray: ShippingAttributes[] = [];
          if (Array.isArray(data)) {
            shippingsArray = data;
          } else if (data?.data && Array.isArray(data.data)) {
            shippingsArray = data.data;
          } else {
            shippingsArray = [];
          }
          setShippings(shippingsArray);
        }
      } catch (err) {
        setError("An unexpected error occurred");
        toast.error("Failed to load shipping information");
      } finally {
        setIsLoading(false);
      }
    };
    fetchShippings();
  }, [user]);

  // Format price with currency
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(price);
  };
  const getShippingStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "TRANSIT":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "CANCELLED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    }
  };
  const getShippingStatusIcon = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <CheckCircle className="h-4 w-4 mr-1" />;
      case "TRANSIT":
        return <Truck className="h-4 w-4 mr-1" />;
      case "CANCELLED":
        return <AlertCircle className="h-4 w-4 mr-1" />;
      default:
        return <Clock className="h-4 w-4 mr-1" />;
    }
  };

  // Parse user profile if it's a JSON string
  const parseUserProfile = (profile?: string) => {
    if (!profile) return null;
    try {
      return JSON.parse(profile);
    } catch {
      return null;
    }
  };
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center py-16 bg-gray-50 rounded-lg shadow-sm dark:bg-zinc-800">
          <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 dark:text-zinc-500" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-zinc-100">
            Please sign in to view your shipping details
          </h2>
          <p className="mt-2 text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
            You need to be logged in to access your shipping information.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/ecommerce/order"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Sign In
            </Link>
            <Link
              href="/ecommerce"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-600 dark:hover:bg-zinc-600"
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          <p className="mt-4 text-gray-500 dark:text-zinc-400">
            Loading shipping information...
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-zinc-900 dark:text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-100">
            Shipping & Tracking
          </h1>
          <div className="flex items-center text-sm text-gray-500 dark:text-zinc-400">
            <Truck className="h-4 w-4 mr-1" />
            {shippings.length} shipment{shippings.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="mt-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 dark:bg-red-900/20 dark:border-red-800">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                    Error loading shipping data
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!error && (!shippings || shippings.length === 0) ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center dark:bg-zinc-800">
              <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-zinc-500" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-zinc-100">
                No shipments found
              </h3>
              <p className="mt-2 text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
                You don't have any physical products being shipped yet.
              </p>
              <div className="mt-6">
                <Link
                  href="/ecommerce/product"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Browse Products
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.isArray(shippings) &&
                shippings.map((shipping) => {
                  // Handle multiple orders per shipping
                  return shipping.ecommerceOrders.map((order) => {
                    const shippingStatus = shipping.loadStatus;
                    const userProfile = parseUserProfile(order.user.profile);
                    return (
                      <div
                        key={`${shipping.id}-${order.id}`}
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm dark:bg-zinc-800 dark:border-zinc-700"
                      >
                        {/* Header */}
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 dark:bg-zinc-700/50 dark:border-zinc-600">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
                                Order #{order.id}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-zinc-400">
                                Placed on{" "}
                                {order.createdAt
                                  ? new Date(
                                      order.createdAt
                                    ).toLocaleDateString()
                                  : "Unknown date"}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 text-sm font-medium rounded-full flex items-center ${getShippingStatusColor(shippingStatus)}`}
                            >
                              {getShippingStatusIcon(shippingStatus)}
                              {shippingStatus}
                            </span>
                          </div>
                        </div>

                        <div className="p-6">
                          {/* Products */}
                          {order.products && order.products.length > 0 && (
                            <div className="mb-6">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-3 flex items-center">
                                <Box className="h-4 w-4 mr-2" />
                                Items
                              </h4>
                              <div className="space-y-3">
                                {order.products.map((product) => {
                                  return (
                                    <div
                                      key={product.id}
                                      className="flex items-center"
                                    >
                                      <div className="flex-shrink-0 relative w-16 h-16 rounded-md overflow-hidden border border-gray-200 dark:border-zinc-700">
                                        <Image
                                          src={
                                            product.image ||
                                            "/placeholder.svg?height=64&width=64&text=Product"
                                          }
                                          alt={product.name}
                                          fill
                                          className="object-cover object-center"
                                          sizes="64px"
                                        />
                                      </div>
                                      <div className="ml-4 flex-1">
                                        <h5 className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                                          {product.name}
                                        </h5>
                                        <div className="flex items-center justify-between mt-1">
                                          <p className="text-sm text-gray-500 dark:text-zinc-400">
                                            Qty:{" "}
                                            {product.ecommerceOrderItem
                                              ?.quantity || 1}
                                          </p>
                                          <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                                            {formatPrice(
                                              product.price,
                                              product.currency
                                            )}
                                          </p>
                                        </div>
                                        {product.type === "DOWNLOADABLE" && (
                                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                            Digital Product
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Shipping Details */}
                            <div className="bg-gray-50 p-4 rounded-md dark:bg-zinc-700/50">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-3 flex items-center">
                                <Truck className="h-4 w-4 mr-2" />
                                Shipping Details
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-zinc-400">
                                    Load ID:
                                  </span>
                                  <span className="text-gray-900 dark:text-zinc-100">
                                    {shipping.loadId}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-zinc-400">
                                    Shipper:
                                  </span>
                                  <span className="text-gray-900 dark:text-zinc-100">
                                    {shipping.shipper}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-zinc-400">
                                    Transporter:
                                  </span>
                                  <span className="text-gray-900 dark:text-zinc-100">
                                    {shipping.transporter}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-zinc-400">
                                    Vehicle:
                                  </span>
                                  <span className="text-gray-900 dark:text-zinc-100">
                                    {shipping.vehicle}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-zinc-400 flex items-center">
                                    <Weight className="h-3 w-3 mr-1" />
                                    Weight:
                                  </span>
                                  <span className="text-gray-900 dark:text-zinc-100">
                                    {shipping.weight} kg
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-zinc-400">
                                    Volume:
                                  </span>
                                  <span className="text-gray-900 dark:text-zinc-100">
                                    {shipping.volume} m³
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-zinc-400">
                                    Type:
                                  </span>
                                  <span className="text-gray-900 dark:text-zinc-100">
                                    {shipping.goodsType}
                                  </span>
                                </div>
                                {shipping.cost && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-zinc-400">
                                      Shipping Cost:
                                    </span>
                                    <span className="text-gray-900 dark:text-zinc-100">
                                      ${shipping.cost.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {shipping.tax && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-zinc-400">
                                      Tax:
                                    </span>
                                    <span className="text-gray-900 dark:text-zinc-100">
                                      ${shipping.tax.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {shipping.deliveryDate && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-zinc-400 flex items-center">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      Expected:
                                    </span>
                                    <span className="text-gray-900 dark:text-zinc-100">
                                      {new Date(
                                        shipping.deliveryDate
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Customer Information */}
                            <div className="bg-gray-50 p-4 rounded-md dark:bg-zinc-700/50">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-3 flex items-center">
                                <User className="h-4 w-4 mr-2" />
                                Customer Information
                              </h4>
                              <div className="space-y-1 text-sm text-gray-600 dark:text-zinc-300">
                                <div className="flex items-center">
                                  <User className="h-3 w-3 mr-2 text-gray-400" />
                                  <span>
                                    {order.user.firstName} {order.user.lastName}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <Mail className="h-3 w-3 mr-2 text-gray-400" />
                                  <span>{order.user.email}</span>
                                </div>
                                {order.user.phone && (
                                  <div className="flex items-center">
                                    <Phone className="h-3 w-3 mr-2 text-gray-400" />
                                    <span>{order.user.phone}</span>
                                  </div>
                                )}
                                {userProfile?.location && (
                                  <div className="mt-2 pl-5">
                                    <div className="flex items-start">
                                      <MapPin className="h-3 w-3 mr-2 text-gray-400 mt-0.5" />
                                      <div>
                                        <p>{userProfile.location.address}</p>
                                        <p>
                                          {userProfile.location.city},{" "}
                                          {userProfile.location.country}
                                        </p>
                                        {userProfile.location.zip && (
                                          <p>{userProfile.location.zip}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status Message */}
                          {shippingStatus === "TRANSIT" && (
                            <div className="mt-4 bg-blue-50 p-3 rounded-md dark:bg-blue-900/20">
                              <div className="flex">
                                <div className="flex-shrink-0">
                                  <Truck className="h-5 w-5 text-blue-400" />
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Your package is on the way!{" "}
                                    {shipping.deliveryDate
                                      ? `Estimated delivery on ${new Date(shipping.deliveryDate).toLocaleDateString()}.`
                                      : "Estimated delivery in 2-3 business days."}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {shippingStatus === "DELIVERED" && (
                            <div className="mt-4 bg-green-50 p-3 rounded-md dark:bg-green-900/20">
                              <div className="flex">
                                <div className="flex-shrink-0">
                                  <CheckCircle className="h-5 w-5 text-green-400" />
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm text-green-700 dark:text-green-300">
                                    Package delivered successfully!{" "}
                                    {shipping.deliveryDate &&
                                      `Delivered on ${new Date(shipping.deliveryDate).toLocaleDateString()}.`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {shippingStatus === "PENDING" && (
                            <div className="mt-4 bg-yellow-50 p-3 rounded-md dark:bg-yellow-900/20">
                              <div className="flex">
                                <div className="flex-shrink-0">
                                  <Clock className="h-5 w-5 text-yellow-400" />
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    Your order is being prepared for shipment.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
