import { useState, useEffect } from "react";

interface PageContent {
  id: string;
  pageId: string;
  pageSource: string;
  type: 'variables' | 'content';
  title: string;
  variables?: Record<string, any>;
  content?: string;
  meta?: Record<string, any>;
  status: string;
  lastModified: string;
}

export function usePageContent(pageId: string, defaultContent?: string | Record<string, any>) {
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPageContent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Add cache-busting timestamp
        const timestamp = new Date().getTime();
        
        // Try both page sources to get the most recent content
        const promises = [
          fetch(`/api/content/default-page/${pageId}?pageSource=default&_t=${timestamp}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          }),
          fetch(`/api/content/default-page/${pageId}?pageSource=builder&_t=${timestamp}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          })
        ];
        
        const [defaultRes, builderRes] = await Promise.all(promises);
        
        let defaultData = null;
        let builderData = null;
        
        if (defaultRes.ok) {
          defaultData = await defaultRes.json();
        }
        
        if (builderRes.ok) {
          builderData = await builderRes.json();
        }
        
        // Use the most recently modified content
        if (defaultData && builderData) {
          const defaultTime = new Date(defaultData.lastModified || 0).getTime();
          const builderTime = new Date(builderData.lastModified || 0).getTime();
          setPageContent(builderTime > defaultTime ? builderData : defaultData);
        } else if (defaultData) {
          setPageContent(defaultData);
        } else if (builderData) {
          setPageContent(builderData);
        } else {
          // Create fallback content if no data is available
          const isHomePage = pageId === 'home';
          setPageContent({
            id: 'fallback',
            pageId,
            pageSource: 'default',
            type: isHomePage ? 'variables' : 'content',
            title: `${pageId.charAt(0).toUpperCase() + pageId.slice(1)} Page`,
            variables: isHomePage ? (typeof defaultContent === 'object' ? defaultContent : {}) : undefined,
            content: isHomePage ? "" : (typeof defaultContent === 'string' ? defaultContent : ""),
            meta: {},
            status: 'active',
            lastModified: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error(`Error loading ${pageId} page content:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load page content');
        
        // Use default content on error
        const isHomePage = pageId === 'home';
        setPageContent({
          id: 'error-fallback',
          pageId,
          pageSource: 'default',
          type: isHomePage ? 'variables' : 'content',
          title: `${pageId.charAt(0).toUpperCase() + pageId.slice(1)} Page`,
          variables: isHomePage ? (typeof defaultContent === 'object' ? defaultContent : {}) : undefined,
          content: isHomePage ? "" : (typeof defaultContent === 'string' ? defaultContent : ""),
          meta: {},
          status: 'active',
          lastModified: new Date().toISOString()
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPageContent();
  }, [pageId, defaultContent]);

  return { pageContent, loading, error };
}