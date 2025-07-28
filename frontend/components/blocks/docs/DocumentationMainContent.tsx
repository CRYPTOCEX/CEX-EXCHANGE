import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocumentationSection } from "./DocumentationSection";

interface DocumentationMainContentProps {
  docs: DocSection[];
  expandedSections: Record<string, boolean>;
  readSections: Set<string>;
  toggleSection: (sectionId: string) => void;
}

export function DocumentationMainContent({
  docs,
  expandedSections,
  readSections,
  toggleSection,
}: DocumentationMainContentProps) {
  return (
    <main className="min-h-[500px]">
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="max-w-3xl mx-auto p-6 pb-24">
          {docs.map((section) => (
            <DocumentationSection
              key={section.id}
              section={section}
              isExpanded={expandedSections[section.id]}
              isRead={readSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </main>
  );
}
