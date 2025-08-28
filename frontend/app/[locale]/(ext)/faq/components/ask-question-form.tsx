"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user";
import { Link } from "@/i18n/routing";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useTranslations } from "next-intl";

interface AskQuestionFormProps {
  onCancel: () => void;
}

export function AskQuestionForm({ onCancel }: AskQuestionFormProps) {
  const t = useTranslations("ext");
  const { hasKyc, canAccessFeature, user } = useUserStore();
  const { settings } = useConfigStore();
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // If not authenticated, show login prompt
  if (!user) {
    return (
      <div className="py-4">
        <p className="text-muted-foreground">
          {t("you_must_be_logged_in_to_ask_a_question")}.{" "}
          <Button variant="link" onClick={onCancel}>
            {t("Cancel")}
          </Button>
        </p>
        <Link href="/login" className="mt-4">
          <Button>{t("log_in")}</Button>
        </Link>
      </div>
    );
  }

  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const canAskFaq = hasKyc() && canAccessFeature("ask_faq");

  if (kycEnabled && !canAskFaq) {
    return <KycRequiredNotice feature="ask_faq" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      toast({
        title: "Error",
        description: "Please enter your question",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await $fetch({
        url: "/api/faq/question",
        method: "POST",
        body: {
          question: question.trim(),
          email: email.trim() || user?.email, // Use user email if available
          userId: user?.id, // Add user ID to the request
        },
      });

      if (error) {
        throw new Error(error);
      }

      setSubmitted(true);
      toast({
        title: "Question Submitted",
        description:
          "Thank you for your question. We'll review it and may add it to our FAQ section.",
      });
    } catch (error) {
      console.error("Error submitting question:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit your question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-6">
        <h3 className="text-xl font-semibold mb-2">{t("thank_you")}</h3>
        <p className="text-muted-foreground mb-4">
          {t("your_question_has_been_submitted")}.{" "}
          {t("well_review_it_and_may_add_it_to_our_faq_section")}.
        </p>
        {email && (
          <p className="text-sm text-muted-foreground">
            {t("well_send_you_an_email_at")}
            {email}
            {t("when_we_have_an_answer_for_you")}.
          </p>
        )}
        <Button className="mt-4" onClick={onCancel}>
          {t("ask_another_question")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Textarea
          placeholder="What would you like to know?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Input
          type="email"
          placeholder="your@email.com (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full"
        />
        <p className="text-sm text-muted-foreground">
          {t("provide_your_email_your_question")}
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("Cancel")}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Question"}
        </Button>
      </div>
    </form>
  );
}
