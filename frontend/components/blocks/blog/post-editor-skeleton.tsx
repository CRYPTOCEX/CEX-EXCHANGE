import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level placeholder for the post editor.
 *
 * It mirrors `EditorShell` exactly — `h-screen` column, `h-12` bar, single
 * `min-h-0 flex-1 overflow-y-auto` body, same `max-w-7xl` gutter — so the
 * skeleton and the editor occupy the same boxes and the first real frame does
 * not re-lay-out the page.
 *
 * Getting this wrong is visible on every route entry: the previous version
 * described the `PageShell` frame it was written against (`min-h-screen`, a
 * gradient wash, `pt-24` of clearance under a site header), and all four
 * routes render it *inside* a layout that no longer mounts any header at all.
 *
 * Deliberately not a client component and deliberately text-free: `loading.tsx`
 * is a server component, so `useTranslations` cannot run in it.
 */
export function PostEditorSkeleton() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <span className="h-4 w-px bg-border" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Skeleton className="h-72 w-full rounded-lg" />
              <Skeleton className="h-[32rem] w-full rounded-lg" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-72 w-full rounded-lg" />
              <Skeleton className="h-56 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostEditorSkeleton;
