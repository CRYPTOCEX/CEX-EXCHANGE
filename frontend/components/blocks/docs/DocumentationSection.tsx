import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Circle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentationSubsection } from "./DocumentationSubsection";
import { useTranslations } from "next-intl";

interface DocSectionProps {
  section: DocSection;
  isExpanded: boolean;
  isRead: boolean;
  onToggle: () => void;
}

export function DocumentationSection({
  section,
  isExpanded,
  isRead,
  onToggle,
}: DocSectionProps) {
  const t = useTranslations("components/blocks/docs/DocumentationSection");
  return (
    <div id={section.id} className="mb-6">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 rounded-lg hover:bg-accent/50 p-4 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
            {isRead ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {section.title}
              {isRead && (
                <span className="text-xs font-normal text-muted-foreground">
                  {t("Read")}
                </span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {section.content}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
            isExpanded ? "rotate-180" : ""
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && section.subsections && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-12 mt-4 space-y-6">
              {section.subsections.map((subsection) => (
                <DocumentationSubsection
                  key={subsection.id}
                  subsection={subsection}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
