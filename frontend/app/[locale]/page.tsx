"use client";

import { useEffect, useState } from "react";
import DefaultHomePage from "./home";
import { useConfigStore } from "@/store/config";
import { SiteFooter } from "@/components/partials/footer/user-footer";
import SiteHeader from "@/components/partials/header/site-header";
import { usePagesStore } from "@/store/pages-store";
import { Section } from "@/types/builder";
import { pageAttributes } from "@/types/builder";
import SectionRenderer from "./(dashboard)/admin/builder/components/renderers/section-renderer";

export default function Home(): React.JSX.Element {
  const { settings } = useConfigStore();
  const { pages, currentPage, fetchPages, fetchPageById, isLoading, error } =
    usePagesStore();
  const [isClient, setIsClient] = useState(false);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Handle hydration mismatch by only rendering conditional content on the client
  useEffect(() => {
    setIsClient(true);
    // Give a small delay to ensure settings are hydrated
    const timer = setTimeout(() => {
      setIsSettingsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Check if frontend type is set to "builder" - only after settings are loaded
  const isFrontendBuilder =
    isSettingsLoaded && settings?.landingPageType === "CUSTOM";

  // Fetch pages and home page content when in builder mode
  useEffect(() => {
    if (isClient && isSettingsLoaded && isFrontendBuilder) {
      const loadHomePage = async () => {
        try {
          setLoadingError(null);
          await fetchPages();

          // Find the home page with better logic
          let homePageFromStore: pageAttributes | undefined = undefined;

          // Wait for pages to be available
          const currentPages = usePagesStore.getState().pages;

          // First, look for a page with isHome flag
          homePageFromStore = currentPages.find((page) => page.isHome === true);

          // If not found, look for a page with slug 'home' or '/'
          if (!homePageFromStore) {
            homePageFromStore = currentPages.find(
              (page) => page.slug === "home" || page.slug === "/"
            );
          }

          // If not found, look for a page with 'frontend' slug
          if (!homePageFromStore) {
            homePageFromStore = currentPages.find(
              (page) => page.slug === "frontend"
            );
          }

          // If still not found, look for the first page with content
          if (!homePageFromStore) {
            homePageFromStore = currentPages.find(
              (page) => page.content && page.content.trim() !== ""
            );
          }

          // If still not found, just use the first page
          if (!homePageFromStore && currentPages.length > 0) {
            homePageFromStore = currentPages[0];
          }

          if (homePageFromStore && homePageFromStore.id !== currentPage?.id) {
            await fetchPageById(homePageFromStore.id);
          }
        } catch (err) {
          console.error("Error in loadHomePage:", err);
          const errorMsg =
            err instanceof Error ? err.message : "Failed to load home page";
          setLoadingError(errorMsg);
        }
      };

      // Use Promise to handle potential unhandled rejections
      loadHomePage().catch((err) => {
        console.error("Unhandled error in loadHomePage:", err);
        const errorMsg =
          err instanceof Error ? err.message : "Unexpected error loading page";
        setLoadingError(errorMsg);
      });
    }
  }, [
    isClient,
    isSettingsLoaded,
    isFrontendBuilder,
    currentPage?.id,
    fetchPages,
    fetchPageById,
  ]);

  // Function to decode and parse page content
  const parsePageContent = (content: string) => {
    if (!content || typeof content !== "string" || content.trim() === "") {
      return null;
    }

    try {
      // If content is base64 encoded, decode it first
      let decodedContent = content;
      try {
        // Check if content looks like base64
        if (
          /^[A-Za-z0-9+/]*={0,2}$/.test(content) &&
          content.length % 4 === 0
        ) {
          decodedContent = atob(content);
        }
      } catch (e) {
        // If base64 decode fails, use content as is
        console.warn("Base64 decode failed, using content as-is:", e);
        decodedContent = content;
      }

      // Try to parse as JSON
      const parsedContent = JSON.parse(decodedContent);
      return parsedContent;
    } catch (error) {
      console.error("Error parsing page content:", error);
      return null;
    }
  };

  // Show loading state until settings are loaded
  if (!isClient || !isSettingsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's a loading error
  if (loadingError) {
    console.warn("Showing error fallback due to:", loadingError);
    return (
      <main>
        <SiteHeader />
        <DefaultHomePage />
        <SiteFooter />
      </main>
    );
  }

  // Render the builder page content
  const renderBuilderPage = () => {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading page content...</p>
          </div>
        </div>
      );
    }

    // If there's an error in the store, fall back to default
    if (error) {
      console.warn("Store error, falling back to default:", error);
      return <DefaultHomePage />;
    }

    // If no pages or no current page, fall back to default
    if (pages.length === 0 || !currentPage || !currentPage.content) {
      return <DefaultHomePage />;
    }

    // Parse the content
    const parsedContent = parsePageContent(currentPage.content);

    // If parsing fails or no sections, fall back to default
    if (
      !parsedContent ||
      !parsedContent.sections ||
      parsedContent.sections.length === 0
    ) {
      return <DefaultHomePage />;
    }

    // Render each section using SectionRenderer
    try {
      return (
        <div className="w-full">
          {parsedContent.sections.map((section: Section) => (
            <SectionRenderer
              key={section.id}
              section={section}
              isPreview={true}
            />
          ))}
        </div>
      );
    } catch (renderError) {
      console.error("Error rendering sections:", renderError);
      return <DefaultHomePage />;
    }
  };

  return (
    <main>
      <SiteHeader />
      {isFrontendBuilder ? renderBuilderPage() : <DefaultHomePage />}
      <SiteFooter />
    </main>
  );
}
