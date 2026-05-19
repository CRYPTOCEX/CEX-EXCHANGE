"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { TestimonialsSectionProps, TestimonialsPreset, testimonialsPresets } from "./types";
import { SectionBackground, SectionHeader } from "../shared";
import { paddingClasses, gapClasses, getColor } from "../shared/types";
import TestimonialCard from "./TestimonialCard";

interface TestimonialsSectionComponentProps extends TestimonialsSectionProps {
  preset?: TestimonialsPreset;
}

const columnsClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
};

export default function TestimonialsSection({
  header,
  testimonials,
  layout,
  background,
  animation = { enabled: true },
  theme = { primary: "teal", secondary: "cyan" },
  showTrustBadge,
  trustBadge,
  className = "",
  preset,
  id,
}: TestimonialsSectionComponentProps) {
  // Apply preset if provided
  const presetConfig = preset ? testimonialsPresets[preset] : null;
  const finalLayout = { ...presetConfig?.layout, ...layout };

  const {
    variant = "grid",
    columns = 3,
    gap = "lg",
    autoplay = false,
    autoplayInterval = 5000,
  } = finalLayout;

  const primaryColor = getColor(theme.primary || "teal");
  const [currentIndex, setCurrentIndex] = useState(0);

  // Carousel navigation
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  // Autoplay effect
  useEffect(() => {
    if (variant === "carousel" && autoplay) {
      const interval = setInterval(nextSlide, autoplayInterval);
      return () => clearInterval(interval);
    }
  }, [variant, autoplay, autoplayInterval, nextSlide]);

  // Render trust badge
  const renderTrustBadge = () => {
    if (!showTrustBadge || !trustBadge) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex items-center justify-center gap-4 mb-12"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-zinc-800 shadow-lg">
          {trustBadge.icon && (
            <trustBadge.icon className="w-5 h-5" style={{ color: primaryColor }} />
          )}
          <span className="font-medium text-zinc-900 dark:text-white">{trustBadge.text}</span>
          {trustBadge.rating && (
            <div className="flex items-center gap-1 ml-2">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-zinc-900 dark:text-white">
                {trustBadge.rating}
              </span>
            </div>
          )}
          {trustBadge.reviewCount && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              ({trustBadge.reviewCount.toLocaleString()} reviews)
            </span>
          )}
        </div>
      </motion.div>
    );
  };

  // Carousel layout
  const renderCarousel = () => {
    return (
      <div className="relative">
        <div className="overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="max-w-4xl mx-auto"
            >
              <TestimonialCard
                testimonial={testimonials[currentIndex]}
                layout={finalLayout}
                theme={theme}
                index={0}
                animate={false}
                isSpotlight
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={prevSlide}
            className="p-2 rounded-full bg-white dark:bg-zinc-800 shadow-lg hover:shadow-xl transition-all hover:-translate-x-0.5"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex
                    ? "w-6"
                    : "bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600"
                }`}
                style={idx === currentIndex ? { backgroundColor: primaryColor } : {}}
                aria-label={`Go to testimonial ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            className="p-2 rounded-full bg-white dark:bg-zinc-800 shadow-lg hover:shadow-xl transition-all hover:translate-x-0.5"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </button>
        </div>
      </div>
    );
  };

  // Spotlight layout (featured + grid)
  const renderSpotlight = () => {
    const [featured, ...rest] = testimonials;

    return (
      <div className="space-y-12">
        {/* Featured testimonial */}
        <TestimonialCard
          testimonial={featured}
          layout={finalLayout}
          theme={theme}
          index={0}
          animate={animation.enabled}
          isSpotlight
        />

        {/* Rest in grid */}
        {rest.length > 0 && (
          <div className={`grid ${columnsClasses[columns]} ${gapClasses[gap]}`}>
            {rest.map((testimonial, index) => (
              <TestimonialCard
                key={testimonial.id || index}
                testimonial={testimonial}
                layout={finalLayout}
                theme={theme}
                index={index + 1}
                animate={animation.enabled}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Masonry layout
  const renderMasonry = () => {
    // Split testimonials into columns
    const cols = Array.from({ length: columns }, () => [] as typeof testimonials);
    testimonials.forEach((t, i) => {
      cols[i % columns].push(t);
    });

    return (
      <div className={`grid ${columnsClasses[columns]} ${gapClasses[gap]} items-start`}>
        {cols.map((col, colIdx) => (
          <div key={colIdx} className={`flex flex-col ${gapClasses[gap]}`}>
            {col.map((testimonial, idx) => (
              <TestimonialCard
                key={testimonial.id || `${colIdx}-${idx}`}
                testimonial={testimonial}
                layout={finalLayout}
                theme={theme}
                index={colIdx * cols.length + idx}
                animate={animation.enabled}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Quote wall layout (compact, many quotes)
  const renderQuoteWall = () => {
    return (
      <div className={`grid ${columnsClasses[columns]} ${gapClasses[gap]}`}>
        {testimonials.map((testimonial, index) => (
          <motion.div
            key={testimonial.id || index}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
          >
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3 line-clamp-3">
              "{testimonial.content}"
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {testimonial.author.name[0]}
              </div>
              <span className="text-xs font-medium text-zinc-900 dark:text-white">
                {testimonial.author.name}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // Default grid layout
  const renderGrid = () => {
    return (
      <div className={`grid ${columnsClasses[columns]} ${gapClasses[gap]}`}>
        {testimonials.map((testimonial, index) => (
          <TestimonialCard
            key={testimonial.id || index}
            testimonial={testimonial}
            layout={finalLayout}
            theme={theme}
            index={index}
            animate={animation.enabled}
          />
        ))}
      </div>
    );
  };

  // Render based on variant
  const renderTestimonials = () => {
    switch (variant) {
      case "carousel":
        return renderCarousel();
      case "spotlight":
        return renderSpotlight();
      case "masonry":
        return renderMasonry();
      case "quote-wall":
        return renderQuoteWall();
      case "grid":
      case "cards":
      case "minimal":
      case "video-cards":
      default:
        return renderGrid();
    }
  };

  return (
    <section
      id={id}
      className={`relative ${paddingClasses.lg} overflow-hidden ${className}`}
    >
      {/* Background */}
      {background && <SectionBackground config={background} theme={theme} />}

      {/* Content */}
      <div className="container mx-auto relative z-10">
        {/* Trust Badge */}
        {renderTrustBadge()}

        {/* Header */}
        {header && <SectionHeader config={header} theme={theme} animate={animation.enabled} />}

        {/* Testimonials */}
        {renderTestimonials()}
      </div>
    </section>
  );
}
