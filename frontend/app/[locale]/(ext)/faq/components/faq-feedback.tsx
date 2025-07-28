"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useFeedbackStore } from "@/store/faq/feedback-store";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";

interface FaqFeedbackProps {
  faqId: string;
}

export function FaqFeedback({ faqId }: FaqFeedbackProps) {
  const t = useTranslations("ext");
  const { user } = useUserStore();
  const [selectedRating, setSelectedRating] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [showCommentField, setShowCommentField] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { submitFeedback, isLoading } = useFeedbackStore();

  const handleRatingClick = (isHelpful: boolean) => {
    setSelectedRating(isHelpful);
    setShowCommentField(true);
  };

  const handleSubmit = async () => {
    if (selectedRating === null) return;

    // Get userId from your user store or context
    const userId = user?.id;

    if (!userId) {
      // Optionally handle the case where user is not logged in
      alert("You must be logged in to submit feedback.");
      return;
    }

    await submitFeedback({
      faqId,
      userId,
      isHelpful: selectedRating,
      comment: comment.trim() || undefined,
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="p-4 bg-muted rounded-lg text-center">
        <p className="text-sm font-medium">
          {t("thank_you_for_your_feedback")}
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 mt-6">
      <h3 className="text-sm font-medium mb-2">{t("was_this_helpful")}</h3>

      <div className="flex gap-2 mb-4">
        <Button
          variant={selectedRating === true ? "default" : "outline"}
          size="sm"
          onClick={() => handleRatingClick(true)}
          disabled={isLoading}
        >
          <ThumbsUp className="h-4 w-4 mr-1" />
          {t("Yes")}
        </Button>

        <Button
          variant={selectedRating === false ? "default" : "outline"}
          size="sm"
          onClick={() => handleRatingClick(false)}
          disabled={isLoading}
        >
          <ThumbsDown className="h-4 w-4 mr-1" />
          {t("No")}
        </Button>
      </div>

      {showCommentField && (
        <div className="space-y-3">
          <Textarea
            placeholder="Tell us more about your experience (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isLoading}
            className="h-24"
          />

          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit Feedback"}
          </Button>
        </div>
      )}
    </div>
  );
}
