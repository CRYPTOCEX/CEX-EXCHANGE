"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useFAQStore } from "@/store/faq";
import { FAQAccordion } from "./components/faq-accordion";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Search,
  HelpCircle,
  Sparkles,
  X,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Filter,
  MessageCircle,
  Clock,
  TrendingUp,
  Lightbulb,
  Shield,
  Zap,
  BookOpen,
  Users,
  CheckCircle2,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AskQuestionForm } from "./components/ask-question-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  InteractivePattern,
  FloatingShapes,
} from "@/components/sections/shared";

export default function FAQClient() {
  const t = useTranslations("ext_faq");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const {
    faqs,
    categories,
    loading,
    pagination,
    fetchFAQs,
    fetchCategories,
    searchFAQs,
  } = useFAQStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<faqAttributes[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [savedFAQs, setSavedFAQs] = useLocalStorage<string[]>("saved-faqs", []);
  const [recentlyViewed, setRecentlyViewed] = useLocalStorage<string[]>(
    "recently-viewed-faqs",
    []
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(20);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  useEffect(() => {
    Promise.all([
      fetchFAQs(
        currentPage,
        perPage,
        selectedCategory !== "all" ? selectedCategory : undefined
      ),
      fetchCategories(),
    ]);
  }, [fetchFAQs, fetchCategories, currentPage, perPage, selectedCategory]);

  useEffect(() => {
    if (searchTerm.length > 1) {
      const matchingQuestions = faqs
        .filter((faq) =>
          faq.question.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map((faq) => faq.question)
        .slice(0, 5);
      setSuggestions(matchingQuestions);
      if (matchingQuestions.length > 0 && !showSuggestions) {
        setShowSuggestions(true);
      } else if (matchingQuestions.length === 0 && showSuggestions) {
        setShowSuggestions(false);
      }
    } else if (showSuggestions) {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, faqs, showSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        document.activeElement === searchInputRef.current
      ) {
        e.preventDefault();
        handleClearSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    setShowSuggestions(false);
    try {
      const results = await searchFAQs(
        searchTerm,
        selectedCategory !== "all" ? selectedCategory : undefined
      );
      setSearchResults(results);
      if (results.length === 0) {
        toast({
          title: "No results found",
          description: `No FAQs matching "${searchTerm}" were found.`,
          variant: "destructive",
        });
      } else {
        setTimeout(() => {
          document
            .getElementById("search-results-section")
            ?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (error) {
      console.error("Error searching FAQs:", error);
      toast({
        title: "Search error",
        description: "An error occurred while searching.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > -1 ? prev - 1 : -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedSuggestionIndex]);
        } else {
          handleSearch();
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    } else if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSelectedCategory("all");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  const toggleSavedFAQ = useCallback(
    (faqId: string) => {
      setSavedFAQs((prev) => {
        if (prev.includes(faqId)) {
          toast({
            title: "FAQ Removed",
            description: "FAQ removed from your saved items.",
          });
          return prev.filter((id) => id !== faqId);
        } else {
          toast({
            title: "FAQ Saved",
            description: "FAQ saved for later reference.",
          });
          return [...prev, faqId];
        }
      });
    },
    [setSavedFAQs, toast]
  );

  const addToRecentlyViewed = useCallback(
    (faqId: string) => {
      setRecentlyViewed((prev) => {
        const filtered = prev.filter((id) => id !== faqId);
        return [faqId, ...filtered].slice(0, 5);
      });
    },
    [setRecentlyViewed]
  );

  const getSavedFAQs = useCallback(() => {
    return faqs.filter((faq) => savedFAQs.includes(faq.id));
  }, [faqs, savedFAQs]);

  const getRecentlyViewedFAQs = useCallback(() => {
    return recentlyViewed
      .map((id) => faqs.find((faq) => faq.id === id))
      .filter(Boolean) as faqAttributes[];
  }, [faqs, recentlyViewed]);

  // Features
  const features = [
    {
      id: "search",
      icon: Zap,
      title: "Lightning Fast Search",
      description:
        "Find answers in seconds with our AI-powered search engine that understands your intent.",
      highlights: ["Smart Suggestions", "Instant Results", "Natural Language"],
    },
    {
      id: "trusted",
      icon: Shield,
      title: "Trusted Information",
      description:
        "All answers are verified by our expert team to ensure accuracy and reliability.",
      highlights: ["Expert Verified", "Regular Updates", "Detailed Guides"],
    },
    {
      id: "improving",
      icon: TrendingUp,
      title: "Always Improving",
      description:
        "We continuously update our knowledge base based on user feedback and new features.",
      highlights: ["User Feedback", "Latest Features", "Community Driven"],
    },
  ];

  return (
    <>
      <div className="flex flex-col overflow-hidden relative">
        {/* Interactive pattern background */}
        <InteractivePattern
          config={{
            enabled: true,
            variant: "crosses",
            opacity: 0.015,
            size: 40,
            interactive: true,
          }}
        />

        {/* Floating ambient shapes */}
        <FloatingShapes
          count={5}
          interactive={true}
          theme={{ primary: "cyan", secondary: "blue" }}
        />

        {/* Premium Hero Section */}
        <section className="relative min-h-[85vh] flex items-center overflow-hidden">
          <div className="container mx-auto relative z-10 pt-20 pb-32">
            <div className="max-w-5xl mx-auto text-center">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Badge className="mb-8 px-5 py-2.5 bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 backdrop-blur-sm text-sm font-medium">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t("ai_powered_knowledge_base")}
                </Badge>
              </motion.div>

              {/* Main heading */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
              >
                <span className="text-zinc-900 dark:text-white">
                  {t("get")}{" "}
                </span>
                <span className="bg-linear-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">
                  {t("instant_answers")}
                </span>
                <br />
                <span className="text-zinc-900 dark:text-white">
                  {t("to_your_questions")}
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 mb-12 max-w-3xl mx-auto leading-relaxed"
              >
                {t("search_through_our_need_it")}.
              </motion.p>

              {/* Premium Search Box */}
              <motion.div
                className="max-w-4xl mx-auto relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="relative flex items-center rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-sky-200 dark:border-sky-800 pl-6 pr-3 py-4 shadow-2xl shadow-sky-500/10 dark:shadow-sky-500/5 hover:shadow-3xl hover:shadow-sky-500/20 transition-all duration-300">
                  <Search
                    className="h-6 w-6 text-sky-500 mr-4 shrink-0"
                    aria-hidden="true"
                  />
                  <Input
                    ref={searchInputRef}
                    placeholder={`${t("ask_anything_ellipsis")} (${t("ask_anything_ellipsis_e_g_how_to_verify_my_account")})`}
                    className="border-0 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 h-14 text-lg flex-1 font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDownInput}
                    onFocus={() => {
                      if (suggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    hasRing={false}
                    hasShadow={false}
                    aria-label={tCommon("search_faqs_ellipsis")}
                    aria-describedby="search-instructions"
                    aria-autocomplete="list"
                    aria-controls={
                      showSuggestions ? "search-suggestions" : undefined
                    }
                    aria-expanded={showSuggestions}
                  />
                  {searchTerm && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 mr-3 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
                      onClick={() => setSearchTerm("")}
                      aria-label={tCommon("clear_search")}
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </motion.button>
                  )}
                  <Button
                    className="rounded-xl bg-linear-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-semibold px-8 py-4 text-lg shadow-lg shadow-sky-500/30 transition-all duration-300 hover:scale-105"
                    onClick={handleSearch}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        {tCommon("search")}
                      </>
                    )}
                  </Button>
                </div>

                {/* Search Suggestions */}
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      ref={suggestionsRef}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      id="search-suggestions"
                      role="listbox"
                      aria-label={t("search_suggestions")}
                      className="absolute z-10 mt-2 w-full bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden border border-sky-200 dark:border-sky-800"
                    >
                      <div className="p-2">
                        {suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            role="option"
                            aria-selected={selectedSuggestionIndex === index}
                            tabIndex={-1}
                            className={cn(
                              "px-4 py-3 hover:bg-sky-500/10 dark:hover:bg-sky-500/10 rounded-lg cursor-pointer flex items-center text-left text-zinc-900 dark:text-zinc-100 transition-colors",
                              selectedSuggestionIndex === index &&
                                "bg-sky-500/10 dark:bg-sky-500/10"
                            )}
                            onClick={() => handleSelectSuggestion(suggestion)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSelectSuggestion(suggestion);
                              }
                            }}
                          >
                            <Search
                              className="h-4 w-4 mr-3 text-sky-500"
                              aria-hidden="true"
                            />
                            <span className="line-clamp-1 font-medium">
                              {suggestion}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Quick Action Buttons */}
              <motion.div
                className="flex flex-wrap justify-center gap-4 mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Link href="/faq/troubleshooter">
                  <Button
                    variant="outline"
                    className="border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 px-6 py-3"
                  >
                    <Lightbulb className="h-5 w-5 mr-2" />
                    {t("ai_troubleshooter")}
                  </Button>
                </Link>
                <Link href="#ask-question-section">
                  <Button
                    variant="outline"
                    className="border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 px-6 py-3"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    {t("ask_a_question")}
                  </Button>
                </Link>
              </motion.div>

              {/* Stats Row */}
              <motion.div
                className="flex flex-wrap justify-center gap-3 md:gap-6 mt-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                {[
                  {
                    icon: BookOpen,
                    value: `${faqs.length}+`,
                    label: "Articles",
                  },
                  {
                    icon: Filter,
                    value: categories.length,
                    label: "Categories",
                  },
                  { icon: Users, value: "24/7", label: "Support" },
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                    className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-sky-200 dark:border-sky-800"
                  >
                    <stat.icon className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {stat.value}
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {stat.label}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-white dark:from-zinc-950 to-transparent" />
        </section>

        {/* Search Results Section */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.section
              id="search-results-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="py-16 bg-white dark:bg-zinc-950 relative z-10"
            >
              <div className="container mx-auto">
                <Card className="shadow-xl bg-white dark:bg-zinc-900 border border-sky-200 dark:border-sky-800">
                  <CardHeader className="pb-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl flex items-center font-bold text-zinc-900 dark:text-zinc-100">
                        <Search className="mr-3 h-6 w-6 text-sky-600 dark:text-sky-400" />
                        {t("search_results")}
                        <Badge className="ml-4 bg-sky-500/10 text-sky-600 dark:text-sky-400">
                          {searchResults.length}{" "}
                          {searchResults.length === 1 ? "result" : "results"}
                        </Badge>
                      </CardTitle>
                      <Button variant="outline" onClick={handleClearSearch}>
                        {t("clear_results")}
                      </Button>
                    </div>
                    <CardDescription className="text-base text-zinc-600 dark:text-zinc-400">
                      {t("showing_results_for")} "{searchTerm}"
                      {selectedCategory !== "all" &&
                        ` in ${selectedCategory}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {searchResults.map((faq, index) => (
                        <motion.div
                          key={faq.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <Card className="hover:shadow-lg transition-all duration-300 h-full bg-linear-to-br from-white to-sky-50/30 dark:from-zinc-900 dark:to-sky-950/10 border border-sky-200 dark:border-sky-800 hover:-translate-y-1">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                                {faq.question}
                              </CardTitle>
                              {faq.category && (
                                <Badge className="w-fit bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                  {faq.category}
                                </Badge>
                              )}
                            </CardHeader>
                            <CardContent>
                              <p className="line-clamp-3 text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
                                {faq.answer && typeof faq.answer === "string"
                                  ? faq.answer
                                      .replace(/<[^>]*>/g, "")
                                      .substring(0, 150) + "..."
                                  : "No answer provided"}
                              </p>
                              <div className="flex justify-between items-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleSavedFAQ(faq.id)}
                                  className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-500"
                                >
                                  {savedFAQs.includes(faq.id) ? (
                                    <BookmarkCheck className="h-4 w-4" />
                                  ) : (
                                    <Bookmark className="h-4 w-4" />
                                  )}
                                </Button>
                                <Link
                                  href={`/faq/${faq.id}`}
                                  onClick={() => addToRecentlyViewed(faq.id)}
                                >
                                  <Button
                                    variant="ghost"
                                    className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400"
                                  >
                                    {tCommon("read_more")}{" "}
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                  </Button>
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* FAQ Categories Section */}
        <section
          id="faq-categories-section"
          className="py-24 relative overflow-hidden"
        >
          <div className="container mx-auto">
            <Tabs defaultValue="all" className="w-full">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center mb-12"
              >
                <Badge
                  variant="outline"
                  className="mb-4 px-4 py-2 rounded-full bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {tCommon("browse_by_category")}
                </Badge>
                <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
                  Find Answers by{" "}
                  <span className="bg-linear-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">
                    Category
                  </span>
                </h2>
                <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                  {t("discover_curated_answers_problem_solving")}
                </p>
              </motion.div>

              {/* Category Tabs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-8"
              >
                <TabsList className="inline-flex flex-wrap justify-center h-auto p-1.5 gap-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
                  <TabsTrigger
                    value="all"
                    className="rounded-xl px-5 py-2.5 text-sm font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/30 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-300"
                  >
                    <HelpCircle className="h-4 w-4 mr-2" />
                    {tExt("all_faqs")}
                  </TabsTrigger>
                  {categories.slice(0, 6).map((category) => (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className="rounded-xl px-5 py-2.5 text-sm font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/30 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-300"
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </motion.div>

              {/* Content Container */}
              <motion.div
                className="relative p-8 md:p-10 rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <TabsContent value="all">
                  <FAQAccordion
                    title=""
                    description=""
                    showCategories={true}
                    variant="default"
                    showFeedback={true}
                    className="border-none shadow-none"
                  />
                  {pagination && pagination.totalPages > 1 && (
                    <Pagination className="mt-8">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) {
                                setCurrentPage(currentPage - 1);
                              }
                            }}
                            className={
                              currentPage === 1
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>

                        {[...Array(Math.min(5, pagination.totalPages))].map(
                          (_, index) => {
                            const pageNumber = index + 1;
                            return (
                              <PaginationItem key={pageNumber}>
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(pageNumber);
                                  }}
                                  isActive={currentPage === pageNumber}
                                >
                                  {pageNumber}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                        )}

                        {pagination.totalPages > 5 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < pagination.totalPages) {
                                setCurrentPage(currentPage + 1);
                              }
                            }}
                            className={
                              currentPage === pagination.totalPages
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </TabsContent>

                {categories.slice(0, 6).map((category) => (
                  <TabsContent key={category} value={category}>
                    <FAQAccordion
                      title=""
                      description=""
                      category={category}
                      showCategories={false}
                      variant="default"
                      showFeedback={true}
                      className="border-none shadow-none"
                    />
                  </TabsContent>
                ))}
              </motion.div>
            </Tabs>
          </div>
        </section>

        {/* Quick Access Sections */}
        {!searchResults.length &&
          (savedFAQs.length > 0 || recentlyViewed.length > 0) && (
            <section className="py-24 relative overflow-hidden">
              <div className="container mx-auto">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Saved FAQs */}
                  {savedFAQs.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                      className="group h-full"
                    >
                      <div className="relative h-full p-8 rounded-3xl bg-gradient-to-br from-white via-sky-50/30 to-white dark:from-zinc-900 dark:via-sky-950/20 dark:to-zinc-900 border border-sky-200/50 dark:border-sky-800/30 shadow-xl shadow-sky-500/5 hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-500 backdrop-blur-sm">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
                              <BookmarkCheck className="w-7 h-7 text-white" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
                                {t("saved_faqs")}
                              </h3>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {t("your_bookmarked_questions_for_quick_reference")}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-sky-500 text-white font-bold px-3 py-1.5 shadow-lg shadow-sky-500/30">
                            {savedFAQs.length}
                          </Badge>
                        </div>

                        {/* Content */}
                        <ScrollArea className="h-[380px] pr-4">
                          <div className="space-y-3">
                            {getSavedFAQs().map((faq, index) => (
                              <motion.div
                                key={faq.id}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                className="group/item"
                              >
                                <div className="relative p-5 rounded-2xl bg-white/80 dark:bg-zinc-800/50 border border-sky-100 dark:border-sky-900/30 hover:border-sky-400 dark:hover:border-sky-600 transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/10 backdrop-blur-sm">
                                  {/* Category Badge */}
                                  {faq.category && (
                                    <Badge className="mb-3 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border-0">
                                      {faq.category}
                                    </Badge>
                                  )}

                                  {/* Question */}
                                  <h4 className="text-base font-semibold text-zinc-900 dark:text-white mb-2 line-clamp-2 group-hover/item:text-sky-600 dark:group-hover/item:text-sky-400 transition-colors">
                                    {faq.question}
                                  </h4>

                                  {/* Answer Preview */}
                                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-4">
                                    {faq.answer && typeof faq.answer === "string"
                                      ? faq.answer.replace(/<[^>]*>/g, "").substring(0, 100) + "..."
                                      : "No answer provided"}
                                  </p>

                                  {/* Actions */}
                                  <div className="flex items-center gap-3">
                                    <Link
                                      href={`/faq/${faq.id}`}
                                      onClick={() => addToRecentlyViewed(faq.id)}
                                      className="flex-1"
                                    >
                                      <Button
                                        size="sm"
                                        className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                                      >
                                        {tCommon("read_more")}
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                      </Button>
                                    </Link>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleSavedFAQ(faq.id)}
                                      className="border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                    >
                                      {tCommon("remove")}
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </motion.div>
                  )}

                  {/* Recently Viewed */}
                  {recentlyViewed.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="group h-full"
                    >
                      <div className="relative h-full p-8 rounded-3xl bg-gradient-to-br from-white via-blue-50/30 to-white dark:from-zinc-900 dark:via-blue-950/20 dark:to-zinc-900 border border-blue-200/50 dark:border-blue-800/30 shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 backdrop-blur-sm">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                              <Clock className="w-7 h-7 text-white" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
                                {t("recently_viewed")}
                              </h3>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {t("continue_reading_where_you_left_off")}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-blue-500 text-white font-bold px-3 py-1.5 shadow-lg shadow-blue-500/30">
                            {recentlyViewed.length}
                          </Badge>
                        </div>

                        {/* Content */}
                        <div className="space-y-3">
                          {getRecentlyViewedFAQs().map((faq, index) => (
                            <motion.div
                              key={faq.id}
                              initial={{ opacity: 0, x: -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <Link href={`/faq/${faq.id}`}>
                                <div className="relative p-5 rounded-2xl bg-white/80 dark:bg-zinc-800/50 border border-blue-100 dark:border-blue-900/30 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 backdrop-blur-sm cursor-pointer group/item">
                                  {/* Question */}
                                  <h4 className="text-base font-semibold text-zinc-900 dark:text-white mb-2 line-clamp-2 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
                                    {faq.question}
                                  </h4>

                                  {/* Answer Preview */}
                                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3">
                                    {faq.answer && typeof faq.answer === "string"
                                      ? faq.answer.replace(/<[^>]*>/g, "").substring(0, 80) + "..."
                                      : "No answer provided"}
                                  </p>

                                  {/* Read More Link */}
                                  <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 group-hover/item:gap-2 transition-all">
                                    {t("continue_reading")}
                                    <ChevronRight className="h-4 w-4 group-hover/item:translate-x-1 transition-transform" />
                                  </div>
                                </div>
                              </Link>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </section>
          )}

        {/* CTA Section - Ask a Question */}
        <section
          id="ask-question-section"
          className="py-24 bg-linear-to-b from-white via-sky-50/30 to-white dark:from-zinc-950 dark:via-sky-950/10 dark:to-zinc-950 relative z-10"
        >
          <div className="container mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left side - Content */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800 px-4 py-2">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {tExt("cant_find_what_youre_looking_for")}
                </Badge>

                <h2 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">
                  {tExt("still_have_questions")}
                </h2>

                <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-xl">
                  {t("if_you_couldnt_to_help")}. {t("submit_your_question_you_quickly")}.
                </p>

                {/* Trust Items */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  {[
                    { icon: Zap, text: tCommon("fast_response") },
                    { icon: Users, text: t("expert_support") },
                    { icon: CheckCircle2, text: t("detailed_answers") },
                    { icon: Headphones, text: "24/7 Support" },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-zinc-900/60 border border-sky-100 dark:border-sky-900/50"
                    >
                      <div className="p-2 rounded-lg bg-linear-to-br from-sky-500/10 to-blue-500/10">
                        <item.icon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                      </div>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {item.text}
                      </span>
                    </motion.div>
                  ))}
                </div>

              </motion.div>

              {/* Right side - Form */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-sky-200 dark:border-sky-800 shadow-2xl shadow-sky-500/10">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center">
                      <MessageCircle className="h-6 w-6 mr-3 text-sky-600 dark:text-sky-400" />
                      {t("ask_a_question")}
                    </CardTitle>
                    <CardDescription className="text-zinc-600 dark:text-zinc-400">
                      {t("our_team_will_respond_to_you_as_soon_as_possible")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AskQuestionForm />
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
