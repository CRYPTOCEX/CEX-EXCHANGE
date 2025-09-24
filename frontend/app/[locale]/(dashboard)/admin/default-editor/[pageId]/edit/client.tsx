"use client";

import { useParams } from "next/navigation";
import { DefaultPageEditor } from "./components/default-page-editor";

export function EditPageClient() {
  const { pageId } = useParams() as { pageId: string };
  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <DefaultPageEditor pageId={pageId} />
    </div>
  );
} 