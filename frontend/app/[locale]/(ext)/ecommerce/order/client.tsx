"use client";

import { useUserStore } from "@/store/user";
import DataTable from "@/components/blocks/data-table";
import { useAnalytics } from "./analytics";
import { useColumns } from "./columns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Package,
} from "lucide-react";
import { formatCurrencySafe } from "@/utils/currency";
import Image from "next/image";

const getStatusIcon = (status: string) => {
  switch (status.toUpperCase()) {
    case "PENDING":
      return <Clock className="w-4 h-4" />;
    case "PROCESSING":
      return <Package className="w-4 h-4" />;
    case "SHIPPED":
      return <Package className="w-4 h-4" />;
    case "DELIVERED":
      return <CheckCircle className="w-4 h-4" />;
    case "CANCELLED":
      return <XCircle className="w-4 h-4" />;
    default:
      return <Info className="w-4 h-4" />;
  }
};

const getStatusStyles = (status: string) => {
  const statusKey = status.toLowerCase();

  switch (statusKey) {
    case 'pending':
      return {
        className: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 border',
      };
    case 'processing':
      return {
        className: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 border',
      };
    case 'shipped':
      return {
        className: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 border',
      };
    case 'delivered':
      return {
        className: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 border',
      };
    case 'cancelled':
      return {
        className: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 border',
      };
    default:
      return {
        className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700",
      };
  }
};

export default function AccountClient() {
  const { user } = useUserStore();
  const columns = useColumns();
  const analytics = useAnalytics();

  const renderOrderDetails = (order: any) => {
    if (!order) return null;

    return (
      <div className="space-y-4 p-4">
        {/* Order Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-amber-600 to-emerald-600`}>
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-zinc-900 dark:text-white">
              Ecommerce Order
            </span>
          </div>
          <Badge className={getStatusStyles(order.status).className}>
            <div className="flex items-center gap-1">
              {getStatusIcon(order.status)}
              {order.status}
            </div>
          </Badge>
        </div>

        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg bg-white dark:bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-900 dark:text-white">
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-end text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Order ID:</span>
                <span className="font-mono text-xs text-zinc-900 dark:text-white text-right">
                  {order.id}
                </span>
              </div>
              <div className="flex justify-between items-end text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Date:</span>
                <span className="text-zinc-900 dark:text-white text-right">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
              {order.ecommerceOrderItems && order.ecommerceOrderItems.length > 0 && (
                <div className="flex justify-between items-end text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">Items:</span>
                  <span className={`font-semibold text-amber-600 dark:text-amber-400 text-right`}>
                    {order.ecommerceOrderItems.length} product(s)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg bg-white dark:bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-900 dark:text-white">
                Products
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.ecommerceOrderItems && order.ecommerceOrderItems.length > 0 ? (
                order.ecommerceOrderItems.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    {item.product?.image && (
                      <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0">
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                        {item.product?.name || "Product"}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No items found</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Information */}
        <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg bg-white dark:bg-zinc-900">
          <CardContent className="pt-4">
            {order.status === "PENDING" && (
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 p-3 rounded-xl bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  Order is pending and awaiting processing.
                </span>
              </div>
            )}
            {order.status === "PROCESSING" && (
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 p-3 rounded-xl bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <Package className="w-4 h-4" />
                <span className="text-sm">
                  Order is being processed.
                </span>
              </div>
            )}
            {order.status === "SHIPPED" && (
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                <Package className="w-4 h-4" />
                <span className="text-sm">
                  Order has been shipped and is on the way.
                </span>
              </div>
            )}
            {order.status === "DELIVERED" && (
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 p-3 rounded-xl bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">
                  Order has been delivered successfully.
                </span>
              </div>
            )}
            {order.status === "CANCELLED" && (
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 p-3 rounded-xl bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">
                  Order was cancelled.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <DataTable
      apiEndpoint="/api/ecommerce/order"
      userAnalytics={true}
      model="ecommerceOrder"
      modelConfig={{
        userId: user?.id,
      }}
      permissions={{
        access: "access.ecommerce.order",
        view: "view.ecommerce.order",
        create: "create.ecommerce.order",
        edit: "edit.ecommerce.order",
        delete: "delete.ecommerce.order",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={false}
      title="Ecommerce Orders"
      description="View and manage all your ecommerce orders"
      itemTitle="Order"
      columns={columns}
      analytics={analytics}
      viewContent={renderOrderDetails}
      design={{
        animation: "orbs",
        primaryColor: "amber",
        secondaryColor: "emerald",
        badge: "Order History",
        icon: ShoppingBag,
        detailsAlignment: "bottom",
      }}
    />
  );
}
