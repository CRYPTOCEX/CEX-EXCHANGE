import { create } from "zustand";

// Types matching the docs patch-notes-data.json structure
interface PatchNoteMetadata {
  title: string;
  releaseDate: string;
  tags: string[];
}

export interface PatchNoteVersion {
  version: string;
  content: string;
  metadata: PatchNoteMetadata;
}

interface ExtensionPatchNotes {
  type: string;
  productId?: string;
  versions: PatchNoteVersion[];
}

interface PatchNotesData {
  buildTime: string;
  version: string;
  extensions: Record<string, ExtensionPatchNotes>;
}

// Single product patch notes data structure
export interface ProductPatchNotesData {
  buildTime: string;
  version: string;
  productId: string;
  type: string;
  name: string;
  versions: PatchNoteVersion[];
}

interface PatchNotesStore {
  data: PatchNotesData | null;
  productData: Record<string, ProductPatchNotesData>;
  isLoading: boolean;
  error: string | null;
  fetchFailed: boolean;
  lastFetched: number | null;

  // Actions
  fetchPatchNotes: () => Promise<void>;
  fetchProductPatchNotes: (
    productId: string
  ) => Promise<ProductPatchNotesData | null>;
  getProductChangelog: (productType: string, version?: string) => string | null;
  getProductVersions: (productType: string) => PatchNoteVersion[];
  getLatestVersion: (productType: string) => PatchNoteVersion | null;
  getVersionMetadata: (
    productType: string,
    version: string
  ) => PatchNoteMetadata | null;
}

// Use backend proxy to avoid CORS issues
const PATCH_NOTES_ALL_URL = "/api/admin/system/patch-notes";
const PATCH_NOTES_PRODUCT_URL = (productId: string) =>
  `/api/admin/system/patch-notes/${productId}`;

export const usePatchNotesStore = create<PatchNotesStore>((set, get) => ({
  data: null,
  productData: {},
  isLoading: false,
  error: null,
  fetchFailed: false,
  lastFetched: null,

  fetchPatchNotes: async () => {
    // Don't retry if we already failed
    const { fetchFailed, data } = get();
    if (fetchFailed || data) return;

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(PATCH_NOTES_ALL_URL);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const fetchedData: PatchNotesData = await response.json();

      set({
        data: fetchedData,
        isLoading: false,
        fetchFailed: false,
        lastFetched: Date.now(),
      });
    } catch (error) {
      // Fail gracefully - don't throw, just set error state
      console.warn("Could not fetch patch notes (graceful failure):", error);
      set({
        isLoading: false,
        fetchFailed: true,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch patch notes",
      });
    }
  },

  fetchProductPatchNotes: async (productId: string) => {
    // Check cache first
    const { productData } = get();
    if (productData[productId]) {
      return productData[productId];
    }

    try {
      const response = await fetch(PATCH_NOTES_PRODUCT_URL(productId));

      if (!response.ok) {
        // Fail gracefully - just return null
        console.warn(
          `Could not fetch patch notes for ${productId}: HTTP ${response.status}`
        );
        return null;
      }

      const data: ProductPatchNotesData = await response.json();

      // Cache the product data
      set((state) => ({
        productData: {
          ...state.productData,
          [productId]: data,
        },
      }));

      return data;
    } catch (error) {
      // Fail gracefully - don't throw
      console.warn(`Could not fetch patch notes for ${productId}:`, error);
      return null;
    }
  },

  getProductChangelog: (productType: string, version?: string) => {
    const { data } = get();
    if (!data) return null;

    const extension = data.extensions[productType];
    if (!extension) return null;

    if (version) {
      // Get specific version
      const versionData = extension.versions.find(
        (v) => v.version === version
      );
      return versionData?.content || null;
    }

    // Get latest version changelog
    const latest = extension.versions[0];
    return latest?.content || null;
  },

  getProductVersions: (productType: string) => {
    const { data } = get();
    if (!data) return [];

    const extension = data.extensions[productType];
    return extension?.versions || [];
  },

  getLatestVersion: (productType: string) => {
    const { data } = get();
    if (!data) return null;

    const extension = data.extensions[productType];
    if (!extension || extension.versions.length === 0) return null;

    return extension.versions[0];
  },

  getVersionMetadata: (productType: string, version: string) => {
    const { data } = get();
    if (!data) return null;

    const extension = data.extensions[productType];
    if (!extension) return null;

    const versionData = extension.versions.find((v) => v.version === version);
    return versionData?.metadata || null;
  },
}));

// Product type mapping from product names to patch notes types
export const PRODUCT_TYPE_MAP: Record<string, string> = {
  bicrypto: "core",
  core: "core",
  "ai-investment": "ai-investment",
  "ai-market-maker": "ai-market-maker",
  affiliate: "affiliate",
  "copy-trading": "copy-trading",
  ecommerce: "ecommerce",
  ecosystem: "ecosystem",
  faq: "faq",
  forex: "forex",
  futures: "futures",
  gateway: "gateway",
  ico: "ico",
  mailwizard: "mailwizard",
  nft: "nft",
  p2p: "p2p",
  staking: "staking",
  "wallet-connect": "wallet-connect",
  "chart-engine": "chart-engine",
};

// Product ID to type mapping (from backend seeders)
export const PRODUCT_ID_TO_TYPE: Record<string, string> = {
  // Core
  "35599184": "core",
  core: "core",
  // Extensions
  "35988984": "ai-investment",
  "61007981": "ai-market-maker",
  "40071914": "ecosystem",
  "36668679": "forex",
  "36120046": "ico",
  "37434481": "staking",
  "39166202": "faq",
  "44624493": "ecommerce",
  "37548018": "wallet-connect",
  "44593497": "p2p",
  "36667808": "affiliate",
  "45613491": "mailwizard",
  "46094641": "futures",
  "60962133": "nft",
  "61043226": "gateway",
  "61107157": "copy-trading",
  "61200000": "chart-engine",
  // Exchange Providers
  "37179816": "exchange-kucoin",
  "38650585": "exchange-binance",
  "54510301": "exchange-xt",
  // Blockchain Providers
  "54514052": "blockchain-solana",
  "54577641": "blockchain-tron",
  "54578959": "blockchain-monero",
  "55715370": "blockchain-ton",
};

// Reverse mapping: type to product ID
export const TYPE_TO_PRODUCT_ID: Record<string, string> = {};
Object.entries(PRODUCT_ID_TO_TYPE).forEach(([id, type]) => {
  if (id !== "core") {
    // Skip core alias
    TYPE_TO_PRODUCT_ID[type] = id;
  }
});

// Helper to get patch notes type from product name
export function getPatchNotesType(productName: string): string {
  const normalized = productName.toLowerCase().replace(/\s+/g, "-");
  return PRODUCT_TYPE_MAP[normalized] || normalized;
}

// Helper to get product ID from type
export function getProductIdFromType(type: string): string {
  return TYPE_TO_PRODUCT_ID[type] || type;
}

// Helper to get type from product ID
export function getTypeFromProductId(productId: string): string {
  return PRODUCT_ID_TO_TYPE[productId] || productId;
}
