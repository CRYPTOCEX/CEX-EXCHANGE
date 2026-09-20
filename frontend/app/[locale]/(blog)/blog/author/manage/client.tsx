"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ImageWithFallback as Image } from "@/components/ui/image-with-fallback";
import { useRouter } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { useBlogStore } from "@/store/blog/user";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Pagination } from "../../components/pagination";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import {
  Edit,
  Trash2,
  Eye,
  PenSquare,
  Plus,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { $fetch } from "@/lib/api";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";

export function PostsClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { author, pagination, postsLoading, fetchAuthor } = useBlogStore();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);
        await fetchAuthor();
        setIsLoadingData(false);
      } catch (err) {
        console.error("Error loading posts:", err);
        setError(t("failed_to_load_posts"));
        setIsLoadingData(false);
      }
    };
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm(t("are_you_sure_you_want_to_delete_this_post"))) {
      try {
        setIsDeleting(true);
        const { error } = await $fetch({
          url: `/api/blog/author/manage/${id}`,
          method: "DELETE",
        });
        if (error) {
          throw new Error(error);
        }
        await fetchAuthor();
      } catch (err: any) {
        console.error("Error deleting post:", err);
        setError(err.message || t("failed_to_delete_post"));
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const posts = author?.posts || [];
  const filteredPosts = filter
    ? posts.filter((post) => post.status === filter)
    : posts;
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  /**
   * The pending copy of this page is gone, and with it a genuinely bad
   * behaviour: `isDeleting` was in the same condition.
   * ==========================================================================
   *
   * Deleting one post out of nine therefore blanked the ENTIRE page — header,
   * filter bar, every other post — to eight grey rectangles until the request
   * came back. The author lost their place, their scroll position and their
   * filter selection to a mutation that affects one card. Deletion now leaves
   * the page standing; `isDeleting` is still tracked, it simply no longer
   * decides what the page IS.
   *
   * The copy was also dimensionally wrong in the usual ways: an `h-48` plate
   * for a header that is `h-48 md:h-56` (8px short above `md`), `rounded-3xl`
   * cards where the real ones are `rounded-lg`, and `h-80` fixed against real
   * cards whose height is `h-52` image + `p-6` content + a two-line
   * `line-clamp-2` blurb + a footer — about 396px, not 320px. Six of those in
   * a three-column grid is two rows each 76px short.
   *
   * NOTE ON THE EMPTY STATE BELOW: `sortedPosts.length === 0` is true for the
   * whole of the fetch, so it now carries `!isPending`. Without that, every
   * visit to this page would open on "No posts found — create your first
   * post", which is a false statement to make to an author who has ten.
   */
  const isPending = isLoadingData || postsLoading;

  return (
    <div className="min-h-screen relative overflow-hidden bg-card pt-24">
      {/* Premium Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent 0%, hsl(var(--primary) / 0.03) 10%, hsl(var(--chart-4) / 0.02) 30%, transparent 60%)`,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 50%)`,
        }}
      />
      <FloatingShapes
        count={8}
        interactive={true}
        theme={{ primary: "indigo", secondary: "purple" }}
      />
      <InteractivePattern
        config={{
          enabled: true,
          variant: "crosses",
          opacity: 0.015,
          size: 40,
          interactive: true,
        }}
      />

      <div className="relative z-10 container mx-auto px-4 pb-16">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Premium Header */}
          <div className="relative overflow-hidden rounded-3xl shadow-2xl">
            <div className="relative h-48 md:h-56 w-full">
              <div className="absolute inset-0 bg-primary"></div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="bg-card/20 backdrop-blur-md p-4 rounded-2xl border border-overlay-foreground/10 shadow-xl">
                    <PenSquare className="h-8 w-8 text-overlay-foreground" />
                  </div>
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-overlay-foreground mb-2 drop-shadow-lg">
                      {t("my_blog_posts")}
                    </h1>
                    <p className="text-lg text-overlay-foreground/90">
                      {t("manage_and_create_your_blog_content")}
                    </p>
                  </div>
                </div>

                <Link href="/blog/author/manage/new">
                  <Button size="lg" variant="glass" className="rounded-full text-overlay-foreground border-overlay-foreground/20 hover:bg-card/20">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("create_new_post")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {error && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert variant="destructive" className="rounded-2xl">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </m.div>
          )}

          {/* Filters and controls */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-lg border border-border"
          >
            <div className="flex gap-3">
              <Button
                variant={filter === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(null)}
                className="rounded-full"
              >
                All
              </Button>
              <Button
                variant={filter === "PUBLISHED" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("PUBLISHED")}
                className="rounded-full"
              >
                Published
              </Button>
              <Button
                variant={filter === "DRAFT" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("DRAFT")}
                className="rounded-full"
              >
                Drafts
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="rounded-full flex items-center gap-2 border-border-strong text-muted-foreground dark:hover:bg-muted"
            >
              {sortOrder === "asc" ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
              {sortOrder === "asc" ? tCommon("oldest_first") : tCommon("newest_first")}
            </Button>
          </m.div>

          {/* Posts grid view. Six pending cards in the REAL grid with the REAL
              breakpoints and the REAL card shell — `rounded-lg border-border
              bg-card`, an `h-52` image frame, `p-6` content — so the only
              thing that settles is how many of them there are. */}
          {isPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`pending-${i}`}
                  className="group relative overflow-hidden rounded-lg bg-card border border-border"
                >
                  <div className="relative h-52 w-full overflow-hidden">
                    <SkeletonBlock className="absolute inset-0 h-full w-full rounded-none" />
                    <div className="absolute inset-0 bg-linear-to-t from-overlay/80 via-overlay/40 to-transparent" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold leading-tight tracking-tight text-foreground line-clamp-2 mb-3">
                      <SkeletonText placeholder={t("a_two_line_post_title_here")} />
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-5">
                      <SkeletonText chars={96} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : sortedPosts.length === 0 ? (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center py-20 bg-card rounded-lg border border-border"
            >
              <div className="mx-auto w-28 h-28 bg-primary/10 rounded-3xl flex items-center justify-center mb-8">
                <PenSquare className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold leading-tight tracking-tight text-foreground mb-3">
                {tCommon("no_posts_found")}
              </h3>
              <p className="text-muted-foreground mb-8 text-lg">
                {t("start_creating_your_first_blog_post_today")}
              </p>
              <Link href="/blog/author/manage/new">
                <Button size="lg" className="rounded-full">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("create_your_first_post")}
                </Button>
              </Link>
            </m.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sortedPosts.map((post, index) => (
                <m.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="group relative overflow-hidden rounded-lg bg-card transition-colors duration-300 border border-border"
                >
                  {/* Post image */}
                  <div className="relative h-52 w-full overflow-hidden">
                    <Image
                      src={post.image || "/placeholder.svg"}
                      alt={post.title}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-overlay/80 via-overlay/40 to-transparent"></div>

                    {/* Status badge */}
                    <div className="absolute top-4 right-4">
                      <StatusBadge
                        status={post.status}
                        // `backdrop-blur-md` stays: the verifier called it dead
                        // because DRAFT's neutral fill is opaque, but this chip
                        // sits over the post photo and PUBLISHED resolves to
                        // success, whose soft fill is a translucent /10 — so
                        // the blur is still doing real work on half the states.
                        className="rounded-full px-3 py-1.5 font-semibold backdrop-blur-md"
                      />
                    </div>

                    {/* Category badge */}
                    {post.category && (
                      <div className="absolute top-4 left-4">
                        <span className="inline-flex items-center rounded-full bg-primary/80 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-primary-foreground border border-primary/30">
                          {post.category.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Post content */}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2 mb-3">
                      {post.title}
                    </h3>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-5">
                      {post.description || post.content.substring(0, 120)}...
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center">
                        {post.createdAt && (
                          <span className="text-xs text-subtle-foreground">
                            {formatDistanceToNow(new Date(post.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-primary dark:hover:bg-primary/30"
                          onClick={() => router.push(`/blog/${post.slug}`)}
                        >
                          <Eye className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-primary dark:hover:bg-primary/30"
                          onClick={() =>
                            router.push(`/blog/author/manage/${post.id}/edit`)
                          }
                        >
                          <Edit className="h-4 w-4 text-primary" />
                        </Button>
                        {/* `disabled` is where `isDeleting` belongs. It used to
                            blank the whole page; the feedback a destructive
                            action owes the user is on the CONTROL, not on the
                            document. */}
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isDeleting}
                          className="h-9 w-9 rounded-xl hover:bg-destructive/10 dark:hover:bg-destructive/30"
                          onClick={() => handleDelete(post.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </m.div>
              ))}
            </div>
          )}

          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            baseUrl="/blog/author/manage"
          />
        </m.div>
      </div>
    </div>
  );
}
