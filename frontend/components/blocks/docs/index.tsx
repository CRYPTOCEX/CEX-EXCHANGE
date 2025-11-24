"use client";

import React, { useState, useEffect } from "react";
import { DocumentationHeader } from "./DocumentationHeader";
import { DocumentationSidebar } from "./DocumentationSidebar";
import { DocumentationMainContent } from "./DocumentationMainContent";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

interface DocumentationProps {
  docs: DocSection[];
  ref?: React.Ref<HTMLDivElement>;
}

const mobileVisibility = 0.5;
const desktopVisibility = 0.7;

export function Documentation({ docs, ref }: DocumentationProps) {
  const isMobile = useMediaQuery("(max-width: 767px)"); // Define isMobile
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    [docs[0].id]: true, // First section expanded by default
  });
  const [activeSection, setActiveSection] = useState<string>(docs[0].id);
  const [readSections, setReadSections] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile); // Hide sidebar initially on mobile
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<string>>(
    new Set()
  );

  const visibility = isMobile ? mobileVisibility : desktopVisibility;

  // Calculate progress
  const totalSections = docs.reduce(
    (acc, section) => acc + 1 + (section.subsections?.length || 0),
    0
  );
  const progress = (readSections.size / totalSections) * 100;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= visibility) {
            // Require 70% visibility
            const sectionId = entry.target.id;
            setActiveSection(sectionId);
            setReadSections((prev) => new Set([...prev, sectionId]));

            // Find the parent section if this is a subsection
            const parentSection = docs.find((section) =>
              section.subsections?.some((sub) => sub.id === sectionId)
            );
            if (parentSection) {
              if (!readSections.has(parentSection.id)) {
                setReadSections((prev) => new Set([...prev, parentSection.id]));
              }
              // Automatically expand the parent section only if it wasn't manually collapsed
              if (!manuallyCollapsed.has(parentSection.id)) {
                setExpandedSections((prev) => ({
                  ...prev,
                  [parentSection.id]: true,
                }));
              }
            }

            // If it's a main section, expand it only if it wasn't manually collapsed
            if (
              docs.some((section) => section.id === sectionId) &&
              !manuallyCollapsed.has(sectionId)
            ) {
              setExpandedSections((prev) => ({
                ...prev,
                [sectionId]: true,
              }));
            }
          }
        });
      },
      {
        threshold: visibility, // Require 70% visibility
        rootMargin: "-20% 0px -30% 0px", // Shrink the effective viewport to require elements to be more centered
      }
    );

    docs.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
      section.subsections?.forEach((subsection) => {
        const subElement = document.getElementById(subsection.id);
        if (subElement) observer.observe(subElement);
      });
    });

    return () => observer.disconnect();
  }, [docs, readSections, manuallyCollapsed]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newState = { ...prev, [sectionId]: !prev[sectionId] };
      if (newState[sectionId]) {
        // If expanding, remove from manually collapsed set
        setManuallyCollapsed((prev) => {
          const newSet = new Set(prev);
          newSet.delete(sectionId);
          return newSet;
        });
      } else {
        // If collapsing, add to manually collapsed set
        setManuallyCollapsed((prev) => new Set(prev).add(sectionId));
      }
      return newState;
    });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <Card ref={ref}>
      <DocumentationHeader
        progress={progress}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isMobile={isMobile}
      />
      <div
        className={cn(
          "grid transition-all",
          isSidebarOpen && "md:grid-cols-[280px_1fr]",
          !isSidebarOpen && "md:grid-cols-1"
        )}
      >
        {!isMobile && ( // Conditionally render sidebar
          <DocumentationSidebar
            isSidebarOpen={isSidebarOpen}
            docs={docs}
            activeSection={activeSection}
            readSections={readSections}
            onSectionClick={scrollToSection}
          />
        )}
        <DocumentationMainContent
          docs={docs}
          expandedSections={expandedSections}
          readSections={readSections}
          toggleSection={toggleSection}
        />
      </div>
    </Card>
  );
}
