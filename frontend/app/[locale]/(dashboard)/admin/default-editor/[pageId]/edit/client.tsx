"use client";

import { useParams } from "next/navigation";

import { PageEditorStudio } from "@/components/admin/studio/page-editor-studio";

/**
 * The route reads the id and nothing else. The editor lives in
 * `components/admin/studio` with the other studios, so the four screens share
 * one shell rather than being four screens that resemble each other.
 */
export function EditPageClient() {
  const params = useParams();
  const pageId = typeof params?.pageId === "string" ? params.pageId : "home";
  return <PageEditorStudio pageId={pageId} />;
}
