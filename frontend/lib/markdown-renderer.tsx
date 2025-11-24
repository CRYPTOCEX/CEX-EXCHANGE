"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  if (!markdown) return "";

  let html = markdown
    // Handle headings
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mb-2 mt-4">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mb-3 mt-5">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4 mt-6">$1</h1>')
    
    // Handle bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    
    // Handle italic text
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    
    // Handle inline code
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    
    // Handle links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Handle unordered lists
    .replace(/^[\s]*[-*+] (.*)$/gm, '<li class="ml-4 mb-1">• $1</li>')
    
    // Handle ordered lists (basic)
    .replace(/^[\s]*\d+\. (.*)$/gm, '<li class="ml-4 mb-1 list-decimal">$1</li>')
    
    // Handle line breaks (double newline = paragraph)
    .replace(/\n\s*\n/g, '</p><p class="mb-3">')
    
    // Handle single line breaks
    .replace(/\n/g, '<br />');

  // Wrap list items in ul tags
  html = html.replace(/((<li class="ml-4 mb-1">• .*?<\/li>\s*)+)/g, '<ul class="mb-3 space-y-1">$1</ul>');
  html = html.replace(/((<li class="ml-4 mb-1 list-decimal">.*?<\/li>\s*)+)/g, '<ol class="mb-3 space-y-1 list-decimal ml-4">$1</ol>');

  // Wrap content in paragraphs if it doesn't start with a heading or list
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<ol')) {
    html = `<p class="mb-3">${html}</p>`;
  }

  return html;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const htmlContent = markdownToHtml(content);

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
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

// Helper function to detect if content is markdown
export function isMarkdownContent(content: string): boolean {
  if (!content) return false;
  
  // Check for common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s+/m,           // Headers
    /\*\*.*?\*\*/,           // Bold
    /\*.*?\*/,               // Italic
    /`.*?`/,                 // Inline code
    /^\s*[-*+]\s+/m,         // Unordered lists
    /^\s*\d+\.\s+/m,         // Ordered lists
    /\[.*?\]\(.*?\)/,        // Links
  ];
  
  return markdownPatterns.some(pattern => pattern.test(content));
} 