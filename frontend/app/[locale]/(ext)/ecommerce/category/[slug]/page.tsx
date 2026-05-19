import type { Metadata } from "next";
import CategoryDetailClient from "./client";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Category | Ecommerce`,
    description: "Browse products in this category",
  };
}

export default function CategoryDetailPage() {
  return <CategoryDetailClient />;
}
