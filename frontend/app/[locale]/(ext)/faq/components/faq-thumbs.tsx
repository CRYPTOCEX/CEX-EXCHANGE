"use client";

import { useState } from "react";
import { useFAQStore } from "@/store/faq";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ThumbsDown,
  ThumbsUp,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user";
import { Link } from "@/i18n/routing";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

interface FAQThumbsProps {
  faqId: string;
  className?: string;
}

export function FAQThumbs({ faqId, className }: FAQThumbsProps) {
  const t = useTranslations("ext");
  const { submitFeedback } = useFAQStore();
  const { user } = useUserStore();
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddSuggestion = () => {
    setShowComment(true);
  };

  const handleFeedback = async (isHelpful: boolean) => {
    setFeedback(isHelpful);
    setError(null);

    if (!isHelpful) {
      setShowComment(true);
      return;
    }

    setSubmitting(true);

    try {
      const success = await submitFeedback(faqId, isHelpful, undefined);
      if (success) {
        setSubmitted(true);
        setSubmitting(false);
      } else {
        setError("Unable to submit feedback. Please try again.");
        setSubmitting(false);
      }
    } catch (err) {
      console.error("Error in handleFeedback:", err);
      setError("An error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  const handleSubmitComment = async () => {
    if (feedback === null) return;

    setSubmitting(true);
    setError(null);

    try {
      const success = await submitFeedback(faqId, feedback, comment);
      if (success) {
        setSubmitted(true);
        setShowComment(false);
      } else {
        setError("Unable to submit feedback. Please try again.");
      }
    } catch (err) {
      console.error("Error in handleSubmitComment:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-zinc-800 dark:to-zinc-700 rounded-xl p-6",
          className
        )}
      >
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-full 
                          bg-blue-100 dark:bg-blue-900/30 mb-4"
          >
            <Heart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            {t("sign_in_to_our_answers")}.
          </p>
          <Link href="/login">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              {t("sign_in_to_give_feedback")}
            </Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  if (submitted && !showComment) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div
              className="inline-flex items-center justify-center w-10 h-10 rounded-full 
                            bg-green-100 dark:bg-green-900/30 mr-3"
            >
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-green-800 dark:text-green-300 font-medium">
              {t("thank_you_for_your_feedback")}
            </span>
          </div>
          {!comment && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddSuggestion}
              className="text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {t("add_suggestion")}
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-700 p-6 space-y-6"
      >
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 
                         text-sm p-4 rounded-lg flex items-center border border-red-200 dark:border-red-800"
            >
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {!submitted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t("was_this_helpful")}
            </h4>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleFeedback(true)}
                disabled={submitting}
                className={cn(
                  "flex-1 transition-all duration-200",
                  feedback === true
                    ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
                    : "hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-900/20"
                )}
              >
                <ThumbsUp className="h-5 w-5 mr-2" />
                {t("yes_helpful")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleFeedback(false)}
                disabled={submitting}
                className={cn(
                  "flex-1 transition-all duration-200",
                  feedback === false
                    ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
                    : "hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-900/20"
                )}
              >
                <ThumbsDown className="h-5 w-5 mr-2" />
                {t("needs_improvement")}
              </Button>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {showComment && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {feedback
                    ? "How can we make this answer even better?"
                    : "How can we improve this answer?"}
                </label>
                <Textarea
                  placeholder="Share your thoughts and suggestions..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="resize-none border-slate-300 dark:border-zinc-600 
                             focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowComment(false);
                    if (!submitted) setFeedback(null);
                  }}
                  disabled={submitting}
                >
                  {t("Cancel")}
                </Button>
                <Button
                  onClick={handleSubmitComment}
                  disabled={submitting || !comment.trim()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
