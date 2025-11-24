"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  ArrowLeft,
  FileText,
  Package,
  Truck,
  XCircle,
  Download,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useEcommerceStore } from "@/store/ecommerce/ecommerce";
import { Link, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
export default function OrderClient() {
  const { id } = useParams() as {
    id: string;
  };
  const {
    fetchOrderById,
    downloadDigitalProduct,
    isLoadingOrders,
    isDownloading,
    error,
  } = useEcommerceStore();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [showKeys, setShowKeys] = useState<{
    [key: string]: boolean;
  }>({});

  // Add this helper function at the top of the component
  const formatPrice = (price: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price);
  };
  useEffect(() => {
    const loadOrder = async () => {
      try {
        const orderData = await fetchOrderById(id);
        if (orderData) {
          setOrder(orderData);
        } else {
          // Order not found
          router.push("/ecommerce/order");
          toast.error("Order not found");
        }
      } catch (err) {
        console.error("Error fetching order:", err);
        toast.error("Failed to load order details");
      }
    };
    loadOrder();
  }, [id, fetchOrderById, router]);
  const handleDownload = async (orderItemId: string) => {
    try {
      await downloadDigitalProduct(orderItemId);
      toast.success("Download started");
    } catch (err) {
      toast.error("Failed to download product");
    }
  };
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard`);
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };
  const toggleKeyVisibility = (itemId: string) => {
    setShowKeys((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };
  if (isLoadingOrders) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-800 dark:border-zinc-200"></div>
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-800 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700 dark:text-red-400">
              Error: {error || "Order not found"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals per currency
  const totalsByCurrency = (order.products || []).reduce(
    (acc: any, product: any) => {
      const currency = product.currency || "USD";
      const productTotal =
        (product.price || 0) * (product.ecommerceOrderItem?.quantity || 1);
      if (!acc[currency]) {
        acc[currency] = {
          subtotal: 0,
          currency: currency,
        };
      }
      acc[currency].subtotal += productTotal;
      return acc;
    },
    {}
  );

  // For shipping and tax, use the first product's currency or USD as fallback
  const primaryCurrency = order.products?.[0]?.currency || "USD";

  // Check if order has physical products
  const hasPhysicalProducts = (order.products || []).some(
    (product: any) => product.type === "PHYSICAL"
  );

  // Check if order has digital products
  const hasDigitalProducts = (order.products || []).some(
    (product: any) => product.type === "DOWNLOADABLE"
  );
  function getStatusBadge(status: string) {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
          >
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  }
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <Link
            href="/ecommerce/order"
            className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Order #{order.id?.slice(0, 8)}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Placed on {format(new Date(order.createdAt), "MMMM dd, yyyy")} at{" "}
            {format(new Date(order.createdAt), "h:mm a")}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">{getStatusBadge(order.status)}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Details
              </TabsTrigger>
              {hasDigitalProducts && (
                <TabsTrigger
                  value="downloads"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Downloads
                </TabsTrigger>
              )}
              {hasPhysicalProducts && (
                <TabsTrigger
                  value="shipping"
                  className="flex items-center gap-2"
                >
                  <Truck className="h-4 w-4" />
                  Shipping
                </TabsTrigger>
              )}
              <TabsTrigger value="invoice" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoice
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {(order.products || []).map(
                      (product: any, index: number) => {
                        return (
                          <div
                            key={`${product.name}-${index}`}
                            className="flex gap-4"
                          >
                            <div className="relative h-20 w-20 rounded-md overflow-hidden flex-shrink-0 border bg-muted">
                              <Image
                                src={product.image || "/placeholder.svg"}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium">{product.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {product.type === "DOWNLOADABLE"
                                    ? "Digital"
                                    : "Physical"}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {product.category?.name || "Uncategorized"}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {product.currency} - {product.walletType}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-end mt-2">
                                <div className="text-sm text-muted-foreground">
                                  {formatPrice(
                                    product.price || 0,
                                    product.currency || "USD"
                                  )}{" "}
                                  × {product.ecommerceOrderItem?.quantity || 1}
                                </div>
                                <div className="font-medium">
                                  {formatPrice(
                                    (product.price || 0) *
                                      (product.ecommerceOrderItem?.quantity ||
                                        1),
                                    product.currency || "USD"
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-4">
                    {Object.entries(totalsByCurrency).map(
                      ([currency, totals]: [string, any]) => {
                        return (
                          <div key={currency} className="space-y-4">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Subtotal ({currency})
                              </span>
                              <span>
                                {formatPrice(totals.subtotal, currency)}
                              </span>
                            </div>
                          </div>
                        );
                      }
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>
                        {formatPrice(
                          order.shipping?.cost || 0,
                          primaryCurrency
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>
                        {formatPrice(order.shipping?.tax || 0, primaryCurrency)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium text-lg">
                      <span>Total</span>
                      <span>
                        {formatPrice(
                          Object.values(totalsByCurrency).reduce(
                            (acc, curr: any) => acc + curr.subtotal,
                            0
                          ) +
                            (order.shipping?.cost || 0) +
                            (order.shipping?.tax || 0),
                          primaryCurrency
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {hasDigitalProducts && (
              <TabsContent value="downloads">
                <Card>
                  <CardHeader>
                    <CardTitle>Digital Products</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Download your digital products and access license keys
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {(order.products || [])
                        .filter(
                          (product: any) => product.type === "DOWNLOADABLE"
                        )
                        .map((product: any, index: number) => {
                          return (
                            <div
                              key={`${product.name}-${index}`}
                              className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20"
                            >
                              <div className="flex items-start gap-4">
                                <div className="relative h-16 w-16 rounded-md overflow-hidden flex-shrink-0 border">
                                  <Image
                                    src={product.image || "/placeholder.svg"}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg mb-2">
                                    {product.name}
                                  </h3>

                                  {/* License Key Section */}
                                  {product.ecommerceOrderItem?.key && (
                                    <div className="mb-4">
                                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                                        License Key
                                      </label>
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-white dark:bg-zinc-800 border rounded-md px-3 py-2 font-mono text-sm">
                                          {showKeys[`${product.name}-${index}`]
                                            ? product.ecommerceOrderItem.key
                                            : "•".repeat(
                                                product.ecommerceOrderItem.key
                                                  .length
                                              )}
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            toggleKeyVisibility(
                                              `${product.name}-${index}`
                                            )
                                          }
                                        >
                                          {showKeys[
                                            `${product.name}-${index}`
                                          ] ? (
                                            <EyeOff className="h-4 w-4" />
                                          ) : (
                                            <Eye className="h-4 w-4" />
                                          )}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            copyToClipboard(
                                              product.ecommerceOrderItem.key,
                                              "License key"
                                            )
                                          }
                                        >
                                          <Copy className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Download Link Section */}
                                  {product.ecommerceOrderItem?.filePath && (
                                    <div className="mb-4">
                                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                                        Download Path
                                      </label>
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-white dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm truncate">
                                          {product.ecommerceOrderItem.filePath}
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            copyToClipboard(
                                              product.ecommerceOrderItem
                                                .filePath,
                                              "Download path"
                                            )
                                          }
                                        >
                                          <Copy className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Download Button */}
                                  <Button
                                    onClick={() =>
                                      handleDownload(`${product.name}-${index}`)
                                    }
                                    disabled={isDownloading}
                                    className="w-full sm:w-auto"
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    {isDownloading
                                      ? "Downloading..."
                                      : "Download Product"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {hasPhysicalProducts && (
              <TabsContent value="shipping">
                <Card>
                  <CardHeader>
                    <CardTitle>Shipping Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {order.shipping ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="font-medium mb-2">
                              Shipping Details
                            </h3>
                            <div className="bg-muted/30 dark:bg-zinc-800/50 p-4 rounded-lg space-y-2">
                              <p>
                                <strong>Load ID:</strong>{" "}
                                {order.shipping.loadId}
                              </p>
                              <p>
                                <strong>Status:</strong>
                                <Badge variant="outline" className="ml-2">
                                  {order.shipping.loadStatus}
                                </Badge>
                              </p>
                              <p>
                                <strong>Shipper:</strong>{" "}
                                {order.shipping.shipper}
                              </p>
                              <p>
                                <strong>Transporter:</strong>{" "}
                                {order.shipping.transporter}
                              </p>
                              <p>
                                <strong>Vehicle:</strong>{" "}
                                {order.shipping.vehicle}
                              </p>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-medium mb-2">
                              Package Information
                            </h3>
                            <div className="bg-muted/30 dark:bg-zinc-800/50 p-4 rounded-lg space-y-2">
                              <p>
                                <strong>Goods Type:</strong>{" "}
                                {order.shipping.goodsType}
                              </p>
                              <p>
                                <strong>Weight:</strong> {order.shipping.weight}{" "}
                                kg
                              </p>
                              <p>
                                <strong>Volume:</strong> {order.shipping.volume}{" "}
                                m³
                              </p>
                              <p>
                                <strong>Description:</strong>{" "}
                                {order.shipping.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-medium mb-2">
                            Delivery Information
                          </h3>
                          <div className="bg-muted/30 dark:bg-zinc-800/50 p-4 rounded-lg">
                            <p>
                              <strong>Expected Delivery:</strong>{" "}
                              {format(
                                new Date(order.shipping.deliveryDate),
                                "MMMM dd, yyyy"
                              )}
                            </p>
                            <p>
                              <strong>Shipping Cost:</strong>{" "}
                              {formatPrice(
                                order.shipping.cost,
                                primaryCurrency
                              )}
                            </p>
                            <p>
                              <strong>Tax:</strong>{" "}
                              {formatPrice(order.shipping.tax, primaryCurrency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium">
                          No shipping information available
                        </p>
                        <p className="text-muted-foreground">
                          Shipping details will be updated once your order is
                          processed.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="invoice">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-bold text-lg">
                          Invoice #{order.id}
                        </h3>
                        <p className="text-muted-foreground">
                          Date:{" "}
                          {format(new Date(order.createdAt), "MMMM d, yyyy")}
                        </p>
                      </div>
                      <div className="text-right">
                        <h3 className="font-bold text-lg">Shop</h3>
                        <p className="text-muted-foreground">
                          123 Commerce St
                          <br />
                          New York, NY 10001
                          <br />
                          support@shop.com
                        </p>
                      </div>
                    </div>

                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                        <thead className="bg-muted/50 dark:bg-zinc-800/50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Item
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Price
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
                          {order.products.map((product: any, index: number) => (
                            <tr key={`${product.name}-${index}`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {product.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                {formatPrice(
                                  product.price || 0,
                                  product.currency || "USD"
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                {product.ecommerceOrderItem?.quantity || 1}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                {formatPrice(
                                  (product.price || 0) *
                                    (product.ecommerceOrderItem?.quantity || 1),
                                  product.currency || "USD"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end">
                      <div className="w-full max-w-xs">
                        <div className="space-y-2">
                          {Object.entries(totalsByCurrency).map(
                            ([currency, totals]: [string, any]) => {
                              return (
                                <div
                                  key={currency}
                                  className="flex justify-between"
                                >
                                  <span className="text-muted-foreground">
                                    Subtotal ({currency})
                                  </span>
                                  <span>
                                    {formatPrice(totals.subtotal, currency)}
                                  </span>
                                </div>
                              );
                            }
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Shipping
                            </span>
                            <span>
                              {formatPrice(
                                order.shipping?.cost || 0,
                                primaryCurrency
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax</span>
                            <span>
                              {formatPrice(
                                order.shipping?.tax || 0,
                                primaryCurrency
                              )}
                            </span>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between font-medium">
                            <span>Total</span>
                            <span>
                              {formatPrice(
                                Object.values(totalsByCurrency).reduce(
                                  (acc, curr: any) => acc + curr.subtotal,
                                  0
                                ) +
                                  (order.shipping?.cost || 0) +
                                  (order.shipping?.tax || 0),
                                primaryCurrency
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Order Number</span>
                  <span className="font-medium">{order.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Date</span>
                  <span>
                    {format(new Date(order.createdAt), "MMM dd, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <span>{getStatusBadge(order.status)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Items</span>
                  <span>{order.products?.length || 0}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center font-medium">
                  <span>Total</span>
                  <span>
                    {formatPrice(
                      Object.values(totalsByCurrency).reduce(
                        (acc, curr: any) => acc + curr.subtotal,
                        0
                      ) +
                        (order.shipping?.cost || 0) +
                        (order.shipping?.tax || 0),
                      primaryCurrency
                    )}
                  </span>
                </div>
              </div>

              {order.status === "CANCELLED" && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-red-700 dark:text-red-400">
                      Order Cancelled
                    </span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    This order has been cancelled. If you have any questions,
                    please contact support.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
