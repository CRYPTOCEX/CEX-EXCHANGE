"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Home,
  FileText,
  Users,
  Shield,
  Phone,
  Edit3,
  ExternalLink,
  Code,
  Palette,
  Search,
  LayoutGrid,
  List,
  Loader2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Globe,
  Settings,
  ChevronRight,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface DefaultPage {
  id: string;
  name: string;
  description: string;
  path: string;
  status: "active" | "inactive";
  lastModified?: string;
  type: "page" | "layout";
}

interface DefaultPageWithIcon extends DefaultPage {
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

// Icon mapping for page types
const getIconForPage = (
  pageId: string,
  type: string
): React.ComponentType<{ className?: string }> => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    home: Home,
    about: Users,
    privacy: Shield,
    terms: FileText,
    contact: Phone,
    "legal-layout": Code,
  };

  return iconMap[pageId] || (type === "layout" ? Code : FileText);
};

// Get category for page
const getCategoryForPage = (pageId: string, type: string): string => {
  if (type === "layout") return "Layouts";
  if (pageId === "home") return "Main Pages";
  if (["about", "contact"].includes(pageId)) return "Information";
  if (["privacy", "terms"].includes(pageId)) return "Legal";
  return "Other";
};

// Format relative date
const formatRelativeDate = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
};

export default function DefaultEditorPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [pages, setPages] = useState<DefaultPageWithIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        setLoading(true);
        const { data, error } = await $fetch({
          url: "/api/admin/default-editor",
          method: "GET",
        });

        if (error) {
          setError(error);
          return;
        }

        // Add icons, categories and format dates
        const pagesWithIcons: DefaultPageWithIcon[] = data.map(
          (page: DefaultPage) => ({
            ...page,
            icon: getIconForPage(page.id, page.type),
            category: getCategoryForPage(page.id, page.type),
            lastModified: page.lastModified
              ? formatRelativeDate(page.lastModified)
              : undefined,
          })
        );

        setPages(pagesWithIcons);
      } catch (err) {
        setError("Failed to load pages");
        console.error("Error fetching default editor pages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, []);

  // Get unique categories
  const categories = Array.from(new Set(pages.map((p) => p.category)));

  // Filter pages
  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.path.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory || page.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group pages by category
  const groupedPages = filteredPages.reduce(
    (acc, page) => {
      if (!acc[page.category]) {
        acc[page.category] = [];
      }
      acc[page.category].push(page);
      return acc;
    },
    {} as Record<string, DefaultPageWithIcon[]>
  );

  // Open preview in new tab
  const openPreview = (pageId: string) => {
    // Map pageId to actual frontend path
    const pathMap: Record<string, string> = {
      home: "/",
      about: "/about",
      privacy: "/privacy",
      terms: "/terms",
      contact: "/contact",
    };
    const path = pathMap[pageId] || `/${pageId}`;
    window.open(path, "_blank");
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-8 w-8 text-primary" />
          </motion.div>
          <p className="text-muted-foreground">Loading pages...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 px-6 flex items-center justify-between border-b bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          {/* Back Button */}
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <motion.div
              className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Palette className="h-5 w-5 text-primary" />
            </motion.div>
            <div>
              <h1 className="font-semibold text-lg">Page Editor</h1>
              <p className="text-xs text-muted-foreground">
                Manage your frontend pages
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Categories */}
        <aside className="w-64 border-r bg-card/50 shrink-0 flex flex-col">
          <div className="p-4 border-b">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Categories
            </p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              <motion.button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer",
                  !selectedCategory
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Globe className="h-4 w-4" />
                <span className="flex-1 text-left font-medium">All Pages</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    !selectedCategory && "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                  )}
                >
                  {pages.length}
                </Badge>
              </motion.button>

              {categories.map((category) => {
                const count = pages.filter(
                  (p) => p.category === category
                ).length;
                const isActive = selectedCategory === category;
                return (
                  <motion.button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {category === "Main Pages" && (
                      <Home className="h-4 w-4" />
                    )}
                    {category === "Information" && (
                      <Users className="h-4 w-4" />
                    )}
                    {category === "Legal" && <Shield className="h-4 w-4" />}
                    {category === "Layouts" && <Code className="h-4 w-4" />}
                    {category === "Other" && <FileText className="h-4 w-4" />}
                    <span className="flex-1 text-left font-medium">
                      {category}
                    </span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        isActive && "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                      )}
                    >
                      {count}
                    </Badge>
                  </motion.button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Sidebar Footer */}
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Settings className="h-3.5 w-3.5" />
              <span>Default Frontend Editor</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 lg:p-8">
              {/* Error State */}
              {error && (
                <motion.div
                  className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl mb-6"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">
                        Error loading pages
                      </p>
                      <p className="text-sm text-destructive/80">{error}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Info Banner */}
              <motion.div
                className="p-4 mb-6 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 rounded-xl border border-primary/20"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">
                      Frontend Page Editor
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Edit your website's core pages including home, about,
                      privacy policy, terms, and contact pages. Changes are
                      applied instantly.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Pages */}
              <AnimatePresence mode="wait">
                {viewMode === "grid" ? (
                  <motion.div
                    key={`grid-${selectedCategory || "all"}`}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0 }}
                  >
                    {Object.entries(groupedPages).map(
                      ([category, categoryPages]) => (
                        <div key={category} className="mb-8">
                          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                            {category}
                            <Badge variant="secondary" className="text-xs">
                              {categoryPages.length}
                            </Badge>
                          </h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {categoryPages.map((page) => (
                              <motion.div
                                key={page.id}
                                variants={itemVariants}
                                className="group"
                              >
                              <div className="p-5 bg-card rounded-xl border hover:border-primary/50 hover:shadow-lg transition-all duration-200">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center",
                                        page.type === "layout"
                                          ? "bg-purple-100 dark:bg-purple-900/30"
                                          : "bg-primary/10"
                                      )}
                                    >
                                      <page.icon
                                        className={cn(
                                          "h-5 w-5",
                                          page.type === "layout"
                                            ? "text-purple-600 dark:text-purple-400"
                                            : "text-primary"
                                        )}
                                      />
                                    </div>
                                    <div>
                                      <h3 className="font-semibold">
                                        {page.name}
                                      </h3>
                                      <p className="text-xs text-muted-foreground font-mono">
                                        {page.path}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge
                                    variant={
                                      page.status === "active"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className={cn(
                                      "text-xs",
                                      page.status === "active" &&
                                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    )}
                                  >
                                    {page.status}
                                  </Badge>
                                </div>

                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                  {page.description}
                                </p>

                                {page.lastModified && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Modified {page.lastModified}</span>
                                  </div>
                                )}

                                <div className="flex gap-2">
                                  <Link
                                    href={`/admin/default-editor/${page.id}/edit`}
                                    className="flex-1"
                                  >
                                    <Button
                                      className="w-full gap-2"
                                      size="sm"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                      Edit Page
                                      <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                    </Button>
                                  </Link>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openPreview(page.id)}
                                    className="gap-1.5"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                      )
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key={`list-${selectedCategory || "all"}`}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    {filteredPages.map((page) => (
                    <motion.div
                      key={page.id}
                      variants={itemVariants}
                      className="group"
                    >
                      <div className="flex items-center gap-4 p-4 bg-card rounded-xl border hover:border-primary/50 hover:shadow-md transition-all duration-200">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                            page.type === "layout"
                              ? "bg-purple-100 dark:bg-purple-900/30"
                              : "bg-primary/10"
                          )}
                        >
                          <page.icon
                            className={cn(
                              "h-5 w-5",
                              page.type === "layout"
                                ? "text-purple-600 dark:text-purple-400"
                                : "text-primary"
                            )}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">
                              {page.name}
                            </h3>
                            <Badge
                              variant={
                                page.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                              className={cn(
                                "text-xs shrink-0",
                                page.status === "active" &&
                                  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              )}
                            >
                              {page.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {page.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground font-mono hidden md:block">
                            {page.path}
                          </span>
                          {page.lastModified && (
                            <span className="text-xs text-muted-foreground hidden lg:block">
                              {page.lastModified}
                            </span>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPreview(page.id)}
                            className="gap-1.5"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Link href={`/admin/default-editor/${page.id}/edit`}>
                            <Button size="sm" className="gap-2">
                              <Edit3 className="h-4 w-4" />
                              Edit
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty State */}
              {filteredPages.length === 0 && !error && (
                <motion.div
                  className="flex flex-col items-center justify-center py-16"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No pages found</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    No pages match your search criteria. Try adjusting your
                    filters or search query.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory(null);
                    }}
                  >
                    Clear Filters
                  </Button>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
