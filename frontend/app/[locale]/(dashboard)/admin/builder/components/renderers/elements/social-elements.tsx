"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  memo,
  useMemo,
} from "react";
import type { Element } from "@/types/builder";
import { cn } from "@/lib/utils";
import { Star, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { getIconComponent } from "./utils";

// Optimized Testimonial Element
export const TestimonialElement = memo(({ element }: { element: Element }) => {
  const settings = element.settings || {};
  const displayType = settings.displayType || "card";
  const testimonials = settings.testimonials || [
    {
      quote:
        settings.quote ||
        "This product has completely transformed how we work. Highly recommended!",
      author: settings.author || "Jane Smith",
      role: settings.role || "CEO, Company Inc.",
      avatarSrc: settings.avatarSrc || "/placeholder.svg?height=50&width=50",
      rating: settings.rating || 5,
    },
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const goToSlide = useCallback((index: number) => setCurrentIndex(index), []);
  const goToPrevSlide = useCallback(
    () =>
      goToSlide((currentIndex - 1 + testimonials.length) % testimonials.length),
    [currentIndex, testimonials.length, goToSlide]
  );
  const goToNextSlide = useCallback(
    () => goToSlide((currentIndex + 1) % testimonials.length),
    [currentIndex, testimonials.length, goToSlide]
  );

  // Memoized testimonial renderer
  const renderTestimonial = useCallback((testimonial: any, index: number) => {
    return (
      <div
        key={index}
        className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
      >
        {testimonial.rating > 0 && (
          <div className="flex mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-5 w-5",
                  i < testimonial.rating
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300"
                )}
              />
            ))}
          </div>
        )}
        <blockquote className="text-gray-700 mb-4 italic">
          "{testimonial.quote}"
        </blockquote>
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full overflow-hidden mr-3 bg-gray-100">
            <img
              src={testimonial.avatarSrc || "/placeholder.svg"}
              alt={testimonial.author}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div>
            <div className="font-medium">{testimonial.author}</div>
            <div className="text-sm text-gray-500">{testimonial.role}</div>
          </div>
        </div>
      </div>
    );
  }, []);

  // Memoized grid classes
  const gridClasses = useMemo(
    () => "grid gap-4 md:grid-cols-2 lg:grid-cols-3",
    []
  );

  // Memoized slider transform
  const sliderTransform = useMemo(
    () => `translateX(-${currentIndex * 100}%)`,
    [currentIndex]
  );
  useEffect(() => {
    if (displayType === "slider" && testimonials.length > 1) {
      autoplayRef.current = setInterval(goToNextSlide, 5000);
      return () => {
        if (autoplayRef.current) {
          clearInterval(autoplayRef.current);
        }
      };
    }
    return undefined;
  }, [displayType, testimonials.length, goToNextSlide]);
  if (displayType === "card") {
    return (
      <div
        className="w-full"
        data-element-id={element.id}
        data-element-type="testimonial"
      >
        {testimonials.length === 1 ? (
          renderTestimonial(testimonials[0], 0)
        ) : (
          <div className={gridClasses}>
            {testimonials.map((testimonial: any, index: number) =>
              renderTestimonial(testimonial, index)
            )}
          </div>
        )}
      </div>
    );
  }
  return (
    <div
      className="w-full relative"
      data-element-id={element.id}
      data-element-type="testimonial"
    >
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{
            transform: sliderTransform,
          }}
        >
          {testimonials.map((testimonial: any, index: number) => (
            <div key={index} className="w-full flex-shrink-0 px-4">
              {renderTestimonial(testimonial, index)}
            </div>
          ))}
        </div>
      </div>
      {testimonials.length > 1 && (
        <>
          <button
            onClick={goToPrevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow-md hover:bg-white transition-colors"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow-md hover:bg-white transition-colors"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="flex justify-center mt-4 gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentIndex ? "bg-purple-600" : "bg-gray-300"
                )}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
});
TestimonialElement.displayName = "TestimonialElement";

// Optimized Stats Element
export const StatsElement = memo(({ element }: { element: Element }) => {
  // Define default stats that will be used if none are provided
  const defaultStats = useMemo(
    () => [
      {
        label: "Users",
        value: "10K+",
        icon: "users",
      },
      {
        label: "Countries",
        value: "30+",
        icon: "globe",
      },
      {
        label: "Servers",
        value: "100+",
        icon: "server",
      },
    ],
    []
  );
  const settings = element.settings || {};
  // Use the provided stats or fall back to default stats
  const stats = settings.stats || defaultStats;
  const layout = settings.layout || "row";
  const columns = settings.columns || 3;
  const getIcon = useCallback((iconName: string) => {
    const IconComponent = getIconComponent(iconName);
    return IconComponent ? (
      <IconComponent className="h-6 w-6 text-purple-500" />
    ) : (
      <Users className="h-6 w-6 text-purple-500" />
    );
  }, []);
  const containerClasses = useMemo(
    () =>
      cn(
        "w-full",
        layout === "row"
          ? "flex flex-wrap justify-around"
          : `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-${Math.min(columns, 4)} gap-4`
      ),
    [layout, columns]
  );
  const statItemClasses = useMemo(
    () => (layout === "row" ? "flex-1 min-w-[120px]" : "border rounded-lg"),
    [layout]
  );
  return (
    <div
      className={containerClasses}
      data-element-id={element.id}
      data-element-type="stats"
    >
      {stats.map((stat, index) => (
        <div
          key={index}
          className={cn(
            "flex flex-col items-center p-4 text-center",
            statItemClasses
          )}
        >
          <div className="mb-2">{getIcon(stat.icon)}</div>
          <div className="text-2xl font-bold">{stat.value}</div>
          <div className="text-sm text-gray-500">{stat.label}</div>
        </div>
      ))}
    </div>
  );
});
StatsElement.displayName = "StatsElement";
