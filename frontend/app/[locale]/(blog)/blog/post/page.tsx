import type { Metadata } from "next";
import { AllArticlesClient } from "./client";

export const metadata: Metadata = {
  title: "All Articles | Blog",
  description:
    "Browse, search and filter all our articles on various topics including web development, design, and technology.",
};

export default function AllArticlesPage() {
  return <AllArticlesClient />;
}
