"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HelpCircle,
  Sparkles,
  Target,
  Clock,
} from "lucide-react";
import { useFAQStore } from "@/store/faq";
import { FAQAccordion } from "./faq-accordion";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";

interface FAQWizardProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
}

export function FAQWizard({ isOpen, onClose, categories }: FAQWizardProps) {
  const t = useTranslations("ext");
  const { faqs } = useFAQStore();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [filteredFAQs, setFilteredFAQs] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setAnswers({});
      setFilteredFAQs([]);
    }
  }, [isOpen]);

  const steps = [
    {
      id: "category",
      title: "Select a Category",
      description: "What area are you having trouble with?",
      icon: Target,
      options: categories.map((category) => ({
        value: category,
        label: category.charAt(0).toUpperCase() + category.slice(1),
        description: `Issues related to ${category}`,
      })),
    },
    {
      id: "issue",
      title: "Describe Your Issue",
      description: "What specific issue are you experiencing?",
      icon: HelpCircle,
      options: [
        {
          value: "access",
          label: "I can't access a feature",
          description: "Login issues, permission errors, or blocked features",
        },
        {
          value: "error",
          label: "I'm seeing an error message",
          description: "Error codes, warnings, or unexpected messages",
        },
        {
          value: "performance",
          label: "Something is slow or not working correctly",
          description: "Slow loading, timeouts, or functionality issues",
        },
        {
          value: "missing",
          label: "Something is missing or not displaying",
          description: "Content not showing, features disappeared",
        },
        {
          value: "other",
          label: "Something else",
          description: "Other issues not covered above",
        },
      ],
    },
    {
      id: "frequency",
      title: "How Often Does This Occur?",
      description: "Is this a one-time issue or does it happen regularly?",
      icon: Clock,
      options: [
        {
          value: "always",
          label: "Every time I try",
          description: "Consistent issue that happens repeatedly",
        },
        {
          value: "sometimes",
          label: "Sometimes, but not always",
          description: "Intermittent issue that occurs occasionally",
        },
        {
          value: "once",
          label: "Just once",
          description: "One-time occurrence",
        },
        {
          value: "unsure",
          label: "I'm not sure",
          description: "Haven't had enough time to determine frequency",
        },
      ],
    },
  ];

  const currentStep = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  const handleSelect = (value: string) => {
    const newAnswers = { ...answers, [currentStep.id]: value };
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      const category = answers.category;
      const filtered = faqs.filter((faq) => {
        if (faq.category !== category) return false;

        const issueKeywords = getKeywordsForIssue(answers.issue);
        const faqText = (faq.question + " " + faq.answer).toLowerCase();

        return issueKeywords.some((keyword) => faqText.includes(keyword));
      });

      setFilteredFAQs(filtered);
      setStep(steps.length);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      onClose();
    }
  };

  const getKeywordsForIssue = (issueType: string): string[] => {
    switch (issueType) {
      case "access":
        return [
          "access",
          "permission",
          "denied",
          "can't open",
          "unable to access",
          "login",
          "authentication",
        ];
      case "error":
        return [
          "error",
          "exception",
          "failed",
          "problem",
          "issue",
          "warning",
          "crash",
          "bug",
        ];
      case "performance":
        return [
          "slow",
          "performance",
          "lag",
          "loading",
          "timeout",
          "freeze",
          "hang",
          "delay",
        ];
      case "missing":
        return [
          "missing",
          "not showing",
          "disappeared",
          "gone",
          "can't find",
          "not visible",
          "blank",
          "empty",
        ];
      default:
        return ["help", "support", "question", "how to"];
    }
  };

  const renderResults = () => {
    if (filteredFAQs.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <div
            className="relative inline-flex items-center justify-center w-20 h-20 rounded-full 
                          bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 mb-6"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 animate-pulse"></div>
            <HelpCircle className="h-10 w-10 text-orange-600 dark:text-orange-400 relative z-10" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
            {t("no_exact_matches_found")}
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto">
            {t("we_couldnt_find_faqs_that_exactly_match_your_issue")}.{" "}
            {t("you_might_want_question_directly")}.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={onClose}>
              {t("browse_all_faqs")}
            </Button>
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {t("ask_a_question")}
            </Button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-6 text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full 
                          bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 mb-4"
          >
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            {t("Found")}
            {filteredFAQs.length}
            {t("suggested_solution")}
            {filteredFAQs.length !== 1 ? "s" : ""}
          </h3>
          <p className="text-slate-600 dark:text-slate-300">
            {t("based_on_your_might_help")}
          </p>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          <FAQAccordion
            faqs={filteredFAQs}
            title=""
            description=""
            showCategories={false}
            variant="default"
            showFeedback={true}
            className="border-none shadow-none"
          />
        </div>
      </motion.div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-6">
          <div className="flex items-center mb-2">
            <div
              className="inline-flex items-center justify-center w-10 h-10 rounded-full 
                            bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 mr-3"
            >
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {t("guided_troubleshooter")}
              </DialogTitle>
              <DialogDescription>
                {t("lets_help_you_by_step")}
              </DialogDescription>
            </div>
          </div>
          {step < steps.length && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>
                  {t("Step")}
                  {step + 1}
                  {t("of")}
                  {steps.length}
                </span>
                <span>
                  {Math.round(progress)}
                  {t("%_complete")}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </DialogHeader>

        <div className="py-4 overflow-y-auto">
          {step < steps.length ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8 text-center">
                  <div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full 
                                  bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 mb-4"
                  >
                    <currentStep.icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                    {currentStep.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 text-lg">
                    {currentStep.description}
                  </p>
                </div>

                <RadioGroup
                  value={answers[currentStep.id] || ""}
                  onValueChange={handleSelect}
                  className="space-y-4"
                >
                  {currentStep.options.map((option, index) => (
                    <motion.div
                      key={option.value}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`relative flex items-start space-x-4 rounded-xl border-2 p-6 cursor-pointer transition-all duration-200 ${
                        answers[currentStep.id] === option.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                          : "border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                      }`}
                      onClick={() => handleSelect(option.value)}
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={option.value}
                          className="block font-medium text-slate-900 dark:text-white cursor-pointer text-base"
                        >
                          {option.label}
                        </Label>
                        {option.description && (
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {option.description}
                          </p>
                        )}
                      </div>
                      {answers[currentStep.id] === option.value && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex-shrink-0"
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </RadioGroup>
              </motion.div>
            </AnimatePresence>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {renderResults()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {step < steps.length && (
          <div className="flex justify-between pt-6 border-t border-slate-200 dark:border-zinc-700">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {step === 0 ? "Cancel" : "Back"}
            </Button>
            <Button
              onClick={handleNext}
              disabled={!answers[currentStep.id]}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center"
            >
              {step < steps.length - 1 ? (
                <>
                  {t("Next")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                "Find Solutions"
              )}
            </Button>
          </div>
        )}

        {step === steps.length && (
          <div className="flex justify-between pt-6 border-t border-slate-200 dark:border-zinc-700">
            <Button variant="outline" onClick={() => setStep(0)}>
              {t("start_over")}
            </Button>
            <Button onClick={onClose}>{t("Close")}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
