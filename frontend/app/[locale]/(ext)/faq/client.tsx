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
  ArrowRight,
  X,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Filter,
  MessageCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AskQuestionForm } from "./components/ask-question-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { FAQWizard } from "./components/faq-wizard";
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

export default function FAQClient() {
  const t = useTranslations("ext");
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
  const [showAskForm, setShowAskForm] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
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
    // Fetch both FAQs and categories on mount
    Promise.all([fetchFAQs(currentPage, perPage, selectedCategory !== "all" ? selectedCategory : undefined), fetchCategories()]);
  }, [fetchFAQs, fetchCategories, currentPage, perPage, selectedCategory]);

  // Generate search suggestions based on current input
  useEffect(() => {
    if (searchTerm.length > 1) {
      // Filter FAQs that contain the search term in their question
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

  // Close suggestions when clicking outside
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to clear search
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

  // Updated search handler that uses API-based searchFAQs.
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

  // Handle search on Enter key and navigation
  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > -1 ? prev - 1 : -1);
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

  // Clear search results and reset filters
  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSelectedCategory("all");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Select a suggestion
  const handleSelectSuggestion = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    // Auto search when selecting a suggestion
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  // Toggle saved FAQ
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

  // Add to recently viewed
  const addToRecentlyViewed = useCallback(
    (faqId: string) => {
      setRecentlyViewed((prev) => {
        const filtered = prev.filter((id) => id !== faqId);
        return [faqId, ...filtered].slice(0, 5);
      });
    },
    [setRecentlyViewed]
  );

  // Get saved FAQs
  const getSavedFAQs = useCallback(() => {
    return faqs.filter((faq) => savedFAQs.includes(faq.id));
  }, [faqs, savedFAQs]);

  // Get recently viewed FAQs
  const getRecentlyViewedFAQs = useCallback(() => {
    return recentlyViewed
      .map((id) => faqs.find((faq) => faq.id === id))
      .filter(Boolean) as faqAttributes[];
  }, [faqs, recentlyViewed]);
  return (
    <>
      <div className="container pb-24 space-y-12">
        {/* Enhanced Hero Section */}
        <motion.div
          initial={{
            opacity: 0,
            y: 30,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.8,
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white"
        >
          {/* Animated Background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-400/30 to-pink-400/30 rounded-full blur-3xl animate-pulse delay-1000" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse delay-2000" />
            </div>
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:30px_30px]"></div>
          </div>

          <div className="relative px-6 py-16 sm:px-12 sm:py-20 md:py-32 text-center space-y-8">
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.2,
              }}
            >
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.8,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                transition={{
                  duration: 0.6,
                  delay: 0.1,
                }}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm font-medium text-white/90 mb-8"
              >
                <Sparkles className="h-4 w-4" />
                {t("ai-powered_knowledge_base")}
              </motion.div>
              <motion.h1
                initial={{
                  opacity: 0,
                  y: 30,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.8,
                  delay: 0.3,
                }}
                className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8"
              >
                {t("Get")}{" "}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {t("instant_answers")}
                </span>{" "}
                {t("to_your_questions")}
              </motion.h1>
              <motion.p
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.8,
                  delay: 0.5,
                }}
                className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto font-light leading-relaxed"
              >
                {t("search_through_our_need_it")}.
              </motion.p>
            </motion.div>

            <motion.div
              className="max-w-4xl mx-auto relative"
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.7,
              }}
            >
              <div className="relative flex items-center rounded-2xl bg-white/95 backdrop-blur-xl border border-white/30 pl-6 pr-3 py-4 shadow-2xl hover:shadow-3xl transition-all duration-300">
                <Search className="h-6 w-6 text-gray-500 mr-4 flex-shrink-0" aria-hidden="true" />
                <Input
                  ref={searchInputRef}
                  placeholder="Ask anything... (e.g., 'How to verify my account?')"
                  className="border-0 bg-transparent text-gray-900 placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 h-14 text-lg flex-1 font-medium"
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
                  aria-label={t("search_faqs")}
                  aria-describedby="search-instructions"
                  aria-autocomplete="list"
                  aria-controls={showSuggestions ? "search-suggestions" : undefined}
                  aria-expanded={showSuggestions}
                />
                {searchTerm && (
                  <motion.button
                    initial={{
                      opacity: 0,
                      scale: 0.8,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    className="text-gray-500 hover:text-gray-700 mr-3 transition-colors p-1 rounded-full hover:bg-gray-100"
                    onClick={() => setSearchTerm("")}
                    aria-label={t("clear_search")}
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </motion.button>
                )}
                <Button
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-4 text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <motion.div
                      animate={{
                        rotate: 360,
                      }}
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
                      {t("Search")}
                    </>
                  )}
                </Button>
              </div>

              {/* Search Suggestions */}
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    ref={suggestionsRef}
                    initial={{
                      opacity: 0,
                      y: 10,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: 10,
                    }}
                    id="search-suggestions"
                    role="listbox"
                    aria-label={t("search_suggestions")}
                    className="absolute z-10 mt-2 w-full bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="p-2">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          role="option"
                          aria-selected={selectedSuggestionIndex === index}
                          tabIndex={-1}
                          className={cn(
                            "px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer flex items-center text-left text-zinc-900 dark:text-zinc-100 transition-colors",
                            selectedSuggestionIndex === index && "bg-zinc-100 dark:bg-zinc-800"
                          )}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectSuggestion(suggestion);
                            }
                          }}
                        >
                          <Search className="h-4 w-4 mr-3 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
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

            {/* Enhanced Quick Stats */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 pt-16 border-t border-white/20"
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.9,
              }}
            >
              {[
                {
                  value: `${faqs.length}+`,
                  label: "FAQs Available",
                  icon: HelpCircle,
                  delay: 0.1,
                },
                {
                  value: categories.length,
                  label: "Categories",
                  icon: Filter,
                  delay: 0.2,
                },
                {
                  value: "24/7",
                  label: "Expert Support",
                  icon: MessageCircle,
                  delay: 0.3,
                },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{
                    opacity: 0,
                    y: 30,
                    scale: 0.8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  transition={{
                    duration: 0.6,
                    delay: 0.9 + stat.delay,
                    type: "spring",
                    stiffness: 100,
                  }}
                  className="text-center group"
                >
                  <motion.div
                    whileHover={{
                      scale: 1.1,
                      rotate: 10,
                    }}
                    className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-white/30 transition-all duration-300"
                  >
                    <stat.icon className="h-8 w-8 text-white" />
                  </motion.div>
                  <motion.div
                    className="text-4xl font-bold text-white mb-2"
                    whileHover={{
                      scale: 1.05,
                    }}
                  >
                    {stat.value}
                  </motion.div>
                  <div className="text-blue-100 font-medium text-lg">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Search Results */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{
                opacity: 0,
                y: 30,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -30,
              }}
              className="max-w-7xl mx-auto"
            >
              <Card className="border-0 shadow-xl bg-white dark:bg-zinc-900">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl flex items-center font-bold text-zinc-900 dark:text-zinc-100">
                      <Search className="mr-3 h-6 w-6 text-zinc-600 dark:text-zinc-400" />
                      {t("search_results")}
                      <Badge className="ml-4 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {searchResults.length}{" "}
                        {searchResults.length === 1 ? "result" : "results"}
                      </Badge>
                    </CardTitle>
                    <Button
                      variant="outline"
                      onClick={handleClearSearch}
                      className="font-medium"
                    >
                      {t("clear_results")}
                    </Button>
                  </div>
                  <CardDescription className="text-base text-zinc-600 dark:text-zinc-400">
                    {t("showing_results_for")} {searchTerm} ,
                    {selectedCategory !== "all" && ` in ${selectedCategory}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map((faq, index) => {
                      return (
                        <motion.div
                          key={faq.id}
                          initial={{
                            opacity: 0,
                            y: 20,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          transition={{
                            duration: 0.3,
                            delay: index * 0.1,
                          }}
                        >
                          <Card className="hover:shadow-lg transition-all duration-300 h-full bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:-translate-y-1">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                                {faq.question}
                              </CardTitle>
                              {faq.category && (
                                <Badge className="w-fit bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
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
                                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
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
                                    className="font-medium"
                                  >
                                    {t("read_more")}{" "}
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                  </Button>
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Access Sections */}
        {!searchResults.length && (
          <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {/* Saved FAQs */}
            {savedFAQs.length > 0 && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 30,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.2,
                }}
              >
                <Card className="border-0 shadow-xl bg-white dark:bg-zinc-900">
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl font-bold text-zinc-900 dark:text-zinc-100">
                      <Bookmark className="mr-3 h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                      {t("saved_faqs")}
                      <Badge className="ml-3 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {savedFAQs.length}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-zinc-600 dark:text-zinc-400">
                      {t("your_bookmarked_questions_for_quick_reference")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {getSavedFAQs().map((faq) => {
                          return (
                            <Card
                              key={faq.id}
                              className="hover:shadow-md transition-shadow bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
                            >
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                                  {faq.question}
                                </CardTitle>
                                {faq.category && (
                                  <Badge className="w-fit bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                                    {faq.category}
                                  </Badge>
                                )}
                              </CardHeader>
                              <CardContent>
                                <p className="line-clamp-2 text-zinc-600 dark:text-zinc-400 mb-3 text-sm">
                                  {faq.answer && typeof faq.answer === "string"
                                    ? faq.answer
                                        .replace(/<[^>]*>/g, "")
                                        .substring(0, 100) + "..."
                                    : "No answer provided"}
                                </p>
                                <div className="flex justify-between items-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleSavedFAQ(faq.id)}
                                    className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                                  >
                                    {t("Remove")}
                                  </Button>
                                  <Link
                                    href={`/faq/${faq.id}`}
                                    onClick={() => addToRecentlyViewed(faq.id)}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="font-medium"
                                    >
                                      {t("read_more")}{" "}
                                      <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                  </Link>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 30,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.3,
                }}
              >
                <Card className="border-0 shadow-xl bg-white dark:bg-zinc-900">
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl font-bold text-zinc-900 dark:text-zinc-100">
                      <Clock className="mr-3 h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                      {t("recently_viewed")}
                      <Badge className="ml-3 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {recentlyViewed.length}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-zinc-600 dark:text-zinc-400">
                      {t("continue_reading_where_you_left_off")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getRecentlyViewedFAQs().map((faq) => {
                        return (
                          <Card
                            key={faq.id}
                            className="hover:shadow-md transition-shadow bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                                {faq.question}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="line-clamp-2 text-zinc-600 dark:text-zinc-400 mb-3 text-sm">
                                {faq.answer && typeof faq.answer === "string"
                                  ? faq.answer
                                      .replace(/<[^>]*>/g, "")
                                      .substring(0, 80) + "..."
                                  : "No answer provided"}
                              </p>
                              <Link href={`/faq/${faq.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="font-medium"
                                >
                                  {t("continue_reading")}{" "}
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              </Link>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )}

        {/* Enhanced FAQ Categories */}
        <motion.div
          initial={{
            opacity: 0,
            y: 30,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
            delay: 0.4,
          }}
          className="max-w-7xl mx-auto"
        >
          <Tabs defaultValue="all" className="w-full">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6">
              <motion.div
                initial={{
                  opacity: 0,
                  x: -30,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  duration: 0.6,
                  delay: 0.5,
                }}
              >
                <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent mb-4">
                  {t("browse_by_category")}
                </h2>
                <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl">
                  {t("discover_curated_answers_problem_solving")}
                </p>
              </motion.div>
              <motion.div
                initial={{
                  opacity: 0,
                  x: 30,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  duration: 0.6,
                  delay: 0.6,
                }}
              >
                <Button
                  variant="outline"
                  onClick={() => setShowWizard(true)}
                  className="bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 dark:from-blue-950/50 dark:to-purple-950/50 dark:hover:from-blue-900/50 dark:hover:to-purple-900/50 border border-blue-200 dark:border-blue-800 font-semibold text-blue-700 dark:text-blue-300 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  {t("ai_troubleshooter")}
                </Button>
              </motion.div>
            </div>

            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.7,
              }}
            >
              <TabsList className="mb-12 flex flex-wrap h-auto p-2 bg-gradient-to-r from-blue-100 via-purple-100 to-indigo-100 dark:from-blue-950/50 dark:via-purple-950/50 dark:to-indigo-950/50 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-lg">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:shadow-lg rounded-xl font-semibold px-6 py-3 transition-all duration-300 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  {t("all_faqs")}
                </TabsTrigger>
                {categories.slice(0, 6).map((category, index) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:shadow-lg rounded-xl font-semibold px-6 py-3 transition-all duration-300 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </motion.div>

            <motion.div
              className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-zinc-900 dark:via-blue-950/30 dark:to-purple-950/30 rounded-3xl shadow-2xl border border-blue-100 dark:border-blue-900/50 p-8 md:p-12 backdrop-blur-sm"
              initial={{
                opacity: 0,
                y: 30,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.8,
              }}
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
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      
                      {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => {
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
                      })}
                      
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
                          className={currentPage === pagination.totalPages ? "pointer-events-none opacity-50" : ""}
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
        </motion.div>

        {/* Ask a Question */}
        <motion.div
          initial={{
            opacity: 0,
            y: 30,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
            delay: 0.5,
          }}
          className="max-w-7xl mx-auto"
        >
          <Card className="bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800 border-0 shadow-xl overflow-hidden">
            <CardHeader className="text-center pb-6">
              <CardTitle className="flex items-center justify-center text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                <MessageCircle className="mr-3 h-8 w-8 text-zinc-600 dark:text-zinc-400" />
                {t("cant_find_what_youre_looking_for")}
              </CardTitle>
              <CardDescription className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                {t("if_you_couldnt_to_help")}.{" "}
                {t("submit_your_question_you_quickly")}.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              {showAskForm ? (
                <AskQuestionForm onCancel={() => setShowAskForm(false)} />
              ) : (
                <div className="space-y-6">
                  <Button
                    onClick={() => setShowAskForm(true)}
                    size="lg"
                    className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white font-semibold px-8 py-4 text-lg shadow-lg"
                  >
                    {t("ask_a_question")}
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MessageCircle className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                        {t("quick_response")}
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {t("get_answers_within_24_hours")}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <TrendingUp className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                        {t("expert_support")}
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {t("professional_assistance")}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <HelpCircle className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                        {t("detailed_answers")}
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {t("comprehensive_solutions")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Guided Troubleshooter */}
      <FAQWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        categories={categories}
      />
    </>
  );
}
