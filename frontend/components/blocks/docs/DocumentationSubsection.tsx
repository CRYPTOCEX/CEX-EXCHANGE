import React from "react";

interface DocSubsection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface DocSubsectionProps {
  subsection: DocSubsection;
}

export function DocumentationSubsection({ subsection }: DocSubsectionProps) {
  return (
    <div id={subsection.id} className="relative pl-6 border-l border-border">
      <div className="absolute -left-[1.25px] top-[6px] w-[2px] h-[12px] bg-primary rounded-sm" />
      <h3 className="text-base font-medium mb-2">{subsection.title}</h3>
      <p className="text-sm text-muted-foreground">{subsection.content}</p>
    </div>
  );
}
