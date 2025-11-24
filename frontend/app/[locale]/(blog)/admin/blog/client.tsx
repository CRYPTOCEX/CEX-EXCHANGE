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
  Plus,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export function AdminDashboardClient() {
  const t = useTranslations("blog");
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
  if (isLoading || !dashboardData) {
    return <DashboardSkeleton />;
  }

  // Destructure unified dashboard data.
  const { posts, authors, categories, tags, stats } = dashboardData;
  const publishedPosts = posts.publishedCount;
  const draftPosts = posts.draftCount;
  const approvedAuthors = authors.approvedCount;
  const pendingAuthors = authors.pendingCount;
  const recentPosts = posts.recentPosts;
  const pendingAuthorsList = authors.recentPendingAuthors;
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
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
      </motion.div>

      {/* Main Dashboard */}
      <motion.div
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
            <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
            <TabsTrigger value="content">{t("Content")}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Published Posts"
                value={publishedPosts}
                icon={<FileText className="h-5 w-5" />}
                color="primary"
                link="/admin/blog/post"
                linkText="View all posts"
              />
              <StatsCard
                title="Draft Posts"
                value={draftPosts}
                icon={<Bookmark className="h-5 w-5" />}
                color="warning"
                link="/admin/blog/post?status=DRAFT"
                linkText="View drafts"
              />
              <StatsCard
                title="Active Authors"
                value={approvedAuthors}
                icon={<Users className="h-5 w-5" />}
                color="success"
                link="/admin/blog/author"
                linkText="Manage authors"
              />
              <StatsCard
                title="Pending Authors"
                value={pendingAuthors}
                icon={<Clock className="h-5 w-5" />}
                color="purple"
                link="/admin/blog/author?status=PENDING"
                linkText="Review applications"
              />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Recent Posts */}
              <Card className="border-border/40 shadow-sm">
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
                        {t("view_all")}
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentPosts.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">
                        {t("no_posts_found")}
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
                                  {post.category?.name || "Uncategorized"}
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
                                    ? "Published"
                                    : "Draft"}
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
              <Card className="border-border/40 shadow-sm">
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
                        {t("view_all")}
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingAuthorsList.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">
                        {t("no_pending_applications")}
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
                                  {author.user?.name || "Unknown"}
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
                                className="border-green-500 text-green-600 hover:bg-green-500/10 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-400/10"
                                onClick={() =>
                                  updateAuthorStatus(author.id, "APPROVED")
                                }
                              >
                                {t("Approve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500 text-red-600 hover:bg-red-500/10 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-400/10"
                                onClick={() =>
                                  updateAuthorStatus(author.id, "REJECTED")
                                }
                              >
                                {t("Reject")}
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
                title="Total Posts"
                value={posts.publishedCount}
                icon={<FileText className="h-5 w-5" />}
                color="primary"
                link="/admin/blog/post"
                linkText="Manage posts"
              />
              <StatsCard
                title="Categories"
                value={categories.count}
                icon={<FolderOpen className="h-5 w-5" />}
                color="warning"
                link="/admin/blog/category"
                linkText="Manage categories"
              />
              <StatsCard
                title="Tags"
                value={tags.count}
                icon={<Tag className="h-5 w-5" />}
                color="success"
                link="/admin/blog/tag"
                linkText="Manage tags"
              />
              <StatsCard
                title="Authors"
                value={approvedAuthors}
                icon={<Users className="h-5 w-5" />}
                color="purple"
                link="/admin/blog/author"
                linkText="Manage authors"
              />
            </div>
            <div className="grid grid-cols-1 gap-6">
              <Card className="border-border/40 shadow-sm">
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
                    {categories.list?.slice(0, 5).map((category) => {
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
                        {t("no_categories_found")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    {t("popular_tags")}
                  </CardTitle>
                  <CardDescription>
                    {t("most_used_content_tags")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tags.list?.slice(0, 15).map((tag) => {
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
                        {t("no_tags_found")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon,
  color,
  link,
  linkText,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: "primary" | "warning" | "success" | "purple";
  link?: string;
  linkText?: string;
}) {
  const colorMap = {
    primary: {
      bg: "bg-primary/10",
      text: "text-primary",
      border: "border-primary/20",
    },
    warning: {
      bg: "bg-yellow-500/10",
      text: "text-yellow-600 dark:text-yellow-400",
      border: "border-yellow-500/20",
    },
    success: {
      bg: "bg-green-500/10",
      text: "text-green-600 dark:text-green-400",
      border: "border-green-500/20",
    },
    purple: {
      bg: "bg-purple-500/10",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-500/20",
    },
  };
  const colors = colorMap[color];
  return (
    <Card className="border-border/40 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div
          className={`p-2 rounded-full ${colors.bg} ${colors.border} border`}
        >
          <div className={colors.text}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {link && linkText && (
          <Link href={link}>
            <p className="text-xs text-muted-foreground hover:text-primary transition-colors mt-1 inline-flex items-center gap-1">
              {linkText}
              <ChevronRight className="h-3 w-3" />
            </p>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({
          length: 4,
        }).map((_, i) => (
          <Card key={i} className="border-border/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({
          length: 2,
        }).map((_, i) => (
          <Card key={i} className="border-border/40">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({
                  length: 3,
                }).map((_, j) => (
                  <div key={j} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
