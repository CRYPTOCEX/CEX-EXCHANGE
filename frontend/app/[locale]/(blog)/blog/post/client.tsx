"use client";

import type React from "react";
import { useEffect, useState, useCallback } from "react";
import { Link, useRouter } from "@/i18n/routing";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useBlogStore } from "@/store/blog/user";
import { BlogCard } from "../components/blog-card";
import { Pagination } from "../components/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  Filter,
  ArrowUpDown,
  Grid,
  List,
  X,
  Calendar,
  TagIcon,
  Bookmark,
  FileText,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { debounce } from "@/utils/debounce";
import { useTranslations } from "next-intl";

export function AllArticlesClient() {
  const t = useTranslations("blog");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get URL parameters
  const categoryParam = searchParams.get("category");
  const tagParam = searchParams.get("tag");
  const searchParam = searchParams.get("search");
  const sortParam = searchParams.get("sort") || "newest";
  const viewParam = searchParams.get("view") || "grid";
  const pageParam = Number(searchParams.get("page") || "1");
  const {
    posts,
    categories,
    tags,
    pagination,
    isLoading,
    fetchPosts,
    fetchCategories,
    fetchTags,
  } = useBlogStore();

  // Local state
  const [searchQuery, setSearchQuery] = useState(searchParam || "");
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || "");
  const [selectedTag, setSelectedTag] = useState(tagParam || "");
  const [sortOrder, setSortOrder] = useState(sortParam);
  const [viewMode, setViewMode] = useState(viewParam);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filteredPosts, setFilteredPosts] = useState(posts);
  const [isFiltering, setIsFiltering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Update URL with current filters
  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      // Create a new URLSearchParams object
      const newSearchParams = new URLSearchParams();

      // Add all the parameters that have values
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          newSearchParams.set(key, value);
        }
      });

      // Convert to string and navigate
      const queryString = newSearchParams.toString();
      const newPath = queryString ? `/blog/post?${queryString}` : "/blog/post";
      router.push(newPath, {
        scroll: false,
      });
    },
    [router]
  );

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      updateUrl({
        category: selectedCategory,
        tag: selectedTag,
        search: value,
        sort: sortOrder,
        view: viewMode,
        page: "1", // Reset to first page on search
      });
    }, 500),
    [updateUrl, selectedCategory, selectedTag, sortOrder, viewMode]
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  // Handle category selection
  const handleCategoryChange = (value: string) => {
    // If "all" is selected, we want to clear the filter
    const categoryValue = value === "all" ? "" : value;
    setSelectedCategory(categoryValue);
    updateUrl({
      category: categoryValue,
      tag: selectedTag,
      search: searchQuery,
      sort: sortOrder,
      view: viewMode,
      page: "1", // Reset to first page on filter change
    });
  };

  // Handle tag selection
  const handleTagChange = (value: string) => {
    // If "all" is selected, we want to clear the filter
    const tagValue = value === "all" ? "" : value;
    setSelectedTag(tagValue);
    updateUrl({
      category: selectedCategory,
      tag: tagValue,
      search: searchQuery,
      sort: sortOrder,
      view: viewMode,
      page: "1", // Reset to first page on filter change
    });
  };

  // Handle sort order change
  const handleSortChange = (value: string) => {
    setSortOrder(value);
    updateUrl({
      category: selectedCategory,
      tag: selectedTag,
      search: searchQuery,
      sort: value,
      view: viewMode,
      page: pageParam.toString(),
    });
  };

  // Handle view mode change
  const handleViewChange = (value: string) => {
    setViewMode(value);
    updateUrl({
      category: selectedCategory,
      tag: selectedTag,
      search: searchQuery,
      sort: sortOrder,
      view: value,
      page: pageParam.toString(),
    });
  };

  // Remove a filter
  const removeFilter = (type: string, value: string) => {
    if (type === "category") {
      setSelectedCategory("");
    } else if (type === "tag") {
      setSelectedTag("");
    } else if (type === "search") {
      setSearchQuery("");
    }
    updateUrl({
      category: type === "category" ? "" : selectedCategory,
      tag: type === "tag" ? "" : selectedTag,
      search: type === "search" ? "" : searchQuery,
      sort: sortOrder,
      view: viewMode,
      page: "1", // Reset to first page when removing filters
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategory("");
    setSelectedTag("");
    setSearchQuery("");
    updateUrl({
      category: "",
      tag: "",
      search: "",
      sort: sortOrder,
      view: viewMode,
      page: "1", // Reset to first page when clearing filters
    });
  };
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsFiltering(true);

        // Fetch categories and tags if not already loaded
        if (categories.length === 0) {
          await fetchCategories();
        }
        if (tags.length === 0) {
          await fetchTags();
        }

        // Map client sort value to sortField and sortOrder
        const sortMapping: Record<
          string,
          {
            sortField: string;
            sortOrder: string;
          }
        > = {
          newest: {
            sortField: "createdAt",
            sortOrder: "desc",
          },
          oldest: {
            sortField: "createdAt",
            sortOrder: "asc",
          },
          "a-z": {
            sortField: "title",
            sortOrder: "asc",
          },
          "z-a": {
            sortField: "title",
            sortOrder: "desc",
          },
        };
        await fetchPosts({
          category: selectedCategory,
          tag: selectedTag,
          search: searchQuery,
          page: pageParam,
          limit: 12,
          ...sortMapping[sortOrder],
        });
        setIsFiltering(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load content");
        setIsFiltering(false);
      }
    };
    loadData();
  }, [
    fetchPosts,
    fetchCategories,
    fetchTags,
    selectedCategory,
    selectedTag,
    pageParam,
    searchQuery,
    sortOrder,
    categories.length,
    tags.length,
  ]);

  // Update active filters when filters change
  useEffect(() => {
    const filters: string[] = [];
    if (selectedCategory) {
      const category = categories.find((c) => c.slug === selectedCategory);
      if (category) {
        filters.push(`category:${category.name}`);
      }
    }
    if (selectedTag) {
      const tag = tags.find((t) => t.slug === selectedTag);
      if (tag) {
        filters.push(`tag:${tag.name}`);
      }
    }
    if (searchQuery) {
      filters.push(`search:${searchQuery}`);
    }
    setActiveFilters(filters);
  }, [selectedCategory, selectedTag, searchQuery, categories, tags]);

  // Apply client-side filtering and sorting
  useEffect(() => {
    let filtered = [...posts];

    // Apply search filter (client-side)
    if (searchQuery) {
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (post.description &&
            post.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortOrder === "oldest") {
        return (
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
        );
      } else if (sortOrder === "a-z") {
        return a.title.localeCompare(b.title);
      } else if (sortOrder === "z-a") {
        return b.title.localeCompare(a.title);
      } else {
        // Default: newest first
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      }
    });
    setFilteredPosts(filtered);
  }, [posts, searchQuery, sortOrder]);

  // Ensure we're only running window-dependent code on the client
  useEffect(() => {
    // This will only run in the browser, not during SSR
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setShowFilters(true);
      } else {
        setShowFilters(false);
      }
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Clean up
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Loading state
  if (
    (isLoading && posts.length === 0) ||
    (categories.length === 0 && isLoading)
  ) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center mb-8">
          <Skeleton className="h-10 w-10 rounded-full mr-2" />
          <Skeleton className="h-8 w-40" />
        </div>

        <div className="mb-8">
          <Skeleton className="h-10 w-1/3 mb-4" />
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({
            length: 9,
          }).map((_, i) => (
            <Skeleton key={i} className="h-[350px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Generate the base URL for pagination
  const getPaginationBaseUrl = () => {
    let baseUrl = "/blog/post";
    const params: string[] = [];
    if (selectedCategory && selectedCategory !== "all")
      params.push(`category=${selectedCategory}`);
    if (selectedTag && selectedTag !== "all") params.push(`tag=${selectedTag}`);
    if (searchQuery) params.push(`search=${searchQuery}`);
    if (sortOrder !== "newest") params.push(`sort=${sortOrder}`);
    if (viewMode !== "grid") params.push(`view=${viewMode}`);
    if (params.length > 0) {
      baseUrl += `?${params.join("&")}`;
    }
    return baseUrl;
  };
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-12">
        {/* Header with back button */}
        <div className="mb-8">
          <Link
            href="/blog"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 mb-4 transition-colors duration-300"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back_to_blog")}
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <motion.h1
              initial={{
                opacity: 0,
                y: -20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.5,
              }}
              className="text-3xl font-bold text-zinc-900 dark:text-zinc-100"
            >
              {t("all_articles")}
            </motion.h1>

            {filteredPosts.length > 0 && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.1,
                }}
                className="flex items-center gap-2"
              >
                {isFiltering ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                )}
                <p className="text-zinc-500 dark:text-zinc-400">
                  {t("Showing")} {filteredPosts.length} {t("of")}{" "}
                  {pagination.totalItems} {t("articles")}
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Search and filters */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
          }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 h-10 rounded-lg border-zinc-200 dark:border-zinc-800 focus:border-indigo-300 dark:focus:border-indigo-700 focus:ring focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:ring-opacity-50 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Toggle filters button (mobile) */}
              <Button
                variant="outline"
                className="lg:hidden h-10 gap-2 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>

              {/* Category filter */}
              <div
                className={`${showFilters ? "block" : "hidden"} lg:block w-full sm:w-auto`}
              >
                <Select
                  value={selectedCategory}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="h-10 min-w-[180px] rounded-lg border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    <div className="flex items-center gap-2">
                      <Bookmark className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                      <SelectValue placeholder="All Categories" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="dark:bg-zinc-900 dark:border-zinc-700">
                    <SelectItem
                      value="all"
                      className="dark:text-zinc-100 dark:focus:bg-zinc-800"
                    >
                      {t("all_categories")}
                    </SelectItem>
                    {categories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.slug}
                        className="dark:text-zinc-100 dark:focus:bg-zinc-800"
                      >
                        {category.name}{" "}
                        {category.postCount && `(${category.postCount})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tag filter */}
              <div
                className={`${showFilters ? "block" : "hidden"} lg:block w-full sm:w-auto`}
              >
                <Select value={selectedTag} onValueChange={handleTagChange}>
                  <SelectTrigger className="h-10 min-w-[180px] rounded-lg border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    <div className="flex items-center gap-2">
                      <TagIcon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                      <SelectValue placeholder="All Tags" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="dark:bg-zinc-900 dark:border-zinc-700">
                    <SelectItem
                      value="all"
                      className="dark:text-zinc-100 dark:focus:bg-zinc-800"
                    >
                      {t("all_tags")}
                    </SelectItem>
                    {tags.map((tag) => (
                      <SelectItem
                        key={tag.id}
                        value={tag.slug}
                        className="dark:text-zinc-100 dark:focus:bg-zinc-800"
                      >
                        {tag.name} {tag.postCount && `(${tag.postCount})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort order */}
              <div
                className={`${showFilters ? "block" : "hidden"} lg:block w-full sm:w-auto`}
              >
                <Select value={sortOrder} onValueChange={handleSortChange}>
                  <SelectTrigger className="h-10 min-w-[180px] rounded-lg border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                      <SelectValue placeholder="Sort by" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="dark:bg-zinc-900 dark:border-zinc-700">
                    <SelectItem
                      value="newest"
                      className="dark:text-zinc-100 dark:focus:bg-zinc-800"
                    >
                      {t("newest_first")}
                    </SelectItem>
                    <SelectItem
                      value="oldest"
                      className="dark:text-zinc-100 dark:focus:bg-zinc-800"
                    >
                      {t("oldest_first")}
                    </SelectItem>
                    <SelectItem
                      value="a-z"
                      className="dark:text-zinc-100 dark:focus:bg-zinc-800"
                    >
                      {t("A-Z")}
                    </SelectItem>
                    <SelectItem
                      value="z-a"
                      className="dark:text-zinc-100 dark:focus:bg-zinc-800"
                    >
                      {t("Z-A")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View mode toggle */}
              <div
                className={`${showFilters ? "flex" : "hidden"} lg:flex rounded-lg border border-zinc-200 dark:border-zinc-700 divide-x divide-zinc-200 dark:divide-zinc-700`}
              >
                <Button
                  variant="ghost"
                  className={`px-3 rounded-none rounded-l-lg ${viewMode === "grid" ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400" : "dark:text-zinc-400 dark:hover:text-zinc-300 dark:hover:bg-zinc-800"}`}
                  onClick={() => handleViewChange("grid")}
                >
                  <Grid className="h-4 w-4" />
                  <span className="sr-only">Grid view</span>
                </Button>
                <Button
                  variant="ghost"
                  className={`px-3 rounded-none rounded-r-lg ${viewMode === "list" ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400" : "dark:text-zinc-400 dark:hover:text-zinc-300 dark:hover:bg-zinc-800"}`}
                  onClick={() => handleViewChange("list")}
                >
                  <List className="h-4 w-4" />
                  <span className="sr-only">List view</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Active filters */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {t("active_filters")}
              </span>
              {selectedCategory && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                >
                  <Bookmark className="h-3 w-3" />
                  {categories.find((c) => c.slug === selectedCategory)?.name ||
                    selectedCategory}
                  <button
                    onClick={() => removeFilter("category", selectedCategory)}
                  >
                    <X className="h-3 w-3 ml-1" />
                  </button>
                </Badge>
              )}
              {selectedTag && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
                >
                  <TagIcon className="h-3 w-3" />
                  {tags.find((t) => t.slug === selectedTag)?.name ||
                    selectedTag}
                  <button onClick={() => removeFilter("tag", selectedTag)}>
                    <X className="h-3 w-3 ml-1" />
                  </button>
                </Badge>
              )}
              {searchQuery && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
                >
                  <Search className="h-3 w-3" />
                  {searchQuery}
                  <button onClick={() => removeFilter("search", searchQuery)}>
                    <X className="h-3 w-3 ml-1" />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                {t("clear_all")}
              </Button>
            </div>
          )}
        </motion.div>

        {/* Error state */}
        {error ? (
          <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-6 rounded-lg text-center">
            <h3 className="text-lg font-medium mb-2">{error}</h3>
            <Button onClick={() => window.location.reload()}>
              {t("try_again")}
            </Button>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div className="inline-flex items-center justify-center p-6 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-4">
              <FileText className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              {t("no_articles_found")}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-md mx-auto">
              {searchQuery
                ? `No articles match your search for "${searchQuery}".`
                : selectedCategory || selectedTag
                  ? "No articles match your selected filters."
                  : "There are no articles published yet."}
            </p>
            <Button onClick={clearAllFilters}>{t("clear_filters")}</Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Grid view */}
            {viewMode === "grid" && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {filteredPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{
                        opacity: 0,
                        y: 20,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                        y: -20,
                      }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.05,
                      }}
                    >
                      <BlogCard post={post} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* List view */}
            {viewMode === "list" && (
              <div className="space-y-6">
                <AnimatePresence>
                  {filteredPosts.map((post, index) => {
                    return (
                      <motion.div
                        key={post.id}
                        initial={{
                          opacity: 0,
                          x: -20,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        exit={{
                          opacity: 0,
                          x: 20,
                        }}
                        transition={{
                          duration: 0.4,
                          delay: index * 0.05,
                        }}
                        className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-zinc-100 dark:border-zinc-700"
                      >
                        <div className="flex flex-col md:flex-row">
                          <div className="relative md:w-1/3 h-48 md:h-auto">
                            <Image
                              src={post.image || "/placeholder.svg"}
                              alt={post.title}
                              fill
                              sizes={`(min-width: 768px) 300px, 100vw`}
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 p-6">
                            <div className="flex flex-wrap gap-2 mb-3">
                              {post.category && (
                                <Link
                                  href={`/blog/category/${post.category.slug}`}
                                  className="inline-block rounded-full bg-indigo-100 dark:bg-indigo-950/40 px-3 py-1 text-xs font-medium text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors duration-300"
                                >
                                  {post.category.name}
                                </Link>
                              )}
                              {post.tags &&
                                post.tags.slice(0, 2).map((tag) => (
                                  <Link
                                    key={tag.id}
                                    href={`/blog/tag/${tag.slug}`}
                                    className="inline-block rounded-full bg-purple-100 dark:bg-purple-950/40 px-3 py-1 text-xs font-medium text-purple-800 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors duration-300"
                                  >
                                    {tag.name}
                                  </Link>
                                ))}
                            </div>

                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-300">
                              <Link href={`/blog/${post.slug}`}>
                                {post.title}
                              </Link>
                            </h3>

                            {post.description && (
                              <p className="text-zinc-600 dark:text-zinc-300 mb-4 line-clamp-2">
                                {post.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                {post.author?.user && (
                                  <div className="flex items-center">
                                    <Image
                                      className="h-8 w-8 rounded-full mr-2"
                                      src={
                                        post.author.user.avatar ||
                                        "/img/placeholder.svg"
                                      }
                                      alt={
                                        post.author.user.firstName || "Author"
                                      }
                                      width={32}
                                      height={32}
                                    />
                                    <div>
                                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                        <Link
                                          href={`/blog/author/${post.author.id}`}
                                          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-300"
                                        >
                                          {post.author.user.firstName}{" "}
                                          {post.author.user.lastName}
                                        </Link>
                                      </p>
                                      {post.createdAt && (
                                        <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400">
                                          <Calendar className="h-3 w-3 mr-1" />
                                          {new Date(
                                            post.createdAt
                                          ).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <Link
                                href={`/blog/${post.slug}`}
                                className="rounded-full"
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="dark:border-zinc-700 dark:text-zinc-300"
                                >
                                  {t("read_article")}
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Pagination */}
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              baseUrl={getPaginationBaseUrl()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
