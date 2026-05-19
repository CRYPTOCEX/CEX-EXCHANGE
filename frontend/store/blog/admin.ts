// src/store/blog/admin.ts
import { create } from "zustand";
import { $fetch } from "@/lib/api";

export interface AnalyticsData {
  date: string;
  views: number;
  visitors: number;
}

export interface DashboardData {
  posts: {
    publishedCount: number;
    draftCount: number;
    recentPosts: any[]; // Replace with your proper type for posts
  };
  authors: {
    approvedCount: number;
    pendingCount: number;
    recentPendingAuthors: any[]; // Replace with your proper type for authors
  };
  categories: {
    count: number;
    list: any[]; // Replace with your proper type for categories
  };
  tags: {
    count: number;
    list: any[]; // Replace with your proper type for tags
  };
  stats: {
    totalPosts: number;
    totalComments: number;
    totalAuthors: number;
    totalReaders: number;
  };
}

interface AdminBlogState {
  dashboardData: DashboardData | null;
  analyticsLoading: boolean;
  error: string | null;

  fetchDashboardData: () => Promise<void>;
  updateAuthorStatus: (
    id: string,
    status: "APPROVED" | "REJECTED"
  ) => Promise<void>;
}

export const useAdminBlogStore = create<AdminBlogState>((set, get) => ({
  dashboardData: null,
  analyticsLoading: false,
  error: null,

  // Unified endpoint to fetch dashboard data (posts, authors, categories, tags, stats)
  fetchDashboardData: async () => {
    try {
      set({ analyticsLoading: true, error: null });
      const { data, error } = await $fetch({
        url: "/api/admin/blog/stats",
        silentSuccess: true,
      });
      if (!error) {
        set({ dashboardData: data });
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      set({ error: "Failed to fetch dashboard data" });
    } finally {
      set({ analyticsLoading: false });
    }
  },

  // Updates an author's status then refreshes dashboard data.
  updateAuthorStatus: async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      set({ analyticsLoading: true, error: null });
      const { error } = await $fetch({
        url: `/api/admin/blog/author/${id}`,
        method: "PUT",
        body: { status },
      });
      if (!error) {
        // Refresh dashboard data so the pending authors list updates.
        await get().fetchDashboardData();
      }
    } catch (err) {
      console.error("Error updating author status:", err);
      set({ error: "Failed to update author status" });
    } finally {
      set({ analyticsLoading: false });
    }
  },
}));
