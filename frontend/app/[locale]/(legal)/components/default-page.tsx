import { Metadata } from "next";
import { sanitizeHtmlServer } from "./sanitize-html-server";
import {
  fetchDefaultPage,
  readStoredSeo,
  type StoredSeo,
} from "../../components/page-seo";

interface PageData {
  title?: string;
  content?: string;
  /** Resolved from whichever shape the record stores — see `readStoredSeo`. */
  seo?: StoredSeo;
}

/**
 * Is this document already styled, and therefore not to be processed?
 *
 * `processContent` below injects Tailwind classes into unclassed tags and turns
 * bare newlines into `<br />` — the right thing for a hand-typed document, and
 * destructive for one that arrived fully styled.
 *
 * This used to sniff five hardcoded class strings taken from the template
 * wizard's output. Two problems with that, both measured:
 *
 *  - `class="p-4 bg-blue…"` can never match. The generator emits no palette
 *    classes at all — the design ratchet would reject them — so that marker has
 *    been dead for as long as the tokens have existed.
 *  - The only marker the CONTACT generator could produce came from a section
 *    that is CONDITIONAL on social links being enabled. With them off, a
 *    perfectly normal generated contact page failed the sniff and had three
 *    stray `</p><p>` wrappers and forty spurious `<br />` tags injected into it.
 *
 * Matching a fixed list of class strings means the sniff has to be updated
 * every time the generator's markup changes, and nothing fails when it is not.
 * So this asks the question the comment always claimed it was asking: does any
 * block-level element already carry a class? If so, somebody has already made
 * the styling decisions and this function's job is to stay out of the way.
 *
 * The tradeoff is deliberate: a document with even one classed block now skips
 * processing entirely, where before it would have had its remaining bare tags
 * styled. That is the safer direction — mixing injected classes into markup
 * that already has its own is how the `<br />` storm happened.
 */
function isTemplateContent(content: string): boolean {
  return /<(?:div|section|article|h[1-6]|p|ul|ol|table|blockquote)\b[^>]*\sclass\s*=/i.test(
    content
  );
}

// Helper function to process content with proper styling
export function processContent(content: string): string {
  // If content already has classes (from the template wizard), return as-is
  // The template wizard generates fully-styled HTML
  if (isTemplateContent(content)) {
    return content;
  }

  // If content already has classes (from the editor), don't override them
  // Only add classes to plain HTML elements

  // First, check if the content has any HTML tags at all
  if (!content.includes("<")) {
    // Plain text content - wrap in paragraph
    return `<p class="mb-4 text-muted-foreground leading-relaxed">${content}</p>`;
  }

  // Process only elements without existing classes
  return (
    content
      .replace(
        /<h1(?![^>]*class=)/g,
        '<h1 class="text-4xl font-bold mb-6 text-foreground"'
      )
      .replace(
        /<h2(?![^>]*class=)/g,
        '<h2 class="text-3xl font-semibold mt-8 mb-4 text-foreground"'
      )
      .replace(
        /<h3(?![^>]*class=)/g,
        '<h3 class="text-2xl font-semibold mt-6 mb-3 text-foreground"'
      )
      .replace(
        /<h4(?![^>]*class=)/g,
        '<h4 class="text-xl font-semibold mt-4 mb-2 text-foreground"'
      )
      .replace(
        /<h5(?![^>]*class=)/g,
        '<h5 class="text-lg font-semibold mt-3 mb-2 text-foreground"'
      )
      .replace(
        /<h6(?![^>]*class=)/g,
        '<h6 class="text-base font-semibold mt-2 mb-1 text-foreground"'
      )
      .replace(
        /<p(?![^>]*class=)/g,
        '<p class="mb-4 text-muted-foreground leading-relaxed"'
      )
      .replace(
        /<ul(?![^>]*class=)/g,
        '<ul class="list-disc list-inside mb-6 space-y-2 text-muted-foreground ml-4"'
      )
      .replace(
        /<ol(?![^>]*class=)/g,
        '<ol class="list-decimal list-inside mb-6 space-y-2 text-muted-foreground ml-4"'
      )
      .replace(/<li(?![^>]*class=)/g, '<li class="ml-2"')
      .replace(
        /<a(?![^>]*class=)/g,
        '<a class="text-primary hover:underline font-medium transition-colors"'
      )
      .replace(
        /<blockquote(?![^>]*class=)/g,
        '<blockquote class="border-l-4 border-primary/30 pl-4 my-4 italic text-muted-foreground"'
      )
      .replace(
        /<strong(?![^>]*class=)/g,
        '<strong class="font-semibold text-foreground"'
      )
      .replace(/<em(?![^>]*class=)/g, '<em class="italic"')
      .replace(
        /<table(?![^>]*class=)/g,
        '<table class="min-w-full divide-y divide-border mb-6 rounded-lg overflow-hidden"'
      )
      .replace(/<thead(?![^>]*class=)/g, '<thead class="bg-muted"')
      .replace(
        /<tbody(?![^>]*class=)/g,
        '<tbody class="divide-y divide-border bg-card"'
      )
      .replace(
        /<th(?![^>]*class=)/g,
        '<th class="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider"'
      )
      .replace(
        /<td(?![^>]*class=)/g,
        '<td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground"'
      )
      .replace(/<hr(?![^>]*class=)/g, '<hr class="my-8 border-border"')
      .replace(/<br(?![^>]*class=)/g, '<br class="my-2"')
      // Handle line breaks
      .replace(
        /\n\n+/g,
        '</p><p class="mb-4 text-muted-foreground leading-relaxed">'
      )
      .replace(/\n/g, "<br />")
  );
}

// Generic function to generate metadata
export async function generatePageMetadata(
  slug: string,
  defaultTitle: string,
  defaultDescription: string
): Promise<Metadata> {
  const data = await fetchDefaultPage(slug);

  // This used to read `data.meta.seo`, which no writer has ever produced, so
  // the branch below was unreachable and every stored SEO field was thrown
  // away. `readStoredSeo` accepts both shapes.
  const seo = readStoredSeo(data?.meta);

  if (seo.title || seo.description || seo.keywords) {
    return {
      title: seo.title || data?.title || defaultTitle,
      description: seo.description || defaultDescription,
      keywords: seo.keywords || "",
    };
  }

  if (data?.title) {
    return {
      title: data.title,
      description: defaultDescription,
    };
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
    // Server-side fetches talk to the backend directly over the internal HTTP
    // port (same host) instead of the public HTTPS domain. This avoids depending
    // on the public TLS cert chain — Node rejects an incomplete chain with
    // UNABLE_TO_VERIFY_LEAF_SIGNATURE even when browsers accept it — and is
    // faster. Override with NEXT_PUBLIC_BACKEND_URL if the backend is on another host.
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
    const baseUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || `http://localhost:${backendPort}`;
    // Use the public content API endpoint
    const url = `${baseUrl}/api/content/default-page/${slug}?pageSource=default&_t=${timestamp}`;

    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    if (res.ok) {
      const data = await res.json();
      // Transform the data structure to match our interface
      return {
        title: data.title,
        content: data.content,
        seo: readStoredSeo(data.meta),
      };
    } else {
      console.error(
        `Failed to fetch ${slug} page content: ${res.status} ${res.statusText}`
      );
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

export function DefaultPage({
  pageContent,
  defaultTitle,
  showEmptyMessage = true,
}: DefaultPageProps) {
  // Check if content already has its own H1 title (from template wizard)
  const contentHasH1 = pageContent?.content?.includes("<h1") || false;

  // Use the exact content from the editor - no fallback
  const finalContent = pageContent?.content
    ? processContent(pageContent.content)
    : showEmptyMessage
      ? '<p class="text-center text-muted-foreground">No content available for this page yet.</p>'
      : "";

  // Only show page title if content doesn't already have H1
  const pageTitle = !contentHasH1
    ? pageContent?.title || defaultTitle || ""
    : "";

  return (
    <div className="w-full bg-background">
      <div className="container mx-auto max-w-4xl py-24">
        {/* Page Title - only show if content doesn't have its own H1 */}
        {pageTitle && (
          <h1 className="text-4xl md:text-5xl font-bold mb-12 md:mb-16 text-center text-foreground">
            {pageTitle}
          </h1>
        )}

        {/* Page Content — sanitized AND rendered on the server, so the styled
            HTML shows immediately (the client-only SafeHtml escaped it to text
            during SSR and never recovered after hydration). */}
        <article
          className="legal-content"
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlServer(finalContent) }}
        />
      </div>
    </div>
  );
}
