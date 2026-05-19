"use client";

import React from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Comprehensive markdown to HTML converter supporting all changelog formats
function markdownToHtml(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.split("\n");
  const result: string[] = [];
  let i = 0;
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockContent: string[] = [];

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  const processInline = (text: string): string => {
    // Bold
    text = text.replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="font-semibold text-foreground">$1</strong>'
    );
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    // Inline code
    text = text.replace(
      /`([^`]+)`/g,
      '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary">$1</code>'
    );
    // Links
    text = text.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    return text;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeBlockContent = [];
        i++;
        continue;
      } else {
        inCodeBlock = false;
        const code = escapeHtml(codeBlockContent.join("\n"));
        result.push(
          `<div class="my-4 rounded-lg overflow-hidden bg-muted/50 border border-border">` +
            (codeBlockLang
              ? `<div class="px-4 py-2 bg-muted text-xs font-mono text-muted-foreground border-b border-border uppercase tracking-wide">${escapeHtml(codeBlockLang)}</div>`
              : "") +
            `<pre class="p-4 overflow-x-auto"><code class="text-sm font-mono text-foreground leading-relaxed">${code}</code></pre>` +
            `</div>`
        );
        i++;
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      i++;
      continue;
    }

    // Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      result.push('<hr class="my-6 border-border" />');
      i++;
      continue;
    }

    // Headers (check from most specific to least specific)
    if (trimmed.startsWith("###### ")) {
      result.push(
        `<h6 class="text-sm font-semibold text-foreground/90 mt-3 mb-1">${processInline(trimmed.slice(7).trim())}</h6>`
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("##### ")) {
      result.push(
        `<h5 class="text-sm font-semibold text-foreground mt-4 mb-2 flex items-center gap-2"><span class="text-primary/70">»</span> ${processInline(trimmed.slice(6).trim())}</h5>`
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("#### ")) {
      result.push(
        `<h4 class="text-base font-semibold text-foreground mt-5 mb-2 flex items-center gap-2"><span class="text-primary">›</span> ${processInline(trimmed.slice(5).trim())}</h4>`
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      result.push(
        `<h3 class="text-lg font-bold text-foreground mt-6 mb-3 pb-2 border-b border-border">${processInline(trimmed.slice(4).trim())}</h3>`
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      result.push(
        `<h2 class="text-xl font-bold text-foreground mt-8 mb-4 flex items-center gap-3"><span class="w-1 h-5 bg-gradient-to-b from-primary to-primary/50 rounded-full"></span>${processInline(trimmed.slice(3).trim())}</h2>`
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      result.push(
        `<h1 class="text-2xl font-bold text-foreground mb-4">${processInline(trimmed.slice(2).trim())}</h1>`
      );
      i++;
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length) {
        const listLine = lines[i].trim();
        const match = listLine.match(/^(\d+)\.\s+(.*)$/);
        if (match) {
          listItems.push(processInline(match[2]));
          i++;
        } else if (!listLine) {
          // Look ahead for continuation
          let j = i + 1;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && /^\d+\.\s/.test(lines[j].trim())) {
            i++;
            continue;
          }
          break;
        } else {
          break;
        }
      }
      let olHtml = '<ol class="my-4 space-y-2 pl-1">';
      listItems.forEach((item, idx) => {
        olHtml +=
          `<li class="flex items-start gap-3">` +
          `<span class="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">${idx + 1}</span>` +
          `<span class="flex-1 text-muted-foreground">${item}</span>` +
          `</li>`;
      });
      olHtml += "</ol>";
      result.push(olHtml);
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length) {
        const listLine = lines[i].trim();
        if (/^[-*+]\s/.test(listLine)) {
          listItems.push(processInline(listLine.slice(2)));
          i++;
        } else if (!listLine) {
          // Look ahead for continuation
          let j = i + 1;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && /^[-*+]\s/.test(lines[j].trim())) {
            i++;
            continue;
          }
          break;
        } else {
          break;
        }
      }
      let ulHtml = '<ul class="my-4 space-y-2 pl-1">';
      listItems.forEach((item) => {
        ulHtml +=
          `<li class="flex items-start gap-3">` +
          `<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2"></span>` +
          `<span class="flex-1 text-muted-foreground">${item}</span>` +
          `</li>`;
      });
      ulHtml += "</ul>";
      result.push(ulHtml);
      continue;
    }

    // Paragraph (collect consecutive lines)
    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const pLine = lines[i].trim();
      if (
        !pLine ||
        pLine.startsWith("#") ||
        /^[-*+]\s/.test(pLine) ||
        pLine.startsWith("```") ||
        pLine === "---" ||
        pLine === "***" ||
        pLine === "___" ||
        /^\d+\.\s/.test(pLine)
      ) {
        break;
      }
      paragraphLines.push(pLine);
      i++;
    }

    if (paragraphLines.length > 0) {
      result.push(
        `<p class="text-muted-foreground mb-4 leading-relaxed">${processInline(paragraphLines.join(" "))}</p>`
      );
    }
  }

  return result.join("\n");
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const rawHtml = markdownToHtml(content);
  // Sanitize HTML to prevent XSS attacks
  const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ["target", "rel", "class"],
    ADD_TAGS: ["span"],
  });

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-headings:text-foreground prose-p:text-muted-foreground",
        "prose-strong:text-foreground prose-em:text-muted-foreground",
        "prose-code:text-foreground prose-code:bg-muted",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-ul:text-muted-foreground prose-ol:text-muted-foreground",
        "prose-li:text-muted-foreground",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

// Helper function to detect if content is markdown
export function isMarkdownContent(content: string): boolean {
  if (!content) return false;

  // Check for common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s+/m, // Headers
    /\*\*.*?\*\*/, // Bold
    /\*.*?\*/, // Italic
    /`.*?`/, // Inline code
    /^\s*[-*+]\s+/m, // Unordered lists
    /^\s*\d+\.\s+/m, // Ordered lists
    /\[.*?\]\(.*?\)/, // Links
    /^```/m, // Code blocks
    /^---$/m, // Horizontal rules
  ];

  return markdownPatterns.some((pattern) => pattern.test(content));
}
