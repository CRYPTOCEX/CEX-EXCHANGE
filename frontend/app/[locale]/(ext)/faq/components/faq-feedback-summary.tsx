"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useFeedbackStore } from "@/store/faq/feedback-store";
import { useTranslations } from "next-intl";

interface FaqFeedbackSummaryProps {
  faqId: string;
}

export function FaqFeedbackSummary({ faqId }: FaqFeedbackSummaryProps) {
  const t = useTranslations("ext");
  const { feedbacks, fetchFeedbackByFaqId, isLoading } = useFeedbackStore();

  useEffect(() => {
    fetchFeedbackByFaqId(faqId);
  }, [faqId, fetchFeedbackByFaqId]);

  if (isLoading) {
    return <div className="p-4 text-center">{t("loading_feedback")}.</div>;
  }

  if (!feedbacks.length) {
    return (
      <div className="p-4 text-center">{t("no_feedback_available_yet")}.</div>
    );
  }

  const totalFeedback = feedbacks.length;
  const helpfulCount = feedbacks.filter((f) => f.isHelpful).length;
  const helpfulPercentage = Math.round((helpfulCount / totalFeedback) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("feedback_summary")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">{t("Helpful")}</span>
              <span className="text-sm font-medium">{helpfulPercentage}%</span>
            </div>
            <Progress value={helpfulPercentage} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-2xl font-bold">{helpfulCount}</div>
              <div className="text-xs text-muted-foreground">
                {t("found_helpful")}
              </div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-2xl font-bold">
                {totalFeedback - helpfulCount}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("not_helpful")}
              </div>
            </div>
          </div>

          {feedbacks.some((f) => f.comment) && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">
                {t("recent_comments")}
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {feedbacks
                  .filter((f) => f.comment)
                  .slice(0, 3)
                  .map((feedback) => (
                    <div
                      key={feedback.id}
                      className="bg-muted p-2 rounded text-sm"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={
                            feedback.isHelpful
                              ? "text-green-500"
                              : "text-red-500"
                          }
                        >
                          {feedback.isHelpful ? "👍" : "👎"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {feedback.createdAt
                            ? new Date(feedback.createdAt).toLocaleDateString()
                            : "unknown"}
                        </span>
                      </div>
                      <p>{feedback.comment}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
