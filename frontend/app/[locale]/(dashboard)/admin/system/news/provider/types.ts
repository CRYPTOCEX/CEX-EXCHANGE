/**
 * The provider console's view of a provider row.
 *
 * Mirrors `GET /api/admin/system/news/provider`. Kept in its own module so the
 * page and the card do not import types from each other — the card is the only
 * thing that edits a provider and the page is the only thing that fetches one,
 * and a shared file is what stops that becoming a cycle.
 */

export interface NewsProviderSetup {
  signupUrl: string;
  consoleUrl: string;
  steps: string[];
}

export interface NewsProviderConfigField {
  key: string;
  type: "select" | "feedList";
  label: string;
  help: string;
  options?: string[];
}

export interface RssFeed {
  url: string;
  category?: string;
}

export interface NewsProvider {
  id: string;
  name: string;
  title: string;
  description: string;
  status: boolean;

  adapterAvailable: boolean;
  /** Every env var the adapter reads, whether set or not. */
  requiredCredentials: string[];
  /** The subset that is absent. Empty means the credentials are in place. */
  missingCredentials: string[];
  /** A non-credential blocker, e.g. RSS with no feeds. */
  configProblem: string | null;
  ready: boolean;

  /**
   * Whether a credential is saved ON THE ROW. The value itself is never sent —
   * the server reports presence and provenance only, so the console can render
   * a filled field without the secret ever leaving the backend.
   */
  hasStoredKey: boolean;
  /** Which door supplied the credential in use: the row, `.env`, or neither. */
  credentialSource: "stored" | "environment" | "none";

  categories: string[];
  fetchLimit: number;
  retentionDays: number;
  config: Record<string, any> | null;

  /** Epoch ms, or null when it has never run. */
  lastSyncAt: number | null;
  lastSyncStatus: "OK" | "EMPTY" | "ERROR" | "SKIPPED" | null;
  lastSyncCount: number;
  lastSyncMessage: string | null;
  storedStories: number;

  categoryOptions: string[];
  /** What this vendor calls its categories. Empty when it has none. */
  categoryLabel: string;
  categoryHelp: string;
  assetScope: string;
  tagsSymbols: boolean;
  cost: string | null;
  costDetail: string | null;
  bestFor: string | null;
  limitations: string | null;
  redistribution: string | null;
  setup: NewsProviderSetup | null;
  configFields: NewsProviderConfigField[];
}

export interface NewsProviderList {
  providers: NewsProvider[];
  /** Operator-authored stories, which no provider setting can affect. */
  manualStories: number;
  syncPeriodMinutes: number;
}

export interface NewsSyncResult {
  provider: string;
  status: "OK" | "EMPTY" | "ERROR" | "SKIPPED";
  inserted: number;
  message: string;
}

export interface NewsSyncSummary {
  news: number;
  results: NewsSyncResult[];
  message: string;
}

/** The editable half of a provider, as the card holds it while being edited. */
export interface ProviderDraft {
  categories: string[];
  fetchLimit: number;
  retentionDays: number;
  config: Record<string, any>;
}

export function draftFrom(provider: NewsProvider): ProviderDraft {
  return {
    categories: [...provider.categories],
    fetchLimit: provider.fetchLimit,
    retentionDays: provider.retentionDays,
    // Cloned rather than referenced: the draft is mutated on every keystroke
    // and the fetched provider is what "has anything changed?" compares
    // against. Sharing the object makes that comparison always false.
    config: JSON.parse(JSON.stringify(provider.config ?? {})),
  };
}

export function readFeeds(config: Record<string, any>): RssFeed[] {
  return Array.isArray(config?.feeds)
    ? config.feeds
        .map((entry: any) =>
          typeof entry === "string"
            ? { url: entry }
            : { url: String(entry?.url ?? ""), category: entry?.category }
        )
        .filter((feed: RssFeed) => feed.url.length > 0)
    : [];
}
