import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { useConfigStore } from "./config";

export interface Product {
  id: string;
  productId: string;
  name: string;
  title: string;
  description?: string;
  link?: string;
  status: boolean;
  version: string;
  image?: string;
  category: "extension" | "blockchain" | "exchange";
  chain?: string; // For blockchains
  type?: string; // For exchanges (spot, futures)
  licenseVerified: boolean;
  hasLicenseUpdate: boolean;
  licenseVersion?: string;
  licenseReleaseDate?: string;
  licenseSummary?: string;
}

interface ProductsState {
  extensions: Product[];
  blockchains: Product[];
  exchangeProviders: Product[];
  allProducts: Product[];
  filteredProducts: Product[];
  isLoading: boolean;
  error: string | null;
  toggleError: string | null; // Separate error for toggle operations
  filter: string;
  categoryFilter: "all" | "extension" | "blockchain" | "exchange";
  statusFilter: "all" | "active" | "inactive" | "licensed" | "unlicensed";
  selectedProduct: Product | null;

  // Actions
  fetchProducts: () => Promise<void>;
  applyFilters: () => void;
  setFilter: (filter: string) => void;
  setCategoryFilter: (category: "all" | "extension" | "blockchain" | "exchange") => void;
  setStatusFilter: (status: "all" | "active" | "inactive" | "licensed" | "unlicensed") => void;
  toggleProductStatus: (product: Product) => Promise<void>;
  setSelectedProduct: (product: Product | null) => void;
  refreshProducts: () => Promise<void>;
  clearToggleError: () => void;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  extensions: [],
  blockchains: [],
  exchangeProviders: [],
  allProducts: [],
  filteredProducts: [],
  isLoading: false,
  error: null,
  toggleError: null,
  filter: "",
  categoryFilter: "all",
  statusFilter: "all",
  selectedProduct: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/system/extension",
        silent: true,
      });

      if (error) throw new Error(error);

      if (data) {
        const extensions = data.extensions || [];
        const blockchains = data.blockchains || [];
        const exchangeProviders = data.exchangeProviders || [];

        const allProducts = [...extensions, ...blockchains, ...exchangeProviders];

        set({
          extensions,
          blockchains,
          exchangeProviders,
          allProducts,
          filteredProducts: allProducts,
        });

        // Apply current filters
        get().applyFilters();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to fetch products:", errorMessage);
      set({ error: errorMessage || "Failed to fetch products" });
    } finally {
      set({ isLoading: false });
    }
  },

  applyFilters: () => {
    const { allProducts, filter, categoryFilter, statusFilter } = get();

    let filtered = [...allProducts];

    // Apply text filter
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(lowerFilter) ||
          p.name?.toLowerCase().includes(lowerFilter) ||
          p.description?.toLowerCase().includes(lowerFilter)
      );
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter === "active") {
      filtered = filtered.filter((p) => p.status);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((p) => !p.status);
    } else if (statusFilter === "licensed") {
      filtered = filtered.filter((p) => p.licenseVerified);
    } else if (statusFilter === "unlicensed") {
      filtered = filtered.filter((p) => !p.licenseVerified);
    }

    set({ filteredProducts: filtered });
  },

  setFilter: (filter: string) => {
    set({ filter });
    get().applyFilters();
  },

  setCategoryFilter: (categoryFilter) => {
    set({ categoryFilter });
    get().applyFilters();
  },

  setStatusFilter: (statusFilter) => {
    set({ statusFilter });
    get().applyFilters();
  },

  toggleProductStatus: async (product: Product) => {
    const newStatus = !product.status;

    // Clear any previous toggle error
    set({ toggleError: null });

    try {
      let url = "";

      switch (product.category) {
        case "extension":
          url = `/api/admin/system/extension/${product.productId}/status`;
          break;
        case "blockchain":
          // Blockchain API expects productId in URL path
          url = `/api/admin/ecosystem/blockchain/${product.productId}/status`;
          break;
        case "exchange":
          url = `/api/admin/finance/exchange/provider/${product.id}/status`;
          break;
      }

      const { error } = await $fetch({
        url,
        method: "PUT",
        body: { status: newStatus },
      });

      if (error) throw new Error(error);

      // Update local state
      // For exchanges, enabling one should disable others (backend handles this too)
      set((state) => {
        const updateProduct = (p: Product) => {
          if (p.id === product.id) {
            return { ...p, status: newStatus };
          }
          // If enabling an exchange, disable all other exchanges
          if (product.category === "exchange" && newStatus && p.category === "exchange") {
            return { ...p, status: false };
          }
          return p;
        };

        return {
          extensions: state.extensions.map(updateProduct),
          blockchains: state.blockchains.map(updateProduct),
          exchangeProviders: state.exchangeProviders.map(updateProduct),
          allProducts: state.allProducts.map(updateProduct),
          filteredProducts: state.filteredProducts.map(updateProduct),
        };
      });

      // Refresh settings cache
      try {
        const { data: settingsData } = await $fetch({
          url: "/api/settings",
          silent: true,
        });

        if (settingsData) {
          const configStore = useConfigStore.getState();

          if (settingsData.settings) {
            const settingsObj = settingsData.settings.reduce(
              (acc: Record<string, any>, cur: { key: string; value: any }) => {
                acc[cur.key] = cur.value;
                return acc;
              },
              {}
            );
            configStore.setSettings(settingsObj);
          }

          if (settingsData.extensions) {
            configStore.setExtensions(settingsData.extensions);
          }

          configStore.setSettingsFetched(true);
          configStore.setSettingsError(null);
        }
      } catch (e) {
        console.warn("Failed to refresh settings cache:", e);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to toggle product status:", errorMessage);
      // Use toggleError instead of error to avoid breaking the page
      set({ toggleError: errorMessage });
    }
  },

  setSelectedProduct: (product) => {
    set({ selectedProduct: product });
  },

  refreshProducts: async () => {
    // Clear cache and refetch
    set({ extensions: [], blockchains: [], exchangeProviders: [], allProducts: [], filteredProducts: [] });
    await get().fetchProducts();
  },

  clearToggleError: () => {
    set({ toggleError: null });
  },
}));
