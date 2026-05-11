// Import types from the correct files instead of defining them inline
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { $fetch } from "@/lib/api";

interface CartItem {
  product: ecommerceProduct;
  quantity: number;
}

interface WishlistItem {
  product: ecommerceProduct;
  addedAt: Date;
}

interface EcommerceStore {
  products: ecommerceProduct[];
  categories: ecommerceCategory[];
  selectedProduct: ecommerceProduct | null;
  cart: CartItem[];
  wishlist: WishlistItem[];

  // Split loading states
  isLoadingProducts: boolean;
  isLoadingCategories: boolean;
  isLoadingProduct: boolean;
  isLoadingOrders: boolean;
  isProcessingOrder: boolean;
  isDownloading: boolean;
  fetchCategoryBySlug: (slug: string) => Promise<ecommerceCategory | null>;
  selectedCategory: ecommerceCategory | null;
  isLoadingCategory: boolean;

  error: string | null;
  orders: ecommerceOrder[];
  reviews: ecommerceReviewAttributes[];

  fetchProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchProductsByCategory: (categorySlug: string) => Promise<void>;
  fetchProductBySlug: (slug: string) => Promise<ecommerceProduct | null>;
  fetchOrders: () => Promise<void>;
  fetchOrderById: (orderId: string) => Promise<ecommerceOrderAttributes | null>;
  trackOrder: (orderId: string) => Promise<any>;
  downloadDigitalProduct: (orderItemId: string) => Promise<string>;

  addToCart: (product: ecommerceProduct, quantity: number) => boolean;
  removeFromCart: (productId: string) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => boolean;
  clearCart: () => void;

  addToWishlist: (product: ecommerceProduct) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  fetchWishlist: () => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;

  getCartTotal: () => number;
  getCartItemCount: () => number;
}

export const useEcommerceStore = create<EcommerceStore>()(
  persist(
    (set, get) => ({
      products: [],
      categories: [],
      selectedProduct: null,
      cart: [],
      wishlist: [],

      // Split loading states
      isLoadingProducts: false,
      isLoadingCategories: false,
      isLoadingProduct: false,
      isLoadingOrders: false,
      isProcessingOrder: false,
      isDownloading: false,
      selectedCategory: null,
      isLoadingCategory: false,

      error: null,
      orders: [],
      reviews: [],

      fetchProducts: async () => {
        if (get().isLoadingProducts) return;
        set({ isLoadingProducts: true, error: null });

        const { data, error } = await $fetch({
          url: "/api/ecommerce/product",
          silentSuccess: true,
        });

        if (error) {
          const errorMessage = error || `Error fetching products`;
          set({ error: errorMessage, isLoadingProducts: false });
          return;
        }

        set({ products: data, isLoadingProducts: false });
      },

      fetchCategories: async () => {
        if (get().isLoadingCategories) return;
        set({ isLoadingCategories: true, error: null });

        const { data, error } = await $fetch({
          url: "/api/ecommerce/category",
          silentSuccess: true,
        });

        if (error) {
          const errorMessage = error || `Error fetching categories`;
          set({ error: errorMessage, isLoadingCategories: false });
          return;
        }

        set({ categories: data, isLoadingCategories: false });
      },

      fetchProductsByCategory: async (categorySlug: string) => {
        if (get().isLoadingProducts) return;
        set({ isLoadingProducts: true, error: null });

        const { data, error } = await $fetch({
          url: `/api/ecommerce/category/${categorySlug}/product`,
          silentSuccess: true,
        });

        if (error) {
          const errorMessage = error || `Error fetching category products`;
          set({ error: errorMessage, isLoadingProducts: false });
          return;
        }

        set({ products: data, isLoadingProducts: false });
      },

      fetchProductBySlug: async (slug: string) => {
        if (get().isLoadingProduct) return null;
        set({ isLoadingProduct: true, error: null });

        const { data, error } = await $fetch({
          url: `/api/ecommerce/product/${slug}`,
          silentSuccess: true,
        });

        if (error) {
          const errorMessage = error || `Error fetching product`;
          set({
            error: errorMessage,
            isLoadingProduct: false,
            selectedProduct: null,
          });
          return null;
        }

        set({ selectedProduct: data, isLoadingProduct: false });
        return data;
      },

      fetchOrders: async () => {
        if (get().isLoadingOrders) return;
        set({ isLoadingOrders: true, error: null });

        const { data, error } = await $fetch({
          url: "/api/ecommerce/order",
          silentSuccess: true,
        });

        if (error) {
          const errorMessage = error || `Error fetching orders`;
          set({ error: errorMessage, isLoadingOrders: false });
          return;
        }

        set({ orders: data, isLoadingOrders: false });
      },

      fetchOrderById: async (orderId: string) => {
        set({ isLoadingOrders: true, error: null });

        const { data, error } = await $fetch({
          url: `/api/ecommerce/order/${orderId}`,
          silentSuccess: true,
        });

        if (error) {
          const errorMessage = error || `Error fetching order`;
          set({ error: errorMessage, isLoadingOrders: false });
          return null;
        }

        set({ isLoadingOrders: false });
        return data;
      },

      trackOrder: async (orderId: string) => {
        set({ isLoadingOrders: true, error: null });

        const { data, error } = await $fetch({
          url: `/api/ecommerce/order/${orderId}/track`,
          silentSuccess: true,
        });

        if (error) {
          const errorMessage = error || `Error tracking order`;
          set({ error: errorMessage, isLoadingOrders: false });
          return null;
        }

        set({ isLoadingOrders: false });
        return data;
      },

      downloadDigitalProduct: async (orderItemId: string) => {
        set({ isDownloading: true, error: null });

        const { data, error } = await $fetch({
          url: `/api/ecommerce/download/${orderItemId}`,
          silentSuccess: true,
        });

        if (error) {
          const errorMessage = error || `Error downloading product`;
          set({ error: errorMessage, isDownloading: false });
          return "";
        }

        set({ isDownloading: false });
        return data.downloadUrl || "";
      },

      // BUG-18: Cart validates inventory for physical products
      addToCart: (product: ecommerceProduct, quantity: number) => {
        const { cart } = get();
        const existingItem = cart.find(
          (item) => item.product.id === product.id
        );

        const currentQty = existingItem ? existingItem.quantity : 0;
        const newQty = currentQty + quantity;

        // Validate inventory for physical products
        if (product.type === "PHYSICAL" && newQty > product.inventoryQuantity) {
          set({ error: `Only ${product.inventoryQuantity} units available` });
          return false;
        }

        if (existingItem) {
          const updatedCart = cart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: newQty }
              : item
          );
          set({ cart: updatedCart, error: null });
        } else {
          set({ cart: [...cart, { product, quantity }], error: null });
        }
        return true;
      },

      removeFromCart: (productId: string) => {
        const { cart } = get();
        set({ cart: cart.filter((item) => item.product.id !== productId) });
      },

      // BUG-18: Validate inventory on quantity update
      updateCartItemQuantity: (productId: string, quantity: number) => {
        const { cart } = get();
        const item = cart.find((i) => i.product.id === productId);
        if (item && item.product.type === "PHYSICAL" && quantity > item.product.inventoryQuantity) {
          set({ error: `Only ${item.product.inventoryQuantity} units available` });
          return false;
        }

        const updatedCart = cart.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        );
        set({ cart: updatedCart, error: null });
        return true;
      },

      clearCart: () => {
        set({ cart: [] });
      },

      // BUG-12: Wishlist functions now sync with backend API
      addToWishlist: async (product: ecommerceProduct) => {
        const { wishlist } = get();
        const isAlreadyInWishlist = wishlist.some(
          (item) => item.product.id === product.id
        );

        if (isAlreadyInWishlist) {
          return;
        }

        // Optimistically update local state
        set({ wishlist: [...wishlist, { product, addedAt: new Date() }] });

        // Sync with backend
        const { error } = await $fetch({
          url: "/api/ecommerce/wishlist",
          method: "POST",
          body: { productId: product.id },
          silent: true,
        });

        if (error) {
          // Revert on failure
          set({
            wishlist: wishlist.filter((item) => item.product.id !== product.id),
          });
        }
      },

      removeFromWishlist: async (productId: string) => {
        const { wishlist } = get();
        const removedItem = wishlist.find((item) => item.product.id === productId);

        // Optimistically update local state
        set({
          wishlist: wishlist.filter((item) => item.product.id !== productId),
        });

        // Find the wishlist item to get its backend ID
        const { data: wishlistData } = await $fetch({
          url: "/api/ecommerce/wishlist",
          silentSuccess: true,
          silent: true,
        });

        if (wishlistData?.items) {
          const backendItem = wishlistData.items.find(
            (item: any) => item.productId === productId
          );
          if (backendItem) {
            const { error } = await $fetch({
              url: `/api/ecommerce/wishlist/${backendItem.id}`,
              method: "DELETE",
              silent: true,
            });

            if (error && removedItem) {
              // Revert on failure
              set({ wishlist: [...get().wishlist, removedItem] });
            }
          }
        }
      },

      fetchWishlist: async () => {
        const { data, error } = await $fetch({
          url: "/api/ecommerce/wishlist",
          silentSuccess: true,
          silent: true,
        });

        if (!error && data?.items) {
          const wishlistItems: WishlistItem[] = data.items.map((item: any) => ({
            product: item.product,
            addedAt: new Date(item.createdAt || Date.now()),
          }));
          set({ wishlist: wishlistItems });
        }
      },

      isInWishlist: (productId: string) => {
        const { wishlist } = get();
        return wishlist.some((item) => item.product.id === productId);
      },

      clearWishlist: () => {
        set({ wishlist: [] });
      },

      getCartTotal: () => {
        const { cart } = get();
        return cart.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },

      getCartItemCount: () => {
        const { cart } = get();
        return cart.reduce((count, item) => count + item.quantity, 0);
      },
      fetchCategoryBySlug: async (slug: string) => {
        if (get().isLoadingCategory) return null;
        set({ isLoadingCategory: true, error: null });

        const { data, error } = await $fetch({
          url: `/api/ecommerce/category/${slug}`,
          silentSuccess: true,
        });

        if (error) {
          const errorMessage = error || `Error fetching category`;
          set({
            error: errorMessage,
            isLoadingCategory: false,
            selectedCategory: null,
          });
          return null;
        }

        set({ selectedCategory: data, isLoadingCategory: false });
        return data;
      },
    }),
    {
      name: "ecommerce-storage", // name of the item in localStorage
      partialize: (state) => ({
        cart: state.cart,
        wishlist: state.wishlist,
      }),
    }
  )
);
