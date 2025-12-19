"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Calendar,
  User,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { FeedbackDetailsDialog } from "./components/feedback-details-dialog";
import { Link } from "@/i18n/routing";

// Import stores
import { useFeedbackStore } from "@/store/faq/feedback-store";
import { useFAQAdminStore } from "@/store/faq/admin";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { motion } from "framer-motion";

export default function AdminFeedbackClient() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  // Get state and actions from the stores.
  const { feedbacks, isLoading, fetchFeedback } = useFeedbackStore();
  const { faqs, fetchFAQs } = useFAQAdminStore();

  // Local state for filtering and details
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Fetch feedback and FAQs on mount.
  useEffect(() => {
    // Fetch all feedback (no FAQ ID filter)
    fetchFeedback();
    // Also fetch FAQs if not already loaded.
    if (!faqs.length) {
      fetchFAQs();
    }
  }, [fetchFeedback, fetchFAQs, faqs.length]);

  // Safe filtering of feedback
  const safeFilteredFeedback = useMemo(() => {
    return Array.isArray(feedbacks)
      ? feedbacks
          .filter((f) => {
            if (!searchQuery) return true;
            const relatedFaq = faqs.find((faq) => faq.id === f.faqId);
            return (
              (relatedFaq?.question &&
                relatedFaq.question
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase())) ||
              (f.comment &&
                f.comment.toLowerCase().includes(searchQuery.toLowerCase()))
            );
          })
          .sort(
            (a, b) =>
              new Date(b.createdAt ?? 0).getTime() -
              new Date(a.createdAt ?? 0).getTime()
          )
      : [];
  }, [feedbacks, faqs, searchQuery]);
  const handleViewDetails = (feedbackItem) => {
    setSelectedFeedback(feedbackItem);
    setShowDetailsDialog(true);
  };

  const helpfulCount = safeFilteredFeedback.filter((f) => f.isHelpful).length;
  const unhelpfulCount = safeFilteredFeedback.filter(
    (f) => !f.isHelpful
  ).length;

  return (
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "Knowledge Base",
          gradient: "from-sky-500/20 via-blue-500/20 to-sky-500/20",
          iconColor: "text-sky-500",
          textColor: "text-sky-600 dark:text-sky-400",
        }}
        title={[
          { text: "User " },
          {
            text: "Feedback",
            gradient:
              "from-sky-600 via-blue-500 to-sky-600 dark:from-sky-400 dark:via-blue-400 dark:to-sky-400",
          },
        ]}
        description={t("manage_and_analyze_knowledge_base")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        background={{
          orbs: [
            {
              color: "#0ea5e9",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#3b82f6",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#0ea5e9", "#3b82f6"],
          size: 8,
        }}
        bottomSlot={
          <Card className="bg-card/50 backdrop-blur border-sky-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-linear-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {feedbacks.length} Total Feedback
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-green-600 dark:text-green-400">
                      {helpfulCount} helpful
                    </span>
                    {" / "}
                    <span className="text-red-600 dark:text-red-400">
                      {unhelpfulCount} not helpful
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        }
      />

      {/* Main Content Container */}
      <div className="container mx-auto py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Tabs defaultValue="all" className="w-full">
            <div className="flex justify-between items-center gap-4">
              <TabsList>
                <TabsTrigger value="all">{t("all_feedback")}</TabsTrigger>
                <TabsTrigger value="helpful">{tExt("helpful")}</TabsTrigger>
                <TabsTrigger value="unhelpful">
                  {tCommon("not_helpful")}
                </TabsTrigger>
                <TabsTrigger value="with-comments">
                  {t("with_comments")}
                </TabsTrigger>
              </TabsList>
              <div className="flex gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("search_feedback_ellipsis")}
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <TabsContent value="all" className="mt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                        <div className="h-3 bg-muted rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : safeFilteredFeedback.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      {t("no_feedback_found")}.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {safeFilteredFeedback.map((item) => {
                    const relatedFaq = faqs.find((f) => f.id === item.faqId);
                    return (
                      <Card
                        key={item.id}
                        className={
                          item.isHelpful
                            ? "border-l-4 border-l-green-500"
                            : "border-l-4 border-l-red-500"
                        }
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">
                              {relatedFaq
                                ? relatedFaq.question
                                : `FAQ ID: ${item.faqId}`}
                            </CardTitle>
                            <Badge
                              variant={
                                item.isHelpful ? "outline" : "destructive"
                              }
                              className="ml-2"
                            >
                              {item.isHelpful ? (
                                <>
                                  <ThumbsUp className="h-3 w-3 mr-1" />
                                  {tExt("helpful")}
                                </>
                              ) : (
                                <>
                                  <ThumbsDown className="h-3 w-3 mr-1" />
                                  {tCommon("not_helpful")}
                                </>
                              )}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="py-2">
                          {item.comment && (
                            <div className="text-sm mb-4 bg-muted p-3 rounded-md">
                              <p className="font-medium text-xs mb-1 text-muted-foreground">
                                {t("user_comment")}
                              </p>

                              {item.comment}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              {item.createdAt
                                ? new Date(item.createdAt).toLocaleDateString()
                                : ""}
                            </div>
                            {item.userId && (
                              <div className="flex items-center">
                                <User className="h-3.5 w-3.5 mr-1" />
                                {tCommon("user_id")}
                                {item.userId}
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(item)}
                            >
                              {tCommon("view_details")}
                            </Button>
                            <Link href={`/admin/faq/manage/${item.faqId}`}>
                              <Button variant="default" size="sm">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                {t("view_faq")}
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
            <TabsContent value="helpful" className="mt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                        <div className="h-3 bg-muted rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {safeFilteredFeedback
                    .filter((item) => item.isHelpful)
                    .map((item) => {
                      const relatedFaq = faqs.find((f) => f.id === item.faqId);
                      return (
                        <Card
                          key={item.id}
                          className="border-l-4 border-l-green-500"
                        >
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">
                                {relatedFaq
                                  ? relatedFaq.question
                                  : `FAQ ID: ${item.faqId}`}
                              </CardTitle>
                              <Badge variant="outline" className="ml-2">
                                <ThumbsUp className="h-3 w-3 mr-1" />
                                {tExt("helpful")}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="py-2">
                            {item.comment && (
                              <div className="text-sm mb-4 bg-muted p-3 rounded-md">
                                <p className="font-medium text-xs mb-1 text-muted-foreground">
                                  {t("user_comment")}
                                </p>

                                {item.comment}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Calendar className="h-3.5 w-3.5 mr-1" />
                                {item.createdAt
                                  ? new Date(
                                      item.createdAt
                                    ).toLocaleDateString()
                                  : ""}
                              </div>
                              {item.userId && (
                                <div className="flex items-center">
                                  <User className="h-3.5 w-3.5 mr-1" />
                                  {tCommon("user_id")}
                                  {item.userId}
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(item)}
                              >
                                {tCommon("view_details")}
                              </Button>
                              <Link href={`/admin/faq/manage/${item.faqId}`}>
                                <Button variant="default" size="sm">
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  {t("view_faq")}
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </TabsContent>
            <TabsContent value="unhelpful" className="mt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                        <div className="h-3 bg-muted rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {safeFilteredFeedback
                    .filter((item) => !item.isHelpful)
                    .map((item) => {
                      const relatedFaq = faqs.find((f) => f.id === item.faqId);
                      return (
                        <Card
                          key={item.id}
                          className="border-l-4 border-l-red-500"
                        >
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">
                                {relatedFaq
                                  ? relatedFaq.question
                                  : `FAQ ID: ${item.faqId}`}
                              </CardTitle>
                              <Badge variant="destructive" className="ml-2">
                                <ThumbsDown className="h-3 w-3 mr-1" />
                                {tCommon("not_helpful")}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="py-2">
                            {item.comment && (
                              <div className="text-sm mb-4 bg-muted p-3 rounded-md">
                                <p className="font-medium text-xs mb-1 text-muted-foreground">
                                  {t("user_comment")}
                                </p>

                                {item.comment}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Calendar className="h-3.5 w-3.5 mr-1" />
                                {item.createdAt
                                  ? new Date(
                                      item.createdAt
                                    ).toLocaleDateString()
                                  : ""}
                              </div>
                              {item.userId && (
                                <div className="flex items-center">
                                  <User className="h-3.5 w-3.5 mr-1" />
                                  {tCommon("user_id")}
                                  {item.userId}
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(item)}
                              >
                                {tCommon("view_details")}
                              </Button>
                              <Link href={`/admin/faq/manage/${item.faqId}`}>
                                <Button variant="default" size="sm">
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  {t("view_faq")}
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </TabsContent>
            <TabsContent value="with-comments" className="mt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                        <div className="h-3 bg-muted rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {safeFilteredFeedback
                    .filter((item) => !!item.comment)
                    .map((item) => {
                      const relatedFaq = faqs.find((f) => f.id === item.faqId);
                      return (
                        <Card
                          key={item.id}
                          className={
                            item.isHelpful
                              ? "border-l-4 border-l-green-500"
                              : "border-l-4 border-l-red-500"
                          }
                        >
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">
                                {relatedFaq
                                  ? relatedFaq.question
                                  : `FAQ ID: ${item.faqId}`}
                              </CardTitle>
                              <Badge
                                variant={
                                  item.isHelpful ? "outline" : "destructive"
                                }
                                className="ml-2"
                              >
                                {item.isHelpful ? (
                                  <>
                                    <ThumbsUp className="h-3 w-3 mr-1" />
                                    {tExt("helpful")}
                                  </>
                                ) : (
                                  <>
                                    <ThumbsDown className="h-3 w-3 mr-1" />
                                    {tCommon("not_helpful")}
                                  </>
                                )}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="py-2">
                            <div className="text-sm mb-4 bg-muted p-3 rounded-md">
                              <p className="font-medium text-xs mb-1 text-muted-foreground">
                                {t("user_comment")}
                              </p>

                              {item.comment}
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Calendar className="h-3.5 w-3.5 mr-1" />
                                {item.createdAt
                                  ? new Date(
                                      item.createdAt
                                    ).toLocaleDateString()
                                  : ""}
                              </div>
                              {item.userId && (
                                <div className="flex items-center">
                                  <User className="h-3.5 w-3.5 mr-1" />
                                  {tCommon("user_id")}
                                  {item.userId}
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(item)}
                              >
                                {tCommon("view_details")}
                              </Button>
                              <Link href={`/admin/faq/manage/${item.faqId}`}>
                                <Button variant="default" size="sm">
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  {t("view_faq")}
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        {selectedFeedback && (
          <FeedbackDetailsDialog
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
            feedback={selectedFeedback}
            faq={faqs.find((f) => f.id === selectedFeedback.faqId)}
          />
        )}
      </div>
    </div>
  );
}
