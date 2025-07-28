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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { FeedbackDetailsDialog } from "./components/feedback-details-dialog";
import { Link } from "@/i18n/routing";

// Import stores
import { useFeedbackStore } from "@/store/faq/feedback-store";
import { useFAQAdminStore } from "@/store/faq/admin";
import { useTranslations } from "next-intl";

export default function AdminFeedbackClient() {
  const t = useTranslations("ext");
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
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("user_feedback")}
            </h1>
            <p className="text-muted-foreground">
              {t("manage_and_analyze_knowledge_base")}.
            </p>
          </div>
        </div>
      </div>
      <Tabs defaultValue="all" className="w-full">
        <div className="flex justify-between items-center gap-4">
          <TabsList>
            <TabsTrigger value="all">{t("all_feedback")}</TabsTrigger>
            <TabsTrigger value="helpful">{t("Helpful")}</TabsTrigger>
            <TabsTrigger value="unhelpful">{t("not_helpful")}</TabsTrigger>
            <TabsTrigger value="with-comments">
              {t("with_comments")}
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search feedback..."
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
                          variant={item.isHelpful ? "outline" : "destructive"}
                          className="ml-2"
                        >
                          {item.isHelpful ? (
                            <>
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              {t("Helpful")}
                            </>
                          ) : (
                            <>
                              <ThumbsDown className="h-3 w-3 mr-1" />
                              {t("not_helpful")}
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
                            {t("user_id")}
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
                          {t("view_details")}
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
                            {t("Helpful")}
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
                              {t("user_id")}
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
                            {t("view_details")}
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
                    <Card key={item.id} className="border-l-4 border-l-red-500">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">
                            {relatedFaq
                              ? relatedFaq.question
                              : `FAQ ID: ${item.faqId}`}
                          </CardTitle>
                          <Badge variant="destructive" className="ml-2">
                            <ThumbsDown className="h-3 w-3 mr-1" />
                            {t("not_helpful")}
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
                              {t("user_id")}
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
                            {t("view_details")}
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
                            variant={item.isHelpful ? "outline" : "destructive"}
                            className="ml-2"
                          >
                            {item.isHelpful ? (
                              <>
                                <ThumbsUp className="h-3 w-3 mr-1" />
                                {t("Helpful")}
                              </>
                            ) : (
                              <>
                                <ThumbsDown className="h-3 w-3 mr-1" />
                                {t("not_helpful")}
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
                              ? new Date(item.createdAt).toLocaleDateString()
                              : ""}
                          </div>
                          {item.userId && (
                            <div className="flex items-center">
                              <User className="h-3.5 w-3.5 mr-1" />
                              {t("user_id")}
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
                            {t("view_details")}
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

      {selectedFeedback && (
        <FeedbackDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          feedback={selectedFeedback}
          faq={faqs.find((f) => f.id === selectedFeedback.faqId)}
        />
      )}
    </div>
  );
}
