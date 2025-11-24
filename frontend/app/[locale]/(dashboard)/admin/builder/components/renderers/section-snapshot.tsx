"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { useBuilderStore } from "@/store/builder-store";
import type { Section } from "@/types/builder";
import SectionRenderer from "./section-renderer";
import { useTheme } from "next-themes";

interface SectionSnapshotProps {
  section: Section;
  onSnapshotGenerated?: (snapshots: { card: string; preview: string }) => void;
}

// Global state to track snapshot generation failures and active generations
let globalFailureCount = 0;
let lastFailureTime = 0;
const MAX_FAILURES = 5;
const FAILURE_RESET_TIME = 60000; // Reset after 1 minute

// Global set to track which sections are currently generating snapshots
const activeGenerations = new Set<string>();

// Global rate limiting system
const MAX_CONCURRENT_SNAPSHOTS = 6; // Increased from 2 to 6 for better performance
const SNAPSHOT_QUEUE: Array<() => Promise<void>> = [];
let currentConcurrentCount = 0;

// Queue processor
const processSnapshotQueue = async () => {
  if (
    currentConcurrentCount >= MAX_CONCURRENT_SNAPSHOTS ||
    SNAPSHOT_QUEUE.length === 0
  ) {
    return;
  }

  currentConcurrentCount++;
  const nextGeneration = SNAPSHOT_QUEUE.shift();

  if (nextGeneration) {
    try {
      await nextGeneration();
    } finally {
      currentConcurrentCount--;
      // Reduced delay for faster processing
      setTimeout(processSnapshotQueue, 100);
    }
  }
};

// Add generation to queue
const queueSnapshotGeneration = (generationFn: () => Promise<void>) => {
  SNAPSHOT_QUEUE.push(generationFn);
  processSnapshotQueue();
};

export function SectionSnapshot({
  section,
  onSnapshotGenerated,
}: SectionSnapshotProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { theme } = useTheme();

  // Memoize the callback to prevent useEffect retriggering
  const memoizedCallback = useCallback(onSnapshotGenerated || (() => {}), []);

  useEffect(() => {
    // Early validation checks
    if (!section || typeof section !== "object" || !section.id) {
      console.warn(`SectionSnapshot: Invalid section provided:`, section);
      return;
    }

    if (!section.rows || !Array.isArray(section.rows)) {
      console.warn(
        `SectionSnapshot: Section missing required properties:`,
        section
      );
      return;
    }

    // Skip if already generating snapshots for this section
    if (isGenerating || activeGenerations.has(section.id)) {
      console.log(
        `SectionSnapshot: Already generating snapshots for section ${section.id}, skipping`
      );
      return;
    }

    // Check if valid snapshots already exist (NOT placeholders)
    if (section.snapshots?.card && section.snapshots?.preview) {
      const hasValidSnapshots =
        section.snapshots.card &&
        section.snapshots.preview &&
        !section.snapshots.card.includes("placeholder") &&
        !section.snapshots.preview.includes("placeholder") &&
        section.snapshots.card.length > 100 && // Base64 images are much longer
        section.snapshots.preview.length > 100;

      if (hasValidSnapshots) {
        console.log(
          `SectionSnapshot: Valid snapshots already exist for section ${section.id}, skipping generation`
        );
        // Call callback with existing snapshots
        if (memoizedCallback) {
          memoizedCallback(section.snapshots);
        }
        return;
      }
    }

    // Check if snapshot generation is temporarily disabled due to failures
    const now = Date.now();
    if (now - lastFailureTime > FAILURE_RESET_TIME) {
      globalFailureCount = 0; // Reset failure count after timeout
    }

    if (globalFailureCount >= MAX_FAILURES) {
      console.warn(
        `SectionSnapshot: Snapshot generation temporarily disabled due to ${globalFailureCount} consecutive failures. Using placeholder for section ${section.id}`
      );

      // Create fallback snapshots immediately
      const fallbackSnapshots = {
        card: `/placeholder.svg?height=360&width=600&text=${section.name || "Section"}`,
        preview: `/placeholder.svg?height=800&width=1200&text=${section.name || "Section"}`,
      };

      // Call the callback with fallback snapshots if provided
      if (memoizedCallback) {
        memoizedCallback(fallbackSnapshots);
      }

      return;
    }

    // Validate section structure to prevent null/undefined issues
    const hasValidRows = section.rows.some((row) => {
      if (!row || typeof row !== "object") return false;
      if (!row.columns || !Array.isArray(row.columns)) return false;
      return row.columns.some((column) => column && typeof column === "object");
    });

    if (!hasValidRows) {
      console.warn(
        `SectionSnapshot: Section has no valid content for snapshot:`,
        section
      );
      return;
    }

    // Create the generation task to be queued
    const generationTask = async () => {
      if (!sectionRef.current) return;

      // Mark this section as actively generating
      activeGenerations.add(section.id);
      setIsGenerating(true);
      console.log(
        `SectionSnapshot: Starting queued snapshot generation for section ${section.id}`
      );

      try {
        // Wait for DOM stability before attempting snapshot
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Ensure the DOM element is still valid and attached
        if (!sectionRef.current || !document.contains(sectionRef.current)) {
          console.warn(`SectionSnapshot: DOM element not available for section ${section.id}`);
          return;
        }

        // Double-check if snapshots were generated by another instance
        const currentSection = useBuilderStore
          .getState()
          .page.sections.find((s) => s.id === section.id);
        if (
          currentSection?.snapshots?.card &&
          currentSection?.snapshots?.preview &&
          !currentSection.snapshots.card.includes("placeholder")
        ) {
          console.log(
            `SectionSnapshot: Snapshots already generated by another instance for section ${section.id}`
          );
          activeGenerations.delete(section.id);
          setIsGenerating(false);
          if (memoizedCallback) {
            memoizedCallback(currentSection.snapshots);
          }
          return;
        }

        const generateSnapshotSafely = async (
          element: HTMLElement,
          options: any,
          type: "card" | "preview"
        ) => {
          try {
            console.log(
              `SectionSnapshot: Generating ${type} snapshot for section ${section.id}`
            );

            // Enhanced robust filter function
            const robustFilter = (node: any): boolean => {
              try {
                // First level: null/undefined checks
                if (!node) return false;
                if (node === null || node === undefined) return false;
                if (typeof node !== "object") return false;

                // Second level: basic DOM node validation
                if (!("nodeType" in node)) return false;
                if (typeof node.nodeType !== "number") return false;

                // Third level: node type validation
                const nodeType = node.nodeType;
                if (nodeType !== Node.ELEMENT_NODE && 
                    nodeType !== Node.TEXT_NODE && 
                    nodeType !== Node.DOCUMENT_NODE &&
                    nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
                  return false;
                }

                // Fourth level: prototype validation (the problematic area)
                try {
                  const proto = Object.getPrototypeOf(node);
                  if (!proto) return false;
                } catch (protoError) {
                  console.warn(`SectionSnapshot: Prototype check failed for node:`, protoError);
                  return false;
                }

                // Fifth level: element-specific checks
                if (nodeType === Node.ELEMENT_NODE) {
                  try {
                    // Safe access to element properties
                    const tagName = node.tagName?.toLowerCase?.() || "";
                    const problematicTags = [
                      "script", "style", "iframe", "object", "embed", "applet",
                      "meta", "link", "base", "title", "head", "noscript"
                    ];

                    if (problematicTags.includes(tagName)) return false;

                    // Check contentEditable safely
                    if (node.contentEditable === "true" || node.contentEditable === true) return false;

                    // Check for problematic classes
                    if (typeof node.className === "string") {
                      const problematicClasses = [
                        "resize-handle", "selection-", "hover-outline",
                        "react-", "data-react", "__next", "chakra-"
                      ];
                      if (problematicClasses.some(cls => node.className.includes(cls))) {
                        return false;
                      }
                    }
                  } catch (elemError) {
                    console.warn(`SectionSnapshot: Element check failed:`, elemError);
                    return false;
                  }
                }

                return true;
              } catch (filterError) {
                console.warn(`SectionSnapshot: Filter error for node:`, filterError);
                return false;
              }
            };

            const enhancedOptions = {
              ...options,
              backgroundColor: theme === "dark" ? "#18181b" : "#ffffff",
              filter: robustFilter,
              // Add timeout to prevent hanging
              timeout: 15000, // 15 second timeout
            };

            // Add a promise wrapper with timeout
            const snapshotPromise = toPng(element, enhancedOptions);
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error(`Snapshot generation timeout after 15s`)), 15000);
            });

            const result = await Promise.race([snapshotPromise, timeoutPromise]) as string;
            console.log(
              `SectionSnapshot: ${type} snapshot generated successfully for section ${section.id}`
            );
            return result;
          } catch (error) {
            console.error(
              `SectionSnapshot: Error generating ${type} snapshot for section ${section.id}:`,
              error
            );
            globalFailureCount++;
            lastFailureTime = Date.now();

            // Return fallback image
            return `/placeholder.svg?height=${type === "card" ? 360 : 800}&width=${type === "card" ? 600 : 1200}&text=${encodeURIComponent(section.name || "Section")}`;
          }
        };

        // Define the style object for consistent scaling
        const cardStyle = {
          transform: "scale(0.5)",
          transformOrigin: "top left",
          width: "1200px",
          height: "auto",
          minHeight: "600px",
        };

        const previewStyle = {
          transform: "scale(0.8)",
          transformOrigin: "top left",
          width: "1200px",
          height: "auto",
          minHeight: "800px",
        };

        // Generate both snapshots in parallel for better performance
        const [cardSnapshot, previewSnapshot] = await Promise.all([
          generateSnapshotSafely(
            sectionRef.current,
            {
              quality: 0.8, // Reduced quality for faster generation
              width: 600,
              height: 360,
              pixelRatio: 1.5, // Reduced pixel ratio for speed
              style: cardStyle,
              skipFonts: true,
              useCORS: true,
              allowTaint: true,
              fetchRequestInit: { mode: "cors" },
              fontEmbedCSS: "",
            },
            "card"
          ),

          generateSnapshotSafely(
            sectionRef.current,
            {
              quality: 0.8, // Reduced quality for faster generation
              width: 1200,
              height: 800,
              pixelRatio: 1.5, // Reduced pixel ratio for speed
              style: previewStyle,
              skipFonts: true,
              useCORS: true,
              allowTaint: true,
              fetchRequestInit: { mode: "cors" },
              fontEmbedCSS: "",
            },
            "preview"
          ),
        ]);

        // Create snapshots object with fallbacks
        const snapshots = {
          card:
            cardSnapshot ||
            `/placeholder.svg?height=360&width=600&text=${section.name || "Section"}`,
          preview:
            previewSnapshot ||
            `/placeholder.svg?height=800&width=1200&text=${section.name || "Section"}`,
        };

        // Update the section's snapshots in the store
        useBuilderStore
          .getState()
          .updateSectionSnapshots(section.id, snapshots);

        // Call the callback if provided
        if (memoizedCallback) {
          memoizedCallback(snapshots);
        }

        console.log(
          `SectionSnapshot: Completed snapshot generation for section ${section.id}`
        );
      } catch (error) {
        console.error("Error generating snapshots:", error);

        // Create fallback snapshots
        const fallbackSnapshots = {
          card: `/placeholder.svg?height=360&width=600&text=${section.name || "Section"}`,
          preview: `/placeholder.svg?height=800&width=1200&text=${section.name || "Section"}`,
        };

        // Call the callback with fallback snapshots if provided
        if (memoizedCallback) {
          memoizedCallback(fallbackSnapshots);
        }
      } finally {
        activeGenerations.delete(section.id);
        setIsGenerating(false);
      }
    };

    // Add the generation task to the queue instead of running immediately
    queueSnapshotGeneration(generationTask);
  }, [section.id, memoizedCallback, theme]); // Use memoized callback

  // Render the section in a hidden div to capture it, but only if section is valid
  if (
    !section ||
    typeof section !== "object" ||
    !section.rows ||
    !Array.isArray(section.rows)
  ) {
    return null;
  }

  try {
    return (
      <div className="absolute left-[-9999px] top-[-9999px] overflow-hidden opacity-0 pointer-events-none">
        <div
          ref={sectionRef}
          className={`w-[1200px] ${theme === "dark" ? "dark bg-zinc-900" : "bg-white"}`}
          data-theme={theme}
          data-snapshot="true"
          style={{
            fontFamily:
              'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
            lineHeight: "1.5",
          }}
        >
          <SectionRenderer section={section} isPreview={true} />
        </div>
      </div>
    );
  } catch (error) {
    console.error(
      `SectionSnapshot: Critical error rendering section ${section.id}:`,
      error
    );
    return null;
  }
}
