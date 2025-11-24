"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import RichTextEditor from "@/components/ui/editor";
import { useFAQAdminStore } from "@/store/faq/admin";
import { imageUploader } from "@/utils/upload";
import { useTranslations } from "next-intl";

interface ConvertToFaqDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: faqQuestionAttributes;
  onConvert: (faqId: string) => void;
}

export function ConvertToFaqDialog({
  open,
  onOpenChange,
  question,
  onConvert,
}: ConvertToFaqDialogProps) {
  const t = useTranslations("ext");
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [faqQuestion, setFaqQuestion] = useState(question.question);
  const [faqAnswer, setFaqAnswer] = useState(question.answer || "");
  const [category, setCategory] = useState("");
  const [pagePath, setPagePath] = useState("/faq");
  // answerImage can be a string (URL), a File, or null
  const [answerImage, setAnswerImage] = useState<string | File | null>(null);

  // Retrieve store data and actions
  const { categories, pageLinks, fetchCategories, fetchPageLinks, createFAQ } =
    useFAQAdminStore();

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchPageLinks();
    }
  }, [open, fetchCategories, fetchPageLinks]);

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
          // If answerImage is a File, upload it using the helper
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

      toast({
        title: "FAQ Created",
        description: "The question has been successfully converted to an FAQ.",
      });

      onConvert(newFaq.id);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("convert_to_faq")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="question">{t("Question")}</Label>
            <Input
              id="question"
              value={faqQuestion}
              onChange={(e) => setFaqQuestion(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="answer">{t("Answer")}</Label>
            <RichTextEditor
              value={faqAnswer}
              onChange={setFaqAnswer}
              placeholder="Write the answer here..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="image">{t("image_(optional)")}</Label>
            <ImageUpload
              value={answerImage}
              onChange={setAnswerImage}
              onRemove={() => setAnswerImage(null)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">{t("Category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
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

            <div className="grid gap-2">
              <Label htmlFor="page">{t("Page")}</Label>
              <Select value={pagePath} onValueChange={setPagePath}>
                <SelectTrigger id="page">
                  <SelectValue placeholder="Select page" />
                </SelectTrigger>
                <SelectContent>
                  {pageLinks.map((page) => (
                    <SelectItem key={page.id} value={page.path}>
                      {page.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create FAQ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
