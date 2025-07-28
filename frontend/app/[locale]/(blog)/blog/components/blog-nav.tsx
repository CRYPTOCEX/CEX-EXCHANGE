"use client";

import { useEffect, useMemo } from "react";
import { Link } from "@/i18n/routing";
import { usePathname } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { PenSquare } from "lucide-react";
import { useBlogStore } from "@/store/blog/user";
import { useConfigStore } from "@/store/config";
import { useUserStore } from "@/store/user";
import SiteHeader from "@/components/partials/header/site-header";
import { useTranslations } from "next-intl";
// Adjust import if needed

export default function BlogNav() {
  const t = useTranslations("blog");
  const pathname = usePathname();
  const { user } = useUserStore();
  const { fetchAuthor, author } = useBlogStore();
  const { settings } = useConfigStore();

  useEffect(() => {
    if (user?.id && !author) {
      fetchAuthor();
    }
  }, [user?.id]);

  const isLoggedIn = Boolean(user?.id);
  const isApprovedAuthor = author?.status === "APPROVED";

  const enableAuthorApplications =
    settings?.enableAuthorApplications &&
    typeof settings?.enableAuthorApplications === "boolean"
      ? settings.enableAuthorApplications
      : Boolean(settings?.enableAuthorApplications);

  // Check if the user has reached their post limit
  const hasReachedPostLimit = () => {
    const maxPostsPerAuthor =
      settings?.maxPostsPerAuthor &&
      typeof settings?.maxPostsPerAuthor === "number"
        ? settings.maxPostsPerAuthor
        : Number(settings?.maxPostsPerAuthor);
    if (!settings || maxPostsPerAuthor === 0) return false;
    if (!author?.posts) return false;
    return author.posts.length >= maxPostsPerAuthor;
  };

  // Build menu array (handles guest state correctly)
  const menu = useMemo(() => {
    const arr = [
      {
        key: "blog",
        title: "Blog",
        href: "/blog",
        active: pathname === "/blog",
      },
    ];

    if (!isLoggedIn) {
      // Guests: only show Blog
      return arr;
    }

    if (enableAuthorApplications) {
      if (!isApprovedAuthor) {
        arr.push({
          key: "become-author",
          title: "Become an Author",
          href: "/blog/author/apply",
          active: pathname.startsWith("/blog/author/apply"),
        });
      } else {
        arr.push({
          key: "my-posts",
          title: "My Posts",
          href: "/blog/author/manage",
          active: pathname.startsWith("/blog/author/manage"),
        });
      }
    }
    return arr;
  }, [pathname, enableAuthorApplications, isLoggedIn, isApprovedAuthor]);

  // Build right controls (handles guest state correctly)
  const rightControls = useMemo(() => {
    if (!isLoggedIn) {
      // Optionally: show login/signup button for guests, or leave blank
      return null;
    }
    if (!enableAuthorApplications) return null;
    if (isApprovedAuthor && !hasReachedPostLimit()) {
      return (
        <Link href="/blog/author/manage/new">
          <Button variant="default" size="sm">
            <PenSquare className="mr-2 h-4 w-4" />
            {t("write_post")}
          </Button>
        </Link>
      );
    } else if (isApprovedAuthor && hasReachedPostLimit()) {
      return (
        <Button variant="outline" size="sm" disabled>
          <PenSquare className="mr-2 h-4 w-4" />
          {t("post_limit_reached")}
        </Button>
      );
    }
    return null;
  }, [
    enableAuthorApplications,
    isApprovedAuthor,
    isLoggedIn,
    settings,
    author,
    hasReachedPostLimit,
  ]);

  // Just return the SiteHeader with menu/rightControls
  return <SiteHeader menu={menu} rightControls={rightControls} />;
}
