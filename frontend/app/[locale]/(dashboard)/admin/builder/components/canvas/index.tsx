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
import { SkeletonBlock } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { DragAndDropProvider, CustomDragLayer } from "./dnd";
import { useTranslations } from "next-intl";

interface CanvasContentProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  isEditMode: boolean;
  /**
   * The route is still fetching the page this canvas is meant to show.
   *
   * Load-bearing because the store's `page.sections` is `[]` in TWO unrelated
   * situations — "not fetched yet" and "this page really has no sections" —
   * and `EmptyCanvas` states the second one as a fact ("Your canvas is empty",
   * with an Add Section button). Until this prop existed the route hid the
   * ambiguity by not rendering the canvas at all while loading; now that the
   * shell renders from the first paint, the canvas has to be told which of the
   * two empties it is looking at, or every page open would flash "your canvas
   * is empty" at an author whose page is full.
   */
  loading?: boolean;
}

function CanvasContent({ canvasRef, isEditMode, loading = false }: CanvasContentProps) {
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
      const store = useBuilderStore.getState();
      store.selectElement(null);
      store.selectSection(null);
      store.selectRow("", null);
      store.selectColumn("", "", null);
      clearHover();
    }
  };

  // Safety check to ensure sections is always an array
  const sections = page?.sections || [];

  /**
   * "This page has no sections" is a CONCLUSION about a page that has arrived.
   *
   * Without the `!loading` term it was also drawn about a page that had not,
   * so every open of the builder would have flashed "Your canvas is empty",
   * with an Add Section button, at an author whose page is full. The route
   * hid that until now by not rendering the canvas at all while loading —
   * which was the larger defect.
   */
  const showEmptyCanvas = !loading && (!page || sections.length === 0);

  if (showEmptyCanvas) {
    return <EmptyCanvas />;
  }

  /* ONE container, both states — same `min-h-full p-4` and the same click
     target — so the canvas card keeps its geometry when the page lands and
     only its CONTENTS change. */
  return (
    <div className="min-h-full p-4" onClick={handleCanvasClick}>
      {loading
        ? PENDING_BANDS.map((height, i) => (
            <SkeletonBlock
              key={i}
              className={cn("w-full rounded-none", height, i > 0 && "mt-4")}
            />
          ))
        : sections.map((section, index) => (
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

/**
 * Band heights for the pending canvas.
 *
 * A section is an arbitrary block of authored layout, so there is no text to
 * measure and `SkeletonBlock` — the primitive for things with no text metrics —
 * is the right one. Three bands is a SHAPE, not a claim about how many sections
 * the page has; what it buys is that the canvas card has a height during the
 * fetch instead of collapsing to zero and then jumping to full page height,
 * taking the scroll position with it.
 */
const PENDING_BANDS = ["h-64", "h-40", "h-80"];

function EmptyCanvas() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const { toggleAddSectionModal } = useBuilderStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-16">
      <div className="text-center space-y-3 max-w-md mx-auto p-5 rounded-lg border-2 border-dashed border-border-strong bg-muted">
        <h3 className="text-base font-medium text-muted-foreground">
          {t("your_canvas_is_empty")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("start_building_your_and_elements")}
        </p>
        <Button
          onClick={toggleAddSectionModal}
          className="bg-primary hover:bg-primary h-9 text-sm text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          {tCommon("add_section")}
        </Button>
      </div>
    </div>
  );
}

export default function BuilderCanvas({ loading = false }: { loading?: boolean }) {
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

  // Clear every selection at once when the user clicks the empty area around
  // the canvas (anywhere that is not a section/row/column/element). This fires
  // only when the click originated on the specific wrapper div, not when it
  // bubbled from deeper content (e.currentTarget === e.target).
  const handleEmptyAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode) return;
    if (e.currentTarget !== e.target) return;
    const store = useBuilderStore.getState();
    store.selectElement(null);
    store.selectSection(null);
    store.selectRow("", null);
    store.selectColumn("", "", null);
  };

  return (
    <DragAndDropProvider>
      <BuilderHoverProvider>
        <div
          className="w-full bg-muted min-h-full"
          onClick={handleEmptyAreaClick}
        >
          <div
            className="flex justify-center p-4"
            onClick={handleEmptyAreaClick}
          >
            <div
              ref={canvasRef}
              className={cn(
                "w-full bg-card transition-all duration-300",
                getCanvasWidth()
              )}
              onClick={handleEmptyAreaClick}
            >
              {/* Fix: Type assertion to satisfy the ref type requirement */}
              <CanvasContent
                canvasRef={canvasRef as React.RefObject<HTMLDivElement>}
                isEditMode={isEditMode}
                loading={loading}
              />
            </div>
          </div>
          <CustomDragLayer />
        </div>
      </BuilderHoverProvider>
    </DragAndDropProvider>
  );
}
