"use client";
import { useCallback, useEffect, useState } from "react";
import BuilderCanvas from "..//components/canvas";
import ElementSettingsPanel from "..//components/settings-panel";
import { AddSectionModal } from "..//components/modals/add-section-modal";
import { Toaster } from "@/components/ui/toaster";
import { DragAndDropProvider } from "../components/canvas/dnd";
import { useParams } from "next/navigation";
import { $fetch } from "@/lib/api";
import { useBuilderStore } from "@/store/builder-store";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";
import { useToast } from "@/hooks/use-toast";
import BuilderHeader from "../components/header";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { generateId } from "@/store/builder-store";
import type { Section, Element, Row, Column } from "@/types/builder";

// Types for legacy content
interface LegacySection {
  id?: string;
  type?: string;
  content?: Record<string, unknown>;
  rows?: Row[];
}

interface ParsedContent {
  sections?: LegacySection[];
  elements?: Element[];
}

interface PageMetadata {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  status?: string;
  isHome?: boolean;
  template?: string;
  category?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  settings?: Record<string, unknown>;
  customCss?: string;
  customJs?: string;
  image?: string;
  order?: number;
  path?: string;
  content?: string;
}

// Function to convert legacy page content to current builder format
const convertLegacyContent = (legacySections: LegacySection[]): Section[] => {
  if (process.env.NODE_ENV === 'development') {
    console.log("convertLegacyContent called with:", legacySections);
  }
  
  return legacySections.map((legacySection, index) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Processing legacy section ${index}:`, legacySection);
    }
    
    // If it's already in the new format (has rows), return as-is
    if (legacySection.rows) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Section ${index} already in new format, returning as-is`);
      }
      return legacySection as Section;
    }

    // Map legacy section types to current element types
    const getElementType = (legacyType: string): string => {
      switch (legacyType) {
        case "hero":
          return "cta"; // Hero sections are similar to CTA elements
        case "features":
          return "feature"; // Features sections map to feature elements
        case "cta":
          return "cta"; // CTA sections map to CTA elements
        case "heading":
          return "heading";
        case "text":
          return "text";
        case "testimonial":
          return "testimonial";
        case "stats":
          return "stats";
        case "pricing":
          return "pricing";
        default:
          return "text"; // Default fallback for unknown types
      }
    };

    const elementType = getElementType(legacySection.type || "text");
    if (process.env.NODE_ENV === 'development') {
      console.log(`Converting section ${index} type "${legacySection.type}" to element type "${elementType}"`);
    }

    // Convert legacy section to new format
    const convertedSection: Section = {
      id: legacySection.id || generateId("section"),
      type: "regular" as const,
      rows: [
        {
          id: generateId("row"),
          columns: [
            {
              id: generateId("column"),
              width: 100,
              elements: [
                {
                  id: generateId("element"),
                  type: elementType,
                  content: JSON.stringify(legacySection.content || {}),
                  settings: {
                    width: "100%",
                    height: "auto",
                    paddingTop: 16,
                    paddingRight: 16,
                    paddingBottom: 16,
                    paddingLeft: 16,
                    marginTop: 0,
                    marginRight: 0,
                    marginBottom: 16,
                    marginLeft: 0,
                  },
                },
              ],
              settings: {
                paddingTop: 15,
                paddingRight: 15,
                paddingBottom: 15,
                paddingLeft: 15,
                marginTop: 0,
                marginRight: 0,
                marginBottom: 0,
                marginLeft: 0,
              },
              nestingLevel: 1,
            } as Column,
          ],
          settings: {
            gutter: 20,
            paddingTop: 20,
            paddingRight: 0,
            paddingBottom: 20,
            paddingLeft: 0,
            verticalAlign: "top" as const,
          },
          nestingLevel: 1,
        } as Row,
      ],
      settings: {
        backgroundColor: undefined,
        backgroundImage: undefined,
        backgroundOverlay: undefined,
        padding: 0,
        margin: 0,
      },
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Converted section ${index}:`, convertedSection);
    }
    return convertedSection;
  });
};

export default function BuilderPage() {
  const t = useTranslations("dashboard");
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const pageId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [pageMetadata, setPageMetadata] = useState<PageMetadata | null>(null);

  const {
    isSettingsPanelOpen,
    isAddSectionModalOpen,
    isPreviewMode,
    setPage,
    setCurrentPageInfo,
  } = useBuilderStore();

  useKeyboardShortcuts();

  // Save page changes with all metadata
  const handleSavePage = useCallback(async () => {
    try {
      const currentPage = useBuilderStore.getState().page;

      // Generate a slug if missing (basic slugify, you can improve it)
      const getSlug = () => {
        if (pageMetadata?.slug) return pageMetadata.slug;
        const title = pageMetadata?.title || currentPage.title || "untitled";
        return title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      };

      // Prepare the complete payload with all fields
      const payload = {
        // Core page data
        title: pageMetadata?.title || currentPage.title || "Untitled Page",
        slug: getSlug(), // FIX: Always include a slug
        content: JSON.stringify(currentPage), // Store the page content as JSON
        description: pageMetadata?.description || "",
        status: pageMetadata?.status || "DRAFT",

        // Builder-specific fields
        isBuilderPage: true, // Mark as builder page
        isHome: pageMetadata?.isHome || false,
        template: pageMetadata?.template || "default",
        category: pageMetadata?.category || "page",

        // SEO fields
        seoTitle:
          pageMetadata?.seoTitle || pageMetadata?.title || currentPage.title,
        seoDescription:
          pageMetadata?.seoDescription || pageMetadata?.description || "",
        seoKeywords: pageMetadata?.seoKeywords || "",
        ogImage: pageMetadata?.ogImage || pageMetadata?.image || null,
        ogTitle:
          pageMetadata?.ogTitle || pageMetadata?.title || currentPage.title,
        ogDescription:
          pageMetadata?.ogDescription || pageMetadata?.description || "",

        // Page settings and customization
        settings: pageMetadata?.settings
          ? JSON.stringify(pageMetadata.settings)
          : null,
        customCss: pageMetadata?.customCss || "",
        customJs: pageMetadata?.customJs || "",

        // Analytics and tracking
        lastModifiedBy: "builder-user", // You can get this from auth context

        // Preserve existing metadata
        image: pageMetadata?.image || null,
        order: pageMetadata?.order || 0,
        path: pageMetadata?.path || "",
      };

      const {data, error} = await $fetch({
        url: `/api/admin/content/page/${pageId}`,
        method: "PUT",
        body: payload,
        successMessage: "Page saved successfully",
      });

      // Update local metadata with response
      if (data) {
        setPageMetadata(data as PageMetadata);
      }

      return data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to save page:", error);
      }
      toast({
        title: "Error",
        description: "Failed to save page. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }, [pageMetadata, pageId, toast]);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        setIsLoading(true);
        const {data, error} = await $fetch({
          url: `/api/admin/content/page/${pageId}`,
          silentSuccess: true,
        });

        if (data) {
          // Store the full page metadata
          setPageMetadata(data);

          // Parse the content if it exists
          let pageContent = {
            id: pageId,
            title: data.title,
            sections: [] as Section[],
            elements: [] as Element[],
          };

          if (data.content) {
            try {
              // Try to parse the content as JSON first
              const parsedContent = JSON.parse(data.content) as ParsedContent;
              if (process.env.NODE_ENV === 'development') {
                console.log("Parsed content:", parsedContent);
              }
              
              // Check if we have sections and convert them if needed
              let sections: Section[] = [];
              if (Array.isArray(parsedContent.sections)) {
                if (process.env.NODE_ENV === 'development') {
                  console.log("Converting legacy sections:", parsedContent.sections);
                }
                sections = convertLegacyContent(parsedContent.sections);
                if (process.env.NODE_ENV === 'development') {
                  console.log("Converted sections:", sections);
                }
              }
              
              pageContent = {
                id: pageId,
                title: data.title,
                sections: sections,
                elements: Array.isArray(parsedContent.elements) ? parsedContent.elements : [],
              };
            } catch (error) {
              if (process.env.NODE_ENV === 'development') {
                console.error("JSON parsing error:", error);
              }
              // If JSON parsing fails, try base64 decoding
              try {
                const decodedContent = atob(data.content);
                const parsedContent = JSON.parse(decodedContent) as ParsedContent;
                if (process.env.NODE_ENV === 'development') {
                  console.log("Base64 decoded content:", parsedContent);
                }
                
                // Check if we have sections and convert them if needed
                let sections: Section[] = [];
                if (Array.isArray(parsedContent.sections)) {
                  if (process.env.NODE_ENV === 'development') {
                    console.log("Converting legacy sections (base64):", parsedContent.sections);
                  }
                  sections = convertLegacyContent(parsedContent.sections);
                  if (process.env.NODE_ENV === 'development') {
                    console.log("Converted sections (base64):", sections);
                  }
                }
                
                pageContent = {
                  id: pageId,
                  title: data.title,
                  sections: sections,
                  elements: Array.isArray(parsedContent.elements) ? parsedContent.elements : [],
                };
              } catch (decodeError) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn("Could not parse page content:", decodeError);
                }
                // Keep the default empty arrays if parsing fails
              }
            }
          }

          // Set the page data in the store
          setPage(pageContent);

          // Set current page info
          setCurrentPageInfo({
            id: pageId,
            title: data.title,
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to load page. Redirecting to page list.",
            variant: "destructive",
          });
          setTimeout(() => {
            router.push("/admin/builder");
          }, 2000);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Failed to fetch page:", error);
        }
        toast({
          title: "Error",
          description: "Failed to load page. Redirecting to page list.",
          variant: "destructive",
        });
        setTimeout(() => {
          router.push("/admin/builder");
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPageData();
  }, [pageId, setPage, setCurrentPageInfo, toast, router]);

  // Add save handler to the builder store
  useEffect(() => {
    if (!isLoading) {
      useBuilderStore.setState({ savePage: handleSavePage });
    }
  }, [isLoading, handleSavePage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t("loading_page")}.</p>
        </div>
      </div>
    );
  }

  return (
    <DragAndDropProvider>
      <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-900">
        <BuilderHeader />
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <BuilderCanvas />
          </div>
          {isSettingsPanelOpen && (
            <div className="w-80 border-l bg-card overflow-auto">
              <ElementSettingsPanel />
            </div>
          )}
        </div>
        {isAddSectionModalOpen && <AddSectionModal />}
        <Toaster />
      </div>
    </DragAndDropProvider>
  );
}
