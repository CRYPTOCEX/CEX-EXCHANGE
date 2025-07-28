import React from "react";
import { cn } from "@/lib/utils";
import { Circle, CheckCircle2 } from "lucide-react";

interface TableOfContentsProps {
  docs: DocSection[];
  activeSection: string;
  readSections: Set<string>;
  onSectionClick: (sectionId: string) => void;
}

export function TableOfContents({
  docs,
  activeSection,
  readSections,
  onSectionClick,
}: TableOfContentsProps) {
  return (
    <div className="space-y-1">
      {docs.map((section) => (
        <div key={section.id}>
          <button
            onClick={() => onSectionClick(section.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              activeSection === section.id
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50",
              readSections.has(section.id) && "text-muted-foreground"
            )}
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              {readSections.has(section.id) ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <span className="text-left">{section.title}</span>
          </button>

          {section.subsections && (
            <div className="ml-4 space-y-1 pt-1">
              {section.subsections.map((subsection) => (
                <button
                  key={subsection.id}
                  onClick={() => onSectionClick(subsection.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    activeSection === subsection.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50",
                    readSections.has(subsection.id) && "text-muted-foreground"
                  )}
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {readSections.has(subsection.id) ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-left">{subsection.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export { TableOfContents as DocumentationTableOfContents };
