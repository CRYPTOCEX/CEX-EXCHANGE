"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

export interface FAQMedia {
  type: "image" | "video" | "embed";
  url: string;
  caption?: string;
  width?: number;
  height?: number;
}

interface FAQFilters {
  search?: string;
  category?: string;
  status?: "active" | "inactive" | "all";
  hasCategory?: boolean;
  pagePath?: string;
  tags?: string[];
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
}

interface FAQCounts {
  active: number;
  inactive: number;
  total: number;
}

interface FAQAdminStore {
  // Data
  faqs: faqAttributes[];
  categories: string[];
  /** Every tag in use, from the server — not just the ones on the loaded page. */
  tags: string[];
  pageLinks: PageLink[];
  pagination: PaginationState;
  /**
   * Active/inactive totals for the current filters across the whole table. The
   * header counters used to count the loaded array and so reported "10 FAQs" on
   * a site with 400.
   */
  counts: FAQCounts;
  /** How many FAQs live on each page path, across the whole table. */
  pageCounts: Record<string, number>;
  /**
   * FAQs for one page path, fetched on demand.
   *
   * The By-page view cannot be served from the paginated global list: ten rows
   * spread over dozens of page sections showed almost every section as empty.
   * Each section fetches its own rows when it is expanded instead.
   */
  faqsByPagePath: Record<string, faqAttributes[]>;

  // UI state
  loading: boolean;
  error: string | null;
  filters: FAQFilters;

  // Add a new property to track the current page context for ordering
  currentPageContext: string | null;

  // Actions
  fetchFAQs: (page?: number) => Promise<void>;
  fetchFAQsForPage: (pagePath: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchPageLinks: () => Promise<void>;
  fetchPageCounts: () => Promise<void>;
  createFAQ: (faq: Partial<faqAttributes>) => Promise<faqAttributes | null>;
  updateFAQ: (
    id: string,
    faq: Partial<faqAttributes>
  ) => Promise<faqAttributes | null>;
  deleteFAQ: (id: string) => Promise<boolean>;
  toggleFAQActive: (id: string, active: boolean) => Promise<boolean>;
  reorderFAQs: (
    faqId: string,
    targetId: string | null,
    targetPagePath?: string | null
  ) => Promise<boolean>;
  bulkUpdateFAQs: (
    ids: string[],
    data: Partial<faqAttributes>
  ) => Promise<boolean>;
  bulkDeleteFAQs: (ids: string[]) => Promise<boolean>;

  // Filters
  setFilters: (filters: Partial<FAQFilters>) => void;
  setPerPage: (perPage: number) => void;
  setPage: (page: number) => void;

  // Add a new action to set the current page context
  setCurrentPageContext: (pagePath: string | null) => void;

  // New functions
  deletePageWithFAQs: (pagePath: string) => Promise<boolean>;
  enablePageFAQs: (pagePath: string) => Promise<boolean>;
  disablePageFAQs: (pagePath: string) => Promise<boolean>;
}

let fetchFAQsCounter = 0;

/**
 * `tags` and `relatedFaqIds` are JSON columns; a MariaDB server hands them back
 * as JSON strings where MySQL hands back arrays. Normalise once on the way in.
 */
const safeJsonParse = (val: any, fallback: any[] = []) => {
  if (typeof val !== "string") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const normalizeFaqs = (items: faqAttributes[] = []) =>
  items.map((item) => ({
    ...item,
    tags: safeJsonParse(item.tags, []),
    relatedFaqIds: safeJsonParse(item.relatedFaqIds, []),
  }));

/**
 * Serialise the filter set into query parameters.
 *
 * Every one of these used to be applied in the browser over whatever page had
 * been loaded, so filtering a long list returned results drawn from ten rows.
 */
/**
 * Apply the same transform to the flat list and to every cached page section.
 *
 * The By-page view reads its own per-path cache, so a mutation that only
 * touched `faqs` would leave the section showing the row it just deleted.
 */
const mapEverywhere = (
  state: {
    faqs: faqAttributes[];
    faqsByPagePath: Record<string, faqAttributes[]>;
  },
  fn: (list: faqAttributes[]) => faqAttributes[]
) => ({
  faqs: fn(state.faqs),
  faqsByPagePath: Object.fromEntries(
    Object.entries(state.faqsByPagePath).map(([path, list]) => [path, fn(list)])
  ),
});

const filterParams = (filters: FAQFilters): string => {
  let url = "";
  if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
  if (filters.category) url += `&category=${encodeURIComponent(filters.category)}`;
  if (filters.status && filters.status !== "all") {
    url += `&status=${filters.status === "active" ? "active" : "inactive"}`;
  }
  if (filters.tags?.length) {
    url += `&tags=${encodeURIComponent(filters.tags.join(","))}`;
  }
  return url;
};

export const useFAQAdminStore = create<FAQAdminStore>((set, get) => ({
  // Data
  faqs: [],
  categories: [],
  tags: [],
  pageLinks: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    perPage: 10,
  },
  counts: { active: 0, inactive: 0, total: 0 },
  pageCounts: {},
  faqsByPagePath: {},

  // UI state
  loading: false,
  error: null,
  filters: {
    search: "",
    category: "",
    status: "all",
    tags: [],
  },

  // Initialize the current page context
  currentPageContext: null,

  // Actions
  fetchFAQs: async (page = 1) => {
    const requestId = ++fetchFAQsCounter;
    set({ loading: true, error: null });
    try {
      const filters = get().filters;
      let url = `/api/admin/faq?page=${page}`;
      url += filterParams(filters);

      if (filters.pagePath) {
        url += `&pagePath=${encodeURIComponent(filters.pagePath)}`;
      }

      // H15: Send perPage to API
      const { perPage } = get().pagination;
      url += `&limit=${perPage}`;

      const { data, error } = await $fetch<{
        items: faqAttributes[];
        pagination: PaginationState;
        counts?: FAQCounts;
      }>({
        url,
        silentSuccess: true,
      });

      // H16: Discard stale responses
      if (requestId !== fetchFAQsCounter) return;

      if (error) {
        set({ error, loading: false });
        return;
      }

      if (data) {
        const processedItems = normalizeFaqs(data.items);

        set({
          faqs: processedItems || [],
          pagination: data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: data.items?.length || 0,
            perPage: 10,
          },
          counts: data.counts ?? {
            active: processedItems.filter((f) => f.status).length,
            inactive: processedItems.filter((f) => !f.status).length,
            total: processedItems.length,
          },
          loading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch FAQs",
        loading: false,
      });
    }
  },

  fetchFAQsForPage: async (pagePath: string) => {
    try {
      const filters = get().filters;
      // A page section is a bounded list, so it asks for the server's maximum
      // in one request rather than carrying a pager of its own.
      let url = `/api/admin/faq?limit=100&pagePath=${encodeURIComponent(pagePath)}`;
      url += filterParams(filters);

      const { data, error } = await $fetch<{ items: faqAttributes[] }>({
        url,
        silentSuccess: true,
      });

      if (error || !data) return;

      set((state) => ({
        faqsByPagePath: {
          ...state.faqsByPagePath,
          [pagePath]: normalizeFaqs(data.items).sort(
            (a, b) => a.order - b.order
          ),
        },
      }));
    } catch {
      // silently ignore
    }
  },

  fetchTags: async () => {
    try {
      const { data, error } = await $fetch<string[]>({
        url: "/api/admin/faq/tag",
        silentSuccess: true,
      });

      if (error) {
        return;
      }

      if (Array.isArray(data)) {
        set({ tags: data });
      }
    } catch {
      // silently ignore
    }
  },

  fetchPageCounts: async () => {
    try {
      const { data, error } = await $fetch<Record<string, number>>({
        url: "/api/admin/faq/page/counts",
        silentSuccess: true,
      });

      if (error) {
        return;
      }

      if (data) {
        set({ pageCounts: data });
      }
    } catch {
      // silently ignore
    }
  },

  fetchCategories: async () => {
    try {
      const { data, error } = await $fetch<string[]>({
        url: "/api/admin/faq/category",
        silentSuccess: true,
      });

      if (error) {
        return;
      }

      if (data) {
        set({ categories: data });
      }
    } catch (error) {
      // silently ignore
    }
  },

  fetchPageLinks: async () => {
    try {
      const { data, error } = await $fetch<PageLink[]>({
        url: "/api/admin/faq/page",
        silentSuccess: true,
      });

      if (error) {
        return;
      }

      if (data) {
        set({ pageLinks: data });
      }
    } catch {
      // silently ignore
    }
  },

  createFAQ: async (faq: Partial<faqAttributes>) => {
    try {
      // Ensure pagePath is not empty
      if (!faq.pagePath) {
        return null;
      }

      const { data, error } = await $fetch<faqAttributes>({
        url: "/api/admin/faq",
        method: "POST",
        body: faq,
      });

      if (error) {
        return null;
      }

      if (data) {
        // Update local state
        set((state) => ({
          faqs: [data, ...state.faqs],
          pagination: {
            ...state.pagination,
            totalItems: state.pagination.totalItems + 1,
          },
          pageCounts: {
            ...state.pageCounts,
            [data.pagePath]: (state.pageCounts[data.pagePath] ?? 0) + 1,
          },
        }));

        return data;
      }

      return null;
    } catch (error) {
      // silently ignore
      return null;
    }
  },

  updateFAQ: async (id: string, faq: Partial<faqAttributes>) => {
    try {
      // Ensure pagePath is not empty
      if (faq.pagePath === "") {
        return null;
      }

      const { data, error } = await $fetch<faqAttributes>({
        url: `/api/admin/faq/${id}`,
        method: "PUT",
        body: faq,
      });

      if (error) {
        return null;
      }

      if (data) {
        // Update local state
        set((state) =>
          mapEverywhere(state, (list) =>
            list.map((f) => (f.id === id ? { ...f, ...data } : f))
          )
        );

        return data;
      }

      return null;
    } catch (error) {
      // silently ignore
      return null;
    }
  },

  deleteFAQ: async (id: string) => {
    try {
      const { error } = await $fetch({
        url: `/api/admin/faq/${id}`,
        method: "DELETE",
      });

      if (error) {
        return false;
      }

      // Update local state
      set((state) => {
        const removed = state.faqs.find((f) => f.id === id);
        const pageCounts = { ...state.pageCounts };
        if (removed?.pagePath && pageCounts[removed.pagePath]) {
          pageCounts[removed.pagePath] = Math.max(
            0,
            pageCounts[removed.pagePath] - 1
          );
        }
        return {
          ...mapEverywhere(state, (list) => list.filter((f) => f.id !== id)),
          pagination: {
            ...state.pagination,
            totalItems: Math.max(0, state.pagination.totalItems - 1),
          },
          pageCounts,
        };
      });

      return true;
    } catch (error) {
      // silently ignore
      return false;
    }
  },

  toggleFAQActive: async (id: string, active: boolean) => {
    try {
      const { data, error } = await $fetch<faqAttributes>({
        url: `/api/admin/faq/${id}`,
        method: "PUT",
        body: { status: active },
      });

      if (error) {
        return false;
      }

      if (data) {
        // M20: Use server response instead of optimistic value
        set((state) =>
          mapEverywhere(state, (list) =>
            list.map((f) =>
              f.id === id ? { ...f, status: data.status ?? active } : f
            )
          )
        );

        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  },

  // Add a function to set the current page context
  setCurrentPageContext: (pagePath: string | null) => {
    set({ currentPageContext: pagePath });
  },

  // Update the reorderFAQs function to handle moving to a different page
  reorderFAQs: async (
    faqId: string,
    targetId: string | null,
    targetPagePath?: string | null
  ): Promise<boolean> => {
    try {
      // Use the provided targetPagePath or fall back to the current page context
      const contextPagePath = targetPagePath || get().currentPageContext;

      // Find the dragged FAQ
      const draggedFaq = get().faqs.find((f) => f.id === faqId);
      if (!draggedFaq) return false;

      // Only find the target FAQ if a targetId was provided.
      let targetFaq: faqAttributes | null = null;
      if (targetId) {
        targetFaq = get().faqs.find((f) => f.id === targetId) || null;
        if (!targetFaq) return false;
      }

      // Check if we're moving to a different page.
      const isPageChange =
        contextPagePath && draggedFaq.pagePath !== contextPagePath;

      // Build the body for the API call.
      // If targetId is null, it indicates a "change page only" action.
      const body: Record<string, any> = {
        faqId,
        targetPagePath: contextPagePath,
      };
      if (targetId) {
        body.targetId = targetId;
      }

      const { error } = await $fetch({
        url: `/api/admin/faq/reorder`,
        method: "POST",
        body,
        successMessage: isPageChange
          ? `FAQ moved to ${contextPagePath} successfully`
          : "FAQ order updated successfully",
      });

      if (error) {
        return false;
      }

      // Optimistically update the local state
      set((state) => {
        const faqs = [...state.faqs];
        const draggedIndex = faqs.findIndex((f) => f.id === faqId);
        if (draggedIndex === -1) return { faqs };

        // Remove the dragged FAQ from its current position.
        const [draggedItem] = faqs.splice(draggedIndex, 1);

        // If moving to a different page, update its pagePath.
        if (contextPagePath && draggedItem.pagePath !== contextPagePath) {
          draggedItem.pagePath = contextPagePath;
        }

        // Determine the new index where the dragged FAQ should be inserted.
        let newIndex = 0;
        if (targetId && targetFaq) {
          newIndex = faqs.findIndex((f) => f.id === targetId);
          if (newIndex === -1) newIndex = faqs.length;
        } else {
          // No targetId provided: append to the end of the FAQs on the target page.
          const faqsOnPage = faqs.filter((f) => f.pagePath === contextPagePath);
          newIndex = faqs.indexOf(faqsOnPage[faqsOnPage.length - 1]) + 1;
          if (newIndex === 0) newIndex = faqs.length;
        }

        // Insert the dragged FAQ at the determined position.
        faqs.splice(newIndex, 0, draggedItem);

        // Update order values for all FAQs on the same page.
        const updatedFaqs = faqs.map((faq, index) => {
          if (faq.pagePath === contextPagePath) {
            return { ...faq, order: index };
          }
          return faq;
        });

        return { faqs: updatedFaqs };
      });

      return true;
    } catch (error) {
      // silently ignore
      return false;
    }
  },

  bulkUpdateFAQs: async (ids: string[], data: Partial<faqAttributes>) => {
    try {
      const { error } = await $fetch({
        url: `/api/admin/faq`,
        method: "PUT",
        body: { ids, data },
      });

      if (error) {
        return false;
      }

      // Update local state
      set((state) =>
        mapEverywhere(state, (list) =>
          list.map((f) => (ids.includes(f.id) ? { ...f, ...data } : f))
        )
      );

      return true;
    } catch (error) {
      // silently ignore
      return false;
    }
  },

  bulkDeleteFAQs: async (ids: string[]) => {
    try {
      const { error } = await $fetch({
        url: `/api/admin/faq`,
        method: "DELETE",
        body: { ids },
      });

      if (error) {
        return false;
      }

      // Update local state
      set((state) => {
        const pageCounts = { ...state.pageCounts };
        for (const removed of state.faqs.filter((f) => ids.includes(f.id))) {
          if (removed.pagePath && pageCounts[removed.pagePath]) {
            pageCounts[removed.pagePath] = Math.max(
              0,
              pageCounts[removed.pagePath] - 1
            );
          }
        }
        return {
          ...mapEverywhere(state, (list) =>
            list.filter((f) => !ids.includes(f.id))
          ),
          pagination: {
            ...state.pagination,
            totalItems: Math.max(
              0,
              state.pagination.totalItems - ids.length
            ),
          },
          pageCounts,
        };
      });

      return true;
    } catch (error) {
      // silently ignore
      return false;
    }
  },

  // Filters
  setFilters: (filters: Partial<FAQFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));

    // Every already-expanded page section holds rows fetched under the OLD
    // filters. Drop the cache and re-request the ones that are on screen, or
    // the By-page view would keep showing rows the new filter excludes.
    const loadedPaths = Object.keys(get().faqsByPagePath);
    set({ faqsByPagePath: {} });

    // Fetch FAQs with new filters
    get().fetchFAQs(1);
    loadedPaths.forEach((pagePath) => get().fetchFAQsForPage(pagePath));
  },

  setPerPage: (perPage: number) => {
    set((state) => ({
      pagination: { ...state.pagination, perPage, currentPage: 1 },
    }));

    // Refetch with new pagination
    get().fetchFAQs(1);
  },

  setPage: (page: number) => {
    set((state) => ({
      pagination: { ...state.pagination, currentPage: page },
    }));

    // Fetch FAQs with new page
    get().fetchFAQs(page);
  },

  // New functions implementation
  deletePageWithFAQs: async (pagePath: string) => {
    try {
      const { error } = await $fetch({
        url: `/api/admin/faq/page`,
        method: "DELETE",
        body: { pagePath },
      });

      if (error) {
        return false;
      }

      // Update local state by removing all FAQs with the given pagePath
      set((state) => {
        const removedCount = state.pageCounts[pagePath] ?? 0;
        const { [pagePath]: _dropped, ...faqsByPagePath } =
          state.faqsByPagePath;
        const { [pagePath]: _droppedCount, ...pageCounts } = state.pageCounts;
        return {
          faqs: state.faqs.filter((f) => f.pagePath !== pagePath),
          faqsByPagePath,
          pageCounts,
          pagination: {
            ...state.pagination,
            totalItems: Math.max(0, state.pagination.totalItems - removedCount),
          },
        };
      });

      return true;
    } catch (error) {
      // silently ignore
      return false;
    }
  },

  enablePageFAQs: async (pagePath: string) => {
    try {
      const { error } = await $fetch({
        url: `/api/admin/faq/page/status`,
        method: "PUT",
        body: { pagePath, status: true },
      });

      if (error) {
        return false;
      }

      // Update local state by setting status to true for all FAQs with the given pagePath
      set((state) =>
        mapEverywhere(state, (list) =>
          list.map((f) =>
            f.pagePath === pagePath ? { ...f, status: true } : f
          )
        )
      );

      return true;
    } catch (error) {
      // silently ignore
      return false;
    }
  },

  disablePageFAQs: async (pagePath: string) => {
    try {
      const { error } = await $fetch({
        url: `/api/admin/faq/page/status`,
        method: "PUT",
        body: { pagePath, status: false },
      });

      if (error) {
        return false;
      }

      // Update local state by setting status to false for all FAQs with the given pagePath
      set((state) =>
        mapEverywhere(state, (list) =>
          list.map((f) =>
            f.pagePath === pagePath ? { ...f, status: false } : f
          )
        )
      );

      return true;
    } catch (error) {
      // silently ignore
      return false;
    }
  },
}));
