"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import type { Section } from "@/types/builder";
import SiteHeader from "@/components/partials/header/site-header";
import SectionRenderer from "../(dashboard)/admin/builder/components/renderers/section-renderer";
import { SiteFooter } from "@/components/partials/footer/user-footer";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";

export default function Page() {
  const t = useTranslations("[pageId]");
  const { pageId } = useParams();
  const { settings } = useConfigStore();
  const [pageData, setPageData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [frontendType, setFrontendType] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const isFrontendBuilder =
    isSettingsLoaded && settings.landingPageType === "CUSTOM";

  // Handle hydration mismatch by only rendering conditional content on the client
  useEffect(() => {
    setIsClient(true);

    // Small delay to ensure settings are loaded from localStorage
    const timer = setTimeout(() => {
      setFrontendType(isFrontendBuilder ? "builder" : "default");
      setIsSettingsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Fetch page content
  useEffect(() => {
    if (!isClient || !isSettingsLoaded || !frontendType) return;

    // Only render builder pages if we're in builder mode
    if (frontendType === "default") {
      notFound();
      return;
    }

    const fetchPageContent = async () => {
      setIsLoading(true);
      try {
        // Use client-side fetch to get the page content
        const response = await fetch(`/api/content/page/${pageId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          console.error(
            `Error fetching page ${pageId}: Status ${response.status}`
          );
          notFound();
          return;
        }

        const data = await response.json();
        if (data.success && data.page) {
          setPageData(data.page);
        } else {
          console.error(`No page data found for ${pageId}`);
          notFound();
        }
      } catch (error) {
        console.error(`Error fetching page ${pageId}:`, error);
        notFound();
      } finally {
        setIsLoading(false);
      }
    };

    fetchPageContent();
  }, [pageId, isClient, frontendType, isSettingsLoaded]);

  // Function to decode and parse page content
  const parsePageContent = (content: string) => {
    if (!content || content.trim() === "") {
      return null;
    }

    try {
      // If content is base64 encoded, decode it first
      let decodedContent = content;
      try {
        decodedContent = atob(content);
      } catch (e) {
        // If base64 decode fails, use content as is
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

  // Show loading state
  if (!isClient || isLoading || !isSettingsLoaded) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading Page Content</p>
          </div>
        </div>
        <SiteFooter />
      </>
    );
  }

  // If no page data or content, show 404
  if (!pageData || !pageData.content) {
    notFound();
  }

  // Parse the content
  const parsedContent = parsePageContent(pageData.content);

  // If parsing fails or no sections, show 404
  if (
    !parsedContent ||
    !parsedContent.sections ||
    parsedContent.sections.length === 0
  ) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen">
        <div className="page-content">
          {parsedContent.sections.map((section: Section) => (
            <SectionRenderer
              key={section.id}
              section={section}
              isPreview={true}
            />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
