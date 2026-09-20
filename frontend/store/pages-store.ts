import { create } from "zustand";
import { persist } from "zustand/middleware";
import { $fetch } from "@/lib/api";
import { pageAttributes } from "@/types/builder";

interface PagesState {
  pages: pageAttributes[];
  currentPage: pageAttributes | null;
  isLoading: boolean;
  error: string | null;
  fetchPages: () => Promise<void>;
  fetchPageById: (id: string) => Promise<pageAttributes | null>;
  setCurrentPage: (page: pageAttributes | null) => void;
}

export const usePagesStore = create<PagesState>()(
  persist(
    (set, get) => ({
      pages: [],
      currentPage: null,
      isLoading: false,
      error: null,

      fetchPages: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await $fetch({
            url: "/api/content/page",
            silentSuccess: true,
          });

          if (response.data && Array.isArray(response.data)) {
            // Handle direct array response
            set({ pages: response.data, isLoading: false });
          } else if (response.data && response.data.pages) {
            // Handle wrapped response
            set({ pages: response.data.pages, isLoading: false });
          } else {
            const errorMsg = response.error || "Failed to fetch pages";
            console.warn("Pages fetch error:", errorMsg);
            set({
              error: errorMsg,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error("Error fetching pages:", error);
          const errorMsg =
            error instanceof Error ? error.message : "Failed to fetch pages";
          set({ error: errorMsg, isLoading: false });
        }
      },

      fetchPageById: async (id: string) => {
        if (!id || typeof id !== "string") {
          console.warn("Invalid page ID provided:", id);
          return null;
        }

        set({ isLoading: true, error: null });
        try {
          const response = await $fetch({
            url: `/api/content/page/${id}`,
            silentSuccess: true,
          });

          if (response.data && response.data.id) {
            // Handle direct page response
            const page = response.data;
            set({ currentPage: page, isLoading: false });
            return page;
          } else if (response.data && response.data.page) {
            // Handle wrapped response
            const page = response.data.page;
            set({ currentPage: page, isLoading: false });
            return page;
          } else {
            const errorMsg = response.error || "Failed to fetch page";
            console.warn(`Page fetch error for ID ${id}:`, errorMsg);
            set({
              error: errorMsg,
              isLoading: false,
            });
            return null;
          }
        } catch (error) {
          console.error(`Error fetching page ${id}:`, error);
          const errorMsg =
            error instanceof Error ? error.message : "Failed to fetch page";
          set({ error: errorMsg, isLoading: false });
          return null;
        }
      },

      setCurrentPage: (page: pageAttributes | null) => {
        set({ currentPage: page });
      },
    }),
    {
      name: "pages-store",
      partialize: (state) => ({
        pages: state.pages,
        currentPage: state.currentPage,
      }),
    }
  )
);
