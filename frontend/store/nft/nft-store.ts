import { create } from "zustand";
import { $fetch } from "@/lib/api";
import type { 
  NftToken, 
  NftCollection, 
  NftCategory, 
  NftListing,
  NftActivity 
} from "@/types/nft";

interface NFTFilters {
  search?: string;
  categoryId?: string;
  collectionId?: string;
  creatorId?: string;
  ownerId?: string;
  status?: string;
  rarity?: string;
  priceRange?: string;
  sortBy?: string;
  isMinted?: boolean;
  isListed?: boolean;
  isStaked?: boolean;
}

// Helper function to filter out undefined values
const cleanFilters = (filters: NFTFilters): Record<string, string | number | boolean> => {
  return Object.fromEntries(
    Object.entries(filters).filter(([_, value]) => value !== undefined)
  ) as Record<string, string | number | boolean>;
};

interface NFTStore {
  // State
  tokens: NftToken[];
  collections: NftCollection[];
  categories: NftCategory[];
  listings: NftListing[];
  activities: NftActivity[];
  selectedToken: NftToken | null;
  selectedCollection: NftCollection | null;
  loading: boolean;
  error: string | null;
  filters: NFTFilters;

  // Actions
  fetchTokens: (filters?: NFTFilters) => Promise<void>;
  fetchCollections: (filters?: NFTFilters) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchListings: (filters?: NFTFilters) => Promise<void>;
  fetchActivities: (filters?: NFTFilters) => Promise<void>;
  
  fetchTokenById: (id: string) => Promise<void>;
  fetchCollectionById: (id: string) => Promise<void>;
  
  createCollection: (data: any) => Promise<void>;
  createToken: (data: any) => Promise<void>;
  
  updateToken: (id: string, data: any) => Promise<void>;
  updateCollection: (id: string, data: any) => Promise<void>;
  
  // Marketplace actions
  listToken: (tokenId: string, data: any) => Promise<void>;
  buyToken: (listingId: string) => Promise<void>;
  cancelListing: (listingId: string) => Promise<void>;
  makeOffer: (tokenId: string, data: any) => Promise<void>;
  
  // Favorites
  addToFavorites: (tokenId?: string, collectionId?: string) => Promise<void>;
  removeFromFavorites: (tokenId?: string, collectionId?: string) => Promise<void>;
  
  // Toggle favorite (convenience method)
  toggleFavorite: (id: string, type: "token" | "collection") => Promise<void>;
  
  // Utilities
  setFilters: (filters: NFTFilters) => void;
  clearError: () => void;
  reset: () => void;
}

export const useNftStore = create<NFTStore>((set, get) => ({
  // Initial state
  tokens: [],
  collections: [],
  categories: [],
  listings: [],
  activities: [],
  selectedToken: null,
  selectedCollection: null,
  loading: false,
  error: null,
  filters: {},

  // Fetch tokens
  fetchTokens: async (filters = {}) => {
    set({ loading: true, error: null, filters: { ...get().filters, ...filters } });
    
    const { data, error } = await $fetch({
      url: "/api/nft/token",
      method: "GET",
      params: cleanFilters(filters),
      silentSuccess: true,
    });

    if (error) {
      set({ error, loading: false });
    } else {
      set({ tokens: data || [], loading: false });
    }
  },

  // Fetch collections
  fetchCollections: async (filters = {}) => {
    set({ loading: true, error: null, filters: { ...get().filters, ...filters } });
    
    const { data, error } = await $fetch({
      url: "/api/nft/collection",
      method: "GET",
      params: cleanFilters(filters),
      silentSuccess: true,
    });

    if (error) {
      set({ error, loading: false });
    } else {
      set({ collections: data || [], loading: false });
    }
  },

  // Fetch categories
  fetchCategories: async () => {
    const { data, error } = await $fetch({
      url: "/api/nft/categories",
      method: "GET",
      silentSuccess: true,
    });

    if (error) {
      set({ error });
    } else {
      set({ categories: data || [] });
    }
  },

  // Fetch listings
  fetchListings: async (filters = {}) => {
    set({ loading: true, error: null });
    
    const listingsData = await $fetch({
      url: "/api/ext/nft/listing",
      method: "GET",
      params: cleanFilters(filters),
      silentSuccess: true,
    });

    if (listingsData && !listingsData.error) {
      const responseData = listingsData.data || listingsData;
      set({ listings: Array.isArray(responseData) ? responseData : responseData.data || [], loading: false });
    } else {
      set({ error: listingsData?.error || "Failed to fetch listings", loading: false });
    }
  },

  // Fetch activities
  fetchActivities: async (filters = {}) => {
    const { data, error } = await $fetch({
      url: "/api/nft/activity",
      method: "GET",
      params: cleanFilters(filters),
      silentSuccess: true,
    });

    if (error) {
      set({ error });
    } else {
      set({ activities: data || [] });
    }
  },

  // Fetch single token
  fetchTokenById: async (id: string) => {
    set({ loading: true, error: null });
    
    const { data, error } = await $fetch({
      url: `/api/nft/token/${id}`,
      method: "GET",
      silentSuccess: true,
    });

    if (error) {
      set({ error, loading: false });
    } else {
      set({ selectedToken: data, loading: false });
    }
  },

  // Fetch single collection
  fetchCollectionById: async (id: string) => {
    set({ loading: true, error: null });
    
    const { data, error } = await $fetch({
      url: `/api/nft/collection/${id}`,
      method: "GET",
      silentSuccess: true,
    });

    if (error) {
      set({ error, loading: false });
    } else {
      set({ selectedCollection: data, loading: false });
    }
  },

  // Create collection
  createCollection: async (data: any) => {
    set({ loading: true, error: null });
    
    const { data: newCollection, error } = await $fetch({
      url: "/api/nft/collection",
      method: "POST",
      body: data,
      successMessage: "Collection created successfully!",
    });

    if (error) {
      set({ error, loading: false });
    } else {
      const currentCollections = get().collections;
      set({ 
        collections: [newCollection, ...currentCollections],
        loading: false 
      });
    }
  },

  // Create token
  createToken: async (data: any) => {
    set({ loading: true, error: null });
    
    const { data: newToken, error } = await $fetch({
      url: "/api/nft/token",
      method: "POST",
      body: data,
      successMessage: "NFT created successfully!",
    });

    if (error) {
      set({ error, loading: false });
    } else {
      const currentTokens = get().tokens;
      set({ 
        tokens: [newToken, ...currentTokens],
        loading: false 
      });
    }
  },

  // Update token
  updateToken: async (id: string, data: any) => {
    set({ loading: true, error: null });
    
    const { data: updatedToken, error } = await $fetch({
      url: `/api/nft/token/${id}`,
      method: "PUT",
      body: data,
      successMessage: "NFT updated successfully!",
    });

    if (error) {
      set({ error, loading: false });
    } else {
      const currentTokens = get().tokens;
      const updatedTokens = currentTokens.map(token => 
        token.id === id ? updatedToken : token
      );
      set({ 
        tokens: updatedTokens,
        selectedToken: updatedToken,
        loading: false 
      });
    }
  },

  // Update collection
  updateCollection: async (id: string, data: any) => {
    set({ loading: true, error: null });
    
    const { data: updatedCollection, error } = await $fetch({
      url: `/api/nft/collection/${id}`,
      method: "PUT",
      body: data,
      successMessage: "Collection updated successfully!",
    });

    if (error) {
      set({ error, loading: false });
    } else {
      const currentCollections = get().collections;
      const updatedCollections = currentCollections.map(collection => 
        collection.id === id ? updatedCollection : collection
      );
      set({ 
        collections: updatedCollections,
        selectedCollection: updatedCollection,
        loading: false 
      });
    }
  },

  // List token for sale
  listToken: async (tokenId: string, data: any) => {
    set({ loading: true, error: null });
    
    const { data: listing, error } = await $fetch({
      url: "/api/nft/listing",
      method: "POST",
      body: { tokenId, ...data },
      successMessage: "NFT listed for sale!",
    });

    if (error) {
      set({ error, loading: false });
    } else {
      // Update token status
      const currentTokens = get().tokens;
      const updatedTokens = currentTokens.map(token => 
        token.id === tokenId ? { ...token, isListed: true } : token
      );
      set({ 
        tokens: updatedTokens,
        loading: false 
      });
    }
  },

  // Buy token
  buyToken: async (listingId: string) => {
    set({ loading: true, error: null });
    
    const { data, error } = await $fetch({
      url: `/api/nft/listing/${listingId}/buy`,
      method: "POST",
      successMessage: "NFT purchased successfully!",
    });

    if (error) {
      set({ error, loading: false });
    } else {
      // Refresh listings and tokens
      get().fetchListings();
      get().fetchTokens();
      set({ loading: false });
    }
  },

  // Cancel listing
  cancelListing: async (listingId: string) => {
    set({ loading: true, error: null });
    
    const { data, error } = await $fetch({
      url: `/api/nft/listing/${listingId}`,
      method: "DELETE",
      successMessage: "Listing cancelled successfully!",
    });

    if (error) {
      set({ error, loading: false });
    } else {
      // Refresh listings
      get().fetchListings();
      set({ loading: false });
    }
  },

  // Make offer
  makeOffer: async (tokenId: string, data: any) => {
    set({ loading: true, error: null });
    
    const { data: offer, error } = await $fetch({
      url: "/api/nft/offer",
      method: "POST",
      body: { tokenId, ...data },
      successMessage: "Offer submitted successfully!",
    });

    if (error) {
      set({ error, loading: false });
    } else {
      set({ loading: false });
    }
  },

  // Add to favorites
  addToFavorites: async (tokenId?: string, collectionId?: string) => {
    const { data, error } = await $fetch({
      url: "/api/nft/favorite",
      method: "POST",
      body: { tokenId, collectionId },
      successMessage: "Added to favorites!",
    });

    if (!error) {
      // Update local state to show favorited
      if (tokenId) {
        const currentTokens = get().tokens;
        const updatedTokens = currentTokens.map(token => 
          token.id === tokenId ? { ...token, isFavorited: true } : token
        );
        set({ tokens: updatedTokens });
      }
    }
  },

  // Remove from favorites
  removeFromFavorites: async (tokenId?: string, collectionId?: string) => {
    const { data, error } = await $fetch({
      url: "/api/nft/favorite",
      method: "DELETE",
      body: { tokenId, collectionId },
      successMessage: "Removed from favorites!",
    });

    if (!error) {
      // Update local state
      if (tokenId) {
        const currentTokens = get().tokens;
        const updatedTokens = currentTokens.map(token => 
          token.id === tokenId ? { ...token, isFavorited: false } : token
        );
        set({ tokens: updatedTokens });
      }
    }
  },

  // Toggle favorite (convenience method)
  toggleFavorite: async (id: string, type: "token" | "collection") => {
    if (type === "token") {
      const token = get().tokens.find(t => t.id === id);
      if (token?.isFavorited) {
        await get().removeFromFavorites(id);
      } else {
        await get().addToFavorites(id);
      }
    } else {
      // Collection favorites - always attempt to add/remove since we don't track state locally
      await get().addToFavorites(undefined, id);
    }
  },

  // Set filters
  setFilters: (filters: NFTFilters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Reset store
  reset: () => {
    set({
      tokens: [],
      collections: [],
      categories: [],
      listings: [],
      activities: [],
      selectedToken: null,
      selectedCollection: null,
      loading: false,
      error: null,
      filters: {},
    });
  },
})); 