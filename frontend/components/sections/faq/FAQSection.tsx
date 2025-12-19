"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { FAQSectionProps, FAQPreset, faqPresets } from "./types";
import { SectionBackground, SectionHeader } from "../shared";
import { paddingClasses, getColor } from "../shared/types";

interface FAQSectionComponentProps extends FAQSectionProps {
  preset?: FAQPreset;
}

export default function FAQSection({
  header,
  faqs,
  layout,
  background,
  animation = { enabled: true },
  theme = { primary: "teal", secondary: "cyan" },
  categories,
  className = "",
  preset,
  id,
}: FAQSectionComponentProps) {
  const presetConfig = preset ? faqPresets[preset] : null;
  const finalLayout = { ...presetConfig?.layout, ...layout };

  const {
    variant = "accordion",
    showCategories = false,
    defaultOpen = null,
    allowMultipleOpen = false,
  } = finalLayout;

  const [openIndexes, setOpenIndexes] = useState<number[]>(
    defaultOpen !== null ? [defaultOpen] : []
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const primaryColor = getColor(theme.primary || "teal");

  const toggleFAQ = (index: number) => {
    if (allowMultipleOpen) {
      setOpenIndexes((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    } else {
      setOpenIndexes((prev) => (prev.includes(index) ? [] : [index]));
    }
  };

  const filteredFAQs = selectedCategory
    ? faqs.filter((faq) => faq.category === selectedCategory)
    : faqs;

  const renderFAQItem = (faq: typeof faqs[0], index: number) => {
    const isOpen = openIndexes.includes(index);

    return (
      <motion.div
        key={faq.id || index}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className={`rounded-xl border-2 transition-all ${
          isOpen
            ? "border-current shadow-lg"
            : "border-zinc-200 dark:border-zinc-800"
        } ${faq.highlighted ? "ring-2 ring-offset-2 dark:ring-offset-zinc-950" : ""}`}
        style={{
          ...(isOpen ? { borderColor: primaryColor } : {}),
          ...(faq.highlighted ? { ringColor: primaryColor } : {}),
        }}
      >
        <button
          onClick={() => toggleFAQ(index)}
          className="w-full p-6 text-left flex items-start justify-between gap-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-xl"
        >
          <span className="font-semibold text-zinc-900 dark:text-white flex-1">
            {faq.question}
          </span>
          <ChevronDown
            className={`w-5 h-5 shrink-0 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            style={{ color: isOpen ? primaryColor : undefined }}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {faq.answer}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <section id={id} className={`relative ${paddingClasses.lg} overflow-hidden ${className}`}>
      {background && <SectionBackground config={background} theme={theme} />}

      <div className="container mx-auto relative z-10">
        {header && <SectionHeader config={header} theme={theme} animate={animation.enabled} />}

        {showCategories && categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                selectedCategory === null
                  ? "text-white shadow-lg"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
              style={
                selectedCategory === null ? { backgroundColor: primaryColor } : {}
              }
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  selectedCategory === category
                    ? "text-white shadow-lg"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                }`}
                style={
                  selectedCategory === category
                    ? { backgroundColor: primaryColor }
                    : {}
                }
              >
                {category}
              </button>
            ))}
          </div>
        )}

        <div
          className={
            variant === "two-column"
              ? "grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto"
              : variant === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto"
                : "flex flex-col gap-4 max-w-3xl mx-auto"
          }
        >
          {filteredFAQs.map((faq, index) => renderFAQItem(faq, index))}
        </div>
      </div>
    </section>
  );
}
