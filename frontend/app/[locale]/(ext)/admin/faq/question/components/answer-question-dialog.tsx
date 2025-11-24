"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import RichTextEditor from "@/components/ui/editor";
import { useAdminQuestionsStore } from "@/store/faq/question-store";
import { useTranslations } from "next-intl";

interface AnswerQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: faqQuestionAttributes;
  onAnswer: () => void;
}

export function AnswerQuestionDialog({
  open,
  onOpenChange,
  question,
  onAnswer,
}: AnswerQuestionDialogProps) {
  const t = useTranslations("ext");
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answer, setAnswer] = useState(question.answer || "");
  const { answerQuestion } = useAdminQuestionsStore();

  const handleSubmit = async () => {
    if (!answer.trim()) {
      toast({
        title: "Missing Answer",
        description: "Please provide an answer to the question.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await answerQuestion(question.id, answer);
      onAnswer();
    } catch (error) {
      console.error("Error answering question:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("answer_question")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>{t("Question")}</Label>
            <div className="p-3 bg-muted rounded-md">{question.question}</div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="answer">{t("your_answer")}</Label>
            <RichTextEditor
              value={answer}
              onChange={setAnswer}
              placeholder="Write your answer here..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Answer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
