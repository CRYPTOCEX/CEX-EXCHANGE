"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  FileText,
  Tag,
  Settings,
  Sparkles,
  LayoutGrid,
  TrendingUp,
  Globe,
  Rocket,
  Smartphone,
  Megaphone,
  Menu,
  X,
  BarChart3,
  Puzzle,
  CheckCircle2,
  Loader2,
  Wand2,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import { WysiwygEditor } from "@/components/ui/wysiwyg";
import {
  HeroSectionEditor,
  FeaturesSectionEditor,
  GlobalSectionEditor,
  GettingStartedEditor,
  CTASectionEditor,
  MarketSectionEditor,
  TickerSectionEditor,
  MobileAppSectionEditor,
  ExtensionSectionsEditor,
  LegalTemplateWizard,
} from "./";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import LanguageSelector from "@/components/partials/header/language-selector";

interface PageContent {
  id: string;
  pageId: string;
  type: "variables" | "content";
  title: string;
  variables?: Record<string, any>;
  content?: string;
  meta?: Record<string, any>;
  status: string;
  lastModified: string;
}

interface FullScreenEditorProps {
  pageId: string;
}

// Section configuration for the sidebar
const SECTIONS = [
  {
    id: "hero",
    label: "Hero Section",
    icon: Sparkles,
    description: "Main banner with headline",
  },
  {
    id: "ticker",
    label: "Ticker Section",
    icon: TrendingUp,
    description: "Scrolling announcements",
  },
  {
    id: "market",
    label: "Market Section",
    icon: BarChart3,
    description: "Market data display",
  },
  {
    id: "extensions",
    label: "Extensions",
    icon: Puzzle,
    description: "Extension sections",
  },
  {
    id: "features",
    label: "Features",
    icon: LayoutGrid,
    description: "Feature highlights",
  },
  {
    id: "global",
    label: "Global Stats",
    icon: Globe,
    description: "Global statistics",
  },
  {
    id: "getting-started",
    label: "Getting Started",
    icon: Rocket,
    description: "Onboarding steps",
  },
  {
    id: "mobile-app",
    label: "Mobile App",
    icon: Smartphone,
    description: "App promotion",
  },
  {
    id: "cta",
    label: "Call to Action",
    icon: Megaphone,
    description: "Final conversion block",
  },
];

const META_SECTIONS = [
  {
    id: "seo",
    label: "SEO Settings",
    icon: Tag,
    description: "Search engine optimization",
  },
  {
    id: "settings",
    label: "Page Settings",
    icon: Settings,
    description: "General page settings",
  },
];

// Animation variants
const sidebarVariants = {
  open: {
    width: 288,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  },
  closed: {
    width: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  },
};

const contentVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: "easeIn" as const,
    },
  },
};

const navItemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: "easeOut" as const,
    },
  }),
  hover: {
    x: 4,
    transition: {
      duration: 0.2,
    },
  },
};

const badgeVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 500,
      damping: 25,
    },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

export function FullScreenEditor({ pageId }: FullScreenEditorProps) {
  const tDashboard = useTranslations("dashboard");
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showTemplateWizard, setShowTemplateWizard] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mount effect for theme
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  // Determine page source based on pageId
  const getPageSource = () => {
    if (pageId === "home-builder") {
      return "builder";
    }
    return "default";
  };

  // Get actual pageId (remove -builder suffix)
  const getActualPageId = () => {
    if (pageId === "home-builder") {
      return "home";
    }
    return pageId;
  };

  const actualPageId = getActualPageId();
  const isHomePage = actualPageId === "home";

  // Determine template type for legal pages
  const getTemplateType = ():
    | "about"
    | "privacy"
    | "terms"
    | "contact"
    | null => {
    const templatePages: Record<
      string,
      "about" | "privacy" | "terms" | "contact"
    > = {
      about: "about",
      privacy: "privacy",
      "privacy-policy": "privacy",
      terms: "terms",
      "terms-of-service": "terms",
      "terms-and-conditions": "terms",
      contact: "contact",
      "contact-us": "contact",
    };
    return templatePages[actualPageId] || null;
  };

  const templateType = getTemplateType();
  const hasTemplateSupport = templateType !== null;

  // Handle template generation
  const handleTemplateGenerated = (content: string) => {
    if (!pageContent) return;
    setPageContent((prev) => (prev ? { ...prev, content } : null));
    setHasChanges(true);
    setShowTemplateWizard(false);
    toast.success("Template applied successfully!");
  };

  // Open preview in new tab
  const openPreview = () => {
    // Map pageId to actual frontend path
    const pathMap: Record<string, string> = {
      home: "/",
      about: "/about",
      privacy: "/privacy",
      terms: "/terms",
      contact: "/contact",
    };
    const path = pathMap[actualPageId] || `/${actualPageId}`;
    window.open(path, "_blank");
  };

  // Reset active section when page changes
  useEffect(() => {
    setActiveSection(isHomePage ? "hero" : "content");
  }, [actualPageId, isHomePage]);

  // Load page content
  useEffect(() => {
    const fetchPageContent = async () => {
      try {
        setLoading(true);
        const pageSource = getPageSource();

        const { data, error } = await $fetch({
          url: `/api/admin/default-editor/${actualPageId}?pageSource=${pageSource}`,
          method: "GET",
          silentSuccess: true,
        });

        if (error) {
          const { data: publicData, error: publicError } = await $fetch({
            url: `/api/public/default-page/${actualPageId}?pageSource=${pageSource}`,
            method: "GET",
            silent: true,
          });

          if (!publicError && publicData) {
            setPageContent(publicData);
            return;
          }

          const defaultPageContent = {
            id: "frontend-fallback",
            pageId: actualPageId,
            pageSource: getPageSource(),
            type: isHomePage ? ("variables" as const) : ("content" as const),
            title: `${actualPageId.charAt(0).toUpperCase() + actualPageId.slice(1)} Page`,
            variables: isHomePage ? {} : undefined,
            content: isHomePage
              ? ""
              : `<h1>${actualPageId.charAt(0).toUpperCase() + actualPageId.slice(1)}</h1><p>Default content for ${actualPageId} page.</p>`,
            meta: {
              seoTitle: `${actualPageId.charAt(0).toUpperCase() + actualPageId.slice(1)} Page`,
              seoDescription: `${actualPageId.charAt(0).toUpperCase() + actualPageId.slice(1)} page content`,
              keywords: [],
            },
            status: "active" as const,
            lastModified: new Date().toISOString(),
          };

          setPageContent(defaultPageContent);
          return;
        }

        if (data && typeof data.meta === "string") {
          try {
            data.meta = JSON.parse(data.meta);
          } catch (e) {
            data.meta = {};
          }
        }

        setPageContent(data);
      } catch (err) {
        console.error("Error loading page content:", err);
        toast.error("Failed to load page content");
      } finally {
        setLoading(false);
      }
    };

    fetchPageContent();
  }, [pageId, actualPageId]);

  // Handle content changes
  const handleContentChange = useCallback(
    (content: string) => {
      if (!pageContent) return;
      setPageContent((prev) => (prev ? { ...prev, content } : null));
      setHasChanges(true);
    },
    [pageContent]
  );

  // Handle variables changes (for home page)
  const handleVariablesChange = useCallback(
    (variables: Record<string, any>) => {
      if (!pageContent) return;
      setPageContent((prev) => (prev ? { ...prev, variables } : null));
      setHasChanges(true);
    },
    [pageContent]
  );

  // Handle meta changes
  const handleMetaChange = useCallback(
    (meta: Record<string, any>) => {
      if (!pageContent) return;
      setPageContent((prev) => (prev ? { ...prev, meta } : null));
      setHasChanges(true);
    },
    [pageContent]
  );

  // Save page
  const handleSave = async () => {
    if (!pageContent || !hasChanges) return;

    try {
      setSaving(true);
      const pageSource = getPageSource();
      const { error } = await $fetch({
        url: `/api/admin/default-editor/${actualPageId}?pageSource=${pageSource}`,
        method: "PUT",
        body: {
          ...pageContent,
          pageSource: pageSource,
        },
      });

      if (error) {
        toast.error(error);
        return;
      }

      setHasChanges(false);
      toast.success("Page saved successfully! Cache has been cleared.");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  // Helper functions for section editors
  const getValue = (path: string) => {
    if (!pageContent?.variables) return undefined;
    const keys = path.split(".");
    let value: any = pageContent.variables;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  };

  const updateVariable = (path: string, value: any) => {
    if (!pageContent?.variables) return;
    const keys = path.split(".");
    const newVariables = { ...pageContent.variables };
    let current: any = newVariables;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {};
      }
      current[key] = { ...current[key] };
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    handleVariablesChange(newVariables);
  };

  // Render section content based on active section
  const renderSectionContent = () => {
    if (!pageContent) return null;

    const variables =
      pageContent.variables &&
      typeof pageContent.variables === "object" &&
      !Array.isArray(pageContent.variables)
        ? pageContent.variables
        : {};

    const editorProps = {
      variables,
      getValue,
      updateVariable,
    };

    switch (activeSection) {
      case "hero":
        return <HeroSectionEditor {...editorProps} />;
      case "ticker":
        return <TickerSectionEditor {...editorProps} />;
      case "market":
        return <MarketSectionEditor {...editorProps} />;
      case "extensions":
        return <ExtensionSectionsEditor {...editorProps} />;
      case "features":
        return <FeaturesSectionEditor {...editorProps} />;
      case "global":
        return <GlobalSectionEditor {...editorProps} />;
      case "getting-started":
        return <GettingStartedEditor {...editorProps} />;
      case "mobile-app":
        return <MobileAppSectionEditor {...editorProps} />;
      case "cta":
        return <CTASectionEditor {...editorProps} />;
      case "seo":
        return (
          <MetaEditor
            meta={pageContent.meta || {}}
            onMetaChange={handleMetaChange}
          />
        );
      case "settings":
        return (
          <SettingsEditor
            pageContent={pageContent}
            setPageContent={setPageContent}
            setHasChanges={setHasChanges}
          />
        );
      case "content":
        return (
          <WysiwygEditor
            value={pageContent.content || ""}
            onChange={handleContentChange}
            placeholder={tDashboard("write_your_page_content_here_ellipsis")}
            uploadDir="legal-pages"
            minHeight={500}
            showWordCount
            variant="borderless"
            radius="none"
            bordered={false}
          />
        );
      default:
        return null;
    }
  };

  // Get section info
  const getActiveSection = () => {
    return [...SECTIONS, ...META_SECTIONS].find((s) => s.id === activeSection);
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
          <p className="text-muted-foreground">Loading editor...</p>
        </motion.div>
      </div>
    );
  }

  if (!pageContent) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-muted-foreground">Failed to load page content</p>
          <Link href="/admin/default-editor">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Pages
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        className="h-full bg-card border-r flex flex-col overflow-hidden shrink-0"
        variants={sidebarVariants}
        initial={false}
        animate={sidebarOpen ? "open" : "closed"}
      >
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              className="flex flex-col h-full min-w-72"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Sidebar Header */}
              <div className="h-16 px-4 flex items-center justify-between border-b bg-linear-to-r from-primary/5 to-primary/10">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FileText className="h-5 w-5 text-primary" />
                  </motion.div>
                  <div>
                    <h2 className="font-semibold text-sm">Page Editor</h2>
                    <p className="text-xs text-muted-foreground truncate max-w-35">
                      {pageContent.title}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Sidebar Content */}
              <ScrollArea className="flex-1">
                <div className="py-4 space-y-6">
                  {/* Page Sections */}
                  {isHomePage && (
                    <div className="px-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Page Sections
                      </p>
                      <nav className="space-y-1.5">
                        {SECTIONS.map((section, index) => {
                          const Icon = section.icon;
                          const isActive = activeSection === section.id;
                          return (
                            <motion.button
                              key={section.id}
                              onClick={() => setActiveSection(section.id)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer",
                                isActive
                                  ? "bg-primary text-primary-foreground shadow-md"
                                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
                              )}
                              variants={navItemVariants}
                              initial="initial"
                              animate="animate"
                              whileHover="hover"
                              custom={index}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="flex-1 text-left font-medium">
                                {section.label}
                              </span>
                              <AnimatePresence>
                                {isActive && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{
                                      type: "spring",
                                      stiffness: 500,
                                      damping: 30,
                                    }}
                                  >
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.button>
                          );
                        })}
                      </nav>
                    </div>
                  )}

                  {/* Non-home page content */}
                  {!isHomePage && (
                    <div className="px-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Content
                      </p>
                      <nav className="space-y-1.5">
                        <motion.button
                          onClick={() => setActiveSection("content")}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer",
                            activeSection === "content"
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                          variants={navItemVariants}
                          initial="initial"
                          animate="animate"
                          whileHover="hover"
                          custom={0}
                        >
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="flex-1 text-left font-medium">
                            Page Content
                          </span>
                          <AnimatePresence>
                            {activeSection === "content" && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 500,
                                  damping: 30,
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      </nav>

                      {/* Template Generator for legal pages */}
                      {hasTemplateSupport && (
                        <motion.div
                          className="mt-4 p-3 bg-linear-to-br from-primary/5 via-purple-500/5 to-cyan-500/5 rounded-lg border border-primary/10"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Wand2 className="w-4 h-4 text-primary" />
                            <span className="text-xs font-medium">
                              Template
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            Generate a professional {templateType} page with our
                            wizard
                          </p>
                          <Button
                            onClick={() => setShowTemplateWizard(true)}
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                          >
                            <Sparkles className="w-3 h-3" />
                            Use Template
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Page Settings - Fixed at bottom */}
              <div className="border-t bg-muted/20">
                <div className="px-3 py-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Page Settings
                  </p>
                  <nav className="space-y-1">
                    {META_SECTIONS.map((section) => {
                      const Icon = section.icon;
                      const isActive = activeSection === section.id;
                      return (
                        <motion.button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 text-left font-medium">
                            {section.label}
                          </span>
                          {isActive && (
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                          )}
                        </motion.button>
                      );
                    })}
                  </nav>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 px-4 flex items-center justify-between border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="cursor-pointer"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </motion.div>
            <Link href="/admin/default-editor">
              <motion.div
                whileHover={{ x: -2 }}
                whileTap={{ scale: 0.95 }}
                className="cursor-pointer"
              >
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </motion.div>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              {(() => {
                const section = getActiveSection();
                if (section) {
                  const Icon = section.icon;
                  return (
                    <motion.div
                      className="flex items-center gap-2"
                      key={section.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      <div>
                        <h1 className="font-semibold text-sm sm:text-base">
                          {section.label}
                        </h1>
                        <p className="text-xs text-muted-foreground hidden sm:block">
                          {section.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence>
              {hasChanges && (
                <motion.div
                  variants={badgeVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <Badge
                    variant="outline"
                    className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30"
                  >
                    Unsaved Changes
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Language Selector */}
            <LanguageSelector variant="compact" />

            {/* Theme Toggle */}
            {mounted && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 cursor-pointer",
                  "border",
                  isDark
                    ? "text-zinc-400 hover:text-amber-400 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
                    : "text-zinc-600 hover:text-amber-500 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100"
                )}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <AnimatePresence mode="wait">
                  {isDark ? (
                    <motion.div
                      key="sun"
                      initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                      animate={{ opacity: 1, rotate: 0, scale: 1 }}
                      exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
                      animate={{ opacity: 1, rotate: 0, scale: 1 }}
                      exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Moon className="w-4 h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )}

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer"
            >
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                size="sm"
                className="gap-2 min-w-25"
              >
                {saving ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </motion.div>
                    <span className="hidden sm:inline">Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span className="hidden sm:inline">Save</span>
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </header>

        {/* Content Area */}
        {activeSection === "content" ? (
          // For content/WYSIWYG editor - no ScrollArea wrapper, let editor handle its own scrolling
          <div className="flex-1 h-[calc(100vh-4rem)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                variants={contentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full"
              >
                {renderSectionContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          // For other sections - use ScrollArea
          <ScrollArea className="flex-1 h-[calc(100vh-4rem)]">
            <div className="w-full min-h-[calc(100vh-4rem)] p-6 lg:p-8 mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  variants={contentVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="bg-card rounded-xl border shadow-sm p-6 lg:p-8 min-h-100"
                >
                  {renderSectionContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Template Wizard Modal */}
      <AnimatePresence>
        {showTemplateWizard && templateType && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplateWizard(false)}
            />
            {/* Modal */}
            <motion.div
              className="relative w-full max-w-4xl h-[90vh] bg-card rounded-2xl border shadow-2xl overflow-hidden mx-4"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <LegalTemplateWizard
                pageType={templateType}
                onGenerate={handleTemplateGenerated}
                onClose={() => setShowTemplateWizard(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Meta Editor Component
function MetaEditor({
  meta,
  onMetaChange,
}: {
  meta: Record<string, any>;
  onMetaChange: (meta: Record<string, any>) => void;
}) {
  const t = useTranslations("dashboard");
  const handleChange = (key: string, value: any) => {
    onMetaChange({ ...meta, [key]: value });
  };

  return (
    <motion.div
      className="space-y-6 max-w-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      <div>
        <h3 className="text-lg font-semibold mb-2">SEO Settings</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t("optimize_your_page_for_search_engines")}
        </p>
      </div>

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Label htmlFor="seoTitle" className="text-base font-medium">
            SEO Title
          </Label>
          <Input
            id="seoTitle"
            value={meta.seoTitle || ""}
            onChange={(e) => handleChange("seoTitle", e.target.value)}
            placeholder={t("enter_seo_title")}
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {(meta.seoTitle || "").length}/60 characters recommended
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Label htmlFor="seoDescription" className="text-base font-medium">
            SEO Description
          </Label>
          <Textarea
            id="seoDescription"
            value={meta.seoDescription || ""}
            onChange={(e) => handleChange("seoDescription", e.target.value)}
            placeholder={t("enter_seo_description")}
            className="mt-1.5"
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {(meta.seoDescription || "").length}/160 characters recommended
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Label htmlFor="keywords" className="text-base font-medium">
            Keywords
          </Label>
          <Input
            id="keywords"
            value={Array.isArray(meta.keywords) ? meta.keywords.join(", ") : ""}
            onChange={(e) =>
              handleChange(
                "keywords",
                e.target.value
                  .split(",")
                  .map((k: string) => k.trim())
                  .filter(Boolean)
              )
            }
            placeholder={t("enter_keywords_separated_by_commas")}
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Separate keywords with commas
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Settings Editor Component
function SettingsEditor({
  pageContent,
  setPageContent,
  setHasChanges,
}: {
  pageContent: PageContent;
  setPageContent: React.Dispatch<React.SetStateAction<PageContent | null>>;
  setHasChanges: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const t = useTranslations("dashboard");

  return (
    <motion.div
      className="space-y-6 max-w-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      <div>
        <h3 className="text-lg font-semibold mb-2">Page Settings</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Configure general page settings
        </p>
      </div>

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Label htmlFor="title" className="text-base font-medium">
            {t("page_title")}
          </Label>
          <Input
            id="title"
            value={pageContent.title}
            onChange={(e) => {
              setPageContent((prev) =>
                prev ? { ...prev, title: e.target.value } : null
              );
              setHasChanges(true);
            }}
            placeholder={t("enter_page_title")}
            className="mt-1.5"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Label htmlFor="status" className="text-base font-medium">
            Status
          </Label>
          <p className="text-sm text-muted-foreground mb-3">
            {t("set_the_page_status_to_control_visibility")}
          </p>
          <select
            id="status"
            value={pageContent.status}
            onChange={(e) => {
              setPageContent((prev) =>
                prev ? { ...prev, status: e.target.value } : null
              );
              setHasChanges(true);
            }}
            className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md"
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </motion.div>
      </div>
    </motion.div>
  );
}
