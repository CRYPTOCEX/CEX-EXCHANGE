"use client";

import { useParams } from "next/navigation";
import { FullScreenEditor } from "./components/full-screen-editor";

export function EditPageClient() {
  const { pageId } = useParams() as { pageId: string };
  return <FullScreenEditor pageId={pageId} />;
}
