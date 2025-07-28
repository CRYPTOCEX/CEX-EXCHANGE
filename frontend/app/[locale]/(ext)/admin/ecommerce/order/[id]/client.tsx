"use client";

import type React from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import {
  ArrowLeft,
  FileText,
  Package,
  Printer,
  Truck,
  XCircle,
  AlertCircle,
  Edit,
  Save,
  X,
  Download,
  Mail,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import { Link } from "@/i18n/routing";
import DownloadOptionsManager from "./download-options";
interface OrderClientProps {
  orderId: string;
}

// Properly memoized debounce function
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const debouncedFn = useCallback(
    (...args: any[]) => {
      const handler = setTimeout(() => {
        callback(...args);
      }, delay);
      return () => {
        clearTimeout(handler);
      };
    },
    [callback, delay]
  );
  return debouncedFn as T;
}
export default function OrderDetailClient({ orderId }: OrderClientProps) {
  const [order, setOrder] = useState<any>(null);
  const [shipments, setShipments] = useState<any[]>([]);
  const [shippingAddress, setShippingAddress] = useState<any>({});
  const [selectedShipment, setSelectedShipment] = useState<string>("");
  const [orderStatus, setOrderStatus] = useState<string>("");
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const api = "/api/admin/ecommerce/order";

  // Memoize the fetchOrder function to prevent unnecessary re-renders
  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await $fetch({
      url: `${api}/${orderId}`,
      silentSuccess: true,
    });
    if (error) {
      console.error("Error fetching order:", error);
      setError("Failed to load order details");
      setIsLoading(false);
      return;
    }
    if (!data.order) {
      toast.error("Order not found");
      setError("Order not found");
      setIsLoading(false);
      return;
    }
    setShipments(data.shipments ?? []);
    setOrder(data.order);
    // Use shipping instead of shippingAddress from the response
    if (data.order.shipping) {
      setShippingAddress({
        name:
          data.order.user?.firstName + " " + data.order.user?.lastName || "",
        email: data.order.user?.email || "",
        phone: "",
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      });
    }
    setOrderStatus(data.order.status);
    setError(null);
    setIsLoading(false);
  }, [orderId]);

  // Properly memoize the debounced function
  const debounceFetchOrder = useDebounce(fetchOrder, 300);

  // Use a ref to prevent the initial double fetch
  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      fetchOrder();
    }
    return () => {
      isMounted = false;
    };
  }, [fetchOrder]);
  const handleShipmentAssignment = async () => {
    if (!selectedShipment) {
      toast.error("Please select a shipment");
      return;
    }
    setIsUpdating(true);
    const { error } = await $fetch({
      url: `${api}/${orderId}/shipment`,
      method: "PUT",
      body: {
        shipmentId: selectedShipment,
      },
      silent: true,
    });
    if (error) {
      toast.error("Error assigning shipment");
      console.error("Error assigning shipment:", error);
    } else {
      toast.success("Shipment assigned successfully");
      fetchOrder();
    }
    setIsUpdating(false);
  };
  const handleShippingUpdate = async () => {
    setIsUpdating(true);
    const { error } = await $fetch({
      url: `${api}/${orderId}/shipping`,
      method: "PUT",
      body: {
        shippingAddress,
      },
    });
    if (error) {
      console.error("Error updating shipping address:", error);
      toast.error("Error updating shipping address");
    } else {
      toast.success("Shipping address updated");
      fetchOrder();
      setIsEditingShipping(false);
    }
    setIsUpdating(false);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingAddress((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleStatusSelectChange = async (value: string) => {
    // Only allow status change if current status is PENDING
    if (order.status !== "PENDING") {
      toast.error("Can only change status when order is pending");
      return;
    }
    setIsUpdating(true);
    const { error } = await $fetch({
      url: `${api}/${orderId}`,
      method: "PUT",
      body: {
        status: value,
      },
    });
    if (error) {
      console.error("Error updating order status:", error);
      toast.error("Error updating order status");
    } else {
      setOrderStatus(value);
      setOrder((prev: any) =>
        prev
          ? {
              ...prev,
              status: value,
            }
          : null
      );
      toast.success("Order status updated");
    }
    setIsUpdating(false);
  };

  // Generate CSV data for invoice
  const generateCsvData = useCallback(() => {
    if (!order) return "";

    // CSV header
    let csv = "Product,Price,Quantity,Total\n";

    // Add products
    order.products.forEach((product: any) => {
      const price = product.price || 0;
      const quantity = product.ecommerceOrderItem?.quantity || 1;
      const total = price * quantity;
      csv += `"${product.name}",${price.toFixed(2)},${quantity},${total.toFixed(2)}\n`;
    });

    // Add summary
    const subtotal = (order.products || []).reduce(
      (sum: number, product: any) =>
        sum +
        (product.price || 0) * (product.ecommerceOrderItem?.quantity || 1),
      0
    );
    const tax = subtotal * 0.1;
    const shipping = order.shippingMethod === "express" ? 15 : 5;
    const total = subtotal + tax + shipping;
    csv += `\nSubtotal,,,"${subtotal.toFixed(2)}"\n`;
    csv += `Shipping,,,"${shipping.toFixed(2)}"\n`;
    csv += `Tax,,,"${tax.toFixed(2)}"\n`;
    csv += `Total,,,"${total.toFixed(2)}"\n`;
    return csv;
  }, [order]);

  // Generate JSON data for invoice
  const generateJsonData = useCallback(() => {
    if (!order) return "{}";
    const subtotal = (order.products || []).reduce(
      (sum: number, product: any) =>
        sum +
        (product.price || 0) * (product.ecommerceOrderItem?.quantity || 1),
      0
    );
    const tax = subtotal * 0.1;
    const shipping = order.shippingMethod === "express" ? 15 : 5;
    const total = subtotal + tax + shipping;
    const invoiceData = {
      orderId: order.id,
      orderDate: order.createdAt,
      customer: {
        name: order.user?.firstName + " " + order.user?.lastName,
        email: order.user?.email,
      },
      items: order.products.map((product: any) => ({
        name: product.name,
        price: product.price || 0,
        quantity: product.ecommerceOrderItem?.quantity || 1,
        total:
          (product.price || 0) * (product.ecommerceOrderItem?.quantity || 1),
        type: product.type,
      })),
      summary: {
        subtotal,
        shipping,
        tax,
        total,
      },
      status: order.status,
      shipping: order.shipping
        ? {
            loadId: order.shipping.loadId,
            transporter: order.shipping.transporter,
            deliveryDate: order.shipping.deliveryDate,
          }
        : null,
    };
    return JSON.stringify(invoiceData, null, 2);
  }, [order]);

  // Download invoice as CSV
  const downloadCsv = useCallback(() => {
    if (!order) return;
    const csvData = generateCsvData();
    const blob = new Blob([csvData], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${order.id.slice(0, 8)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Invoice downloaded as CSV");
  }, [order, generateCsvData]);

  // Download invoice as JSON
  const downloadJson = useCallback(() => {
    if (!order) return;
    const jsonData = generateJsonData();
    const blob = new Blob([jsonData], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${order.id.slice(0, 8)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Invoice downloaded as JSON");
  }, [order, generateJsonData]);

  // Share invoice via email
  const shareInvoice = useCallback(() => {
    if (!order) return;
    const subject = `Invoice for Order #${order.id.slice(0, 8)}`;
    const subtotal = (order.products || []).reduce(
      (sum: number, product: any) =>
        sum +
        (product.price || 0) * (product.ecommerceOrderItem?.quantity || 1),
      0
    );
    const tax = subtotal * 0.1;
    const shipping = order.shippingMethod === "express" ? 15 : 5;
    const total = subtotal + tax + shipping;
    let body = `Invoice for Order #${order.id.slice(0, 8)}\n\n`;
    body += `Date: ${format(new Date(order.createdAt), "MMMM d, yyyy")}\n\n`;
    body += "Items:\n";
    order.products.forEach((product: any) => {
      const price = product.price || 0;
      const quantity = product.ecommerceOrderItem?.quantity || 1;
      const total = price * quantity;
      body += `- ${product.name}: ${quantity} x $${price.toFixed(2)} = $${total.toFixed(2)}\n`;
    });
    body += `\nSubtotal: $${subtotal.toFixed(2)}\n`;
    body += `Shipping: $${shipping.toFixed(2)}\n`;
    body += `Tax: $${tax.toFixed(2)}\n`;
    body += `Total: $${total.toFixed(2)}\n\n`;
    body += "Thank you for your business!";
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl);
    toast.success("Email client opened with invoice details");
  }, [order]);

  // Status check for editing
  const canEditStatus = useMemo(() => {
    return order?.status === "PENDING";
  }, [order?.status]);
  if (isLoading) {
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

  // Safely calculate totals with fallbacks for undefined values
  const subtotal = (order.products || []).reduce(
    (sum: number, product: any) =>
      sum + (product.price || 0) * (product.ecommerceOrderItem?.quantity || 1),
    0
  );
  const tax = subtotal * 0.1; // Assuming 10% tax
  const shipping = order.shippingMethod === "express" ? 15 : 5;
  const total = subtotal + tax + shipping;

  // Determine if order has physical products
  const hasPhysicalProducts = (order.products || []).some(
    (product: any) => product.type === "PHYSICAL"
  );
  function getStatusBadge(status: string) {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>;
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  }
  function getShipmentStatusBadge(status: string) {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>;
      case "TRANSIT":
        return <Badge variant="secondary">In Transit</Badge>;
      case "DELIVERED":
        return <Badge variant="secondary">Delivered</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  }
  return (
    <div>
      {/* Back button and header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <Link
            href="/admin/ecommerce/order"
            className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Order #{order.id?.slice(0, 8) || orderId}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Placed on{" "}
            {format(new Date(order.createdAt || Date.now()), "MMMM dd, yyyy")}{" "}
            at {format(new Date(order.createdAt || Date.now()), "h:mm a")}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Select
              value={orderStatus}
              onValueChange={handleStatusSelectChange}
              disabled={isUpdating || !canEditStatus}
            >
              <SelectTrigger className="w-full sm:w-auto">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            {getStatusBadge(orderStatus)}
            {!canEditStatus && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                (Status can only be changed when order is pending)
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Details
              </TabsTrigger>
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
                    {(order.products || []).map((product: any) => {
                      return (
                        <div
                          key={product.ecommerceOrderItem?.id}
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
                                {product.status ? "Active" : "Inactive"}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {product.category?.name}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-end mt-2">
                              <div className="text-sm text-muted-foreground">
                                ${(product.price || 0).toFixed(2)} ×{" "}
                                {product.ecommerceOrderItem?.quantity || 1}
                              </div>
                              <div className="font-medium">
                                $
                                {(
                                  (product.price || 0) *
                                  (product.ecommerceOrderItem?.quantity || 1)
                                ).toFixed(2)}
                              </div>
                            </div>
                            {product.type === "DOWNLOADABLE" &&
                              product.ecommerceOrderItem?.filePath && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  File: {product.ecommerceOrderItem.filePath}
                                </div>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>${shipping.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>${(subtotal * 0.1).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Download Options for Digital Products */}
              {(order.products || []).some(
                (product: any) => product.type === "DOWNLOADABLE"
              ) && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Digital Product Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {(order.products || [])
                        .filter(
                          (product: any) => product.type === "DOWNLOADABLE"
                        )
                        .map((product: any) => (
                          <DownloadOptionsManager
                            key={product.ecommerceOrderItem?.id}
                            order={order}
                            product={product}
                            orderItem={product.ecommerceOrderItem}
                            fetchOrder={fetchOrder}
                            canEdit={canEditStatus}
                          />
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {hasPhysicalProducts && (
              <TabsContent value="shipping">
                <div className="space-y-6">
                  {/* Shipping Address */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Shipping Address</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingShipping(!isEditingShipping)}
                        disabled={!canEditStatus}
                      >
                        {isEditingShipping ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Edit className="h-4 w-4" />
                        )}
                        {isEditingShipping ? "Cancel" : "Edit"}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {isEditingShipping ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="name">Name</Label>
                              <Input
                                id="name"
                                name="name"
                                value={shippingAddress.name || ""}
                                onChange={handleInputChange}
                              />
                            </div>
                            <div>
                              <Label htmlFor="email">Email</Label>
                              <Input
                                id="email"
                                name="email"
                                type="email"
                                value={shippingAddress.email || ""}
                                onChange={handleInputChange}
                              />
                            </div>
                            <div>
                              <Label htmlFor="phone">Phone</Label>
                              <Input
                                id="phone"
                                name="phone"
                                value={shippingAddress.phone || ""}
                                onChange={handleInputChange}
                              />
                            </div>
                            <div>
                              <Label htmlFor="street">Street</Label>
                              <Input
                                id="street"
                                name="street"
                                value={shippingAddress.street || ""}
                                onChange={handleInputChange}
                              />
                            </div>
                            <div>
                              <Label htmlFor="city">City</Label>
                              <Input
                                id="city"
                                name="city"
                                value={shippingAddress.city || ""}
                                onChange={handleInputChange}
                              />
                            </div>
                            <div>
                              <Label htmlFor="state">State</Label>
                              <Input
                                id="state"
                                name="state"
                                value={shippingAddress.state || ""}
                                onChange={handleInputChange}
                              />
                            </div>
                            <div>
                              <Label htmlFor="postalCode">Postal Code</Label>
                              <Input
                                id="postalCode"
                                name="postalCode"
                                value={shippingAddress.postalCode || ""}
                                onChange={handleInputChange}
                              />
                            </div>
                            <div>
                              <Label htmlFor="country">Country</Label>
                              <Input
                                id="country"
                                name="country"
                                value={shippingAddress.country || ""}
                                onChange={handleInputChange}
                              />
                            </div>
                          </div>
                          <Button
                            onClick={handleShippingUpdate}
                            disabled={isUpdating}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {isUpdating ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      ) : (
                        <div className="bg-muted/30 dark:bg-zinc-800/50 p-4 rounded-lg">
                          <p className="font-medium">{shippingAddress.name}</p>
                          <p>{shippingAddress.email}</p>
                          <p>{shippingAddress.phone}</p>
                          <p>{shippingAddress.street}</p>
                          <p>
                            {shippingAddress.city}, {shippingAddress.state}{" "}
                            {shippingAddress.postalCode}
                          </p>
                          <p>{shippingAddress.country}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Shipment Assignment */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Shipment Assignment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {!order.shipping ? (
                          <div className="flex gap-4">
                            <Select
                              value={selectedShipment}
                              onValueChange={setSelectedShipment}
                              disabled={!canEditStatus}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select a shipment" />
                              </SelectTrigger>
                              <SelectContent>
                                {shipments.map((shipment) => {
                                  return (
                                    <SelectItem
                                      key={shipment.id}
                                      value={shipment.id}
                                    >
                                      {shipment.loadId} - {shipment.transporter}{" "}
                                      ({shipment.loadStatus})
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={handleShipmentAssignment}
                              disabled={
                                isUpdating ||
                                !selectedShipment ||
                                !canEditStatus
                              }
                            >
                              {isUpdating ? "Assigning..." : "Assign"}
                            </Button>
                          </div>
                        ) : (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                Shipment Assigned
                              </span>
                            </div>
                            <p className="text-sm text-green-600 dark:text-green-300">
                              This order has been assigned to shipment{" "}
                              {order.shipping.loadId}
                            </p>
                          </div>
                        )}

                        {/* Current Shipment Details */}
                        {order.shipping && (
                          <div className="bg-muted/30 dark:bg-zinc-800/50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">
                              Current Shipment
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p>
                                  <strong>Load ID:</strong>{" "}
                                  {order.shipping.loadId}
                                </p>
                                <p>
                                  <strong>Status:</strong>{" "}
                                  {getShipmentStatusBadge(
                                    order.shipping.loadStatus
                                  )}
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
                                  <strong>Goods Type:</strong>{" "}
                                  {order.shipping.goodsType}
                                </p>
                              </div>
                              <div>
                                <p>
                                  <strong>Vehicle:</strong>{" "}
                                  {order.shipping.vehicle}
                                </p>
                                <p>
                                  <strong>Weight:</strong>{" "}
                                  {order.shipping.weight} kg
                                </p>
                                <p>
                                  <strong>Volume:</strong>{" "}
                                  {order.shipping.volume} m³
                                </p>
                                <p>
                                  <strong>Cost:</strong> ${order.shipping.cost}
                                </p>
                                <p>
                                  <strong>Tax:</strong> ${order.shipping.tax}
                                </p>
                                {order.shipping.deliveryDate && (
                                  <p>
                                    <strong>Delivery Date:</strong>{" "}
                                    {format(
                                      new Date(order.shipping.deliveryDate),
                                      "MMM dd, yyyy"
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                            {order.shipping.description && (
                              <div className="mt-2">
                                <p>
                                  <strong>Description:</strong>{" "}
                                  {order.shipping.description}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}

            <TabsContent value="invoice">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Invoice</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={downloadCsv}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-4 w-4" />
                      <span>CSV</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={downloadJson}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-4 w-4" />
                      <span>JSON</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={shareInvoice}
                      className="flex items-center gap-1"
                    >
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print</span>
                    </Button>
                  </div>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium text-sm uppercase text-muted-foreground mb-2">
                          Bill To
                        </h3>
                        <p className="font-medium">
                          {order.user?.firstName} {order.user?.lastName}
                        </p>
                        <p>{order.user?.email}</p>
                      </div>

                      <div>
                        <h3 className="font-medium text-sm uppercase text-muted-foreground mb-2">
                          Ship To
                        </h3>
                        <p className="font-medium">
                          {shippingAddress?.name || "Customer"}
                        </p>
                        <p>
                          {shippingAddress?.street || "No address provided"}
                        </p>
                        <p>
                          {shippingAddress?.city}, {shippingAddress?.state}{" "}
                          {shippingAddress?.postalCode}
                        </p>
                        <p>{shippingAddress?.country}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Order Items</h3>
                      <div className="border rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                          <thead className="bg-muted/50 dark:bg-zinc-800/50">
                            <tr>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                              >
                                Item
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                              >
                                Price
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                              >
                                Quantity
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                              >
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
                            {order.products.map((product: any) => {
                              return (
                                <tr key={product.ecommerceOrderItem?.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    {product.name}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                    ${(product.price || 0).toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                    {product.ecommerceOrderItem?.quantity || 1}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                    $
                                    {(
                                      (product.price || 0) *
                                      (product.ecommerceOrderItem?.quantity ||
                                        1)
                                    ).toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="w-full max-w-xs">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Subtotal
                            </span>
                            <span>${subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Shipping
                            </span>
                            <span>${shipping.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax</span>
                            <span>${(subtotal * 0.1).toFixed(2)}</span>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between font-medium">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Payment Information</h3>
                      <div className="bg-muted/30 dark:bg-zinc-800/50 p-4 rounded-lg">
                        <div className="flex items-center">
                          {order.paymentMethod === "CREDIT_CARD" ? (
                            <Badge>Credit Card</Badge>
                          ) : order.paymentMethod === "CRYPTO" ? (
                            <Badge>Cryptocurrency</Badge>
                          ) : (
                            <Badge>Bank Transfer</Badge>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Payment processed on{" "}
                          {format(new Date(order.createdAt), "MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Terms & Conditions</h3>
                      <p className="text-sm text-muted-foreground">
                        Thank you for your business! If you have any questions
                        about this invoice, please contact our customer support
                        team at support@shop.com.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

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
                    {format(new Date(order.createdAt), "MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <span>{getStatusBadge(orderStatus)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Items</span>
                  <span>{order.products?.length || 0}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center font-medium">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={downloadCsv}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={downloadJson}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    JSON
                  </Button>
                </div>

                <Button className="w-full" onClick={shareInvoice}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email Invoice
                </Button>

                {orderStatus === "PENDING" && canEditStatus && (
                  <Button
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950/50"
                    onClick={() => handleStatusSelectChange("CANCELLED")}
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Cancel Order
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {hasPhysicalProducts &&
            shippingAddress &&
            Object.keys(shippingAddress).length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <p className="font-medium">{shippingAddress.name}</p>
                    <p>{shippingAddress.street}</p>
                    <p>
                      {shippingAddress.city}, {shippingAddress.state}{" "}
                      {shippingAddress.postalCode}
                    </p>
                    <p>{shippingAddress.country}</p>
                    {shippingAddress.phone && (
                      <p className="mt-1">Phone: {shippingAddress.phone}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </div>
    </div>
  );
}
