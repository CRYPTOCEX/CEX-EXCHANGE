"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { WysiwygEditor } from "@/components/ui/wysiwyg";
import { ImageUpload } from "@/components/ui/image-upload";
import { useAdminQuestionsStore } from "@/store/faq/question-store";
import { useFAQAdminStore } from "@/store/faq/admin";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { imageUploader } from "@/utils/upload";
import {
  ArrowLeft,
  FileText,
  Mail,
  Calendar,
  Loader2,
  PlusCircle,
} from "lucide-react";

export default function ConvertToFaqClient() {
  const params = useParams();
  const questionId = params.id as string;
  const router = useRouter();
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const { toast } = useToast();

  const { questions, fetchQuestions, updateQuestionStatus } =
    useAdminQuestionsStore();
  const { categories, pageLinks, fetchCategories, fetchPageLinks, createFAQ } =
    useFAQAdminStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [question, setQuestion] = useState<faqQuestionAttributes | null>(null);

  // Form state
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [pagePath, setPagePath] = useState("/faq");
  const [answerImage, setAnswerImage] = useState<string | File | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchQuestions(),
          fetchCategories(),
          fetchPageLinks(),
        ]);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [fetchQuestions, fetchCategories, fetchPageLinks, toast]);

  useEffect(() => {
    if (questions.length > 0) {
      const found = questions.find((q) => q.id === questionId);
      if (found) {
        setQuestion(found);
        setFaqQuestion(found.question);
        setFaqAnswer(found.answer || "");
      }
    }
  }, [questions, questionId]);

  const handleSubmit = async () => {
    if (!faqQuestion.trim() || !faqAnswer.trim() || !category || !pagePath) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl: string | undefined;
      if (answerImage) {
        if (typeof answerImage !== "string") {
          const uploadResult = await imageUploader({
            file: answerImage,
            dir: "faq",
            size: { maxWidth: 1024, maxHeight: 728 },
          });
          if (!uploadResult.success) {
            toast({
              title: "Error",
              description: "Image upload failed.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
          imageUrl = uploadResult.url;
        } else {
          imageUrl = answerImage;
        }
      }

      const newFaq = await createFAQ({
        question: faqQuestion,
        answer: faqAnswer,
        category,
        pagePath,
        image: imageUrl,
        status: true,
      });

      if (!newFaq) {
        throw new Error("Failed to create FAQ");
      }

      // Update question status to answered
      await updateQuestionStatus(questionId, "ANSWERED");

      toast({
        title: "FAQ Created",
        description: "The question has been successfully converted to an FAQ.",
      });

      router.push("/admin/faq/question");
    } catch (error) {
      console.error("Error creating FAQ:", error);
      toast({
        title: "Error",
        description: "Failed to create FAQ. Please try again.",
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
          <h1 className="text-2xl font-bold">{t("convert_to_faq")}</h1>
          <p className="text-muted-foreground">
            Create a new FAQ entry from this user question
          </p>
        </div>
      </div>

      {/* Original Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">Original Question</CardTitle>
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
            <p className="font-medium">{question.question}</p>
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

      {/* FAQ Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            FAQ Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="faq-question">{t("question")}</Label>
            <Input
              id="faq-question"
              value={faqQuestion}
              onChange={(e) => setFaqQuestion(e.target.value)}
              placeholder="Enter the FAQ question"
            />
          </div>

          {/* Answer */}
          <div className="space-y-2">
            <Label htmlFor="faq-answer">{t("answer")}</Label>
            <WysiwygEditor
              value={faqAnswer}
              onChange={setFaqAnswer}
              placeholder={t("write_the_answer_here_ellipsis")}
              uploadDir="faq"
              minHeight={400}
              showWordCount
            />
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>{t("image_optional")}</Label>
            <ImageUpload
              value={answerImage}
              onChange={setAnswerImage}
              onRemove={() => setAnswerImage(null)}
            />
          </div>

          {/* Category and Page Path */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="category">{tCommon("category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder={t("select_category")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="page">{tCommon("page")}</Label>
              <Select value={pagePath} onValueChange={setPagePath}>
                <SelectTrigger id="page">
                  <SelectValue placeholder={t("select_page")} />
                </SelectTrigger>
                <SelectContent>
                  {pageLinks.map((page) => (
                    <SelectItem key={page.id} value={page.path}>
                      {page.name} ({page.path})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" asChild>
              <Link href="/admin/faq/question">{tCommon("cancel")}</Link>
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create FAQ
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
