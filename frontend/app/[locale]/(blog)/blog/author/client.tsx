"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useBlogStore } from "@/store/blog/user";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";

export function AllAuthorsClient() {
  const t = useTranslations("blog");
  const { authors, isLoading, fetchAllAuthors, error } = useBlogStore();
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();

  // Gating logic
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasAccess = hasKyc() && canAccessFeature("author_blog");
  useEffect(() => {
    fetchAllAuthors();
  }, []);
  if (kycEnabled && !hasAccess) {
    return <KycRequiredNotice feature="author_blog" />;
  }
  if (isLoading && authors.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-12 w-1/3 mx-auto mb-8" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({
            length: 6,
          }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
            {t("Authors")}
          </h1>
          <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-4 rounded-lg inline-block border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
            {t("our_authors")}
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-300">
            {t("meet_the_talented_writers_behind_our_blog")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((author, index) => {
            return (
              <motion.div
                key={author.id}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.1,
                }}
                className="group overflow-hidden rounded-xl bg-white dark:bg-zinc-800 shadow-md hover:shadow-lg dark:shadow-zinc-900/50 dark:hover:shadow-zinc-900/70 transition-all duration-300 border border-zinc-100 dark:border-zinc-700"
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <Link href={`/blog/author/${author.id}`}>
                    <Image
                      src={author.user?.avatar || "/placeholder.svg"}
                      alt={author.user?.firstName || "Author"}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
                  </Link>
                </div>

                <div className="p-6">
                  <Link href={`/blog/author/${author.id}`}>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                      {author.user?.firstName || "Unknown Author"}
                    </h2>
                  </Link>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2 mt-2">
                    {author.user?.profile?.bio || "No bio available"}
                  </p>
                  <Link href={`/blog/author/${author.id}`} className="px-0">
                    <Button
                      variant="link"
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                    >
                      {t("view_articles")}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
