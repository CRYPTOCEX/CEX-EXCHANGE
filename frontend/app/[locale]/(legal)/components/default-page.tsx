import { Metadata } from "next";

interface PageData {
  title?: string;
  content?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
}

// Helper function to process content with proper styling
export function processContent(content: string): string {
  // If content already has classes (from the editor), don't override them
  // Only add classes to plain HTML elements
  
  // First, check if the content has any HTML tags at all
  if (!content.includes('<')) {
    // Plain text content - wrap in paragraph
    return `<p class="mb-4 text-muted-foreground leading-relaxed">${content}</p>`;
  }
  
  // Process only elements without existing classes
  return content
    .replace(/<h1(?![^>]*class=)/g, '<h1 class="text-4xl font-bold mb-6 text-foreground"')
    .replace(/<h2(?![^>]*class=)/g, '<h2 class="text-3xl font-semibold mt-8 mb-4 text-foreground"')
    .replace(/<h3(?![^>]*class=)/g, '<h3 class="text-2xl font-semibold mt-6 mb-3 text-foreground"')
    .replace(/<h4(?![^>]*class=)/g, '<h4 class="text-xl font-semibold mt-4 mb-2 text-foreground"')
    .replace(/<h5(?![^>]*class=)/g, '<h5 class="text-lg font-semibold mt-3 mb-2 text-foreground"')
    .replace(/<h6(?![^>]*class=)/g, '<h6 class="text-base font-semibold mt-2 mb-1 text-foreground"')
    .replace(/<p(?![^>]*class=)/g, '<p class="mb-4 text-muted-foreground leading-relaxed"')
    .replace(/<ul(?![^>]*class=)/g, '<ul class="list-disc list-inside mb-6 space-y-2 text-muted-foreground ml-4"')
    .replace(/<ol(?![^>]*class=)/g, '<ol class="list-decimal list-inside mb-6 space-y-2 text-muted-foreground ml-4"')
    .replace(/<li(?![^>]*class=)/g, '<li class="ml-2"')
    .replace(/<a(?![^>]*class=)/g, '<a class="text-primary hover:underline font-medium transition-colors"')
    .replace(/<blockquote(?![^>]*class=)/g, '<blockquote class="border-l-4 border-primary/30 pl-4 my-4 italic text-muted-foreground"')
    .replace(/<strong(?![^>]*class=)/g, '<strong class="font-semibold text-foreground"')
    .replace(/<em(?![^>]*class=)/g, '<em class="italic"')
    .replace(/<table(?![^>]*class=)/g, '<table class="min-w-full divide-y divide-border mb-6 rounded-lg overflow-hidden"')
    .replace(/<thead(?![^>]*class=)/g, '<thead class="bg-muted"')
    .replace(/<tbody(?![^>]*class=)/g, '<tbody class="divide-y divide-border bg-card"')
    .replace(/<th(?![^>]*class=)/g, '<th class="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider"')
    .replace(/<td(?![^>]*class=)/g, '<td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground"')
    .replace(/<hr(?![^>]*class=)/g, '<hr class="my-8 border-border"')
    .replace(/<br(?![^>]*class=)/g, '<br class="my-2"')
    // Handle line breaks
    .replace(/\n\n+/g, '</p><p class="mb-4 text-muted-foreground leading-relaxed">')
    .replace(/\n/g, '<br />');
}

// Generic function to generate metadata
export async function generatePageMetadata(
  slug: string,
  defaultTitle: string,
  defaultDescription: string
): Promise<Metadata> {
  try {
    const timestamp = new Date().getTime();
    // In development, use backend URL with port; in production, use the same domain
    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev 
      ? (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000')
      : (process.env.NEXT_PUBLIC_SITE_URL || '');
    // Use the public content API endpoint
    const url = `${baseUrl}/api/content/default-page/${slug}?pageSource=default&_t=${timestamp}`;
    
    const res = await fetch(url, {
      cache: "no-store",
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data?.meta?.seo) {
        return {
          title: data.meta.seo.title || data.title || defaultTitle,
          description: data.meta.seo.description || defaultDescription,
          keywords: data.meta.seo.keywords || "",
        };
      } else if (data?.title) {
        return {
          title: data.title,
          description: defaultDescription,
        };
      }
    }
  } catch (error) {
    console.error(`Error loading SEO metadata for ${slug}:`, error);
  }
  
  return {
    title: defaultTitle,
    description: defaultDescription,
  };
}

// Generic function to get page content
export async function getPageContent(slug: string): Promise<PageData | null> {
  try {
    const timestamp = new Date().getTime();
    // In development, use backend URL with port; in production, use the same domain
    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev 
      ? (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000')
      : (process.env.NEXT_PUBLIC_SITE_URL || '');
    // Use the public content API endpoint
    const url = `${baseUrl}/api/content/default-page/${slug}?pageSource=default&_t=${timestamp}`;
    
    console.log(`Fetching page content from: ${url}`);
    
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log(`Successfully fetched content for ${slug}:`, data?.title || 'No title');
      // Transform the data structure to match our interface
      return {
        title: data.title,
        content: data.content,
        seo: data.meta?.seo
      };
    } else {
      console.error(`Failed to fetch ${slug} page content: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    console.error(`Error loading ${slug} page content:`, error);
  }
  return null;
}

// Default page component
interface DefaultPageProps {
  pageContent: PageData | null;
  defaultTitle?: string;
  showEmptyMessage?: boolean;
}

export function DefaultPage({ pageContent, defaultTitle, showEmptyMessage = true }: DefaultPageProps) {
  console.log('DefaultPage rendering with:', { 
    hasContent: !!pageContent?.content, 
    title: pageContent?.title,
    contentLength: pageContent?.content?.length 
  });
  
  // Use the exact content from the editor - no fallback
  const finalContent = pageContent?.content 
    ? processContent(pageContent.content)
    : showEmptyMessage 
      ? '<p class="text-center text-muted-foreground">No content available for this page yet.</p>'
      : '';

  const pageTitle = pageContent?.title || defaultTitle || '';

  return (
    <div className="w-full bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          {pageTitle && (
            <h1 className="text-4xl md:text-5xl font-bold mb-12 md:mb-16 text-center text-foreground">
              {pageTitle}
            </h1>
          )}
          
          {/* Page Content */}
          <div 
            className="prose prose-lg dark:prose-invert max-w-none [&>h1]:text-4xl [&>h1]:font-bold [&>h1]:mb-6 [&>h1]:text-foreground [&>h2]:text-3xl [&>h2]:font-semibold [&>h2]:mt-8 [&>h2]:mb-4 [&>h2]:text-foreground [&>h3]:text-2xl [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-3 [&>h3]:text-foreground [&>p]:mb-4 [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:list-inside [&>ul]:mb-6 [&>ul]:space-y-2 [&>ul]:text-muted-foreground [&>ol]:list-decimal [&>ol]:list-inside [&>ol]:mb-6 [&>ol]:space-y-2 [&>ol]:text-muted-foreground"
            dangerouslySetInnerHTML={{ 
              __html: finalContent 
            }}
          />
        </div>
      </div>
    </div>
  );
}