import { MediaManager } from "@/components/ui/wysiwyg/media-manager";

export default function MediaPage() {
  /**
   * `h-screen` minus the bar, not `h-screen`.
   *
   * This route used to render with no chrome, so the manager could own the full
   * viewport. It now sits below the admin shell's `fixed h-header` top bar, and
   * a full `100vh` child under a 4rem bar overflows the fold by exactly that
   * bar's height — the manager's own footer and pagination end up unreachable.
   *
   * `--header-height` rather than a literal, because a navbar variant overrides
   * it (`lib/chrome/variants.ts`); a hardcoded 4rem would silently break on the
   * stacked navbar the way `pt-24` did before `pt-header-clear` existed.
   */
  return (
    <MediaManager
      mode="page"
      className="mt-header h-[calc(100vh-var(--header-height))]"
    />
  );
}
