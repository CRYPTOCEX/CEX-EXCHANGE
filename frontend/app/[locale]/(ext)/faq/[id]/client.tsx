"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { Clock, Tag, ThumbsUp, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useFAQStore } from "@/store/faq";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function FAQDetailContent() {
  const t = useTranslations("ext");
  const { id } = useParams() as { id: string };
  const { toast } = useToast();
  const [faq, setFaq] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [helpfulCount, setHelpfulCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  // Get methods from the FAQ store.
  const { getFAQById, submitFeedback } = useFAQStore();

  useEffect(() => {
    async function loadFAQ() {
      try {
        setIsLoading(true);
        const faqData = await getFAQById(id);
        if (!faqData) {
          notFound();
        }

        setFaq(faqData);
        // Use the real helpful count if provided; otherwise default to 0.
        setHelpfulCount(faqData.helpfulCount ?? 0);
      } catch (error) {
        console.error("Error loading FAQ:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadFAQ();
  }, [id]);

  if (isLoading) {
    return null; // Parent Suspense should show a loading state
  }

  if (!faq) {
    notFound();
  }

  // When the user clicks "Helpful", immediately submit a vote with no comment.
  const handleHelpfulClick = async () => {
    if (!hasVoted) {
      const success = await submitFeedback(faq.id, true);
      if (success) {
        setHelpfulCount((prev) => prev + 1);
        setHasVoted(true);
        setShowFeedbackForm(true);
        toast({
          title: "Thank you!",
          description: "Your vote has been recorded.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to record your vote.",
          variant: "destructive",
        });
      }
    }
  };

  // When submitting feedback, if a comment is provided, submit it.
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackText.trim()) {
      const success = await submitFeedback(faq.id, true, feedbackText);
      if (success) {
        toast({
          title: "Feedback submitted",
          description: "Thank you for your feedback!",
        });
        setFeedbackText("untitled");
        setShowFeedbackForm(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to submit feedback. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Please enter some feedback before submitting.",
        variant: "destructive",
      });
    }
  };

  // Use updatedAt if available; otherwise, use createdAt.
  const formattedDate = new Date(
    faq.updatedAt ? faq.updatedAt : faq.createdAt
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">{faq.question}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline" className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {faq.category || "General"}
            </Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t("Updated")}
              {formattedDate}
            </span>
          </div>
          <Separator className="my-6" />
          <div className="prose prose-blue dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
          </div>
          <div className="pt-8">
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-2">
                  {t("was_this_helpful")}
                </h3>
                {!showFeedbackForm ? (
                  <Button
                    variant={hasVoted ? "default" : "outline"}
                    size="sm"
                    onClick={handleHelpfulClick}
                    disabled={hasVoted && !showFeedbackForm}
                    className="flex items-center gap-2"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    {t("helpful_(")}
                    {helpfulCount}
                    )
                  </Button>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="feedback" className="text-sm font-medium">
                        {t("tell_us_why_improve_it")}
                      </label>
                      <Textarea
                        id="feedback"
                        placeholder="Your feedback helps us improve our documentation..."
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {t("submit_feedback")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFeedbackForm(false)}
                      >
                        {t("Cancel")}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {faq.relatedFaqs.length > 0 ? (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">
            {t("related_questions")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faq.relatedFaqs.map((related) => (
              <RelatedQuestionCard key={related.id} faq={related} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">
            {t("related_questions")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("no_related_questions_found")}.
          </p>
        </div>
      )}
    </>
  );
}

function RelatedQuestionCard({ faq }: { faq: any }) {
  const t = useTranslations("ext");
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <Link
          href={`/faq/${faq.id}`}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {faq.question}
        </Link>
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
          {faq.answer.replace(/<[^>]*>/g, "").slice(0, 100)}
        </p>
      </CardContent>
    </Card>
  );
}
