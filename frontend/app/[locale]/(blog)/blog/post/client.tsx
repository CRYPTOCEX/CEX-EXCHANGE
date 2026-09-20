"use client";

import type React from "react";
import { useEffect, useState, useCallback } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { ImageWithFallback as Image } from "@/components/ui/image-with-fallback";
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
import { m, AnimatePresence } from "framer-motion";
import { debounce } from "@/utils/debounce";
import { useTranslations } from "next-intl";
import { publicShortName } from "@/utils/display-name";
import { PageHero } from "../components/page-hero";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";

export function AllArticlesClient() {
  const t = useTranslations("common");
  const tBlogBlog = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
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
      router.push(newPath);
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
        setError(tCommon("failed_to_load_content"));
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

  /**
   * The pending copy of this page is gone.
   * ==========================================================================
   *
   * Of everything it drew, exactly ONE region was genuinely unknown: the post
   * grid. The hero is three `t()` strings; the search box, the three
   * `<Select>`s and the grid/list toggle are live controls this component owns
   * and that work perfectly well before any post exists — the copy replaced
   * all of them with `h-10` grey bars, so for the duration of the fetch the
   * user could not type a search or pick a category on a page whose entire
   * purpose is filtering.
   *
   * It also dropped `FloatingShapes` and `InteractivePattern` (present in the
   * real tree, absent in the copy), and its nine cards were the usual drifted
   * `BlogCard` imitation: `border-border/50`, a `p-6 space-y-4` content block
   * and a footer with `pt-4` but no `mt-6`, i.e. 24px short per card over
   * three rows.
   *
   * `isPending` keeps the same condition the early return used, so nothing
   * about WHEN the placeholder shows has changed — only what it replaces.
   */
  const isPending =
    (isLoading && posts.length === 0) ||
    (categories.length === 0 && isLoading);

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
    <div className="min-h-screen relative overflow-hidden bg-card">
      {/* Premium Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent 0%, hsl(var(--primary) / 0.03) 10%, hsl(var(--chart-4) / 0.02) 30%, transparent 60%)`,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 50%)`,
        }}
      />
      <FloatingShapes
        count={8}
        interactive={true}
        theme={{ primary: "indigo", secondary: "purple" }}
      />
      <InteractivePattern
        config={{
          enabled: true,
          variant: "crosses",
          opacity: 0.015,
          size: 40,
          interactive: true,
        }}
      />

      {/* Hero Section */}
      <PageHero
        badge={{ icon: <FileText className="h-3.5 w-3.5" />, text: tCommon("articles") }}
        title={[
          { text: "All " },
          { text: "Articles", gradient: "bg-primary" },
        ]}
        description={tBlogBlog("explore_our_collection_of_articles")}
      />

      <div className="relative z-10 container mx-auto px-4 pb-16">

        {/* Search and filters */}
        <m.div
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
              <Input
                placeholder={`${tBlogBlog("search_articles")}…`}
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 h-10 rounded-lg border-border focus:border-primary focus:ring focus:ring-primary text-foreground"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Toggle filters button (mobile) */}
              <Button
                variant="outline"
                className="lg:hidden gap-2 border-border-strong text-muted-foreground dark:hover:bg-muted"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
                {showFilters ? tCommon("hide_filters") : tCommon("show_filters")}
              </Button>

              {/* Category filter */}
              <div
                className={`${showFilters ? "block" : "hidden"} lg:block w-full sm:w-auto`}
              >
                <Select
                  value={selectedCategory}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="h-10 min-w-[180px] rounded-lg border-border-strong text-foreground">
                    <div className="flex items-center gap-2">
                      <Bookmark className="h-4 w-4 text-primary" />
                      <SelectValue placeholder={t("all_categories")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="border-border-strong">
                    <SelectItem
                      value="all"
                      className="text-foreground dark:focus:bg-muted"
                    >
                      {t("all_categories")}
                    </SelectItem>
                    {categories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.slug}
                        className="text-foreground dark:focus:bg-muted"
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
                  <SelectTrigger className="h-10 min-w-[180px] rounded-lg border-border-strong text-foreground">
                    <div className="flex items-center gap-2">
                      <TagIcon className="h-4 w-4 text-primary" />
                      <SelectValue placeholder={tCommon("all_tags")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="border-border-strong">
                    <SelectItem
                      value="all"
                      className="text-foreground dark:focus:bg-muted"
                    >
                      {tCommon("all_tags")}
                    </SelectItem>
                    {tags.map((tag) => (
                      <SelectItem
                        key={tag.id}
                        value={tag.slug}
                        className="text-foreground dark:focus:bg-muted"
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
                  <SelectTrigger className="h-10 min-w-[180px] rounded-lg border-border-strong text-foreground">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4 text-primary" />
                      <SelectValue placeholder={t("sort_by")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="border-border-strong">
                    <SelectItem
                      value="newest"
                      className="text-foreground dark:focus:bg-muted"
                    >
                      {t("newest_first")}
                    </SelectItem>
                    <SelectItem
                      value="oldest"
                      className="text-foreground dark:focus:bg-muted"
                    >
                      {t("oldest_first")}
                    </SelectItem>
                    <SelectItem
                      value="a-z"
                      className="text-foreground dark:focus:bg-muted"
                    >
                      A-Z
                    </SelectItem>
                    <SelectItem
                      value="z-a"
                      className="text-foreground dark:focus:bg-muted"
                    >
                      Z-A
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View mode toggle */}
              <div
                className={`${showFilters ? "flex" : "hidden"} lg:flex rounded-lg border border-border-strong divide-x divide-border`}
              >
                <Button
                  variant="ghost"
                  className={`px-3 rounded-none rounded-l-lg ${viewMode === "grid" ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "text-muted-foreground dark:hover:text-muted-foreground dark:hover:bg-muted"}`}
                  onClick={() => handleViewChange("grid")}
                >
                  <Grid className="h-4 w-4" />
                  <span className="sr-only">Grid view</span>
                </Button>
                <Button
                  variant="ghost"
                  className={`px-3 rounded-none rounded-r-lg ${viewMode === "list" ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "text-muted-foreground dark:hover:text-muted-foreground dark:hover:bg-muted"}`}
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
              <span className="text-sm text-subtle-foreground">
                {t("active_filters")}
              </span>
              {selectedCategory && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
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
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
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
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
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
                className="text-subtle-foreground hover:text-foreground dark:hover:text-muted-foreground"
              >
                {t("clear_all")}
              </Button>
            </div>
          )}
        </m.div>

        {/* Error state */}
        {error ? (
          <div className="bg-destructive/10 dark:bg-destructive/20 text-destructive-ink p-6 rounded-lg text-center">
            <h3 className="text-lg font-medium mb-2">{error}</h3>
            <Button onClick={() => window.location.reload()}>
              {t("try_again")}
            </Button>
          </div>
        ) : !isPending && filteredPosts.length === 0 ? (
          /* `!isPending &&` is the loading/empty separation. `filteredPosts` is
             empty for the whole of the fetch, so without this guard removing
             the early return above would have made every visit render "No
             articles found" — with a "Clear filters" button — before the
             articles appeared. */
          <div className="text-center py-16 bg-muted rounded-xl border border-border">
            <div className="inline-flex items-center justify-center p-6 bg-muted rounded-full mb-4">
              <FileText className="h-10 w-10 text-subtle-foreground" />
            </div>
            <h3 className="text-xl font-medium text-foreground mb-2">
              {tBlogBlog("no_articles_found")}
            </h3>
            <p className="text-subtle-foreground mb-6 max-w-md mx-auto">
              {searchQuery
                ? tCommon("no_articles_match_your_search_for", { searchQuery: String(searchQuery) })
                : selectedCategory || selectedTag
                  ? tCommon("no_articles_match_your_selected_filters")
                  : tCommon("there_are_no_articles_published_yet")}
            </p>
            <Button onClick={clearAllFilters}>{t("clear_filters")}</Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Grid view */}
            {viewMode === "grid" && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Nine pending cards — the count the removed copy used — from
                    the REAL `BlogCard`, in the REAL grid. */}
                {isPending &&
                  Array.from({ length: 9 }).map((_, i) => (
                    <BlogCard key={`pending-${i}`} loading />
                  ))}
                <AnimatePresence>
                  {filteredPosts.map((post, index) => (
                    <m.div
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
                    </m.div>
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
                      <m.div
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
                        className="bg-muted rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-border-strong"
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
                                  className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-300"
                                >
                                  {post.category.name}
                                </Link>
                              )}
                              {post.tags &&
                                post.tags.slice(0, 2).map((tag) => (
                                  <Link
                                    key={tag.id}
                                    href={`/blog/tag/${tag.slug}`}
                                    className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-300"
                                  >
                                    {tag.name}
                                  </Link>
                                ))}
                            </div>

                            <h3 className="text-xl font-bold text-foreground mb-2 hover:text-primary transition-colors duration-300">
                              <Link href={`/blog/${post.slug}`}>
                                {post.title}
                              </Link>
                            </h3>

                            {post.description && (
                              <p className="text-muted-foreground mb-4 line-clamp-2">
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
                                      alt={publicShortName(
                                        post.author.user,
                                        tCommon("author")
                                      )}
                                      width={32}
                                      height={32}
                                    />
                                    <div>
                                      <p className="text-sm font-medium text-foreground">
                                        <Link
                                          href={`/blog/author/${post.author.id}`}
                                          className="hover:text-primary transition-colors duration-300"
                                        >
                                          {publicShortName(post.author.user, tCommon("author"))}
                                        </Link>
                                      </p>
                                      {post.createdAt && (
                                        <div className="flex items-center text-xs text-subtle-foreground">
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
                                  className="border-border-strong text-muted-foreground"
                                >
                                  {tBlogBlog("read_article")}
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </m.div>
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
