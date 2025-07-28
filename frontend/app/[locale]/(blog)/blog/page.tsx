import type { Metadata } from "next";
import BlogClient from "./client";

export async function generateMetadata(): Promise<Metadata> {
  const defaultDescription =
    "Explore our collection of articles, tutorials, and insights on web development, design, and technology.";
  const defaultKeywords = "blog, articles, content";

  return {
    title: "Blog | Discover Insights and Tutorials",
    description: defaultDescription,
    keywords: defaultKeywords,
  };
}

export default function BlogPage() {
  return <BlogClient />;
}
