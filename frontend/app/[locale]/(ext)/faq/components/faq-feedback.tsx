"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useFeedbackStore } from "@/store/faq/feedback-store";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useToast } from "@/hooks/use-toast";

// FAQFeedbackProps interface is now imported from global types

export function FaqFeedback({ faqId }: FaqFeedbackProps) {
  const t = useTranslations("ext");
  const { user } = useUserStore();
  const router = useRouter();
  const { toast } = useToast();
  const [selectedRating, setSelectedRating] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [showCommentField, setShowCommentField] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { submitFeedback, isLoading } = useFeedbackStore();

  const handleRatingClick = (isHelpful: boolean) => {
    // Check if user is logged in before allowing rating
    if (!user?.id) {
      toast({
        title: t("authentication_required"),
        description: t("please_login_to_submit_feedback"),
        variant: "destructive",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/login")}
          >
            {t("login")}
          </Button>
        ),
      });
      return;
    }
    
    setSelectedRating(isHelpful);
    setShowCommentField(true);
  };

  const handleSubmit = async () => {
    if (selectedRating === null) return;

    // Double-check authentication
    if (!user?.id) {
      toast({
        title: t("authentication_required"),
        description: t("please_login_to_submit_feedback"),
        variant: "destructive",
      });
      router.push("/login");
      return;
    }

    try {
      await submitFeedback({
        faqId,
        userId: user.id,
        isHelpful: selectedRating,
        comment: comment.trim() || undefined,
      });

      setSubmitted(true);
      toast({
        title: t("feedback_submitted"),
        description: t("thank_you_for_your_feedback"),
      });
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failed_to_submit_feedback"),
        variant: "destructive",
      });
    }
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

      {!user && (
        <div className="text-sm text-muted-foreground mb-3">
          {t("login_to_provide_feedback")}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <Button
          variant={selectedRating === true ? "default" : "outline"}
          size="sm"
          onClick={() => handleRatingClick(true)}
          disabled={isLoading}
          title={!user ? t("login_required") : ""}
        >
          <ThumbsUp className="h-4 w-4 mr-1" />
          {t("Yes")}
        </Button>

        <Button
          variant={selectedRating === false ? "default" : "outline"}
          size="sm"
          onClick={() => handleRatingClick(false)}
          disabled={isLoading}
          title={!user ? t("login_required") : ""}
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
