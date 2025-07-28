"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Check,
  AlertCircle,
  RefreshCw,
  Brain,
  Zap,
  FileText,
  Layers,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

// Import admin store and AI store
import { useFAQAdminStore } from "@/store/faq/admin";
import { useAIStore } from "@/store/faq/ai-store";
import { useTranslations } from "next-intl";

export function FAQAIAssistant() {
  const t = useTranslations("ext");
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"single" | "page" | "all">(
    "single"
  );
  const [selectedFaqId, setSelectedFaqId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [results, setResults] = useState<{
    improved: string[];
    failed: string[];
    skipped: string[];
  }>({
    improved: [],
    failed: [],
    skipped: [],
  });

  // Retrieve FAQs and page links from the admin store.
  const { faqs, pageLinks, fetchFAQs, fetchPageLinks, updateFAQ } =
    useFAQAdminStore();

  // Fetch FAQs and page links on mount if not already loaded.
  useEffect(() => {
    if (!faqs.length) {
      fetchFAQs();
    }
    if (!pageLinks.length) {
      fetchPageLinks();
    }
  }, [faqs, pageLinks, fetchFAQs, fetchPageLinks]);

  // Get pages from the structured pageLinks (each is an object with id, path, name, group)
  const pages = pageLinks.sort((a, b) => a.name.localeCompare(b.name));

  // Filter FAQs for a selected page.
  const faqsForSelectedPage = selectedPage
    ? faqs.filter((faq) => faq.pagePath === selectedPage)
    : [];

  // Get the AI store function for improvement.
  const { improveFAQ } = useAIStore();

  // Process a batch of FAQs using the real AI improvement endpoint.
  const processBatch = async (faqsToProcess: faqAttributes[]) => {
    if (faqsToProcess.length === 0) {
      toast({
        title: "No FAQs to process",
        description: "Please select at least one FAQ to improve.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);
    setTotalToProcess(faqsToProcess.length);
    setResults({ improved: [], failed: [], skipped: [] });

    const improved: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];

    for (let i = 0; i < faqsToProcess.length; i++) {
      const faq = faqsToProcess[i];
      try {
        // Call the AI endpoint via the store.
        const result = await improveFAQ(faq.question, faq.answer);
        if (result) {
          // Update the FAQ in the admin store.
          const updateResult = await updateFAQ(faq.id, {
            answer: result,
            tags: faq.tags, // Optionally update tags if your API returns new tags.
          });
          if (updateResult) {
            improved.push(faq.id);
          } else {
            failed.push(faq.id);
          }
        } else {
          skipped.push(faq.id);
        }
      } catch (error) {
        console.error(`Error processing FAQ ${faq.id}:`, error);
        failed.push(faq.id);
      }
      setProcessedCount(i + 1);
      setProgress(Math.round(((i + 1) / faqsToProcess.length) * 100));
    }
    setResults({ improved, failed, skipped });
    setIsProcessing(false);
    toast({
      title: "AI Improvement Complete",
      description: `Improved: ${improved.length}, Failed: ${failed.length}, Skipped: ${skipped.length}`,
      variant: improved.length > 0 ? "default" : "destructive",
    });
  };

  // Handle processing based on active tab.
  const handleStartProcessing = async () => {
    if (activeTab === "single") {
      if (!selectedFaqId) {
        toast({
          title: "No FAQ selected",
          description: "Please select an FAQ to improve.",
          variant: "destructive",
        });
        return;
      }
      const selectedFaq = faqs.find((faq) => faq.id === selectedFaqId);
      if (selectedFaq) {
        processBatch([selectedFaq]);
      }
    } else if (activeTab === "page") {
      if (!selectedPage) {
        toast({
          title: "No page selected",
          description: "Please select a page to improve its FAQs.",
          variant: "destructive",
        });
        return;
      }
      const pageFaqs = faqs.filter((faq) => faq.pagePath === selectedPage);
      processBatch(pageFaqs);
    } else {
      processBatch(faqs);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950 dark:via-gray-900 dark:to-purple-950">
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
        <div className="relative">
          <CardHeader className="pb-8">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 p-3">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {t("batch_ai_enhancement")}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("enhance_multiple_faqs_ai-powered_improvements")}.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "single" | "page" | "all")
              }
            >
              <TabsList className="grid w-full grid-cols-3 bg-muted/30">
                <TabsTrigger
                  value="single"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {t("single_faq")}
                </TabsTrigger>
                <TabsTrigger
                  value="page"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Layers className="h-4 w-4 mr-2" />
                  {t("page_faqs")}
                </TabsTrigger>
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {t("all_faqs")}
                </TabsTrigger>
              </TabsList>

              <div className="mt-6 space-y-6">
                <TabsContent value="single">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t("select_an_faq_to_improve")}
                      </label>
                      <select
                        className="w-full p-3 rounded-lg border bg-white/50 backdrop-blur-sm transition-colors hover:bg-white/80 focus:bg-white"
                        value={selectedFaqId || ""}
                        onChange={(e) => setSelectedFaqId(e.target.value)}
                        disabled={isProcessing}
                      >
                        <option value="">{t("select_an_faq")}.</option>
                        {faqs.map((faq) => (
                          <option key={faq.id} value={faq.id}>
                            {faq.question}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="page">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t("select_a_page")}
                      </label>
                      <select
                        className="w-full p-3 rounded-lg border bg-white/50 backdrop-blur-sm transition-colors hover:bg-white/80 focus:bg-white"
                        value={selectedPage || ""}
                        onChange={(e) => setSelectedPage(e.target.value)}
                        disabled={isProcessing}
                      >
                        <option value="">{t("select_a_page")}.</option>
                        {pages.map((page) => (
                          <option key={page.id} value={page.path}>
                            {page.name}
                          </option>
                        ))}
                      </select>

                      {selectedPage && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4"
                        >
                          <p className="text-sm font-medium mb-2">
                            {t("faqs_on_this_page")}
                            {faqsForSelectedPage.length}
                          </p>
                          <div className="max-h-40 overflow-y-auto rounded-lg border bg-white/50 backdrop-blur-sm p-3">
                            {faqsForSelectedPage.length > 0 ? (
                              faqsForSelectedPage.map((faq) => (
                                <div
                                  key={faq.id}
                                  className="py-2 px-3 rounded-md hover:bg-white/50 transition-colors"
                                >
                                  {faq.question}
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                {t("no_faqs_found_for_this_page")}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="all">
                  <Alert className="bg-white/50 backdrop-blur-sm border-indigo-100">
                    <Zap className="h-4 w-4 text-indigo-500" />
                    <AlertTitle>
                      {t("improve_all")}
                      {faqs.length}
                      {t("FAQs")}
                    </AlertTitle>
                    <AlertDescription>
                      {t("this_will_process_all_faqs_in_the_system")}.{" "}
                      {t("the_operation_may_take_a_while")}.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </div>

              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-8 space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {t("processing_faqs")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {processedCount}
                            {t("of")}
                            {totalToProcess}
                            {t("complete")}
                          </p>
                        </div>
                        <div className="text-2xl font-bold tabular-nums">
                          {progress}%
                        </div>
                      </div>
                      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500"
                          initial={{ width: "0%" }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {!isProcessing &&
                  results.improved.length +
                    results.failed.length +
                    results.skipped.length >
                    0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-8 space-y-4"
                    >
                      <h3 className="text-lg font-medium">{t("Results")}</h3>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg border bg-white/50 backdrop-blur-sm p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="rounded-full bg-green-100 p-1">
                              <Check className="h-4 w-4 text-green-600" />
                            </div>
                            <p className="font-medium">{t("Improved")}</p>
                          </div>
                          <p className="text-2xl font-bold">
                            {results.improved.length}
                          </p>
                        </div>

                        <div className="rounded-lg border bg-white/50 backdrop-blur-sm p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="rounded-full bg-red-100 p-1">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            </div>
                            <p className="font-medium">{t("Failed")}</p>
                          </div>
                          <p className="text-2xl font-bold">
                            {results.failed.length}
                          </p>
                        </div>

                        <div className="rounded-lg border bg-white/50 backdrop-blur-sm p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="rounded-full bg-yellow-100 p-1">
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                            </div>
                            <p className="font-medium">{t("Skipped")}</p>
                          </div>
                          <p className="text-2xl font-bold">
                            {results.skipped.length}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
              </AnimatePresence>

              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-8"
                >
                  <Button
                    onClick={handleStartProcessing}
                    disabled={
                      isProcessing ||
                      (activeTab === "single" && !selectedFaqId) ||
                      (activeTab === "page" && !selectedPage)
                    }
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        {t("Processing")}.
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        {activeTab === "single"
                          ? "Improve Selected FAQ"
                          : activeTab === "page"
                            ? "Improve FAQs on Selected Page"
                            : "Improve All FAQs"}
                      </>
                    )}
                  </Button>
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
