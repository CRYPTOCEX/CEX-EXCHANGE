import { create } from "zustand";
import type { ecommerceProductAttributes } from "@/types/ecommerce/product";
import type { ecommerceCategoryAttributes } from "@/types/ecommerce/category";
import type { ecommerceOrderAttributes } from "@/types/ecommerce/order";
import type { ecommerceCustomerAttributes } from "@/types/ecommerce/customer";
import { $fetch } from "@/lib/api";
import { format } from "date-fns";

interface TopProduct {
  id: number | string;
  name: string;
  type: string;
  unitsSold: number;
  revenue: number;
}

interface AdminEcommerceStore {
  // State
  products: ecommerceProductAttributes[];
  categories: ecommerceCategoryAttributes[];
  orders: ecommerceOrderAttributes[];
  customers: ecommerceCustomerAttributes[];
  topProducts: TopProduct[];

  // Loading states
  isLoadingProducts: boolean;
  isLoadingCategories: boolean;
  isLoadingOrders: boolean;
  isLoadingCustomers: boolean;
  isLoadingStats: boolean;
  isLoadingTopProducts: boolean;
  isUpdating: boolean;
  isLoadingChartData: boolean;

  error: string | null;

  // Dashboard stats
  totalRevenue: number;
  averageOrderValue: number;
  totalUnitsSold: number;
  newCustomersCount: number;
  pendingOrders: number;

  // Actions
  fetchProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  fetchCustomers: () => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  fetchTopProducts: () => Promise<void>;
  fetchProductById: (id: string) => Promise<ecommerceProductAttributes | null>;
  fetchCategoryById: (
    id: string
  ) => Promise<ecommerceCategoryAttributes | null>;
  fetchOrderById: (id: string) => Promise<ecommerceOrderAttributes | null>;

  createProduct: (
    product: Partial<ecommerceProductAttributes>
  ) => Promise<void>;
  updateProduct: (
    id: string,
    product: Partial<ecommerceProductAttributes>
  ) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  createCategory: (
    category: Partial<ecommerceCategoryAttributes>
  ) => Promise<void>;
  updateCategory: (
    id: string,
    category: Partial<ecommerceCategoryAttributes>
  ) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  updateOrderStatus: (
    orderId: string,
    status: "PENDING" | "REJECTED" | "COMPLETED" | "CANCELLED"
  ) => Promise<void>;
  fetchChartData: (
    startDate: Date,
    endDate: Date,
    type?: string
  ) => Promise<any | null>;
}

export const useAdminEcommerceStore = create<AdminEcommerceStore>(
  (set, get) => ({
    // Initial state
    products: [],
    categories: [],
    orders: [],
    customers: [],
    topProducts: [],

    // Loading states
    isLoadingProducts: false,
    isLoadingCategories: false,
    isLoadingOrders: false,
    isLoadingCustomers: false,
    isLoadingStats: false,
    isLoadingTopProducts: false,
    isUpdating: false,
    isLoadingChartData: false,

    error: null,

    // Dashboard stats
    totalRevenue: 0,
    averageOrderValue: 0,
    totalUnitsSold: 0,
    newCustomersCount: 0,
    pendingOrders: 0,

    // Fetch products
    fetchProducts: async () => {
      if (get().isLoadingProducts) return;
      set({ isLoadingProducts: true, error: null });

      const { data, error } = await $fetch({
        url: "/api/admin/ecommerce/product",
        method: "GET",
        silentSuccess: true,
      });

      if (error) {
        set({
          error: error || "Failed to fetch products",
          isLoadingProducts: false,
        });
        return;
      }

      set({ products: data || [], isLoadingProducts: false });
    },

    // Fetch categories
    fetchCategories: async () => {
      if (get().isLoadingCategories) return;
      set({ isLoadingCategories: true, error: null });

      const { data, error } = await $fetch({
        url: "/api/admin/ecommerce/category",
        method: "GET",
        silentSuccess: true,
      });

      if (error) {
        set({
          error: error || "Failed to fetch categories",
          isLoadingCategories: false,
        });
        return;
      }

      set({ categories: data || [], isLoadingCategories: false });
    },

    // Fetch orders
    fetchOrders: async () => {
      if (get().isLoadingOrders) return;
      set({ isLoadingOrders: true, error: null });

      const { data, error } = await $fetch({
        url: "/api/admin/ecommerce/orders",
        method: "GET",
        silentSuccess: true,
      });

      if (error) {
        set({
          error: error || "Failed to fetch orders",
          isLoadingOrders: false,
        });
        return;
      }

      set({ orders: data || [], isLoadingOrders: false });
    },

    // Fetch customers
    fetchCustomers: async () => {
      if (get().isLoadingCustomers) return;
      set({ isLoadingCustomers: true, error: null });

      const { data, error } = await $fetch({
        url: "/api/admin/ecommerce/customers",
        method: "GET",
        silentSuccess: true,
      });

      if (error) {
        set({
          error: error || "Failed to fetch customers",
          isLoadingCustomers: false,
        });
        return;
      }

      set({ customers: data || [], isLoadingCustomers: false });
    },

    // Fetch dashboard stats
    fetchDashboardStats: async () => {
      if (get().isLoadingStats) return;
      set({ isLoadingStats: true, error: null });

      const { data, error } = await $fetch({
        url: "/api/admin/ecommerce/dashboard/stats",
        method: "GET",
        silentSuccess: true,
      });

      if (error) {
        set({
          error: error || "Failed to fetch dashboard stats",
          isLoadingStats: false,
        });
        return;
      }

      if (data) {
        set({
          totalRevenue: data.totalRevenue || 0,
          averageOrderValue: data.averageOrderValue || 0,
          totalUnitsSold: data.totalUnitsSold || 0,
          newCustomersCount: data.newCustomers || 0,
          pendingOrders: get().orders.filter(
            (order) => order.status === "PENDING"
          ).length,
          isLoadingStats: false,
        });
      }
    },

    // Fetch top products
    fetchTopProducts: async () => {
      if (get().isLoadingTopProducts) return;
      set({ isLoadingTopProducts: true, error: null });

      const { data, error } = await $fetch({
        url: "/api/admin/ecommerce/dashboard/stats",
        method: "GET",
        silentSuccess: true,
      });

      if (error) {
        set({
          error: error || "Failed to fetch top products",
          isLoadingTopProducts: false,
        });
        return;
      }

      if (data && data.topProducts) {
        set({ topProducts: data.topProducts, isLoadingTopProducts: false });
      } else {
        set({ topProducts: [], isLoadingTopProducts: false });
      }
    },

    // Fetch product by ID
    fetchProductById: async (id: string) => {
      set({ isLoadingProducts: true, error: null });

      const { data, error } = await $fetch({
        url: `/api/admin/ecommerce/product/${id}`,
        method: "GET",
        silentSuccess: true,
      });

      if (error) {
        set({
          error: error || `Failed to fetch product ${id}`,
          isLoadingProducts: false,
        });
        return null;
      }

      set({ isLoadingProducts: false });
      return data;
    },

    // Fetch category by ID
    fetchCategoryById: async (id: string) => {
      set({ isLoadingCategories: true, error: null });

      const { data, error } = await $fetch({
        url: `/api/admin/ecommerce/category/${id}`,
        method: "GET",
        silentSuccess: true,
      });

      if (error) {
        set({
          error: error || `Failed to fetch category ${id}`,
          isLoadingCategories: false,
        });
        return null;
      }

      set({ isLoadingCategories: false });
      return data;
    },

    // Fetch order by ID
    fetchOrderById: async (id: string) => {
      set({ isLoadingOrders: true, error: null });

      const { data, error } = await $fetch({
        url: `/api/admin/ecommerce/orders/${id}`,
        method: "GET",
        silentSuccess: true,
      });

      if (error) {
        set({
          error: error || `Failed to fetch order ${id}`,
          isLoadingOrders: false,
        });
        return null;
      }

      set({ isLoadingOrders: false });
      return data;
    },

    // Create product
    createProduct: async (product: Partial<ecommerceProductAttributes>) => {
      set({ isUpdating: true, error: null });

      const { data, error } = await $fetch({
        url: "/api/admin/ecommerce/product",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: product,
      });

      if (error) {
        set({
          error: error || "Failed to create product",
          isUpdating: false,
        });
        throw new Error(error || "Failed to create product");
      }

      // Update products list with the new product
      set((state) => ({
        products: [...state.products, data],
        isUpdating: false,
      }));
    },

    // Update product
    updateProduct: async (
      id: string,
      product: Partial<ecommerceProductAttributes>
    ) => {
      set({ isUpdating: true, error: null });

      const { data, error } = await $fetch({
        url: `/api/admin/ecommerce/product/${id}`,
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: product,
      });

      if (error) {
        set({
          error: error || `Failed to update product ${id}`,
          isUpdating: false,
        });
        throw new Error(error || `Failed to update product ${id}`);
      }

      // Update products list with the updated product
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, ...data } : p
        ),
        isUpdating: false,
      }));
    },

    // Delete product
    deleteProduct: async (id: string) => {
      set({ isUpdating: true, error: null });

      const { data, error } = await $fetch({
        url: `/api/admin/ecommerce/product/${id}`,
        method: "DELETE",
        silentSuccess: true,
      });

      if (error) {
        set({
          error: error || `Failed to delete product ${id}`,
          isUpdating: false,
        });
        return;
      }

      // Remove the deleted product from the products list
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        isUpdating: false,
      }));
    },

    // Create category
    createCategory: async (category: Partial<ecommerceCategoryAttributes>) => {
      set({ isUpdating: true, error: null });

      const { data, error } = await $fetch({
        url: "/api/admin/ecommerce/category",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: category,
      });

      if (error) {
        set({
          error: error || "Failed to create category",
          isUpdating: false,
        });
        throw new Error(error || "Failed to create category");
      }

      // Update categories list with the new category
      set((state) => ({
        categories: [...state.categories, data],
        isUpdating: false,
      }));
    },

    // Update category
    updateCategory: async (
      id: string,
      category: Partial<ecommerceCategoryAttributes>
    ) => {
      set({ isUpdating: true, error: null });

      const { data, error } = await $fetch({
        url: `/api/admin/ecommerce/category/${id}`,
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: category,
      });

      if (error) {
        set({
          error: error || `Failed to update category ${id}`,
          isUpdating: false,
        });
        throw new Error(error || `Failed to update category ${id}`);
      }

      // Update categories list with the updated category
      set((state) => ({
        categories: state.categories.map((c) =>
          c.id === id ? { ...c, ...data } : c
        ),
        isUpdating: false,
      }));
    },

    // Delete category
    deleteCategory: async (id: string) => {
      set({ isUpdating: true, error: null });

      const { data, error } = await $fetch({
        url: `/api/admin/ecommerce/category/${id}`,
        method: "DELETE",
        silentSuccess: true,
      });

      if (error) {
        set({
          error: error || `Failed to delete category ${id}`,
          isUpdating: false,
        });
        return;
      }

      // Remove the deleted category from the categories list
      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
        isUpdating: false,
      }));
    },

    // Update order status
    updateOrderStatus: async (
      orderId: string,
      status: "PENDING" | "REJECTED" | "COMPLETED" | "CANCELLED"
    ) => {
      set({ isUpdating: true, error: null });

      const { data, error } = await $fetch({
        url: "/api/admin/ecommerce/orders",
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: { orderId, status },
      });

      if (error) {
        set({
          error: error || `Failed to update order status for ${orderId}`,
          isUpdating: false,
        });
        return;
      }

      // Update orders list with the updated status
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId ? { ...o, status } : o
        ),
        isUpdating: false,
      }));
    },
    // Add or update the fetchChartData function in the store
    fetchChartData: async (
      startDate: Date,
      endDate: Date,
      type = "revenue"
    ) => {
      if (get().isLoadingChartData) return null;
      set({ isLoadingChartData: true, error: null });

      const formattedStartDate = format(startDate, "yyyy-MM-dd");
      const formattedEndDate = format(endDate, "yyyy-MM-dd");

      const { data, error } = await $fetch({
        url: `/api/admin/ecommerce/dashboard/chart?startDate=${formattedStartDate}&endDate=${formattedEndDate}&type=${type}`,
        method: "GET",
        silentSuccess: true,
      });

      if (error) {
        set({
          error: error || "Failed to fetch chart data",
          isLoadingChartData: false,
        });
        return null;
      }

      set({ isLoadingChartData: false });
      return data;
    },
  })
);
