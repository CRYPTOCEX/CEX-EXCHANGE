"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import BuilderCanvas from "..//components/canvas";
import ElementSettingsPanel from "..//components/settings-panel";
import { AddSectionModal } from "..//components/modals/add-section-modal";
import { DragAndDropProvider } from "../components/canvas/dnd";
import { useParams } from "next/navigation";
import { $fetch } from "@/lib/api";
import { useBuilderStore } from "@/store/builder-store";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";
import { useToast } from "@/hooks/use-toast";
import BuilderHeader from "../components/header";
import { useRouter } from "@/i18n/routing";
import { generateId } from "@/store/builder-store";
import type { Section, Element, Row, Column } from "@/types/builder";
import { useTranslations } from "next-intl";

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
  /**
   * `false` means the row holds HTML rather than builder sections — a page
   * added from the Pages studio. This editor must not open or save one; see
   * the guards in `fetchPageData` and `handleSavePage`.
   */
  isBuilderPage?: boolean;
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
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const pageId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [pageMetadata, setPageMetadata] = useState<PageMetadata | null>(null);
  /**
   * Set when the load refused this row because it is not a builder page.
   *
   * A ref rather than state: the refusal happens on a path that returns before
   * any state is set, and `handleSavePage` has to be able to see it in the same
   * tick — a render has not necessarily happened, and the redirect has not
   * necessarily landed. See both call sites for what it prevents.
   */
  const refusedRef = useRef(false);

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
      /* Belt to the redirect's braces. This function is installed into
         `useBuilderStore` and is reachable from the keyboard shortcut, which
         can fire before a redirect has landed — and what it would write is the
         overwrite the guard on load exists to prevent.

         The REF is the load-time refusal (see `fetchPageData`); the metadata
         test covers a row that loaded normally and was later found not to be a
         builder page. Reading only the metadata would miss the refused case
         entirely, because that path returns before the metadata is ever set. */
      if (refusedRef.current) return null;
      if (pageMetadata && pageMetadata.isBuilderPage === false) return null;

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
        title: pageMetadata?.title || currentPage.title || tCommon("untitled_page"),
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
        successMessage: t("page_saved_successfully"),
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
        title: tCommon("error"),
        description: t("failed_to_save_page_please_try_again"),
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
          /**
           * THIS EDITOR DESTROYS A NON-BUILDER PAGE, so it refuses to open one.
           *
           * An owner-added page stores plain HTML in the same table. Loading it
           * here parses `content` as JSON, gets nothing, and leaves an empty
           * document on screen — and `handleSavePage` below hardcodes
           * `content: JSON.stringify(currentPage)` and `isBuilderPage: true`,
           * so one save (or one Ctrl-S from the keyboard shortcut) replaces the
           * owner's page with that empty document. There is no undo.
           *
           * The list at `/admin/builder` filters these out, but this URL is
           * bookmarkable and guessable, so the refusal has to live here too. A
           * redirect rather than a read-only mode: the right editor for this
           * row exists and is one route away.
           */
          if (data.isBuilderPage === false || data.isBuilderPage === 0) {
            /* A REF, SET BEFORE THE RETURN, because the return is what makes
               the state unusable here. This branch bails out ahead of
               `setPageMetadata(data)` below, so `pageMetadata` stays null and
               a guard reading it would be inert for exactly the row it was
               written to protect — `null && …` is falsy. A ref is written and
               readable synchronously, with no render in between, which is the
               only thing that closes the window before the redirect lands. */
            refusedRef.current = true;
            toast({
              title: "Not a builder page",
              description:
                "This page holds HTML rather than builder sections. Opening it in Pages instead.",
              variant: "destructive",
            });
            router.replace(`/admin/default-editor/${pageId}/edit`);
            return;
          }

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
            title: tCommon("error"),
            description: t("failed_to_load_page_redirecting_to_page_list"),
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
          title: tCommon("error"),
          description: t("failed_to_load_page_redirecting_to_page_list"),
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

  /**
   * THE BUILDER SHELL IS THE FRAME, IN BOTH STATES.
   * ==========================================================================
   *
   * What was here: `if (isLoading) return <div className="flex items-center
   * justify-center h-screen bg-muted"><spinner/></div>`. This route owns the
   * entire viewport — it is an editor shell, `h-screen flex flex-col`, with a
   * 40px chrome bar at the top and a 320px settings rail on the right — and
   * none of that geometry depends on the fetch. The swap therefore threw away
   * 100% of a full-screen layout and rebuilt it, which on this route is the
   * most expensive version of the defect there is: the toolbar, the canvas
   * viewport and the settings rail all arrive at once, and the canvas scroll
   * container is created at that instant, so the page cannot even hold a
   * scroll position across the transition.
   *
   * It also swapped a `bg-muted` centring box for a `bg-muted` COLUMN, so the
   * one thing that did survive — the background colour — was the only thing
   * the user could not see move.
   *
   * The frame below now renders from the first paint. `isLoading` travels down
   * to the two components that own an unknown: the header's page title, and
   * the canvas's contents. Everything else is static config.
   */
  return (
    <DragAndDropProvider>
      <div className="h-screen flex flex-col bg-muted">
        <BuilderHeader loading={isLoading} />
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <BuilderCanvas loading={isLoading} />
          </div>
          {isSettingsPanelOpen && (
            <div className="w-80 border-l bg-card overflow-auto">
              <ElementSettingsPanel />
            </div>
          )}
        </div>
        {isAddSectionModalOpen && <AddSectionModal />}
      </div>
    </DragAndDropProvider>
  );
}
