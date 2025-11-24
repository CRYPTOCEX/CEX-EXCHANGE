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
  page?: string; // Changed from hasPages to page
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
}

interface FAQAdminStore {
  // Data
  faqs: faqAttributes[];
  categories: string[];
  pageLinks: PageLink[];
  pagination: PaginationState;

  // UI state
  loading: boolean;
  error: string | null;
  filters: FAQFilters;

  // Add a new property to track the current page context for ordering
  currentPageContext: string | null;

  // Actions
  fetchFAQs: (page?: number) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchPageLinks: () => Promise<void>;
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

export const useFAQAdminStore = create<FAQAdminStore>((set, get) => ({
  // Data
  faqs: [],
  categories: [],
  pageLinks: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    perPage: 10,
  },

  // UI state
  loading: false,
  error: null,
  filters: {
    search: "",
    category: "",
    status: "all",
  },

  // Initialize the current page context
  currentPageContext: null,

  // Actions
  fetchFAQs: async (page = 1) => {
    set({ loading: true, error: null });
    try {
      const filters = get().filters;
      let url = `/api/admin/faq?page=${page}`;

      if (filters.search) {
        url += `&search=${encodeURIComponent(filters.search)}`;
      }

      if (filters.category) {
        url += `&category=${encodeURIComponent(filters.category)}`;
      }

      if (filters.status && filters.status !== "all") {
        url += `&status=${filters.status === "active" ? "active" : "inactive"}`;
      }

      if (filters.page) {
        url += `&page=${encodeURIComponent(filters.page)}`;
      }

      const { data, error } = await $fetch<{
        items: faqAttributes[];
        pagination: PaginationState;
      }>({
        url,
        silentSuccess: true,
      });

      if (error) {
        set({ error, loading: false });
        return;
      }

      if (data) {
        // Process each FAQ to parse tags and relatedFaqIds if they are strings.
        const processedItems = data.items.map((item) => ({
          ...item,
          tags:
            typeof item.tags === "string" ? JSON.parse(item.tags) : item.tags,
          relatedFaqIds:
            typeof item.relatedFaqIds === "string"
              ? JSON.parse(item.relatedFaqIds)
              : item.relatedFaqIds,
        }));

        set({
          faqs: processedItems || [],
          pagination: data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: data.items?.length || 0,
            perPage: 10,
          },
          loading: false,
        });
      }
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to fetch FAQs",
        loading: false,
      });
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
      console.error("Error fetching categories:", error);
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
    } catch (error) {
      console.error("Error fetching page links:", error);
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
        }));

        return data;
      }

      return null;
    } catch (error) {
      console.error("Error creating FAQ:", error);
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
        set((state) => ({
          faqs: state.faqs.map((f) => (f.id === id ? { ...f, ...data } : f)),
        }));

        return data;
      }

      return null;
    } catch (error) {
      console.error("Error updating FAQ:", error);
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
      set((state) => ({
        faqs: state.faqs.filter((f) => f.id !== id),
      }));

      return true;
    } catch (error) {
      console.error("Error deleting FAQ:", error);
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
        // Update local state
        set((state) => ({
          faqs: state.faqs.map((f) =>
            f.id === id ? { ...f, status: active } : f
          ),
        }));

        return true;
      }

      return false;
    } catch (error) {
      console.error("Error toggling FAQ status:", error);
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
      console.error("Error reordering FAQs:", error);
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
      set((state) => ({
        faqs: state.faqs.map((f) =>
          ids.includes(f.id) ? { ...f, ...data } : f
        ),
      }));

      return true;
    } catch (error) {
      console.error("Error bulk updating FAQs:", error);
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
      set((state) => ({
        faqs: state.faqs.filter((f) => !ids.includes(f.id)),
      }));

      return true;
    } catch (error) {
      console.error("Error bulk deleting FAQs:", error);
      return false;
    }
  },

  // Filters
  setFilters: (filters: Partial<FAQFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));

    // Fetch FAQs with new filters
    get().fetchFAQs(1);
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
      set((state) => ({
        faqs: state.faqs.filter((f) => f.pagePath !== pagePath),
      }));

      return true;
    } catch (error) {
      console.error("Error deleting page with FAQs:", error);
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
      set((state) => ({
        faqs: state.faqs.map((f) =>
          f.pagePath === pagePath ? { ...f, status: true } : f
        ),
      }));

      return true;
    } catch (error) {
      console.error("Error enabling page FAQs:", error);
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
      set((state) => ({
        faqs: state.faqs.map((f) =>
          f.pagePath === pagePath ? { ...f, status: false } : f
        ),
      }));

      return true;
    } catch (error) {
      console.error("Error disabling page FAQs:", error);
      return false;
    }
  },
}));
