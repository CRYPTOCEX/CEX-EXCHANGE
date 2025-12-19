"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HelpCircle,
  Sparkles,
  Target,
  Clock,
  MessageCircle,
  RotateCcw,
  ChevronRight,
  Lightbulb,
  Search,
  CheckCircle2,
  XCircle,
  Compass,
  Zap,
} from "lucide-react";
import { useFAQStore } from "@/store/faq";
import { Link } from "@/i18n/routing";
import { motion, AnimatePresence } from "framer-motion";
import { sanitizeHTML } from "@/lib/sanitize";
import Image from "next/image";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";

export default function TroubleshooterContent() {
  const { faqs, loading, fetchFAQs } = useFAQStore();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [filteredFAQs, setFilteredFAQs] = useState<any[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs]);

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(faqs.map((faq) => faq.category).filter(Boolean))];
    return uniqueCategories;
  }, [faqs]);

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
  const isResultsStep = step === steps.length;

  const handleSelect = (value: string) => {
    const newAnswers = { ...answers, [currentStep.id]: value };
    setAnswers(newAnswers);
  };

  const getKeywordsForIssue = (issueType: string): string[] => {
    switch (issueType) {
      case "access":
        return ["access", "permission", "denied", "can't open", "unable to access", "login", "authentication"];
      case "error":
        return ["error", "exception", "failed", "problem", "issue", "warning", "crash", "bug"];
      case "performance":
        return ["slow", "performance", "lag", "loading", "timeout", "freeze", "hang", "delay"];
      case "missing":
        return ["missing", "not showing", "disappeared", "gone", "can't find", "not visible", "blank", "empty"];
      default:
        return ["help", "support", "question", "how to"];
    }
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

      // If no exact matches, show all FAQs from the category
      if (filtered.length === 0) {
        const categoryFaqs = faqs.filter((faq) => faq.category === category);
        setFilteredFAQs(categoryFaqs.slice(0, 5));
      } else {
        setFilteredFAQs(filtered);
      }

      setStep(steps.length);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleStartOver = () => {
    setStep(0);
    setAnswers({});
    setFilteredFAQs([]);
    setExpandedFaq(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "Guided Support",
          gradient: "from-sky-500/10 to-blue-500/10",
          iconColor: "text-sky-500",
          textColor: "text-sky-600 dark:text-sky-400",
        }}
        title={[
          { text: "Find the " },
          { text: "Perfect Solution", gradient: "from-sky-600 to-blue-600" },
          { text: " for Your Issue" },
        ]}
        description="Answer a few quick questions and we'll guide you to the right solution."
        paddingTop="pt-24"
        paddingBottom="pb-16"
        layout="split"
        showBorder={false}
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
            <Link href="/faq">
              <Button
                size="lg"
                className="w-full sm:w-48 bg-linear-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white"
              >
                <Compass className="mr-2 h-5 w-5" />
                Browse All FAQs
              </Button>
            </Link>
            <Link href="/faq#ask-question-section">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-48 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
              >
                <Zap className="mr-2 h-5 w-5" />
                Ask a Question
              </Button>
            </Link>
          </div>
        }
      >
        <StatsGroup
          stats={[
            {
              icon: Target,
              label: "Guided diagnosis",
              value: "",
              iconColor: "text-sky-500",
              iconBgColor: "bg-sky-500/10",
            },
            {
              icon: Lightbulb,
              label: "Smart suggestions",
              value: "",
              iconColor: "text-blue-500",
              iconBgColor: "bg-blue-500/10",
            },
            {
              icon: Clock,
              label: "Quick resolution",
              value: "",
              iconColor: "text-sky-500",
              iconBgColor: "bg-sky-500/10",
            },
          ]}
        />
      </HeroSection>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Tracker */}
          {!isResultsStep && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card className="border-0 shadow-xl bg-white dark:bg-zinc-900 overflow-hidden">
                <CardContent className="p-6">
                  {/* Step Progress Bar with Numbers */}
                  <div className="flex items-center justify-between mb-2">
                    {steps.map((s, index) => {
                      const isCompleted = index < step;
                      const isCurrent = index === step;
                      return (
                        <div key={s.id} className="flex items-center flex-1 last:flex-none">
                          {/* Step Circle */}
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                isCompleted
                                  ? "bg-emerald-500 text-white"
                                  : isCurrent
                                  ? "bg-sky-600 text-white ring-4 ring-sky-200 dark:ring-sky-800"
                                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="h-5 w-5" />
                              ) : (
                                index + 1
                              )}
                            </div>
                            <span
                              className={`text-xs mt-2 font-medium text-center max-w-20 ${
                                isCurrent
                                  ? "text-sky-600 dark:text-sky-400"
                                  : isCompleted
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-zinc-400 dark:text-zinc-500"
                              }`}
                            >
                              {s.title}
                            </span>
                          </div>
                          {/* Connector Line */}
                          {index < steps.length - 1 && (
                            <div className="flex-1 h-1 mx-3 rounded-full bg-zinc-200 dark:bg-zinc-700 relative overflow-hidden">
                              <motion.div
                                className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: isCompleted ? "100%" : "0%" }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {!isResultsStep ? (
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-0 shadow-2xl bg-white dark:bg-zinc-900 overflow-hidden">
                  <CardContent className="p-8 md:p-12">
                    {/* Step Header */}
                    <div className="text-center mb-10">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-linear-to-br from-sky-600 to-blue-600 mb-6 shadow-lg shadow-sky-500/20"
                      >
                        <currentStep.icon className="h-10 w-10 text-white" />
                      </motion.div>
                      <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">
                        {currentStep.title}
                      </h2>
                      <p className="text-lg text-zinc-600 dark:text-zinc-400">
                        {currentStep.description}
                      </p>
                    </div>

                    {/* Options */}
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
                          transition={{ delay: 0.1 + index * 0.05 }}
                        >
                          <div
                            className={`relative flex items-start space-x-4 rounded-2xl border-2 p-6 cursor-pointer transition-all duration-300 ${
                              answers[currentStep.id] === option.value
                                ? "border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/20"
                                : "border-zinc-200 dark:border-zinc-700 hover:border-sky-500 dark:hover:border-sky-700 hover:bg-sky-500/10 dark:hover:bg-sky-500/10"
                            }`}
                            onClick={() => handleSelect(option.value)}
                          >
                            <RadioGroupItem
                              value={option.value}
                              id={option.value}
                              className="mt-1 border-2"
                            />
                            <div className="flex-1 min-w-0">
                              <Label
                                htmlFor={option.value}
                                className="block font-semibold text-zinc-900 dark:text-white cursor-pointer text-lg"
                              >
                                {option.label}
                              </Label>
                              {option.description && (
                                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                                  {option.description}
                                </p>
                              )}
                            </div>
                            <AnimatePresence>
                              {answers[currentStep.id] === option.value && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  className="flex-shrink-0"
                                >
                                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-sky-600 to-blue-600 flex items-center justify-center shadow-lg">
                                    <Check className="h-5 w-5 text-white" />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      ))}
                    </RadioGroup>

                    {/* Navigation */}
                    <div className="flex justify-between mt-10 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                      <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={step === 0}
                        className="px-6 py-3 h-auto"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        onClick={handleNext}
                        disabled={!answers[currentStep.id]}
                        className="bg-linear-to-r from-sky-600 to-blue-600 hover:opacity-90 text-white px-8 py-3 h-auto"
                      >
                        {step < steps.length - 1 ? (
                          <>
                            Next Step
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            Find Solutions
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* Results Step */
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.4 }}
              >
                {/* Results Header */}
                <Card className="border-0 shadow-xl bg-white dark:bg-zinc-900 overflow-hidden mb-8">
                  <CardContent className="p-8 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 ${
                        filteredFAQs.length > 0
                          ? "bg-linear-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30"
                          : "bg-linear-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30"
                      }`}
                    >
                      {filteredFAQs.length > 0 ? (
                        <CheckCircle2 className="h-10 w-10 text-white" />
                      ) : (
                        <Lightbulb className="h-10 w-10 text-white" />
                      )}
                    </motion.div>
                    <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">
                      {filteredFAQs.length > 0
                        ? `Found ${filteredFAQs.length} Suggested Solution${filteredFAQs.length !== 1 ? "s" : ""}`
                        : "No Exact Matches Found"}
                    </h2>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
                      {filteredFAQs.length > 0
                        ? "Based on your answers, these articles might help resolve your issue"
                        : "We couldn't find FAQs that exactly match your issue, but here are some related articles that might help"}
                    </p>
                    {/* Summary Badges */}
                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                      <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 px-3 py-1">
                        <Target className="h-3 w-3 mr-1" />
                        {answers.category}
                      </Badge>
                      <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1">
                        <HelpCircle className="h-3 w-3 mr-1" />
                        {steps[1].options.find((o) => o.value === answers.issue)?.label || answers.issue}
                      </Badge>
                      <Badge className="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400 px-3 py-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {steps[2].options.find((o) => o.value === answers.frequency)?.label || answers.frequency}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Results List */}
                {filteredFAQs.length > 0 ? (
                  <div className="space-y-4">
                    {filteredFAQs.map((faq, index) => (
                      <motion.div
                        key={faq.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                      >
                        <Card
                          className={`shadow-lg bg-white dark:bg-zinc-900 overflow-hidden transition-all duration-300 border border-sky-200 dark:border-sky-800 ${
                            expandedFaq === faq.id ? "ring-2 ring-sky-500/50" : ""
                          }`}
                        >
                          <CardContent className="p-0">
                            <button
                              onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                              className="w-full text-left p-6 hover:bg-sky-500/10 dark:hover:bg-sky-500/10 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs">
                                      {faq.category}
                                    </Badge>
                                    <span className="text-xs text-zinc-400">#{index + 1}</span>
                                  </div>
                                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                    {faq.question}
                                  </h3>
                                </div>
                                <motion.div
                                  animate={{ rotate: expandedFaq === faq.id ? 90 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronRight className="h-5 w-5 text-zinc-400" />
                                </motion.div>
                              </div>
                            </button>
                            <AnimatePresence>
                              {expandedFaq === faq.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-6 pb-6 border-t border-zinc-100 dark:border-zinc-800">
                                    <div className="pt-6 prose dark:prose-invert max-w-none prose-sky">
                                      <div
                                        dangerouslySetInnerHTML={{ __html: sanitizeHTML(faq.answer) }}
                                        className="text-zinc-700 dark:text-zinc-300 leading-relaxed"
                                      />
                                    </div>
                                    {faq.image && (
                                      <div className="mt-6 rounded-xl overflow-hidden border border-sky-200 dark:border-sky-800">
                                        <Image
                                          src={faq.image}
                                          alt="Answer illustration"
                                          width={600}
                                          height={400}
                                          className="w-full h-auto object-cover"
                                          unoptimized
                                        />
                                      </div>
                                    )}
                                    <div className="mt-6 flex gap-3">
                                      <Link href={`/faq/${faq.id}`}>
                                        <Button
                                          variant="outline"
                                          className="text-sky-600 border-sky-200 hover:bg-sky-50 dark:text-sky-400 dark:border-sky-800 dark:hover:bg-sky-950/30"
                                        >
                                          View Full Article
                                          <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                      </Link>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <Card className="border-0 shadow-lg bg-white dark:bg-zinc-900">
                    <CardContent className="p-12 text-center">
                      <XCircle className="h-16 w-16 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                      <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                        Try broadening your search or asking a question directly to our support team.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
                  <Button
                    variant="outline"
                    onClick={handleStartOver}
                    className="px-6 py-3 h-auto"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Start Over
                  </Button>
                  <Link href="/faq">
                    <Button
                      variant="outline"
                      className="px-6 py-3 h-auto w-full sm:w-auto"
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Browse All FAQs
                    </Button>
                  </Link>
                  <Link href="/faq#ask-question-section">
                    <Button
                      className="bg-linear-to-r from-sky-600 to-blue-600 hover:opacity-90 text-white px-6 py-3 h-auto w-full sm:w-auto"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Ask a Question
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
