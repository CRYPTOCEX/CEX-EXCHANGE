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
import { MessageSquare, Sparkles, HelpCircle, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { sanitizeHTML } from "@/lib/sanitize";
import { ErrorBoundary } from "@/app/[locale]/(ext)/faq/components/error-boundary";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

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
  const t = useTranslations("ext_faq");
  const tExt = useTranslations("ext");
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
              className="h-24 bg-linear-to-r from-sky-50 to-blue-50 dark:from-sky-950/50 dark:to-blue-950/50 rounded-2xl w-full relative overflow-hidden border border-sky-200 dark:border-sky-800"
            >
              <div
                className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent
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
          className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-linear-to-br from-white to-sky-50/30 dark:from-zinc-900 dark:to-sky-950/10 mb-6"
        >
          <div
            className="absolute inset-0 rounded-full bg-linear-to-br from-sky-500/20 to-blue-500/20 animate-pulse"
          ></div>
          <HelpCircle className="h-12 w-12 text-sky-600 dark:text-sky-400 relative z-10" />
        </div>
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
          {tExt("no_faqs_found")}
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto text-lg">
          {tExt("no_faqs_found")}
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
          <CardHeader className="bg-linear-to-r from-sky-50 to-blue-50 dark:from-sky-950/50 dark:to-blue-950/50 border-b border-sky-100 dark:border-sky-900/50">
            {title && (
              <CardTitle className="flex items-center text-2xl font-bold text-zinc-900 dark:text-white">
                <Sparkles className="h-6 w-6 mr-3 text-sky-600 dark:text-sky-400" />
                {title}
              </CardTitle>
            )}
            {description && (
              <CardDescription className="text-base text-zinc-600 dark:text-zinc-400">
                {description}
              </CardDescription>
            )}
          </CardHeader>
        )}

      {(title || description) && variant !== "card" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          {title && (
            <h2
              className="text-4xl font-bold bg-linear-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400
                           bg-clip-text text-transparent mb-4"
            >
              {title}
            </h2>
          )}
          {description && (
            <p className="text-zinc-600 dark:text-zinc-400 text-xl max-w-2xl mx-auto leading-relaxed">
              {description}
            </p>
          )}
        </motion.div>
      )}

      <div className={cn(variant === "card" && "p-6 pt-0")}>
        <Accordion type="single" collapsible className="w-full space-y-4 pb-2">
          {faqs.map((faq, index) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <AccordionItem
                value={faq.id}
                className="bg-linear-to-br from-white to-sky-50/20 dark:from-zinc-900 dark:to-sky-950/20 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border-2 border-sky-200/80 dark:border-sky-700/50 data-[state=open]:shadow-xl data-[state=open]:ring-2 data-[state=open]:ring-sky-500/20 data-[state=open]:border-sky-500 dark:data-[state=open]:border-sky-500"
              >
                <AccordionTrigger
                  className="text-left hover:no-underline py-6 px-6 hover:bg-sky-500/10 dark:hover:bg-sky-500/10 transition-colors group"
                >
                  <div className="flex flex-col items-start w-full">
                    <div className="flex items-start justify-between w-full">
                      <span
                        className="font-semibold text-zinc-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors text-lg leading-relaxed pr-4"
                      >
                        {faq.question}
                      </span>
                    </div>
                    {showCategories && faq.category && (
                      <Badge
                        variant="outline"
                        className="mt-3 bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 font-medium"
                      >
                        {faq.category}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="bg-linear-to-br from-white to-sky-50/30 dark:from-zinc-900 dark:to-sky-950/10 rounded-xl p-6 mt-2 border border-sky-100/50 dark:border-sky-800/50">
                    <div className="prose dark:prose-invert max-w-none prose-sky">
                      <div
                        dangerouslySetInnerHTML={{ __html: sanitizeHTML(faq.answer) }}
                        className="text-zinc-700 dark:text-zinc-300 leading-relaxed"
                      />
                    </div>

                    {/* Enhanced image display */}
                    {faq.image && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-6 rounded-xl overflow-hidden shadow-lg border border-sky-200 dark:border-sky-800"
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

                    {/* View Full Article Link */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mt-6 flex justify-end"
                    >
                      <Link href={`/faq/${faq.id}`}>
                        <Button
                          variant="ghost"
                          className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-500 font-medium"
                        >
                          {t("view_full_article")}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </motion.div>

                    {showFeedback && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <FAQThumbs
                          faqId={faq.id}
                          className="mt-6 pt-6 border-t border-sky-200 dark:border-sky-800"
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
