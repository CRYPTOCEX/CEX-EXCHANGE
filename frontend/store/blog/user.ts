import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { useConfigStore } from "@/store/config";

interface BlogState {
  // Posts
  posts: Post[];
  post: Post | null;
  postsLoading: boolean;
  postLoading: boolean;
  pagination: paginationAttributes;

  // Categories
  categories: Category[];
  categoriesLoading: boolean;

  // Tags
  tags: Tag[];
  tagsLoading: boolean;

  // Comments
  comments: Comment[];
  commentsLoading: boolean;

  // Authors
  authors: Author[];
  authorsLoading: boolean;

  // Author
  author: Author | null;
  authorLoading: boolean;

  // Top authors
  topAuthors: TopAuthor[];
  topAuthorsLoading: boolean;

  // General loading state
  isLoading: boolean;

  // Error state
  error: string | null;

  // Posts actions
  fetchPosts: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    tag?: string;
    search?: string;
    sortField?: string;
    sortOrder?: string;
  }) => Promise<void>;
  fetchPost: (slug: string) => Promise<void>;

  // Categories actions
  category: Category | null;
  fetchCategories: () => Promise<void>;
  fetchCategory: (id: string) => Promise<void>;

  // Tags actions
  tag: Tag | null;
  fetchTags: () => Promise<void>;
  fetchTag: (slug: string) => Promise<void>;

  // Comments actions
  fetchComments: (postId: string) => Promise<void>;
  addComment: (
    content: string,
    userId: string,
    postId: string
  ) => Promise<void>;

  // Authors actions
  fetchAllAuthors: () => Promise<void>;
  fetchAuthor: () => Promise<void>;
  applyForAuthor: (userId: string) => Promise<void>;

  // Top authors actions
  fetchTopAuthors: () => Promise<void>;
}

export const useBlogStore = create<BlogState>((set, get) => ({
  // Initial state
  posts: [],
  post: null,
  postsLoading: false,
  postLoading: false,
  pagination: {
    currentPage: 1,
    perPage: 10, // This will be updated by fetchPosts
    totalItems: 0,
    totalPages: 1,
  },

  category: null,
  categories: [],
  categoriesLoading: false,

  tag: null,
  tags: [],
  tagsLoading: false,

  comments: [],
  commentsLoading: false,

  authors: [],
  authorsLoading: false,

  author: null,
  authorLoading: false,

  topAuthors: [],
  topAuthorsLoading: false,

  isLoading: false,
  error: null,

  // Posts actions
  fetchPosts: async (params = {}) => {
    set({ postsLoading: true, error: null });

    // Get settings to use postsPerPage setting
    const { settings } = useConfigStore.getState();
    const defaultPerPage = settings?.postsPerPage
      ? Number(settings.postsPerPage)
      : 10;

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set("page", params.page.toString());
    // Use perPage because your backend expects it, with setting value as default
    if (params.limit) {
      queryParams.set("perPage", params.limit.toString());
    } else {
      queryParams.set("perPage", defaultPerPage.toString());
    }

    // Build a filter object for category, tag, and search.
    const filterObj: Record<string, any> = {};
    if (params.category) {
      filterObj["category.slug"] = params.category;
    }
    if (params.tag) {
      filterObj["tags.slug"] = params.tag;
    }
    if (params.search) {
      // Example: search in the title using LIKE operator
      filterObj["title"] = { operator: "like", value: `%${params.search}%` };
    }
    if (Object.keys(filterObj).length > 0) {
      queryParams.set("filter", JSON.stringify(filterObj));
    }

    // Pass sort parameters if provided
    if (params.sortField) {
      queryParams.set("sortField", params.sortField);
    }
    if (params.sortOrder) {
      queryParams.set("sortOrder", params.sortOrder);
    }

    const { data, error } = await $fetch({
      url: `/api/blog/post?${queryParams.toString()}`,
      silentSuccess: true,
    });

    if (!error) {
      set({
        // Use items from the response as posts
        posts: data?.items || [],
        // Use pagination as provided by the backend. Note: it returns "currentPage"
        pagination: data?.pagination || {
          currentPage: 1,
          perPage: 10,
          totalItems: 0,
          totalPages: 1,
        },
      });
    }

    set({ postsLoading: false });
  },

  fetchPost: async (slug: string) => {
    set({ postLoading: true, error: null });

    const { data, error } = await $fetch({
      url: `/api/blog/post/${slug}`,
      silentSuccess: true,
    });

    if (!error) {
      set({ post: data || null });
    }

    set({ postLoading: false });
  },

  // Categories actions
  fetchCategories: async () => {
    set({ categoriesLoading: true, error: null });

    const { data, error } = await $fetch({
      url: "/api/blog/category",
      silentSuccess: true,
    });

    if (!error) {
      set({ categories: data || [] });
    }

    set({ categoriesLoading: false });
  },

  fetchCategory: async (slug: string) => {
    set({ categoriesLoading: true, error: null });

    const { data, error } = await $fetch({
      url: `/api/blog/category/${slug}?posts=true`,
      silentSuccess: true,
    });

    if (!error) {
      set({ category: data || null, categoriesLoading: false });
    }
  },

  // Tags actions
  fetchTags: async () => {
    set({ tagsLoading: true, error: null });

    const { data, error } = await $fetch({
      url: "/api/blog/tag",
      silentSuccess: true,
    });

    if (!error) {
      set({ tags: data || [] });
    }

    set({ tagsLoading: false });
  },

  fetchTag: async (slug: string) => {
    set({ tagsLoading: true, error: null });

    const { data, error } = await $fetch({
      url: `/api/blog/tag/${slug}?posts=true`,
      silentSuccess: true,
    });

    if (!error) {
      set({ tag: data || null });
    }

    set({ tagsLoading: false });
  },

  // Comments actions
  fetchComments: async (postId: string) => {
    set({ commentsLoading: true, error: null });

    const { data, error } = await $fetch({
      url: `/api/blog/comment/${postId}`,
      silentSuccess: true,
    });

    if (!error) {
      set({ comments: data || [] });
    }

    set({ commentsLoading: false });
  },

  addComment: async (content: string, userId: string, postId: string) => {
    set({ commentsLoading: true, error: null });

    const { error } = await $fetch({
      url: `/api/blog/comment/${postId}`,
      method: "POST",
      body: { content, userId, postId },
    });

    if (!error) {
      await get().fetchComments(postId);
    }

    set({ commentsLoading: false });
  },

  // Authors actions
  fetchAllAuthors: async () => {
    set({ authorsLoading: true, error: null });

    const { data, error } = await $fetch({
      url: "/api/blog/author/all",
      silentSuccess: true,
    });

    if (!error) {
      set({ authors: data || [] });
    }

    set({ authorsLoading: false });
  },

  fetchAuthor: async () => {
    set({ authorLoading: true, error: null });

    const { data, error } = await $fetch({
      url: `/api/blog/author`,
      silentSuccess: true,
    });

    if (!error) {
      set({ author: data || null });
    }

    set({ authorLoading: false });
  },

  applyForAuthor: async (userId: string) => {
    set({ isLoading: true, error: null });

    const { error } = await $fetch({
      url: "/api/blog/author",
      method: "POST",
      body: { userId },
    });

    set({ isLoading: false });
  },

  // Top authors actions
  fetchTopAuthors: async () => {
    set({ topAuthorsLoading: true, error: null });

    const { data, error } = await $fetch({
      url: "/api/blog/author/top",
      silentSuccess: true,
      silent: true,
    });

    if (!error) {
      set({ topAuthors: data || [] });
    }

    set({ topAuthorsLoading: false });
  },
}));
