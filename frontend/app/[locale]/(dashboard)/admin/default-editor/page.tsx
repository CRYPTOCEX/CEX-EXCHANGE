import { PagesStudio } from "@/components/admin/studio/pages-studio";

/**
 * The screen lives in `components/admin/studio` with the other three studios,
 * so the four cannot drift apart. This file is the route and nothing else.
 */
export default function DefaultEditorPage() {
  return <PagesStudio />;
}
