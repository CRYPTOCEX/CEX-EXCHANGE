"use client";

import { useMemo } from "react";
import { useFAQStore } from "@/store/faq";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FAQThumbs } from "./faq-thumbs";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { MessageSquare, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { sanitizeHTML } from "@/lib/sanitize";
import { ErrorBoundary } from "@/components/faq/error-boundary";

// FAQAccordionProps interface is now imported from global types

export function FAQAccordion({
  faqs: propFaqs,
  title = "Frequently Asked Questions",
  description,
  category,
  showCategories = false,
  variant = "default",
  showFeedback = false,
  className,
}: FAQAccordionProps) {
  const t = useTranslations("ext");
  const { faqs: storeFaqs, loading } = useFAQStore();

  const faqs = useMemo(() => {
    if (propFaqs) return propFaqs;

    if (category) {
      return storeFaqs.filter((faq) => faq.category === category && faq.status);
    }

    return storeFaqs.filter((faq) => faq.status);
  }, [propFaqs, storeFaqs, category]);

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="animate-pulse space-y-4 w-full">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="h-20 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 
                         dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 
                         rounded-xl w-full relative overflow-hidden"
            >
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                              animate-shimmer transform -skew-x-12"
              ></div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (faqs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-16 text-center"
      >
        <div
          className="relative inline-flex items-center justify-center w-20 h-20 rounded-full 
                        bg-gradient-to-br from-blue-100 to-purple-100 
                        dark:from-zinc-800 dark:to-zinc-700 mb-6"
        >
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 
                          animate-pulse"
          ></div>
          <MessageSquare className="h-10 w-10 text-blue-600 dark:text-blue-400 relative z-10" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          {t("no_faqs_found")}
        </h3>
        <p className="text-slate-600 dark:text-slate-300 max-w-md mx-auto">
          {t("no_faqs_found")}
          {category ? ` in ${category}` : ""}
          {t("check_back_later_for_updates")}.
        </p>
      </motion.div>
    );
  }

  const AccordionWrapper = variant === "card" ? Card : "div";

  return (
    <ErrorBoundary>
      <AccordionWrapper className={className}>
        {(title || description) && variant === "card" && (
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-zinc-900 dark:to-zinc-800">
            {title && (
              <CardTitle className="flex items-center text-2xl">
                <Sparkles className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
                {title}
              </CardTitle>
            )}
            {description && (
              <CardDescription className="text-base">
                {description}
              </CardDescription>
            )}
          </CardHeader>
        )}

      {(title || description) && variant !== "card" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          {title && (
            <h2
              className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                           bg-clip-text text-transparent mb-3"
            >
              {title}
            </h2>
          )}
          {description && (
            <p className="text-slate-600 dark:text-slate-300 text-lg max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </motion.div>
      )}

      <div className={cn(variant === "card" && "p-6 pt-0")}>
        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <AccordionItem
                value={faq.id}
                className="border-0 bg-white dark:bg-zinc-900 rounded-xl shadow-sm 
                           hover:shadow-md transition-all duration-300 overflow-hidden
                           data-[state=open]:shadow-lg data-[state=open]:ring-2 
                           data-[state=open]:ring-blue-500/20"
              >
                <AccordionTrigger
                  className="text-left hover:no-underline py-6 px-6 
                                           hover:bg-slate-50 dark:hover:bg-zinc-800/50 
                                           transition-colors group"
                >
                  <div className="flex flex-col items-start w-full">
                    <div className="flex items-start justify-between w-full">
                      <span
                        className="font-semibold text-slate-900 dark:text-white 
                                     group-hover:text-blue-600 dark:group-hover:text-blue-400 
                                     transition-colors text-lg leading-relaxed pr-4"
                      >
                        {faq.question}
                      </span>
                    </div>
                    {showCategories && faq.category && (
                      <Badge
                        variant="outline"
                        className="mt-3 bg-blue-50 text-blue-700 border-blue-200 
                                   dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                      >
                        {faq.category}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-lg p-6 mt-2">
                    <div className="prose dark:prose-invert max-w-none prose-blue">
                      <div
                        dangerouslySetInnerHTML={{ __html: sanitizeHTML(faq.answer) }}
                        className="text-slate-700 dark:text-slate-300 leading-relaxed"
                      />
                    </div>

                    {/* Enhanced image display */}
                    {faq.image && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-6 rounded-xl overflow-hidden shadow-lg"
                      >
                        <Image
                          src={faq.image || "/img/placeholder.svg"}
                          alt="Answer illustration"
                          width={600}
                          height={400}
                          className="w-full h-auto object-cover"
                          unoptimized
                        />
                      </motion.div>
                    )}

                    {showFeedback && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <FAQThumbs
                          faqId={faq.id}
                          className="mt-8 pt-6 border-t border-slate-200 dark:border-zinc-700"
                        />
                      </motion.div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </AccordionWrapper>
    </ErrorBoundary>
  );
}
