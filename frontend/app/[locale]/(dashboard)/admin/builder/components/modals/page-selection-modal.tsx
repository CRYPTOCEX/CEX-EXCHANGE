"use client";

import { useState, useEffect, useMemo } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { $fetch } from "@/lib/api";
import { useBuilderStore } from "@/store/builder-store";
import { SearchInput } from "./utils";
import Modal from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Loadable, SkeletonBlock } from "@/components/ui/skeleton";
import { ScrollableSnapshot } from "../../components/shared/scrollable-snapshot";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
interface Page {
  id: string;
  title: string;
  slug: string;
  lastModified: string;
  status: "published" | "draft";
  snapshots?: {
    card: string;
    preview: string;
  };
}
interface PageSelectionModalProps {
  onClose: () => void;
}

/**
 * How many pending cards to paint while GET /api/content/page is out.
 *
 * The grid is `grid-cols-2 md:grid-cols-3`, so six is exactly two full rows at
 * every breakpoint it defines — a partial row would read as "that is all of
 * them" before anything had been counted. A card is a 16:9 snapshot plus a
 * ~76px `p-3` caption, i.e. ~245px at the modal's 900px cap, so two rows is
 * ~506px against the modal's own `max-h-[80vh]`: the pending state already
 * scrolls, exactly as the resolved one does.
 */
const PENDING_CARD_COUNT = 6;

/**
 * What a card reads from before its page has been fetched.
 *
 * The spinner this replaced also acted as a type guard — nothing below it ran
 * without real pages — so one frozen constant replaces the narrowing rather
 * than `?.` through the card body. `status: "draft"` is never SHOWN (the badge
 * is skeletoned while pending); it is here because the field is required and a
 * draft is the conservative of the two, not a claim.
 */
const PENDING_PAGE: Page = {
  id: "",
  title: "",
  slug: "",
  lastModified: "",
  status: "draft",
};
export function PageSelectionModal({ onClose }: PageSelectionModalProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { currentPageId } = useBuilderStore();
  useEffect(() => {
    const fetchPages = async () => {
      try {
        setIsLoading(true);
        const response = await $fetch<Page[]>({
          url: "/api/content/page",
          silentSuccess: true,
        });
        if (response.data) {
          // Fetch full page data to get snapshots
          const pagesWithContent = await Promise.all(
            response.data.map(async (page) => {
              if (!page.snapshots) {
                const pageResponse = await $fetch<Page>({
                  url: `/api/content/page/${page.id}`,
                  silentSuccess: true,
                });
                return pageResponse.data || page;
              }
              return page;
            })
          );
          setPages(pagesWithContent.filter(Boolean) as Page[]);
        } else {
          toast({
            title: tCommon("error"),
            description: t("failed_to_load_pages"),
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to fetch pages:", error);
        toast({
          title: tCommon("error"),
          description: t("failed_to_load_pages"),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPages();
  }, [toast]);
  const filteredPages = useMemo(
    () =>
      pages.filter(
        (page) =>
          page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          page.slug.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [pages, searchQuery]
  );
  const handleSelectPage = (pageId: string) => {
    if (pageId === currentPageId) {
      onClose();
      return;
    }
    router.push(`/admin/builder/${pageId}`);
    onClose();
  };

  /**
   * ONE grid, two states. A `null` cell is a card whose page has not arrived.
   */
  const cards: Array<Page | null> = isLoading
    ? Array.from({ length: PENDING_CARD_COUNT }, () => null)
    : filteredPages;

  /**
   * "No pages found" / "No pages match your search" is a RESULT, and it needs a
   * finished request to be one. The spinner branch used to make this
   * unreachable during load; with the spinner gone, `!isLoading` is what stops
   * an admin opening this modal and being told their site has no pages a
   * quarter-second before six of them appear.
   */
  const showEmptyState = !isLoading && filteredPages.length === 0;
  return (
    <Modal
      title={t("select_a_page_to_edit")}
      onClose={onClose}
      color="purple"
      showHeader={true}
      className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto"
    >
      <div className="p-4">
        <div className="flex items-center mb-4">
          <div className="relative flex-1">
            <SearchInput
              placeholder={`${tCommon("search_pages")}…`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* The spinner this replaced was a 48px ring centred in a fixed `h-64`
            (256px) box, standing in for a grid whose first two rows alone are
            ~506px. The modal shrank to 256px of content, then doubled under the
            pointer that was already travelling toward the first card. */}
        {showEmptyState ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? t("no_pages_match_your_search") : t("no_pages_found")}
          </div>
        ) : (
          <div
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
            aria-busy={isLoading || undefined}
          >
            {cards.map((card, index) => {
              const pending = card === null;
              const page = card ?? PENDING_PAGE;
              return (
                <div
                  key={pending ? `pending-${index}` : page.id}
                  className={cn(
                    "border rounded-lg overflow-hidden transition-all",
                    /* A pending card promises nothing, so it offers neither the
                       pointer nor the hover affordance that says "click me". */
                    !pending &&
                      "cursor-pointer hover:border-primary hover:shadow-md",
                    !pending &&
                      page.id === currentPageId &&
                      "ring-2 ring-primary border-primary"
                  )}
                  onClick={pending ? undefined : () => handleSelectPage(page.id)}
                >
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {/* The 16:9 box is chrome and reserves itself through
                        `aspect-video` in every state — that is the card's whole
                        height budget, so nothing here can move. Pending shows
                        the empty box rather than "No preview available",
                        because that sentence is a statement about a page that
                        has not been fetched. */}
                    {pending ? (
                      <SkeletonBlock className="h-full w-full rounded-none" />
                    ) : page.snapshots?.card ? (
                      <ScrollableSnapshot
                        src={page.snapshots.card}
                        alt={page.title}
                        className="h-full"
                        fallbackSrc={`/placeholder.svg?height=200&width=400&text=${encodeURIComponent(page.title)}`}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-muted">
                        <div className="text-center p-4">
                          <div className="text-muted-foreground text-sm">
                            {t("no_preview_available")}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Label and tone must come from the SAME normalisation.
                        `statusTone()` upper-cases and de-separates its input;
                        a raw `=== "published"` ternary does not, so any casing
                        the API returns other than the one hardcoded here would
                        colour the pill green while labelling it "Draft".
                        `statusLabel()` normalises identically.

                        Withheld while pending, and that is the point: the badge
                        is a claim about publication state, and PENDING_PAGE's
                        "draft" would render a confident grey "Draft" pill on a
                        page that may well be live. It is absolutely positioned
                        inside the snapshot box, so its arrival moves nothing. */}
                    {!pending && (
                      <StatusBadge
                        status={page.status}
                        className="absolute top-2 right-2"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium truncate">
                      <Loadable loading={pending} placeholder={t("landing_page")}>
                        {page.title}
                      </Loadable>
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      <Loadable loading={pending} placeholder="/landing-page">
                        {page.slug}
                      </Loadable>
                    </p>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {/* `new Date("")` is Invalid Date, which
                            `toLocaleDateString()` renders as the literal string
                            "Invalid Date" — so this one is not merely a jump,
                            it prints a visible defect on six cards. */}
                        <Loadable loading={pending} placeholder="00/00/0000">
                          {new Date(page.lastModified).toLocaleDateString()}
                        </Loadable>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        disabled={pending}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPage(page.id);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
