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
import { Users, AlertCircle, ArrowRight } from "lucide-react";
import { PageHero } from "../components/page-hero";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";

export function AllAuthorsClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
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
      <div className="min-h-screen relative overflow-hidden bg-white dark:bg-zinc-950">
        {/* Premium Background */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.03) 10%, rgba(139, 92, 246, 0.02) 30%, transparent 60%)`,
          }}
        />
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)`,
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

        {/* Hero Section Skeleton */}
        <div className="relative z-10 py-16 text-center">
          <div className="container mx-auto px-4">
            {/* Badge skeleton */}
            <div className="flex justify-center mb-6">
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            {/* Title skeleton */}
            <Skeleton className="h-14 w-80 max-w-full mx-auto mb-4 rounded-xl" />
            {/* Description skeleton */}
            <Skeleton className="h-6 w-96 max-w-full mx-auto rounded-lg" />
          </div>
        </div>

        {/* Authors Grid Skeleton */}
        <div className="relative z-10 container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-lg border border-zinc-200/50 dark:border-zinc-800/50"
              >
                {/* Image area skeleton */}
                <div className="relative h-52 w-full">
                  <Skeleton className="h-full w-full rounded-none" />
                  {/* Badge overlay skeleton */}
                  <div className="absolute bottom-4 left-4">
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>

                {/* Content area */}
                <div className="p-6">
                  {/* Name skeleton */}
                  <Skeleton className="h-7 w-3/4 mb-3 rounded-lg" />
                  {/* Bio skeleton - 2 lines */}
                  <Skeleton className="h-4 w-full mb-2 rounded" />
                  <Skeleton className="h-4 w-5/6 mb-5 rounded" />
                  {/* Button skeleton */}
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-white dark:bg-zinc-950 pt-24">
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)`,
          }}
        />
        <FloatingShapes
          count={6}
          interactive={true}
          theme={{ primary: "indigo", secondary: "purple" }}
        />
        <div className="relative z-10 container mx-auto px-4 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mb-8 inline-flex items-center justify-center p-8 bg-linear-to-br from-red-500/10 to-orange-500/10 rounded-3xl border border-red-200/50 dark:border-red-900/50">
              <AlertCircle className="h-16 w-16 text-red-500 dark:text-red-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
              {t("authors")}
            </h1>
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl text-red-700 dark:text-red-400 p-6 rounded-2xl inline-block border border-red-200/50 dark:border-red-900/50 shadow-xl">
              {error}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-zinc-950">
      {/* Premium Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.03) 10%, rgba(139, 92, 246, 0.02) 30%, transparent 60%)`,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)`,
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

      {/* Hero Section */}
      <PageHero
        badge={{ icon: <Users className="h-3.5 w-3.5" />, text: t("authors") }}
        title={[
          { text: "Our " },
          { text: "Authors", gradient: "from-indigo-600 to-purple-600" },
        ]}
        description={t("meet_the_talented_writers_behind_our_blog")}
      />

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((author, index) => {
            return (
              <motion.div
                key={author.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="group overflow-hidden rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-zinc-200/50 dark:border-zinc-800/50"
              >
                <div className="relative h-52 w-full overflow-hidden">
                  <Link href={`/blog/author/${author.id}`}>
                    <Image
                      src={author.user?.avatar || "/placeholder.svg"}
                      alt={author.user?.firstName || "Author"}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent"></div>

                    {/* Author badge overlay */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white/90 text-xs font-medium">
                        <Users className="h-3 w-3" />
                        {tCommon("author")}
                      </div>
                    </div>
                  </Link>
                </div>

                <div className="p-6">
                  <Link href={`/blog/author/${author.id}`}>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300 mb-2">
                      {author.user?.firstName} {author.user?.lastName || ""}
                    </h2>
                  </Link>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-5 line-clamp-2 text-sm">
                    {author.user?.profile?.bio || t("no_bio_available")}
                  </p>
                  <Link href={`/blog/author/${author.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl group/btn dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {t("view_articles")}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
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
