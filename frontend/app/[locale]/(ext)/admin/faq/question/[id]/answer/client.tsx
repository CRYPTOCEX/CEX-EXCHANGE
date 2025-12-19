"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { WysiwygEditor } from "@/components/ui/wysiwyg";
import { useAdminQuestionsStore } from "@/store/faq/question-store";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { ArrowLeft, Send, Mail, Calendar, Loader2 } from "lucide-react";

export default function AnswerQuestionClient() {
  const params = useParams();
  const questionId = params.id as string;
  const router = useRouter();
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const { toast } = useToast();

  const { questions, fetchQuestions, answerQuestion } =
    useAdminQuestionsStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answer, setAnswer] = useState("");
  const [question, setQuestion] = useState<faqQuestionAttributes | null>(null);

  useEffect(() => {
    const loadQuestion = async () => {
      setIsLoading(true);
      try {
        await fetchQuestions();
      } catch (error) {
        console.error("Error loading question:", error);
        toast({
          title: "Error",
          description: "Failed to load question",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestion();
  }, [fetchQuestions, toast]);

  useEffect(() => {
    if (questions.length > 0) {
      const found = questions.find((q) => q.id === questionId);
      if (found) {
        setQuestion(found);
        setAnswer(found.answer || "");
      }
    }
  }, [questions, questionId]);

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
      await answerQuestion(questionId, answer);
      toast({
        title: "Answer Sent",
        description: "The answer has been sent successfully.",
      });
      router.push("/admin/faq/question");
    } catch (error) {
      console.error("Error answering question:", error);
      toast({
        title: "Error",
        description: "Failed to send answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto pb-8 pt-20">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="container mx-auto pb-8 pt-20">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Question not found</p>
            <Button asChild className="mt-4">
              <Link href="/admin/faq/question">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Questions
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-8 pt-20 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/faq/question">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t("answer_question")}</h1>
          <p className="text-muted-foreground">
            Provide a helpful answer to the user's question
          </p>
        </div>
      </div>

      {/* Question Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{t("question")}</CardTitle>
            <Badge
              variant="outline"
              className={
                question.status === "PENDING"
                  ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                  : question.status === "ANSWERED"
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-red-100 text-red-800 border-red-200"
              }
            >
              {question.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-lg font-medium">{question.question}</p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {question.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{question.email}</span>
              </div>
            )}
            {question.createdAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(question.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Answer Editor Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("your_answer")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <WysiwygEditor
            value={answer}
            onChange={setAnswer}
            placeholder={t("write_your_answer_here_ellipsis")}
            uploadDir="faq"
            minHeight={400}
            showWordCount
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" asChild>
              <Link href="/admin/faq/question">{tCommon("cancel")}</Link>
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Answer
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
