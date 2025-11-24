"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit3, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";

interface PageContent {
  id: string;
  pageId: string;
  type: 'variables' | 'content';
  title: string;
  variables?: Record<string, any>;
  content?: string;
  meta?: Record<string, any>;
  status: string;
  lastModified: string;
}

export default function PreviewDefaultPage() {
  const params = useParams();
  const pageId = params.pageId as string;
  
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine page source based on pageId
  const getPageSource = () => {
    if (pageId === 'home-builder') {
      return 'builder';
    }
    return 'default';
  };

  // Get actual pageId (remove -builder suffix)
  const getActualPageId = () => {
    if (pageId === 'home-builder') {
      return 'home';
    }
    return pageId;
  };

  // Load page content
  useEffect(() => {
    const fetchPageContent = async () => {
      try {
        setLoading(true);
        const actualPageId = getActualPageId();
        const pageSource = getPageSource();
        
        const { data, error } = await $fetch({
          url: `/api/admin/default-editor/${actualPageId}?pageSource=${pageSource}`,
          method: "GET",
          silentSuccess: true,
        });
      
        if (error) {
          // If admin endpoint fails, try public endpoint
          const { data: publicData, error: publicError } = await $fetch({
            url: `/api/public/default-page/${actualPageId}?pageSource=${pageSource}`,
            method: "GET",
            silent: true,
          });
          
          if (!publicError && publicData) {
            setPageContent(publicData);
            return;
          }
          
          setError("Failed to load page content");
          return;
        }

        // Ensure meta field is always an object
        if (data && typeof data.meta === 'string') {
          try {
            data.meta = JSON.parse(data.meta);
          } catch (e) {
            data.meta = {};
          }
        }

        setPageContent(data);
      } catch (err) {
        console.error("Error loading page content:", err);
        setError("Failed to load page content");
      } finally {
        setLoading(false);
      }
    };

    fetchPageContent();
  }, [pageId]);

  const actualPageId = getActualPageId();
  const isHomePage = actualPageId === 'home';

  // Get default content for legal pages
  const getDefaultContent = () => {
    const defaultContent: Record<string, string> = {
      about: `
        <h1>About Our Platform</h1>
        <p>We are a leading cryptocurrency trading platform dedicated to providing secure, reliable, and user-friendly trading services.</p>
        <h2>Our Mission</h2>
        <p>To democratize access to cryptocurrency trading and provide professional-grade tools for traders of all levels.</p>
      `,
      privacy: `
        <h1>Privacy Policy</h1>
        <p>This Privacy Policy describes how we collect, use, and protect your personal information.</p>
        <h2>Information We Collect</h2>
        <p>We collect information you provide directly to us, such as when you create an account or contact us for support.</p>
      `,
      terms: `
        <h1>Terms of Service</h1>
        <p>These Terms of Service govern your use of our platform and services.</p>
        <h2>Acceptance of Terms</h2>
        <p>By accessing and using our services, you accept and agree to be bound by these terms.</p>
      `,
      contact: `
        <h1>Contact Us</h1>
        <p>Get in touch with our support team for any questions or assistance.</p>
        <h2>Support Channels</h2>
        <p>We offer multiple ways to contact our support team including email, live chat, and help center.</p>
      `
    };
    
    return defaultContent[actualPageId] || `<h1>${actualPageId.charAt(0).toUpperCase() + actualPageId.slice(1)}</h1><p>Default content for ${actualPageId} page.</p>`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading preview...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-red-600 font-medium">Error loading preview</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <Link href="/admin/default-editor">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Editor
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/default-editor">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Editor
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold">
                  {pageContent?.title || `${actualPageId.charAt(0).toUpperCase() + actualPageId.slice(1)} Page`}
                </h1>
                <p className="text-sm text-muted-foreground">Preview Mode</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Preview
              </Badge>
              <Link href={`/admin/default-editor/${pageId}/edit`}>
                <Button size="sm">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Page
                </Button>
              </Link>
              {/* Link to actual page if it exists */}
              {actualPageId !== 'home' && (
                <Link href={`/${actualPageId}`} target="_blank">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Live
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-8">
            {isHomePage ? (
              // For home page, we would need to render the variable-based content
              // This is more complex and would require the same rendering logic as the actual home page
              <div className="text-center py-8">
                <h2 className="text-xl font-semibold mb-4">Home Page Preview</h2>
                <p className="text-muted-foreground">
                  Home page preview is complex due to its variable-based structure. 
                  Please use the "View Live" link to see the actual rendered page.
                </p>
                <Link href="/" target="_blank">
                  <Button className="mt-4">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Live Home Page
                  </Button>
                </Link>
              </div>
            ) : (
              // For legal pages, render the HTML content
              <div className="prose prose-slate dark:prose-invert max-w-none prose-lg">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: pageContent?.content || getDefaultContent()
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* SEO Preview */}
        {pageContent?.meta && (
          <div className="max-w-4xl mx-auto mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">SEO Preview</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Page Title</label>
                  <p className="text-blue-600 dark:text-blue-400 text-lg">
                    {pageContent.meta.seoTitle || pageContent.title}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Meta Description</label>
                  <p className="text-gray-600 dark:text-gray-400">
                    {pageContent.meta.seoDescription || 'No meta description provided'}
                  </p>
                </div>
                {pageContent.meta.keywords && pageContent.meta.keywords.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Keywords</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {pageContent.meta.keywords.map((keyword: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 