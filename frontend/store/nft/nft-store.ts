import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { retry } from "@/lib/retry";
import type { 
  NftToken, 
  NftCollection, 
  NftCategory, 
  NftListing,
  NftActivity 
} from "@/types/nft";

// Simple cache implementation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttl: number; // Time to live in milliseconds

  constructor(ttlMinutes: number = 5) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Create caches for different data types
const tokenCache = new SimpleCache<any>(5); // 5 minutes TTL
const collectionCache = new SimpleCache<any>(10); // 10 minutes TTL
const categoryCache = new SimpleCache<any>(30); // 30 minutes TTL for rarely changing data

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
  limit?: number;
  offset?: number;
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
  featuredTokens: NftToken[];
  trendingCollections: NftCollection[];
  topCreators: any[];
  marketplaceStats: any;
  chainStats: any[];
  loading: boolean;
  error: string | null;
  filters: NFTFilters;

  // Actions
  fetchTokens: (filters?: NFTFilters) => Promise<void>;
  fetchCollections: (filters?: NFTFilters) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchListings: (filters?: NFTFilters) => Promise<void>;
  fetchActivities: (filters?: NFTFilters) => Promise<void>;
  fetchFeaturedTokens: (limit?: number, category?: string) => Promise<void>;
  fetchTrendingCollections: (limit?: number, timeframe?: string) => Promise<void>;
  fetchTopCreators: (limit?: number, timeframe?: string, sortBy?: string) => Promise<void>;
  fetchMarketplaceStats: (timeframe?: string) => Promise<void>;
  fetchChainStats: () => Promise<void>;

  fetchTokenById: (id: string) => Promise<void>;
  fetchCollectionById: (id: string) => Promise<void>;
  
  createCollection: (data: any) => Promise<void>;
  createToken: (data: any) => Promise<void>;
  
  updateToken: (id: string, data: any) => Promise<void>;
  updateCollection: (id: string, data: any) => Promise<void>;
  
  // Marketplace actions
  listToken: (tokenId: string, data: any) => Promise<{ error: string | null; data: any }>;
  buyToken: (listingId: string) => Promise<void>;
  cancelListing: (listingId: string) => Promise<void>;
  makeOffer: (tokenId: string, data: any) => Promise<void>;
  
  // Favorites
  addToFavorites: (tokenId?: string, collectionId?: string) => Promise<void>;
  removeFromFavorites: (tokenId?: string, collectionId?: string) => Promise<void>;
  
  // Toggle favorite (convenience method)
  toggleFavorite: (id: string, type: "token" | "collection") => Promise<void>;

  // Follow/Unfollow creators
  followCreator: (userId: string) => Promise<void>;
  unfollowCreator: (userId: string) => Promise<void>;
  toggleFollowCreator: (userId: string) => Promise<void>;

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
  featuredTokens: [],
  trendingCollections: [],
  topCreators: [],
  chainStats: [],
  marketplaceStats: null,
  loading: false,
  error: null,
  filters: {},

  // Fetch tokens with retry functionality
  fetchTokens: async (filters = {}) => {
    const cacheKey = JSON.stringify({ endpoint: 'tokens', filters });
    
    // Check cache first
    const cachedData = tokenCache.get(cacheKey);
    if (cachedData) {
      set({ tokens: cachedData, loading: false, error: null, filters: { ...get().filters, ...filters } });
      return;
    }
    
    set({ loading: true, error: null, filters: { ...get().filters, ...filters } });
    
    try {
      const result = await retry(
        async () => {
          const { data, error } = await $fetch({
            url: "/api/nft/token",
            method: "GET",
            params: cleanFilters(filters),
            silentSuccess: true,
          });

          if (error) {
            throw new Error(error);
          }

          return data;
        },
        {
          retries: 3,
          delay: 1000,
          onRetry: (error, attempt) => {
            console.log(`Retrying fetch tokens (attempt ${attempt}):`, error.message);
          },
        }
      );

      // Transform and cache the result
      const transformedResult = (result || []).map((token: any) => ({
        ...token,
        imageUrl: token.image,
      }));

      if (transformedResult) {
        tokenCache.set(cacheKey, transformedResult);
      }

      set({ tokens: transformedResult, loading: false, error: null });
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to fetch tokens", 
        loading: false 
      });
    }
  },

  // Fetch collections (for marketplace display)
  fetchCollections: async (filters = {}) => {
    set({ loading: true, error: null, filters: { ...get().filters, ...filters } });

    const { data, error } = await $fetch({
      url: "/api/nft/collection",
      method: "GET",
      params: cleanFilters(filters),
      silent: true,
    });

    if (error) {
      set({ error, loading: false });
    } else {
      // API returns {items: [...], pagination: {...}}
      set({ collections: data?.items || data || [], loading: false });
    }
  },

  // Fetch categories
  fetchCategories: async () => {
    const { data, error } = await $fetch({
      url: "/api/nft/category",
      method: "GET",
      silent: true,
    });

    if (error) {
      set({ error });
    } else {
      // API returns {items: [...], pagination: {...}}
      set({ categories: data?.items || data || [] });
    }
  },

  // Fetch listings
  fetchListings: async (filters = {}) => {
    set({ loading: true, error: null });
    
    const listingsData = await $fetch({
      url: "/api/nft/listing",
      method: "GET",
      params: cleanFilters(filters),
      silentSuccess: true,
    });

    if (listingsData && !listingsData.error) {
      const responseData = listingsData.data || listingsData;
      // Backend returns { items: [...], pagination: {...} }
      const items = Array.isArray(responseData)
        ? responseData
        : responseData.items || responseData.data || [];
      set({ listings: items, loading: false });
    } else {
      set({ error: listingsData?.error || "Failed to fetch listings", loading: false });
    }
  },

  // Fetch activities
  fetchActivities: async (filters = {}) => {
    const { data, error } = await $fetch({
      url: "/api/nft/activity/recent",
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
      // Transform backend `image` to frontend `imageUrl`
      const transformedData = data ? {
        ...data,
        imageUrl: data.image,
      } : null;
      set({ selectedToken: transformedData, loading: false });
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
      silent: true, // Don't show automatic toasts - let the component handle it
      silentSuccess: true,
    });

    if (error) {
      set({ error, loading: false });
      return { error, data: null };
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
      return { error: null, data: listing };
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

  // Add to favorites with optimistic updates
  addToFavorites: async (tokenId?: string, collectionId?: string) => {
    // Optimistic update: immediately update UI
    if (tokenId) {
      const currentTokens = get().tokens;
      const currentListings = get().listings;
      
      const updatedTokens = currentTokens.map(token => 
        token.id === tokenId ? { ...token, isFavorited: true } : token
      );
      
      const updatedListings = currentListings.map(listing => 
        listing.tokenId === tokenId ? { ...listing, isFavorited: true } : listing
      );
      
      set({ tokens: updatedTokens, listings: updatedListings });
    }

    try {
      const { data, error } = await $fetch({
        url: "/api/nft/favorite",
        method: "POST",
        body: { tokenId, collectionId },
        successMessage: "Added to favorites!",
      });

      // If API call fails, revert the optimistic update
      if (error && tokenId) {
        const currentTokens = get().tokens;
        const currentListings = get().listings;
        
        const revertedTokens = currentTokens.map(token => 
          token.id === tokenId ? { ...token, isFavorited: false } : token
        );
        
        const revertedListings = currentListings.map(listing => 
          listing.tokenId === tokenId ? { ...listing, isFavorited: false } : listing
        );
        
        set({ tokens: revertedTokens, listings: revertedListings });
      }
    } catch (error) {
      // Revert optimistic update on network error
      if (tokenId) {
        const currentTokens = get().tokens;
        const currentListings = get().listings;
        
        const revertedTokens = currentTokens.map(token => 
          token.id === tokenId ? { ...token, isFavorited: false } : token
        );
        
        const revertedListings = currentListings.map(listing => 
          listing.tokenId === tokenId ? { ...listing, isFavorited: false } : listing
        );
        
        set({ tokens: revertedTokens, listings: revertedListings });
      }
    }
  },

  // Remove from favorites with optimistic updates
  removeFromFavorites: async (tokenId?: string, collectionId?: string) => {
    // Optimistic update: immediately update UI
    if (tokenId) {
      const currentTokens = get().tokens;
      const currentListings = get().listings;
      
      const updatedTokens = currentTokens.map(token => 
        token.id === tokenId ? { ...token, isFavorited: false } : token
      );
      
      const updatedListings = currentListings.map(listing => 
        listing.tokenId === tokenId ? { ...listing, isFavorited: false } : listing
      );
      
      set({ tokens: updatedTokens, listings: updatedListings });
    }

    try {
      const { data, error } = await $fetch({
        url: "/api/nft/favorite",
        method: "DELETE",
        body: { tokenId, collectionId },
        successMessage: "Removed from favorites!",
      });

      // If API call fails, revert the optimistic update
      if (error && tokenId) {
        const currentTokens = get().tokens;
        const currentListings = get().listings;
        
        const revertedTokens = currentTokens.map(token => 
          token.id === tokenId ? { ...token, isFavorited: true } : token
        );
        
        const revertedListings = currentListings.map(listing => 
          listing.tokenId === tokenId ? { ...listing, isFavorited: true } : listing
        );
        
        set({ tokens: revertedTokens, listings: revertedListings });
      }
    } catch (error) {
      // Revert optimistic update on network error
      if (tokenId) {
        const currentTokens = get().tokens;
        const currentListings = get().listings;
        
        const revertedTokens = currentTokens.map(token => 
          token.id === tokenId ? { ...token, isFavorited: true } : token
        );
        
        const revertedListings = currentListings.map(listing => 
          listing.tokenId === tokenId ? { ...listing, isFavorited: true } : listing
        );
        
        set({ tokens: revertedTokens, listings: revertedListings });
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

  // Fetch featured tokens
  fetchFeaturedTokens: async (limit = 12, category?) => {
    const cacheKey = `featured-tokens-${limit}-${category || 'all'}`;
    const cached = tokenCache.get(cacheKey);

    if (cached) {
      set({ featuredTokens: cached, loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      const params: any = { limit };
      if (category) params.category = category;

      const { data, error } = await $fetch({
        url: "/api/nft/featured/tokens",
        method: "GET",
        params,
        silentSuccess: true,
      });

      if (error) {
        set({ error, loading: false });
      } else {
        // Transform backend `image` to frontend `imageUrl`
        const transformedData = (data || []).map((token: any) => ({
          ...token,
          imageUrl: token.image,
        }));

        tokenCache.set(cacheKey, transformedData);
        set({ featuredTokens: transformedData, loading: false });
      }
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch featured tokens", loading: false });
    }
  },

  // Fetch trending collections
  fetchTrendingCollections: async (limit = 10, timeframe = "24h") => {
    const cacheKey = `trending-collections-${limit}-${timeframe}`;
    const cached = collectionCache.get(cacheKey);

    if (cached) {
      set({ trendingCollections: cached, loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: "/api/nft/trending/collections",
        method: "GET",
        params: { limit, timeframe },
        silentSuccess: true,
      });

      if (error) {
        set({ error, loading: false });
      } else {
        // Ensure we extract the array from the response
        const collections = Array.isArray(data) ? data : (data?.data || []);
        collectionCache.set(cacheKey, collections);
        set({ trendingCollections: collections, loading: false });
      }
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch trending collections", loading: false });
    }
  },

  // Fetch top creators
  fetchTopCreators: async (limit = 10, timeframe = "all", sortBy = "volume") => {
    const cacheKey = `top-creators-${limit}-${timeframe}-${sortBy}`;
    const cached = categoryCache.get(cacheKey);

    if (cached) {
      set({ topCreators: cached });
      return;
    }

    try {
      const { data, error } = await $fetch({
        url: "/api/nft/top/creators",
        method: "GET",
        params: { limit, timeframe, sortBy },
        silentSuccess: true,
      });

      if (!error && data) {
        // Extract array from response - API returns { data: [...], metadata: {...} }
        const creators = Array.isArray(data) ? data : (data?.data || []);
        categoryCache.set(cacheKey, creators);
        set({ topCreators: creators });
      }
    } catch (error: any) {
      console.error("Failed to fetch top creators:", error);
    }
  },

  // Fetch marketplace stats
  fetchMarketplaceStats: async (timeframe = "24h") => {
    const cacheKey = `marketplace-stats-${timeframe}`;
    const cached = categoryCache.get(cacheKey);

    if (cached) {
      set({ marketplaceStats: cached });
      return;
    }

    try {
      const { data, error } = await $fetch({
        url: "/api/nft/stats",
        method: "GET",
        params: { timeframe },
        silentSuccess: true,
      });

      if (!error && data) {
        categoryCache.set(cacheKey, data);
        set({ marketplaceStats: data });
      }
    } catch (error: any) {
      console.error("Failed to fetch marketplace stats:", error);
    }
  },

  // Fetch chain stats
  fetchChainStats: async () => {
    const cacheKey = "chain-stats";
    const cached = categoryCache.get(cacheKey);

    if (cached) {
      set({ chainStats: cached });
      return;
    }

    try {
      const { data, error } = await $fetch({
        url: "/api/nft/chains/stats",
        method: "GET",
        silentSuccess: true,
      });

      if (!error && data) {
        const chains = Array.isArray(data) ? data : (data?.data || []);
        categoryCache.set(cacheKey, chains);
        set({ chainStats: chains });
      }
    } catch (error: any) {
      console.error("Failed to fetch chain stats:", error);
    }
  },

  // Follow creator with optimistic updates
  followCreator: async (userId: string) => {
    // Optimistic update: immediately update UI
    const currentCreators = get().topCreators;
    const updatedCreators = currentCreators.map(creator =>
      creator.userId === userId || creator.id === userId
        ? {
            ...creator,
            isFollowing: true,
            followers: (creator.followers || 0) + 1,
          }
        : creator
    );
    set({ topCreators: updatedCreators });

    try {
      const { data, error } = await $fetch({
        url: "/api/nft/social/follow",
        method: "POST",
        body: { userId, action: "follow" },
        successMessage: "Following creator!",
      });

      // If API call fails, revert the optimistic update
      if (error) {
        const revertedCreators = currentCreators.map(creator =>
          creator.userId === userId || creator.id === userId
            ? {
                ...creator,
                isFollowing: false,
                followers: Math.max((creator.followers || 0) - 1, 0),
              }
            : creator
        );
        set({ topCreators: revertedCreators });
      }
    } catch (error) {
      // Revert optimistic update on network error
      const revertedCreators = currentCreators.map(creator =>
        creator.userId === userId || creator.id === userId
          ? {
              ...creator,
              isFollowing: false,
              followers: Math.max((creator.followers || 0) - 1, 0),
            }
          : creator
      );
      set({ topCreators: revertedCreators });
    }
  },

  // Unfollow creator with optimistic updates
  unfollowCreator: async (userId: string) => {
    // Optimistic update: immediately update UI
    const currentCreators = get().topCreators;
    const updatedCreators = currentCreators.map(creator =>
      creator.userId === userId || creator.id === userId
        ? {
            ...creator,
            isFollowing: false,
            followers: Math.max((creator.followers || 0) - 1, 0),
          }
        : creator
    );
    set({ topCreators: updatedCreators });

    try {
      const { data, error } = await $fetch({
        url: "/api/nft/social/follow",
        method: "POST",
        body: { userId, action: "unfollow" },
        successMessage: "Unfollowed creator!",
      });

      // If API call fails, revert the optimistic update
      if (error) {
        const revertedCreators = currentCreators.map(creator =>
          creator.userId === userId || creator.id === userId
            ? {
                ...creator,
                isFollowing: true,
                followers: (creator.followers || 0) + 1,
              }
            : creator
        );
        set({ topCreators: revertedCreators });
      }
    } catch (error) {
      // Revert optimistic update on network error
      const revertedCreators = currentCreators.map(creator =>
        creator.userId === userId || creator.id === userId
          ? {
              ...creator,
              isFollowing: true,
              followers: (creator.followers || 0) + 1,
            }
          : creator
      );
      set({ topCreators: revertedCreators });
    }
  },

  // Toggle follow (convenience method)
  toggleFollowCreator: async (userId: string) => {
    const creator = get().topCreators.find(c => c.userId === userId || c.id === userId);
    if (creator?.isFollowing) {
      await get().unfollowCreator(userId);
    } else {
      await get().followCreator(userId);
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
      featuredTokens: [],
      trendingCollections: [],
      topCreators: [],
      marketplaceStats: null,
      loading: false,
      error: null,
      filters: {},
    });
  },
})); 