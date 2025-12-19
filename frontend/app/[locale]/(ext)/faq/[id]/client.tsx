"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import {
  Tag,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  HelpCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useFAQStore } from "@/store/faq";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { sanitizeHTML } from "@/lib/sanitize";
import Image from "next/image";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { useTranslations } from "next-intl";

export default function FAQDetailContent() {
  const t = useTranslations("ext_faq");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { id } = useParams() as { id: string };
  const { toast } = useToast();
  const [faq, setFaq] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [helpfulCount, setHelpfulCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteType, setVoteType] = useState<"helpful" | "not-helpful" | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [savedFAQs, setSavedFAQs] = useLocalStorage<string[]>("saved-faqs", []);
  const { getFAQById, submitFeedback } = useFAQStore();

  const isSaved = savedFAQs.includes(id);

  useEffect(() => {
    async function loadFAQ() {
      try {
        setIsLoading(true);
        const faqData = await getFAQById(id);
        if (!faqData) {
          notFound();
        }

        setFaq(faqData);
        setHelpfulCount(faqData.helpfulCount ?? 0);
      } catch (error) {
        console.error("Error loading FAQ:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadFAQ();
  }, [id]);

  const toggleSaved = () => {
    setSavedFAQs((prev) => {
      if (prev.includes(id)) {
        toast({
          title: "Removed from saved",
          description: "FAQ removed from your saved items.",
        });
        return prev.filter((faqId) => faqId !== id);
      } else {
        toast({
          title: "Saved",
          description: "FAQ saved for later reference.",
        });
        return [...prev, id];
      }
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: faq.question,
          url: window.location.href,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "FAQ link copied to clipboard.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full"
        />
      </div>
    );
  }

  if (!faq) {
    notFound();
  }

  const handleHelpfulClick = async () => {
    if (!hasVoted) {
      const success = await submitFeedback(faq.id, true);
      if (success) {
        setHelpfulCount((prev) => prev + 1);
        setHasVoted(true);
        setVoteType("helpful");
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

  const handleNotHelpfulClick = async () => {
    if (!hasVoted) {
      setHasVoted(true);
      setVoteType("not-helpful");
      setShowFeedbackForm(true);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackText.trim()) {
      const success = await submitFeedback(faq.id, voteType === "helpful", feedbackText);
      if (success) {
        toast({
          title: "Feedback submitted",
          description: "Thank you for your feedback!",
        });
        setFeedbackText("");
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

  const formattedDate = new Date(
    faq.updatedAt ? faq.updatedAt : faq.createdAt
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Hero Section */}
      <HeroSection
        breadcrumb={{
          text: "Back to FAQs",
          href: "/faq",
        }}
        title={faq.question}
        titleClassName="text-2xl md:text-3xl lg:text-4xl"
        description={t("find_the_answer_to_your_question_below")}
        descriptionClassName="text-lg"
        layout="split"
        showBorder={false}
        paddingTop="pt-24"
        paddingBottom="pb-16"
        rightContentAlign="center"
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
        rightContent={
          <div className="flex flex-col gap-3 w-full sm:w-auto lg:mt-8">
            <Button
              size="lg"
              onClick={toggleSaved}
              className="w-full sm:w-48 bg-linear-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white"
            >
              {isSaved ? (
                <BookmarkCheck className="mr-2 h-5 w-5" />
              ) : (
                <Bookmark className="mr-2 h-5 w-5" />
              )}
              {isSaved ? "Saved" : "Save Article"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleShare}
              className="w-full sm:w-48 border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50"
            >
              <Share2 className="mr-2 h-5 w-5" />
              Share
            </Button>
          </div>
        }
      >
        <StatsGroup
          stats={[
            {
              icon: Clock,
              label: `Updated ${formattedDate}`,
              value: "",
              iconColor: "text-sky-500",
              iconBgColor: "bg-sky-500/10",
            },
            {
              icon: ThumbsUp,
              label: `${helpfulCount} found helpful`,
              value: "",
              iconColor: "text-blue-500",
              iconBgColor: "bg-blue-500/10",
            },
            {
              icon: Tag,
              label: faq.category || "General",
              value: "",
              iconColor: "text-sky-500",
              iconBgColor: "bg-sky-500/10",
            },
          ]}
        />
      </HeroSection>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Answer Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card className="border-0 shadow-xl bg-white dark:bg-zinc-900 overflow-hidden">
              <CardContent className="p-8 md:p-12">
                {/* Answer */}
                <div className="prose dark:prose-invert max-w-none prose-sky prose-lg">
                  <div
                    dangerouslySetInnerHTML={{ __html: sanitizeHTML(faq.answer) }}
                    className="text-zinc-700 dark:text-zinc-300 leading-relaxed"
                  />
                </div>

                {/* Image if exists */}
                {faq.image && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-8 rounded-2xl overflow-hidden shadow-lg border border-sky-200 dark:border-sky-800"
                  >
                    <Image
                      src={faq.image}
                      alt={tExt("answer_illustration")}
                      width={800}
                      height={500}
                      className="w-full h-auto object-cover"
                      unoptimized
                    />
                  </motion.div>
                )}

                {/* Feedback Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-12 pt-8 border-t border-sky-200 dark:border-sky-800"
                >
                  <AnimatePresence mode="wait">
                    {!hasVoted ? (
                      <motion.div
                        key="vote"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                          {t("was_this_article_helpful")}
                        </h3>
                        <div className="flex gap-3">
                          <Button
                            onClick={handleHelpfulClick}
                            className="bg-linear-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white px-6"
                          >
                            <ThumbsUp className="h-4 w-4 mr-2" />
                            {t("yes_helpful")}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleNotHelpfulClick}
                            className="border-zinc-300 dark:border-zinc-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-950/30"
                          >
                            <ThumbsDown className="h-4 w-4 mr-2" />
                            {t("needs_improvement")}
                          </Button>
                        </div>
                      </motion.div>
                    ) : showFeedbackForm ? (
                      <motion.div
                        key="feedback"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className={`p-6 rounded-xl ${
                          voteType === "helpful"
                            ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                            : "bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800"
                        }`}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              voteType === "helpful"
                                ? "bg-emerald-100 dark:bg-emerald-900/50"
                                : "bg-rose-100 dark:bg-rose-900/50"
                            }`}>
                              {voteType === "helpful" ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <MessageSquare className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-zinc-900 dark:text-white">
                                {voteType === "helpful" ? "Thank you for your feedback!" : "Help us improve"}
                              </h4>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {voteType === "helpful"
                                  ? "Tell us what you liked or how we can improve"
                                  : "What could we do better?"}
                              </p>
                            </div>
                          </div>
                          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                            <Textarea
                              placeholder={t("share_your_thoughts_ellipsis")}
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                              rows={4}
                              className="resize-none bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                            />
                            <div className="flex gap-3">
                              <Button
                                type="submit"
                                className="bg-linear-to-r from-sky-600 to-blue-600 text-white"
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                {t("submit_feedback")}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowFeedbackForm(false)}
                              >
                                Skip
                              </Button>
                            </div>
                          </form>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="thanks"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">
                              {t("thank_you_for_your_feedback")}
                            </h4>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400">
                              {t("your_feedback_helps_us_improve_our_content")}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {/* Related Questions */}
            <Card className="shadow-lg bg-white dark:bg-zinc-900 overflow-hidden border border-sky-200 dark:border-sky-800">
              <CardHeader className="bg-linear-to-r from-sky-50 to-blue-50 dark:from-sky-950/50 dark:to-blue-950/50 border-b border-sky-100 dark:border-sky-900/50">
                <CardTitle className="flex items-center text-lg font-bold text-zinc-900 dark:text-white">
                  <HelpCircle className="h-5 w-5 mr-2 text-sky-600 dark:text-sky-400" />
                  {t("related_questions")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {faq.relatedFaqs && faq.relatedFaqs.length > 0 ? (
                  <div className="space-y-3">
                    {faq.relatedFaqs.map((related: any, index: number) => (
                      <motion.div
                        key={related.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                      >
                        <Link href={`/faq/${related.id}`}>
                          <Card className="hover:shadow-md transition-all duration-300 bg-sky-500/5 border border-sky-100 dark:border-sky-900/50 hover:border-sky-500 dark:hover:border-sky-700">
                            <CardContent className="p-4">
                              <h4 className="font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-500 transition-colors line-clamp-2 text-sm">
                                {related.question}
                              </h4>
                              {related.category && (
                                <Badge variant="outline" className="mt-2 text-xs bg-white/50 dark:bg-zinc-900/50">
                                  {related.category}
                                </Badge>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto mb-3">
                      <HelpCircle className="h-6 w-6 text-sky-500 dark:text-sky-400" />
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {t("no_related_questions_found")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Need More Help */}
            <Card className="shadow-lg overflow-hidden bg-linear-to-br from-sky-600 to-blue-600 border-0">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {tCommon("need_more_help")}
                </h3>
                <p className="text-sky-100 text-sm mb-4">
                  {t("our_support_team_is_here_to_help_you")}
                </p>
                <Link href="/faq">
                  <Button className="bg-white text-sky-600 hover:bg-sky-50 w-full">
                    {t("browse_all_faqs")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
