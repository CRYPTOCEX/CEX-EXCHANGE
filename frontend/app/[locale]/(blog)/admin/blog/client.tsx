"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import {
  FileText,
  Users,
  FolderOpen,
  Tag,
  Eye,
  ChevronRight,
  Clock,
  Bookmark,
  Activity,
  TrendingUp,
} from "lucide-react";
import { useAdminBlogStore } from "@/store/blog/admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";

export function AdminDashboardClient() {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { dashboardData, fetchDashboardData, updateAuthorStatus } =
    useAdminBlogStore();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const loadData = async () => {
    setIsLoading(true);
    try {
      await fetchDashboardData();
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, []);
  /**
   * `if (isLoading || !dashboardData) return <DashboardSkeleton/>` is gone,
   * and `DashboardSkeleton` with it.
   * ==========================================================================
   *
   * That function was a 60-line second copy of this dashboard, and everything
   * it drew was already in hand: the `h-8 w-48` bar was `t("blog_dashboard")`,
   * the `h-4 w-64` bar under it was `t("welcome_to_your_blog_admin_dashboard")`,
   * the `h-10 w-24` bar was the "View blog" button, and the two card headers it
   * faked are `t()` titles with `t()` descriptions. It did not draw the TabsList
   * at all, so the two tabs — 40px of chrome plus the `space-y-8` gap — appeared
   * out of nowhere and pushed the KPI row and both cards down by 72px.
   *
   * Its KPI tiles were hand-built `Card`s with an `h-8 w-16` figure. The real
   * ones are `StatsCard`, whose own `loading` mode measures the placeholder
   * inside the real `text-2xl leading-tight` element — the copy's box was 32px
   * against a 30px line, the exact 2px-per-card error `stats-card.tsx`
   * documents.
   *
   * Everything below now reads through `?.`, because it runs while
   * `dashboardData` is still null.
   */
  const isPending = isLoading || !dashboardData;

  // Destructure unified dashboard data.
  const posts = dashboardData?.posts;
  const authors = dashboardData?.authors;
  const categories = dashboardData?.categories;
  const tags = dashboardData?.tags;
  const publishedPosts = posts?.publishedCount;
  const draftPosts = posts?.draftCount;
  const approvedAuthors = authors?.approvedCount;
  const pendingAuthors = authors?.pendingCount;
  /* `?? []` on the LISTS only. A missing list is genuinely an empty render;
     a missing COUNT is not zero, and the tiles below take `loading` rather
     than a `?? 0` that would state a confident, wrong figure. */
  const recentPosts = posts?.recentPosts ?? [];
  const pendingAuthorsList = authors?.recentPendingAuthors ?? [];
  return (
    <div className="space-y-8">
      {/* Header */}
      <m.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("blog_dashboard")}
          </h1>
          <p className="text-muted-foreground">
            {t("welcome_to_your_blog_admin_dashboard")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/blog")}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            {t("view_blog")}
          </Button>
        </div>
      </m.div>

      {/* Main Dashboard */}
      <m.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.1,
        }}
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-8"
        >
          <TabsList className="grid w-full grid-cols-2 lg:w-fit">
            <TabsTrigger value="overview">{tCommon("overview")}</TabsTrigger>
            <TabsTrigger value="content">{tCommon("content")}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                label={t("published_posts")}
                value={publishedPosts}
                loading={isPending}
                icon={FileText}
                index={0}
                onClick={() => router.push("/admin/blog/post")}
                {...statsCardColors.blue}
              />
              <StatsCard
                label={t("draft_posts")}
                value={draftPosts}
                loading={isPending}
                icon={Bookmark}
                index={1}
                onClick={() => router.push("/admin/blog/post?status=DRAFT")}
                {...statsCardColors.amber}
              />
              <StatsCard
                label={t("active_authors")}
                value={approvedAuthors}
                loading={isPending}
                icon={Users}
                index={2}
                onClick={() => router.push("/admin/blog/author")}
                {...statsCardColors.green}
              />
              <StatsCard
                label={t("pending_authors")}
                value={pendingAuthors}
                loading={isPending}
                icon={Clock}
                index={3}
                onClick={() => router.push("/admin/blog/author?status=PENDING")}
                {...statsCardColors.purple}
              />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Recent Posts */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        {t("recent_posts")}
                      </CardTitle>
                      <CardDescription>
                        {t("latest_published_and_draft_posts")}
                      </CardDescription>
                    </div>
                    <Link href="/admin/blog/post" className="gap-1 text-xs">
                      <Button variant="ghost" size="sm">
                        {tCommon("view_all")}
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Three pending rows in the REAL `space-y-4` list, with
                        the real `border-b pb-4` separators and the real 40px
                        glyph tile — so the card's height is the height it
                        settles to. `!isPending &&` in front of the empty
                        message is the loading/empty separation: `recentPosts`
                        is `[]` for the whole fetch, so without it the card
                        would announce "No posts found" on every load. */}
                    {isPending ? (
                      [0, 1, 2].map((i) => (
                        <div
                          key={`pending-post-${i}`}
                          className="flex items-center justify-between border-b border-border/40 pb-4 last:border-0"
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">
                                <SkeletonText placeholder={t("a_recent_post_title")} />
                              </h4>
                              <div className="mt-1 flex items-center space-x-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-xs">
                                  <SkeletonText placeholder="Category" />
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  <SkeletonText placeholder="Published" />
                                </Badge>
                                <span>
                                  <SkeletonText placeholder="2 days ago" />
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="icon" disabled>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : recentPosts.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">
                        {tCommon("no_posts_found")}
                      </p>
                    ) : (
                      recentPosts.map((post) => (
                        <div
                          key={post.id}
                          className="flex items-center justify-between border-b border-border/40 pb-4 last:border-0"
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">
                                {post.title}
                              </h4>
                              <div className="mt-1 flex items-center space-x-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-xs">
                                  {post.category?.name || tCommon("uncategorized")}
                                </Badge>
                                <Badge
                                  variant={
                                    post.status === "PUBLISHED"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {post.status === "PUBLISHED"
                                    ? tCommon("published")
                                    : tCommon("draft")}
                                </Badge>
                                <span>
                                  {post.createdAt &&
                                    formatDistanceToNow(
                                      new Date(post.createdAt),
                                      {
                                        addSuffix: true,
                                      }
                                    )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Link href={`/blog/${post.slug}`}>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Pending Authors */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {t("pending_authors")}
                      </CardTitle>
                      <CardDescription>
                        {t("recent_author_applications")}
                      </CardDescription>
                    </div>
                    <Link
                      href="/admin/blog/author?status=PENDING"
                      className="gap-1 text-xs"
                    >
                      <Button variant="ghost" size="sm">
                        {tCommon("view_all")}
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isPending ? (
                      [0, 1, 2].map((i) => (
                        <div
                          key={`pending-author-${i}`}
                          className="flex items-center justify-between border-b border-border/40 pb-4 last:border-0"
                        >
                          <div className="flex items-center space-x-4">
                            <SkeletonBlock className="h-8 w-8 shrink-0 rounded-full" />
                            <div>
                              <h4 className="text-sm font-medium">
                                <SkeletonText placeholder={t("applicant_name")} />
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                <SkeletonText placeholder="name@example.com" />
                              </p>
                            </div>
                          </div>
                          {/* The two decision buttons are chrome — their
                              captions are `t()` strings and their box is what
                              keeps the row's right edge from resizing. */}
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" disabled>
                              {tCommon("approve")}
                            </Button>
                            <Button size="sm" variant="outline" disabled>
                              {tCommon("reject")}
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : pendingAuthorsList.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">
                        {tCommon("no_pending_applications")}
                      </p>
                    ) : (
                      pendingAuthorsList.map((author) => {
                        return (
                          <div
                            key={author.id}
                            className="flex items-center justify-between border-b border-border/40 pb-4 last:border-0"
                          >
                            <div className="flex items-center space-x-4">
                              <Avatar>
                                <AvatarImage
                                  src={
                                    author.user?.avatar ||
                                    "/img/placeholder.svg"
                                  }
                                />
                                <AvatarFallback>
                                  {author.user?.name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="text-sm font-medium">
                                  {author.user?.name || tCommon("unknown")}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {author.user?.email || ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-success text-success hover:bg-success/10 hover:text-success-ink"
                                onClick={() =>
                                  updateAuthorStatus(author.id, "APPROVED")
                                }
                              >
                                {tCommon("approve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive-ink"
                                onClick={() =>
                                  updateAuthorStatus(author.id, "REJECTED")
                                }
                              >
                                {tCommon("reject")}
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                label={tCommon("total_posts")}
                value={posts?.publishedCount}
                loading={isPending}
                icon={FileText}
                index={0}
                onClick={() => router.push("/admin/blog/post")}
                {...statsCardColors.blue}
              />
              <StatsCard
                label="Categories"
                value={categories?.count}
                loading={isPending}
                icon={FolderOpen}
                index={1}
                onClick={() => router.push("/admin/blog/category")}
                {...statsCardColors.amber}
              />
              <StatsCard
                label="Tags"
                value={tags?.count}
                loading={isPending}
                icon={Tag}
                index={2}
                onClick={() => router.push("/admin/blog/tag")}
                {...statsCardColors.green}
              />
              <StatsCard
                label="Authors"
                value={approvedAuthors}
                loading={isPending}
                icon={Users}
                index={3}
                onClick={() => router.push("/admin/blog/author")}
                {...statsCardColors.purple}
              />
            </div>
            <div className="grid grid-cols-1 gap-6">
              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {t("top_categories")}
                  </CardTitle>
                  <CardDescription>
                    {t("most_popular_content_categories")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {categories?.list?.slice(0, 5).map((category) => {
                      return (
                        <Badge
                          key={category.id}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {category.name}
                          <span className="text-xs text-muted-foreground">
                            (
                            {category.postCount || 0} )
                          </span>
                        </Badge>
                      );
                    }) || (
                      <p className="w-full text-center py-4 text-muted-foreground">
                        {tCommon("no_categories_found")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    {tCommon("popular_tags")}
                  </CardTitle>
                  <CardDescription>
                    {t("most_used_content_tags")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tags?.list?.slice(0, 15).map((tag) => {
                      return (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          {tag.name}
                          <span className="text-xs text-muted-foreground">
                            (
                            {tag.postCount || 0} )
                          </span>
                        </Badge>
                      );
                    }) || (
                      <p className="w-full text-center py-4 text-muted-foreground">
                        {tCommon("no_tags_found")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </m.div>
    </div>
  );
}
