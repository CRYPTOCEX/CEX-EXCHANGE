"use client";

import { useState, useEffect } from "react";
import { useBlogStore } from "@/store/blog/user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";

export function AuthorApplication() {
  const t = useTranslations("blog");
  const { user } = useUserStore();
  const [status, setStatus] = useState<string | null>(null);
  const { applyForAuthor, isLoading, error, fetchAuthor } = useBlogStore();

  useEffect(() => {
    if (user?.id) {
      fetchAuthor();
    }
  }, [user?.id]);

  const handleApply = async () => {
    if (user?.id) {
      await applyForAuthor(user.id);
      setStatus("PENDING");
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center text-center">
            <Skeleton className="h-16 w-16 rounded-full mb-4" />
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-2" />
            <Skeleton className="h-4 w-4/6 mb-4" />
            <Skeleton className="h-10 w-40 rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("author_application")}</CardTitle>
          <CardDescription>
            {t("join_our_team_of_content_creators")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Error
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              {t("try_again")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderStatusContent = () => {
    switch (status) {
      case "PENDING":
        return (
          <div className="flex flex-col items-center text-center">
            <Clock className="h-16 w-16 text-yellow-500 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              {t("application_pending")}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              {t("your_application_to_under_review")}{" "}
              {t("well_notify_you_once_a_decision_has_been_made")}
            </p>
          </div>
        );
      case "APPROVED":
        return (
          <div className="flex flex-col items-center text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              {t("application_approved")}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              {t("congratulations_you_are_now_an_approved_author")}{" "}
              {t("you_can_start_creating_and_publishing_blog_posts")}
            </p>
            <Link href="/blog/posts/new" className="mt-4">
              <Button>{t("create_your_first_post")}</Button>
            </Link>
          </div>
        );
      case "REJECTED":
        return (
          <div className="flex flex-col items-center text-center">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              {t("application_rejected")}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              {t("unfortunately_your_application_been_rejected")}{" "}
              {t("if_you_believe_support_team")}
            </p>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="h-16 w-16 text-indigo-500 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              {t("become_an_author")}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">
              {t("share_your_knowledge_blog_author")}{" "}
              {t("apply_now_to_blog_posts")}
            </p>
            <Button onClick={handleApply} disabled={isLoading}>
              {isLoading
                ? "Submitting Application..."
                : "Apply to be an Author"}
            </Button>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("author_application")}</CardTitle>
        <CardDescription>
          {t("join_our_team_of_content_creators")}
        </CardDescription>
      </CardHeader>
      <CardContent>{renderStatusContent()}</CardContent>
    </Card>
  );
}
