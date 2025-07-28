import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op, fn, col } from "sequelize";

export const metadata = {
  summary: "Get Ecommerce Dashboard Data",
  description: "Retrieves all key data for the admin ecommerce dashboard.",
  operationId: "getAdminEcommerceDashboard",
  tags: ["Ecommerce", "Admin", "Dashboard"],
  requiresAuth: true,
  parameters: [
    {
      name: "startDate",
      in: "query",
      required: false,
      schema: { type: "string", format: "date" },
      description: "Start date for chart/statistics range (ISO format)",
    },
    {
      name: "endDate",
      in: "query",
      required: false,
      schema: { type: "string", format: "date" },
      description: "End date for chart/statistics range (ISO format)",
    },
    {
      name: "chartType",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["revenue", "orders", "customers"] },
      description: "Metric to use for the sales chart",
    },
  ],
  responses: {
    200: {
      description: "Ecommerce dashboard data retrieved",
      content: {
        "application/json": { schema: { type: "object" } },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "access.ecommerce.dashboard",
};

export default async (data: { user?: any; query?: any }) => {
  const { user, query } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  // === Date handling ===
  const now = new Date();
  const { startDate, endDate, chartType: chartTypeRaw } = query || {};
  let start = startDate ? new Date(startDate) : new Date(now);
  let end = endDate ? new Date(endDate) : now;

  // Default: last 7 days
  if (!startDate || !endDate) {
    end = now;
    start = new Date(now);
    start.setDate(end.getDate() - 7);
  }

  const chartType = (chartTypeRaw || "revenue") as
    | "revenue"
    | "orders"
    | "customers";
  // Calculate previous period for % change calculation
  const periodMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - periodMs);
  const prevEnd = new Date(start.getTime());

  try {
    // === PRODUCTS ===
    const productsRaw = await models.ecommerceProduct.findAll({
      include: [
        {
          model: models.ecommerceOrderItem,
          as: "ecommerceOrderItems",
          attributes: [],
        },
        {
          model: models.ecommerceCategory,
          as: "category",
          attributes: ["id", "name"],
        },
      ],
      attributes: {
        include: [
          [
            fn("COALESCE", fn("SUM", col("ecommerceOrderItems.quantity")), 0),
            "soldCount",
          ],
        ],
      },
      group: ["ecommerceProduct.id", "category.id"],
      raw: false,
      paranoid: false,
    });

    const products = productsRaw.map((p) => ({
      ...p.get({ plain: true }),
      soldCount: Number(p.get("soldCount") || 0),
    }));

    // === ORDERS ===
    const ordersRaw = await models.ecommerceOrder.findAll({
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: models.ecommerceOrderItem,
          as: "ecommerceOrderItems",
          attributes: ["productId", "quantity"],
        },
      ],
      order: [["createdAt", "DESC"]],
      paranoid: false,
    });

    const orders = ordersRaw.map((o) => {
      const order = o.get({ plain: true });
      order.customer = order.user
        ? {
            name: order.user.firstName + " " + order.user.lastName,
            email: order.user.email,
          }
        : { name: "Guest", email: "" };
      order.total = (order.ecommerceOrderItems || []).reduce(
        (sum, i) => sum + (i.quantity || 0),
        0
      );
      return order;
    });

    // === CUSTOMERS ===
    const customersRaw = await models.user.findAll({
      include: [
        {
          model: models.ecommerceOrder,
          as: "ecommerceOrders",
          required: true,
          attributes: [],
        },
      ],
      attributes: [
        "id",
        "firstName",
        "lastName",
        "email",
        "createdAt",
        [fn("COUNT", col("ecommerceOrders.id")), "orderCount"],
      ],
      group: ["user.id"],
      order: [["createdAt", "DESC"]],
      paranoid: false,
    });
    const customers = customersRaw.map((u) => u.get({ plain: true }));

    // === STATS (Current Period) ===
    const completedOrders = orders.filter(
      (o) =>
        (o.status === "COMPLETED" || o.status === "DELIVERED") &&
        o.createdAt >= start &&
        o.createdAt <= end
    );
    const totalRevenue = completedOrders.reduce((sum, o) => {
      const orderSum = (o.ecommerceOrderItems || []).reduce((os, i) => {
        const prod = products.find((p) => p.id === i.productId);
        return os + (prod?.price || 0) * (i.quantity || 0);
      }, 0);
      return sum + orderSum;
    }, 0);

    const ordersInPeriod = orders.filter(
      (o) => o.createdAt >= start && o.createdAt <= end
    );
    const totalOrders = ordersInPeriod.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalUnitsSold = completedOrders.reduce(
      (sum, o) =>
        sum +
        (o.ecommerceOrderItems || []).reduce(
          (os, i) => os + (i.quantity || 0),
          0
        ),
      0
    );
    const newCustomersCount = customers.filter(
      (u) => u.createdAt >= start && u.createdAt <= end
    ).length;
    const pendingOrders = ordersInPeriod.filter(
      (o) => o.status === "PENDING"
    ).length;
    const outOfStockCount = products.filter(
      (p) => (p.inventoryQuantity || 0) === 0
    ).length;
    const shippedToday = ordersInPeriod.filter(
      (o) =>
        o.status === "SHIPPED" &&
        o.updatedAt &&
        new Date(o.updatedAt).toDateString() === now.toDateString()
    ).length;
    const completedOrdersCount = ordersInPeriod.filter(
      (o) => o.status === "DELIVERED"
    ).length;

    // === STATS (Previous Period, for change % calculation) ===
    const completedOrdersPrev = orders.filter(
      (o) =>
        (o.status === "COMPLETED" || o.status === "DELIVERED") &&
        o.createdAt >= prevStart &&
        o.createdAt < prevEnd
    );
    const totalRevenuePrev = completedOrdersPrev.reduce((sum, o) => {
      const orderSum = (o.ecommerceOrderItems || []).reduce((os, i) => {
        const prod = products.find((p) => p.id === i.productId);
        return os + (prod?.price || 0) * (i.quantity || 0);
      }, 0);
      return sum + orderSum;
    }, 0);

    const ordersPrev = orders.filter(
      (o) => o.createdAt >= prevStart && o.createdAt < prevEnd
    ).length;
    const avgOrderValuePrev =
      ordersPrev > 0 ? totalRevenuePrev / ordersPrev : 0;
    const unitsSoldPrev = completedOrdersPrev.reduce(
      (sum, o) =>
        sum +
        (o.ecommerceOrderItems || []).reduce(
          (os, i) => os + (i.quantity || 0),
          0
        ),
      0
    );
    const newCustomersPrev = customers.filter(
      (u) => u.createdAt >= prevStart && u.createdAt < prevEnd
    ).length;

    // === Change % Calculations ===
    function calcChange(now: number, prev: number): number {
      if (prev === 0 && now === 0) return 0;
      if (prev === 0) return 100;
      return ((now - prev) / prev) * 100;
    }
    const revenueChange = calcChange(totalRevenue, totalRevenuePrev);
    const ordersChange = calcChange(totalOrders, ordersPrev);
    const averageOrderChange = calcChange(averageOrderValue, avgOrderValuePrev);
    const unitsSoldChange = calcChange(totalUnitsSold, unitsSoldPrev);
    const newCustomersChange = calcChange(newCustomersCount, newCustomersPrev);

    // === Chart Data: build all datasets (7/30/12 based on range) ===
    function buildChartData(
      key: "revenue" | "orders" | "customers" | "unitsSold",
      rangeStart: Date,
      rangeEnd: Date
    ) {
      const chartLabels: string[] = [];
      const chartData: number[] = [];
      const dateUnit: "day" | "month" =
        rangeEnd.getTime() - rangeStart.getTime() > 40 * 24 * 3600 * 1000
          ? "month"
          : "day";
      const cursor = new Date(rangeStart);

      while (cursor <= rangeEnd) {
        chartLabels.push(
          dateUnit === "day"
            ? cursor.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : cursor.toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })
        );

        // Value
        let value = 0;
        if (key === "revenue" || key === "unitsSold") {
          const ordersHere = orders.filter((o) => {
            const d = new Date(o.createdAt);
            if (dateUnit === "day")
              return (
                d.getFullYear() === cursor.getFullYear() &&
                d.getMonth() === cursor.getMonth() &&
                d.getDate() === cursor.getDate()
              );
            else
              return (
                d.getFullYear() === cursor.getFullYear() &&
                d.getMonth() === cursor.getMonth()
              );
          });
          value = ordersHere.reduce((sum, o) => {
            if (o.status !== "COMPLETED" && o.status !== "DELIVERED")
              return sum;
            if (key === "revenue") {
              return (
                sum +
                (o.ecommerceOrderItems || []).reduce((os, i) => {
                  const prod = products.find((p) => p.id === i.productId);
                  return os + (prod?.price || 0) * (i.quantity || 0);
                }, 0)
              );
            } else if (key === "unitsSold") {
              return (
                sum +
                (o.ecommerceOrderItems || []).reduce(
                  (os, i) => os + (i.quantity || 0),
                  0
                )
              );
            }
            return sum;
          }, 0);
        } else if (key === "orders") {
          value = orders.filter((o) => {
            const d = new Date(o.createdAt);
            if (dateUnit === "day")
              return (
                d.getFullYear() === cursor.getFullYear() &&
                d.getMonth() === cursor.getMonth() &&
                d.getDate() === cursor.getDate()
              );
            else
              return (
                d.getFullYear() === cursor.getFullYear() &&
                d.getMonth() === cursor.getMonth()
              );
          }).length;
        } else if (key === "customers") {
          value = customers.filter((u) => {
            const d = new Date(u.createdAt);
            if (dateUnit === "day")
              return (
                d.getFullYear() === cursor.getFullYear() &&
                d.getMonth() === cursor.getMonth() &&
                d.getDate() === cursor.getDate()
              );
            else
              return (
                d.getFullYear() === cursor.getFullYear() &&
                d.getMonth() === cursor.getMonth()
              );
          }).length;
        }
        chartData.push(value);

        // Advance cursor
        if (dateUnit === "day") {
          cursor.setDate(cursor.getDate() + 1);
        } else {
          const origDay = cursor.getDate();
          cursor.setMonth(cursor.getMonth() + 1);
          if (cursor.getDate() < origDay) {
            cursor.setDate(0);
          }
        }
        if (chartLabels.length > 400) break;
      }
      return { labels: chartLabels, data: chartData };
    }

    const revenueChart = buildChartData("revenue", start, end);
    const orderValueChart = buildChartData("orders", start, end);
    const unitsSoldChart = buildChartData("unitsSold", start, end);
    const customersChart = buildChartData("customers", start, end);

    // === Top Products & Recent Data ===
    const topProducts = [...products]
      .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
      .slice(0, 5);
    const recentOrders = [...orders]
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
      .slice(0, 5);

    // === Final shape: match frontend ===
    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalUnitsSold,
      newCustomers: newCustomersCount,
      revenueChange,
      ordersChange,
      averageOrderChange,
      unitsSoldChange,
      newCustomersChange,
      revenueChartData: revenueChart.data,
      orderValueChartData: orderValueChart.data,
      unitsSoldChartData: unitsSoldChart.data,
      customersChartData: customersChart.data,
      topProducts,
      chartData: {
        labels: revenueChart.labels, // By default, revenue chart labels
        datasets: [
          {
            label: chartType,
            data:
              chartType === "revenue"
                ? revenueChart.data
                : chartType === "orders"
                  ? orderValueChart.data
                  : chartType === "customers"
                    ? customersChart.data
                    : [],
          },
        ],
      },
      pendingOrders,
      outOfStockCount,
      shippedToday,
      completedOrders: completedOrdersCount,
      recentOrders,
      // Optionally: categories, customers, orders, products if you want to use them elsewhere
    };
  } catch (err) {
    console.error("Failed to fetch ecommerce dashboard data", err);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch dashboard data",
    });
  }
};
