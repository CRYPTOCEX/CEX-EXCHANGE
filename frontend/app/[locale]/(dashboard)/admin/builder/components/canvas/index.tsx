"use client";
import { useState, useRef, useEffect } from "react";
import type React from "react";

import { useBuilderStore } from "@/store/builder-store";
import {
  BuilderHoverProvider,
  useBuilderHover,
} from "./context/builder-hover-context";

import Section from "./structure/section";
import SectionRenderer from "../renderers/section-renderer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { DragAndDropProvider, CustomDragLayer } from "./dnd";
import { useTranslations } from "next-intl";

interface CanvasContentProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  isEditMode: boolean;
}

function CanvasContent({ canvasRef, isEditMode }: CanvasContentProps) {
  const { page, selectedSectionId, selectSection } = useBuilderStore();
  const { clearHover } = useBuilderHover();
  const [insertPosition, setInsertPosition] = useState<number | null>(null);

  const handleAddSectionClick = (position?: number) => {
    if (position !== undefined) {
      setInsertPosition(position);
    } else {
      setInsertPosition(page.sections.length);
    }
    useBuilderStore.getState().toggleAddSectionModal();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) {
      useBuilderStore.getState().selectElement(null);
      // Fix: Pass empty string instead of null for string parameters
      useBuilderStore.getState().selectSection("");
      useBuilderStore.getState().selectRow("", "");
      useBuilderStore.getState().selectColumn("", "", "");
      clearHover();
    }
  };

  // Safety check to ensure sections is always an array
  const sections = page?.sections || [];
  
  if (!page || !sections || sections.length === 0) {
    return <EmptyCanvas />;
  }

  return (
    <div className="min-h-full p-4" onClick={handleCanvasClick}>
      {sections.map((section, index) => (
        <div key={section.id} className="relative">
          {isEditMode ? (
            <Section
              section={section}
              isSelected={selectedSectionId === section.id}
              onSelect={() => selectSection(section.id)}
              index={index}
              totalSections={sections.length}
              isEditMode={isEditMode}
            />
          ) : (
            <SectionRenderer section={section} isPreview={true} />
          )}
        </div>
      ))}
    </div>
  );
}

function EmptyCanvas() {
  const t = useTranslations("dashboard");
  const { toggleAddSectionModal } = useBuilderStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-16">
      <div className="text-center space-y-3 max-w-md mx-auto p-5 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <h3 className="text-base font-medium dark:text-zinc-300">
          {t("your_canvas_is_empty")}
        </h3>
        <p className="text-sm text-muted-foreground dark:text-zinc-400">
          {t("start_building_your_and_elements")}
        </p>
        <Button
          onClick={toggleAddSectionModal}
          className="bg-purple-600 hover:bg-purple-700 h-9 text-sm text-white dark:text-white"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          {t("add_section")}
        </Button>
      </div>
    </div>
  );
}

export default function BuilderCanvas() {
  // Fix: Explicitly type the ref to allow null
  const canvasRef = useRef<HTMLDivElement>(null);
  const { viewMode, isPreviewMode } = useBuilderStore();
  const isEditMode = !isPreviewMode;

  const getCanvasWidth = () => {
    switch (viewMode) {
      case "mobile":
        return "max-w-[375px]";
      case "tablet":
        return "max-w-[768px]";
      case "desktop":
      default:
        return "max-w-6xl";
    }
  };

  useEffect(() => {
    if (isPreviewMode) {
      // Function to handle scroll effects
      const handleScrollEffects = () => {
        const elements =
          document.querySelectorAll<HTMLElement>(".scroll-effect");

        elements.forEach((element) => {
          if (!element) return;

          const rect = element.getBoundingClientRect();
          const triggerPosition = Number.parseInt(
            element.getAttribute("data-scroll-trigger") || "50",
            10
          );
          const windowHeight = window.innerHeight;
          const triggerPoint = windowHeight * (triggerPosition / 100);

          // Check if element is in view
          if (rect.top <= triggerPoint && rect.bottom >= 0) {
            const effectType = element.getAttribute("data-scroll-effect");
            const duration =
              element.getAttribute("data-scroll-duration") || "0.5";
            const intensity = Number.parseFloat(
              element.getAttribute("data-scroll-intensity") || "1"
            );
            const once = element.getAttribute("data-scroll-once") === "true";

            // Apply the effect
            element.style.transition = `all ${duration}s ease-out`;

            switch (effectType) {
              case "fade":
                element.style.opacity = "1";
                break;
              case "slide":
                element.style.transform = "translateY(0)";
                break;
              case "zoom":
                element.style.transform = "scale(1)";
                break;
              case "rotate":
                element.style.transform = "rotate(0deg)";
                break;
              case "parallax": {
                // Fix: Wrap case content in a block to avoid lexical declaration error
                const scrolled = window.scrollY;
                const parallaxSpeed = intensity * 0.1;
                element.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
                break;
              }
            }

            if (once) {
              element.classList.remove("scroll-effect");
            }
          } else {
            // Reset the element if not in view and not set to "once"
            const once = element.getAttribute("data-scroll-once") === "true";
            const effectType = element.getAttribute("data-scroll-effect");

            if (!once) {
              switch (effectType) {
                case "fade":
                  element.style.opacity = "0";
                  break;
                case "slide":
                  element.style.transform = "translateY(50px)";
                  break;
                case "zoom":
                  element.style.transform = "scale(0.8)";
                  break;
                case "rotate":
                  element.style.transform = "rotate(10deg)";
                  break;
              }
            }
          }
        });
      };

      // Initialize elements
      const initScrollEffects = () => {
        const elements =
          document.querySelectorAll<HTMLElement>(".scroll-effect");

        elements.forEach((element) => {
          if (!element) return;

          const effectType = element.getAttribute("data-scroll-effect");

          // Set initial state
          switch (effectType) {
            case "fade":
              element.style.opacity = "0";
              break;
            case "slide":
              element.style.transform = "translateY(50px)";
              break;
            case "zoom":
              element.style.transform = "scale(0.8)";
              break;
            case "rotate":
              element.style.transform = "rotate(10deg)";
              break;
          }
        });

        // Run once to check initial viewport
        handleScrollEffects();
      };

      // Add scroll listener
      window.addEventListener("scroll", handleScrollEffects);
      initScrollEffects();

      return () => {
        window.removeEventListener("scroll", handleScrollEffects);
      };
    }
  }, [isPreviewMode]);

  return (
    <DragAndDropProvider>
      <BuilderHoverProvider>
        <div className="w-full bg-zinc-100 dark:bg-zinc-950 min-h-full">
          <div className="flex justify-center p-4">
            <div
              ref={canvasRef}
              className={cn(
                "w-full bg-white dark:bg-zinc-900 shadow-sm transition-all duration-300",
                getCanvasWidth()
              )}
            >
              {/* Fix: Type assertion to satisfy the ref type requirement */}
              <CanvasContent
                canvasRef={canvasRef as React.RefObject<HTMLDivElement>}
                isEditMode={isEditMode}
              />
            </div>
          </div>
          <CustomDragLayer />
        </div>
      </BuilderHoverProvider>
    </DragAndDropProvider>
  );
}
