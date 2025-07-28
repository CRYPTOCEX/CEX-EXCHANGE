import type { Metadata } from "next";
import ProductDetailClient from "./client";

export default function ProductDetailPage() {
  return (
    <div className="bg-white dark:bg-zinc-900 dark:text-zinc-100">
      <ProductDetailClient />
    </div>
  );
}
