import { create } from "zustand";

/**
 * Release notes for the admin panel.
 *
 * The shape of this changed for a reason worth knowing. It used to call
 * `/api/admin/system/patch-notes`, which proxied a single 2 MB file containing
 * every product, every version and every word of markdown — downloaded in full,
 * uncached, on every admin page load, in order to render one changelog.
 *
 * Now there are two calls with very different sizes:
 *
 *   fetchPatchNotes()             ~25 KB — which versions exist, dates, tags.
 *   fetchProductPatchNotes(id)    only the product being looked at, with prose.
 *
 * So `getProductChangelog` reads from the per-product cache, not from the
 * manifest: the manifest deliberately carries no `content`. Call
 * `fetchProductPatchNotes` before expecting a changelog body.
 */

interface PatchNoteMetadata {
  title: string;
  releaseDate: string;
  tags: string[];
}

export interface PatchNoteVersion {
  version: string;
  /** Absent on manifest entries — only per-product fetches carry prose. */
  content?: string;
  metadata: PatchNoteMetadata;
}

interface ExtensionPatchNotes {
  type: string;
  productId?: string;
  name?: string;
  latest?: string;
  versions: PatchNoteVersion[];
}

interface PatchNotesData {
  buildTime: string | null;
  version: string | null;
  extensions: Record<string, ExtensionPatchNotes>;
}

export interface ProductPatchNotesData {
  product?: string;
  docsKey?: string;
  name: string;
  latest: string | null;
  total?: number;
  behind?: number | null;
  versions: PatchNoteVersion[];
}

interface PatchNotesStore {
  data: PatchNotesData | null;
  productData: Record<string, ProductPatchNotesData>;
  isLoading: boolean;
  error: string | null;
  fetchFailed: boolean;
  lastFetched: number | null;

  fetchPatchNotes: () => Promise<void>;
  fetchProductPatchNotes: (
    productId: string,
    opts?: { since?: string },
  ) => Promise<ProductPatchNotesData | null>;
  getProductChangelog: (productType: string, version?: string) => string | null;
  getProductVersions: (productType: string) => PatchNoteVersion[];
  getLatestVersion: (productType: string) => PatchNoteVersion | null;
  getVersionMetadata: (
    productType: string,
    version: string,
  ) => PatchNoteMetadata | null;
}

// Backend proxy, so the browser never talks to the docs host directly (CORS,
// and the proxy is where the response cache lives).
const PATCH_NOTES_ALL_URL = "/api/admin/system/patch-notes";
const PATCH_NOTES_PRODUCT_URL = (productId: string) =>
  `/api/admin/system/patch-notes/${encodeURIComponent(productId)}`;

/**
 * The API resolves Envato ids, patch-note types and store slugs alike, so a
 * response may be filed under any of them. Indexing the cache by every name a
 * product answers to means a later lookup by type finds data fetched by id.
 */
function cacheKeys(requested: string, data: ProductPatchNotesData): string[] {
  return [requested, data.docsKey, data.product].filter(
    (k): k is string => typeof k === "string" && k.length > 0,
  );
}

export const usePatchNotesStore = create<PatchNotesStore>((set, get) => ({
  data: null,
  productData: {},
  isLoading: false,
  error: null,
  fetchFailed: false,
  lastFetched: null,

  fetchPatchNotes: async () => {
    const { fetchFailed, data } = get();
    if (fetchFailed || data) return;

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(PATCH_NOTES_ALL_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const fetchedData: PatchNotesData = await response.json();
      set({
        data: fetchedData,
        isLoading: false,
        fetchFailed: false,
        lastFetched: Date.now(),
      });
    } catch (error) {
      // Fail gracefully — a docs outage must not break the admin panel.
      console.warn("Could not fetch patch notes (graceful failure):", error);
      set({
        isLoading: false,
        fetchFailed: true,
        error:
          error instanceof Error ? error.message : "Failed to fetch patch notes",
      });
    }
  },

  fetchProductPatchNotes: async (productId: string, opts) => {
    const { productData } = get();
    // `since` narrows the result, so a narrowed response must never satisfy a
    // later unfiltered request out of the cache.
    if (!opts?.since && productData[productId]) return productData[productId];

    try {
      const url = opts?.since
        ? `${PATCH_NOTES_PRODUCT_URL(productId)}?since=${encodeURIComponent(opts.since)}`
        : PATCH_NOTES_PRODUCT_URL(productId);

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(
          `Could not fetch patch notes for ${productId}: HTTP ${response.status}`,
        );
        return null;
      }

      const raw = await response.json();
      if (!raw) return null;

      // The endpoint returns `releases`; the previous shape used `versions`.
      const versions: PatchNoteVersion[] = (
        raw.releases ??
        raw.versions ??
        []
      ).map((r: any) => ({
        version: r.version,
        content: r.content,
        metadata: r.metadata ?? {
          title: r.title ?? "",
          releaseDate: r.date ?? "",
          tags: r.tags ?? [],
        },
      }));

      const data: ProductPatchNotesData = {
        product: raw.product,
        docsKey: raw.docsKey ?? raw.type,
        name: raw.name ?? productId,
        latest: raw.latest ?? versions[0]?.version ?? null,
        total: raw.total,
        behind: raw.behind ?? null,
        versions,
      };

      if (!opts?.since) {
        set((state) => {
          const next = { ...state.productData };
          for (const key of cacheKeys(productId, data)) next[key] = data;
          return { productData: next };
        });
      }

      return data;
    } catch (error) {
      console.warn(`Could not fetch patch notes for ${productId}:`, error);
      return null;
    }
  },

  getProductChangelog: (productType: string, version?: string) => {
    // Prose lives in the per-product cache only — the manifest has none.
    const product = get().productData[productType];
    if (!product) return null;

    if (version) {
      return (
        product.versions.find((v) => v.version === version)?.content ?? null
      );
    }
    return product.versions[0]?.content ?? null;
  },

  getProductVersions: (productType: string) => {
    const { data, productData } = get();
    // Prefer the per-product response; fall back to the manifest, which lists
    // the same versions without their bodies.
    return (
      productData[productType]?.versions ??
      data?.extensions[productType]?.versions ??
      []
    );
  },

  getLatestVersion: (productType: string) => {
    return get().getProductVersions(productType)[0] ?? null;
  },

  getVersionMetadata: (productType: string, version: string) => {
    return (
      get()
        .getProductVersions(productType)
        .find((v) => v.version === version)?.metadata ?? null
    );
  },
}));

// Product display name -> patch-note type. Kept because callers pass a name.
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
  "binary-engine": "binary-engine",
  "binary-ai-engine": "binary-engine",
  hummingbot: "hummingbot",
  "trading-bot": "trading-bot",
  "forex-trading": "forex-trading",
};

/**
 * The PRODUCT_ID_TO_TYPE table that used to live here is GONE.
 *
 * It was the third copy of the same map (backend route, store lib, docs
 * builder) and the three had drifted: an id missing from one resolved to
 * itself, requested a file that was never published, and the admin showed
 * "No Changelogs Available" for a product that had notes.
 *
 * The docs host now resolves item ids, patch-note types and store slugs
 * itself, so an identifier can be passed straight through.
 */
export function getPatchNotesType(productName: string): string {
  const normalized = productName.toLowerCase().replace(/\s+/g, "-");
  return PRODUCT_TYPE_MAP[normalized] || normalized;
}

/** Pass-through: every endpoint accepts an id, a type or a slug. */
export function getProductIdFromType(type: string): string {
  return type;
}

export function getTypeFromProductId(productId: string): string {
  return productId;
}
