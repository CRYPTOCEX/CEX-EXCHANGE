"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PlusCircle,
  Save,
  Search,
  Image,
  FileText,
  Settings,
  Layers,
  Link2,
  Sparkles,
  Wand2,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { validationRules } from "@/utils/validation";
import { useToast } from "@/hooks/use-toast";
// Update the import for the TagInput component
import { TagInput } from "../components/features/faq-tag-input";
// Update the import for the rich text editor
import { ImageUpload } from "@/components/ui/image-upload";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import RichTextEditor from "@/components/ui/editor";
import { imageUploader } from "@/utils/upload";
import { useTranslations } from "next-intl";

interface FAQFormProps {
  faq: Partial<faqAttributes>;
  isEditing: boolean;
  availablePages: PageLink[];
  onCancel: () => void;
  onSubmit: () => void;
  onChange: (faq: Partial<faqAttributes>) => void;
  isLoadingPages?: boolean;
  isSubmitting?: boolean;
  faqs: faqAttributes[];
}

interface ValidationErrors {
  question?: string;
  answer?: string;
  category?: string;
  pagePath?: string;
}

export function FAQForm({
  faq,
  isEditing,
  availablePages,
  onCancel,
  onSubmit,
  onChange,
  isLoadingPages,
  isSubmitting = false,
  faqs,
}: FAQFormProps) {
  const t = useTranslations("ext");
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isValid, setIsValid] = useState(true);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("content");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // AI enhancement states
  const [isImprovingQuestion, setIsImprovingQuestion] = useState(false);
  const [isImprovingAnswer, setIsImprovingAnswer] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [isFindingRelated, setIsFindingRelated] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [relatedFaqSearchTerm, setRelatedFaqSearchTerm] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<{
    question?: string;
    answer?: string;
    tags?: string[];
    relatedFaqs?: string[];
  }>({});

  // Validate form whenever FAQ data changes, but only show errors for touched fields
  useEffect(() => {
    const newErrors: ValidationErrors = {};
    const faqLength = faq.question?.length || 0;
    const faqAnswerLength = faq.answer?.length || 0;

    // Question validation
    if (!faq.question && touched.question) {
      newErrors.question = "Question is required";
    } else if (faqLength < 5 && touched.question) {
      newErrors.question = "Question must be at least 5 characters";
    } else if (faqLength > 255 && touched.question) {
      newErrors.question = "Question must be less than 255 characters";
    }

    // Answer validation
    if (!faq.answer && touched.answer) {
      newErrors.answer = "Answer is required";
    } else if (faqAnswerLength < 10 && touched.answer) {
      newErrors.answer = "Answer must be at least 10 characters";
    }

    // Category validation
    if (!faq.category && touched.category) {
      newErrors.category = "Category is required";
    }

    // Page validation
    if (!faq.pagePath && touched.pagePath) {
      newErrors.pagePath = "A page path must be selected";
    }

    // Only update errors state if there are actual changes
    if (JSON.stringify(newErrors) !== JSON.stringify(errors)) {
      setErrors(newErrors);
    }

    // Check if form is valid (regardless of touched state)
    const isFormValid = !!(
      faqLength >= 5 &&
      faqLength <= 255 &&
      faqAnswerLength >= 10 &&
      faq.category &&
      faq.pagePath
    );

    // Only update isValid state if there's a change
    if (isFormValid !== isValid) {
      setIsValid(isFormValid);
    }
  }, [faq, touched, errors, isValid]);

  // Mark field as touched when user interacts with it
  const handleFieldTouch = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Get unique groups from available pages
  const groups = useMemo(() => {
    const uniqueGroups = Array.from(
      new Set(availablePages.map((page) => page.group))
    );
    return ["all", ...uniqueGroups].filter(Boolean);
  }, [availablePages]);

  // Filter pages based on search term and selected group
  const filteredPages = useMemo(() => {
    return availablePages.filter((page) => {
      const matchesSearch =
        searchTerm === "" ||
        page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.path.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesGroup =
        selectedGroup === "all" || page.group === selectedGroup;

      return matchesSearch && matchesGroup;
    });
  }, [availablePages, searchTerm, selectedGroup]);

  // Filter FAQs based on search term for related FAQs
  const filteredFaqs = useMemo(() => {
    return faqs.filter(
      (f) =>
        f.id !== faq.id &&
        (relatedFaqSearchTerm === "" ||
          f.question
            .toLowerCase()
            .includes(relatedFaqSearchTerm.toLowerCase()) ||
          f.answer.toLowerCase().includes(relatedFaqSearchTerm.toLowerCase()))
    );
  }, [faqs, faq.id, relatedFaqSearchTerm]);

  // Handle page selection
  const handlePageSelect = (pagePath: string) => {
    onChange({ ...faq, pagePath });
    handleFieldTouch("pagePath");
  };

  // Handle image change
  const handleImageChange = async (file: File | null) => {
    setImageFile(file);

    if (file) {
      setIsUploading(true);
      try {
        const uploadResult = await imageUploader({
          file,
          dir: "faq",
          size: { maxWidth: 1024, maxHeight: 728 },
        });
        if (!uploadResult.success) {
          toast({
            title: "Error",
            description: "Image upload failed.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
        // Update FAQ with the uploaded image URL (string)
        onChange({ ...faq, image: uploadResult.url });
      } catch (error) {
        console.error("Error uploading image:", error);
        toast({
          title: "Error",
          description: "Image upload encountered an error. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    } else {
      // Remove the image
      onChange({ ...faq, image: undefined });
    }
  };

  // AI enhancement functions
  // Update the improveQuestion function to use a mock implementation instead of making an API call
  const improveQuestion = async () => {
    if (!faq.question) {
      toast({
        title: "Error",
        description: "Please enter a question first",
        variant: "destructive",
      });
      return;
    }

    setIsImprovingQuestion(true);
    setAiError(null);

    try {
      // Mock implementation with better improvements
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate API delay

      // Extract the core topic from the question
      const question = faq.question.toLowerCase();
      let improvedQuestion = faq.question;

      // Make improvements based on the question type
      if (question.includes("payment")) {
        improvedQuestion =
          "What payment methods and currencies do you accept for purchases?";
      } else if (question.includes("shipping")) {
        improvedQuestion =
          "What are your shipping options, delivery times, and associated costs?";
      } else if (question.includes("return")) {
        improvedQuestion =
          "What is your return policy, and how can I initiate a return?";
      } else if (question.includes("account")) {
        improvedQuestion =
          "How do I manage my account settings and preferences?";
      } else {
        // General improvement for other questions
        improvedQuestion = faq.question
          .replace(
            /^(how|what|when|where|why|can|do)/i,
            (match) => match.charAt(0).toUpperCase() + match.slice(1)
          )
          .trim();
        if (!improvedQuestion.endsWith("?")) {
          improvedQuestion += "?";
        }
      }

      setAiSuggestions((prev) => ({ ...prev, question: improvedQuestion }));
    } catch (error) {
      console.error("Error improving question:", error);
      setAiError("Failed to improve question. Please try again.");
      toast({
        title: "Error",
        description: "Failed to improve question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImprovingQuestion(false);
    }
  };

  // Update the improveAnswer function to use a mock implementation
  const improveAnswer = async () => {
    if (!faq.question || !faq.answer) {
      toast({
        title: "Error",
        description: "Please enter both a question and answer first",
        variant: "destructive",
      });
      return;
    }

    setIsImprovingAnswer(true);
    setAiError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API delay

      // Extract the core topic from the question and current answer
      const question = faq.question.toLowerCase();
      const currentAnswer = faq.answer || "";
      let improvedAnswer = "";

      // Provide detailed, contextual improvements based on the topic
      if (question.includes("payment")) {
        improvedAnswer = `<p>We accept the following payment methods:</p>
<ul>
  <li><strong>Credit/Debit Cards:</strong> Visa, Mastercard, American Express, and Discover</li>
  <li><strong>Digital Wallets:</strong> PayPal, Apple Pay, and Google Pay</li>
  <li><strong>Bank Transfers:</strong> Available for orders over $500</li>
  <li><strong>Cryptocurrencies:</strong> Bitcoin and Ethereum</li>
</ul>
<p>All transactions are processed securely using industry-standard SSL encryption. For international purchases, we accept payments in USD, EUR, and GBP. Currency conversion fees may apply based on your payment method and location.</p>
<p><strong>Payment Processing Times:</strong></p>
<ul>
  <li>Credit/Debit Cards: Instant processing</li>
  <li>Digital Wallets: Instant to 24 hours</li>
  <li>Bank Transfers: 2-3 business days</li>
  <li>Cryptocurrencies: Requires 6 confirmations</li>
</ul>
<p>For business or bulk purchases, we also offer invoicing and purchase orders. Contact our business sales team for more information.</p>`;
      } else if (question.includes("shipping")) {
        improvedAnswer = `<p>We offer several shipping options to meet your needs:</p>
<ul>
  <li><strong>Standard Shipping:</strong> 5-7 business days (Free for orders over $50)</li>
  <li><strong>Express Shipping:</strong> 2-3 business days ($12.99)</li>
  <li><strong>Next Day Delivery:</strong> Next business day ($24.99)</li>
  <li><strong>International Shipping:</strong> 7-14 business days (Rates vary by location)</li>
</ul>
<p>All orders are processed within 24 hours and shipped from our warehouse. You'll receive a tracking number via email once your order is dispatched.</p>`;
      } else {
        // General improvement for other topics
        improvedAnswer = `<p>${currentAnswer}</p>
<p>Here are some additional details to help you:</p>
<ul>
  <li>Step-by-step instructions when applicable</li>
  <li>Common scenarios and solutions</li>
  <li>Related resources and documentation</li>
</ul>
<p>If you need further assistance, our support team is available 24/7 through:</p>
<ul>
  <li>Live Chat: Available on our website</li>
  <li>Email: support@example.com</li>
  <li>Phone: 1-800-123-4567</li>
</ul>`;
      }

      setAiSuggestions((prev) => ({ ...prev, answer: improvedAnswer }));
    } catch (error) {
      console.error("Error improving answer:", error);
      setAiError("Failed to improve answer. Please try again.");
      toast({
        title: "Error",
        description: "Failed to improve answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImprovingAnswer(false);
    }
  };

  // Update the suggestTags function to use a mock implementation
  const suggestTags = async () => {
    if (!faq.question || !faq.answer) {
      toast({
        title: "Error",
        description: "Please enter both a question and answer first",
        variant: "destructive",
      });
      return;
    }

    setIsSuggestingTags(true);
    setAiError(null);

    try {
      // Mock implementation instead of actual API call
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate API delay

      // Extract keywords from question and answer to generate tags
      const combinedText = `${faq.question} ${faq.answer}`.toLowerCase();
      const suggestedTags: string[] = [];

      // Common categories to check for
      const categories = [
        "account",
        "billing",
        "technical",
        "support",
        "features",
        "security",
        "privacy",
      ];
      categories.forEach((category) => {
        if (combinedText.includes(category)) {
          suggestedTags.push(category);
        }
      });

      // Add some generic tags
      if (combinedText.includes("how")) suggestedTags.push("how-to");
      if (combinedText.includes("password")) suggestedTags.push("password");
      if (combinedText.includes("login")) suggestedTags.push("login");
      if (combinedText.includes("payment")) suggestedTags.push("payment");

      // Ensure we have at least 3 tags
      if (suggestedTags.length < 3) {
        const defaultTags = ["faq", "help", "information"];
        for (
          let i = 0;
          i < defaultTags.length && suggestedTags.length < 3;
          i++
        ) {
          if (!suggestedTags.includes(defaultTags[i])) {
            suggestedTags.push(defaultTags[i]);
          }
        }
      }

      setAiSuggestions((prev) => ({ ...prev, tags: suggestedTags }));
    } catch (error) {
      console.error("Error suggesting tags:", error);
      setAiError("Failed to suggest tags. Please try again.");
      toast({
        title: "Error",
        description: "Failed to suggest tags. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const findRelatedFaqs = async () => {
    if (!faq.question || !faq.answer) {
      toast({
        title: "Error",
        description: "Please enter both a question and answer first",
        variant: "destructive",
      });
      return;
    }

    if (faqs.length === 0) {
      toast({
        title: "Error",
        description: "No other FAQs available to find related content",
        variant: "destructive",
      });
      return;
    }

    setIsFindingRelated(true);
    setAiError(null);

    try {
      // In a real implementation, you would call an API endpoint
      // Here we're simulating finding related FAQs
      setTimeout(() => {
        // Find FAQs with similar keywords
        const keywords = [
          ...(faq.question ? faq.question.toLowerCase().split("untitled") : []),
          ...(faq.answer ? faq.answer.toLowerCase().split("untitled") : []),
        ]
          .filter((word) => word.length > 4)
          .slice(0, 5);

        const relatedIds = faqs
          .filter((f) => f.id !== faq.id)
          .filter((f) => {
            const text = `${f.question} ${f.answer}`.toLowerCase();
            return keywords.some((keyword) => text.includes(keyword));
          })
          .slice(0, 3)
          .map((f) => f.id);

        setAiSuggestions((prev) => ({ ...prev, relatedFaqs: relatedIds }));
        setIsFindingRelated(false);
      }, 1500);
    } catch (error) {
      console.error("Error finding related FAQs:", error);
      setAiError("Failed to find related FAQs. Please try again.");
      toast({
        title: "Error",
        description: "Failed to find related FAQs. Please try again.",
        variant: "destructive",
      });
      setIsFindingRelated(false);
    }
  };

  // Apply AI suggestions
  const applyQuestionSuggestion = () => {
    if (aiSuggestions.question) {
      onChange({ ...faq, question: aiSuggestions.question });
      setAiSuggestions((prev) => ({ ...prev, question: undefined }));
      toast({
        title: "Success",
        description: "AI-improved question applied",
      });
    }
  };

  const applyAnswerSuggestion = () => {
    if (aiSuggestions.answer) {
      onChange({ ...faq, answer: aiSuggestions.answer });
      setAiSuggestions((prev) => ({ ...prev, answer: undefined }));
      toast({
        title: "Success",
        description: "AI-improved answer applied",
      });
    }
  };

  const applyTagSuggestions = () => {
    if (aiSuggestions.tags) {
      onChange({
        ...faq,
        tags: [...new Set([...(faq.tags || []), ...aiSuggestions.tags])],
      });
      setAiSuggestions((prev) => ({ ...prev, tags: undefined }));
      toast({
        title: "Success",
        description: "AI-suggested tags applied",
      });
    }
  };

  const applyRelatedFaqSuggestions = () => {
    if (aiSuggestions.relatedFaqs) {
      onChange({
        ...faq,
        relatedFaqIds: [
          ...new Set([
            ...(faq.relatedFaqIds || []),
            ...aiSuggestions.relatedFaqs,
          ]),
        ],
      });
      setAiSuggestions((prev) => ({ ...prev, relatedFaqs: undefined }));
      toast({
        title: "Success",
        description: "AI-suggested related FAQs applied",
      });
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    // Mark all fields as touched when submitting
    setTouched({
      question: true,
      answer: true,
      category: true,
      pagePath: true,
    });

    if (!isValid) {
      // Determine which tab has errors and switch to it
      if (errors.question || errors.answer) {
        setActiveTab("content");
      } else if (errors.category) {
        setActiveTab("settings");
      } else if (errors.pagePath) {
        setActiveTab("pages");
      }

      // Show error toast with all validation errors
      const errorMessages = Object.values(errors).filter(Boolean);
      if (errorMessages.length > 0) {
        toast({
          title: "Validation Error",
          description: errorMessages.join(". "),
          variant: "destructive",
        });
      }
      return;
    }
    onSubmit();
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 grid grid-cols-5 w-full">
          <TabsTrigger
            value="content"
            className="relative flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t("Content")}</span>
            {(errors.question || errors.answer) && touched.question && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="image"
            className="relative flex items-center gap-2"
          >
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">{t("Image")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="pages"
            className="relative flex items-center gap-2"
          >
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">{t("Pages")}</span>
            {errors.pagePath && touched.pagePath && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="related"
            className="relative flex items-center gap-2"
          >
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("Related")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="relative flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t("Settings")}</span>
            {errors.category && touched.category && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="question">{t("Question")}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={improveQuestion}
                  disabled={isImprovingQuestion || !faq.question}
                  className="h-8 px-2 text-xs"
                >
                  {isImprovingQuestion ? (
                    <>
                      <div className="animate-spin mr-1 h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                      {t("Improving")}.
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-1 h-3 w-3" />
                      {t("improve_with_ai")}
                    </>
                  )}
                </Button>
              </div>
              <Input
                id="question"
                value={faq.question || ""}
                onChange={(e) => onChange({ ...faq, question: e.target.value })}
                onBlur={() => handleFieldTouch("question")}
                placeholder="Enter the question here..."
                className={
                  touched.question && errors.question ? "border-red-500" : ""
                }
              />
              {touched.question && errors.question && (
                <p className="text-sm text-red-500">{errors.question}</p>
              )}
            </div>

            {aiSuggestions.question && (
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <h4 className="font-medium text-sm">
                        {t("ai_suggestion")}
                      </h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={applyQuestionSuggestion}
                      className="h-7 px-2 text-xs border-blue-300 bg-blue-100 hover:bg-blue-200 dark:border-blue-700 dark:bg-blue-800/30 dark:hover:bg-blue-800/50"
                    >
                      {t("Apply")}
                    </Button>
                  </div>
                  <p className="text-sm">{aiSuggestions.question}</p>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="answer">{t("Answer")}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={improveAnswer}
                  disabled={isImprovingAnswer || !faq.question || !faq.answer}
                  className="h-8 px-2 text-xs"
                >
                  {isImprovingAnswer ? (
                    <>
                      <div className="animate-spin mr-1 h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                      {t("Improving")}.
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-1 h-3 w-3" />
                      {t("improve_with_ai")}
                    </>
                  )}
                </Button>
              </div>
              <RichTextEditor
                value={faq.answer || ""}
                onChange={(value) => onChange({ ...faq, answer: value })}
                placeholder="Enter the answer here..."
                error={touched.answer && !!errors.answer}
              />
              {touched.answer && errors.answer && (
                <div className="flex items-center gap-2 text-red-500 text-sm mt-1 bg-red-50 dark:bg-red-900/10 p-2 rounded-md">
                  <span>{errors.answer}</span>
                </div>
              )}
            </div>

            {aiSuggestions.answer && (
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <h4 className="font-medium text-sm">
                        {t("ai_improved_answer")}
                      </h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={applyAnswerSuggestion}
                      className="h-7 px-2 text-xs border-blue-300 bg-blue-100 hover:bg-blue-200 dark:border-blue-700 dark:bg-blue-800/30 dark:hover:bg-blue-800/50"
                    >
                      {t("Apply")}
                    </Button>
                  </div>
                  <div className="text-sm prose dark:prose-invert max-w-none prose-sm">
                    <div
                      dangerouslySetInnerHTML={{ __html: aiSuggestions.answer }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {aiError && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{aiError}</AlertDescription>
              </Alert>
            )}
          </motion.div>
        </TabsContent>

        {/* Image Upload Tab */}
        <TabsContent value="image" className="space-y-4">
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-sm text-muted-foreground">
              {t("add_an_image_to_enhance_your_answer")}.{" "}
              {t("this_image_will_be_displayed_below_the_answer_text")}.
            </p>

            <ImageUpload
              title="Answer Image"
              value={imageFile || faq.image || null}
              onChange={handleImageChange}
              loading={isUploading}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <motion.div
            className="grid gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              {t("select_the_page_where_this_faq_should_appear")}
            </Label>

            <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md border border-amber-200 dark:border-amber-800">
              {t("each_faq_must_be_assigned_to_a_specific_page_path")}.{" "}
              {t("this_determines_where_your_site")}.
            </p>

            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group === "all" ? "All Groups" : group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoadingPages ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("loading_available_pages")}.
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("no_pages_match_your_search_criteria")}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredPages.map((page) => (
                  <motion.div
                    key={page.id}
                    className={`
                      flex items-center p-3 rounded-md border cursor-pointer transition-colors
                      ${
                        faq.pagePath === page.path
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
                      }
                    `}
                    onClick={() => handlePageSelect(page.path)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="mr-3">
                      {faq.pagePath === page.path ? (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-white"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{page.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {page.path}
                      </p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {page.group}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="related" className="space-y-4">
          <motion.div
            className="grid gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <Label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                {t("select_related_faqs_this_one")}
              </Label>

              <Button
                variant="outline"
                size="sm"
                onClick={findRelatedFaqs}
                disabled={
                  isFindingRelated ||
                  !faq.question ||
                  !faq.answer ||
                  faqs.length === 0
                }
                className="h-8 px-2 text-xs"
              >
                {isFindingRelated ? (
                  <>
                    <div className="animate-spin mr-1 h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                    {t("Finding")}.
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1 h-3 w-3" />
                    {t("find_related")}
                  </>
                )}
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search FAQs..."
                className="pl-8"
                value={relatedFaqSearchTerm}
                onChange={(e) => setRelatedFaqSearchTerm(e.target.value)}
              />
            </div>

            {aiSuggestions.relatedFaqs && (
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 mb-4">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <h4 className="font-medium text-sm">
                        {t("ai_suggested_related_faqs")}
                      </h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={applyRelatedFaqSuggestions}
                      className="h-7 px-2 text-xs border-blue-300 bg-blue-100 hover:bg-blue-200 dark:border-blue-700 dark:bg-blue-800/30 dark:hover:bg-blue-800/50"
                    >
                      {t("apply_all")}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {aiSuggestions.relatedFaqs.map((relatedId) => {
                      const relatedFaq = faqs.find((f) => f.id === relatedId);
                      if (!relatedFaq) return null;

                      return (
                        <div
                          key={relatedId}
                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-md border border-blue-100 dark:border-blue-800"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {relatedFaq.question}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              const relatedFaqIds = [
                                ...(faq.relatedFaqIds || []),
                              ];
                              if (!relatedFaqIds.includes(relatedId)) {
                                onChange({
                                  ...faq,
                                  relatedFaqIds: [...relatedFaqIds, relatedId],
                                });
                              }
                            }}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {faqs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("no_other_faqs_available")}
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredFaqs.slice(0, 5).map((relatedFaq) => (
                  <motion.div
                    key={relatedFaq.id}
                    className={`
                        flex items-center p-3 rounded-md border cursor-pointer transition-colors
                        ${
                          faq.relatedFaqIds?.includes(relatedFaq.id)
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
                        }
                      `}
                    onClick={() => {
                      const relatedFaqIds = [...(faq.relatedFaqIds || [])];
                      const index = relatedFaqIds.indexOf(relatedFaq.id);

                      if (index === -1) {
                        relatedFaqIds.push(relatedFaq.id);
                      } else {
                        relatedFaqIds.splice(index, 1);
                      }

                      onChange({ ...faq, relatedFaqIds });
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="mr-3">
                      {faq.relatedFaqIds?.includes(relatedFaq.id) ? (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-white"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {relatedFaq.question}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {relatedFaq.answer}
                      </p>
                      {relatedFaq.category && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {relatedFaq.category}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <motion.div
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Input
              title="Category"
              value={faq.category || ""}
              onChange={(e) => onChange({ ...faq, category: e.target.value })}
              placeholder="e.g., general, account, security"
              error={touched.category && !!errors.category}
              description="Group related FAQs together with categories"
              validateOnChange={false}
              onBlur={() => handleFieldTouch("category")}
            />

            <Input
              title="Display Order"
              type="number"
              value={faq.order?.toString() || "0"}
              onChange={(e) =>
                onChange({
                  ...faq,
                  order: Number.parseInt(e.target.value) || 0,
                })
              }
              description="Lower numbers appear first"
              validationRules={[
                validationRules.numeric("Order must be a number"),
                validationRules.min(0, "Order must be a positive number"),
              ]}
              validateOnChange={true}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <Label htmlFor="tags">{t("Tags")}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={suggestTags}
                disabled={isSuggestingTags || !faq.question || !faq.answer}
                className="h-8 px-2 text-xs"
              >
                {isSuggestingTags ? (
                  <>
                    <div className="animate-spin mr-1 h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                    {t("Suggesting")}.
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1 h-3 w-3" />
                    {t("suggest_tags")}
                  </>
                )}
              </Button>
            </div>

            <TagInput
              tags={faq.tags || []}
              onChange={(newTags: string[]) =>
                onChange({ ...faq, tags: newTags })
              }
              placeholder="Add tags and press Enter..."
              description="Add tags to improve searchability (e.g., password, billing, account)"
              maxTags={10}
            />

            {aiSuggestions.tags && Array.isArray(aiSuggestions.tags) && (
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 mt-2">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <h4 className="font-medium text-sm">
                        {t("ai_suggested_tags")}
                      </h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={applyTagSuggestions}
                      className="h-7 px-2 text-xs border-blue-300 bg-blue-100 hover:bg-blue-200 dark:border-blue-700 dark:bg-blue-800/30 dark:hover:bg-blue-800/50"
                    >
                      {t("apply_all")}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {aiSuggestions.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary/20"
                        onClick={() => {
                          if (!faq.tags?.includes(tag)) {
                            onChange({
                              ...faq,
                              tags: [...(faq.tags || []), tag],
                            });
                          }
                        }}
                      >
                        {tag}
                        <PlusCircle className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>

          <motion.div
            className="flex items-center space-x-2 pt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Switch
              id={isEditing ? "edit-active" : "active"}
              checked={faq.status !== false}
              onCheckedChange={(checked) =>
                onChange({ ...faq, status: checked })
              }
            />
            <div>
              <Label
                htmlFor={isEditing ? "edit-active" : "active"}
                className="font-medium"
              >
                {t("active_status")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("inactive_faqs_wont_be_displayed_on_any_page")}
              </p>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onCancel}>
          {t("Cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
          {isSubmitting ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              {isEditing ? "Saving..." : "Creating..."}
            </>
          ) : isEditing ? (
            <>
              <Save className="mr-2 h-4 w-4" />
              {t("save_changes")}
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("create_faq")}
            </>
          )}
        </Button>
      </div>
    </>
  );
}
