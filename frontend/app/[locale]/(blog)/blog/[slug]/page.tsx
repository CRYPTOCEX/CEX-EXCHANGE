import type { Metadata } from "next";
import { $serverFetch } from "@/lib/api";
import PostClient from "./client";
import { publicShortName } from "@/utils/display-name";

interface PostPageProps {
  params: Promise<{ slug: string; locale: string }>;
}

/** Plain-text excerpt from an article's stored HTML, for meta/OG descriptions. */
function excerpt(html: string, max = 160): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Every post shared the site-wide fallback title ("Bicrypto") because this route
 * was a bare client wrapper with no metadata export — measured in the browser,
 * `document.title` was identical on the article and on a 404. That is the whole
 * of what a browser tab, a bookmark, a search result and a Slack/X/WhatsApp
 * unfurl have to go on, and none of them run the client-side store that knows
 * the post's real title. The sibling /blog index already exports
 * `generateMetadata`; this is the same pattern, keyed on the post.
 *
 * The root layout sets `title.template` = "%s - {SITE_NAME}", so returning the
 * bare title here is correct — the site name is appended for us.
 */
export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;

  // $serverFetch returns {data, error} and never throws, so a backend that is
  // down degrades to the generic title rather than failing the render.
  const { data: post } = await $serverFetch(
    { params: await params, headers: {} } as any,
    { url: `/api/blog/post/${encodeURIComponent(slug)}` }
  );

  if (!post?.title) return {};

  const description =
    post.description?.trim() ||
    (post.content ? excerpt(post.content) : undefined);

  const tags = Array.isArray(post.tags)
    ? post.tags.map((t: any) => t?.name).filter(Boolean)
    : [];

  return {
    title: post.title,
    description,
    keywords: [post.category?.name, ...tags].filter(Boolean).join(", ") || undefined,
    /* The `author` meta tag is the WORST place to join a first and last
       name: it is not merely on the page, it is what search engines index
       and republish. Same ladder as the rendered byline -- the handle, or
       the given name, and never the surname. */
    authors: publicShortName(post.author?.user)
      ? [{ name: publicShortName(post.author?.user) }]
      : undefined,
    openGraph: {
      type: "article",
      title: post.title,
      description,
      images: post.image ? [{ url: post.image, alt: post.title }] : [],
      publishedTime: post.createdAt
        ? new Date(post.createdAt).toISOString()
        : undefined,
      modifiedTime: post.updatedAt
        ? new Date(post.updatedAt).toISOString()
        : undefined,
      tags,
    },
    twitter: {
      card: post.image ? "summary_large_image" : "summary",
      title: post.title,
      description,
      images: post.image ? [post.image] : undefined,
    },
  };
}

export default function PostPage() {
  return <PostClient />;
}
