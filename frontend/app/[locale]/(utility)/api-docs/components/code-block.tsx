"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Check, Copy, ChevronDown, ChevronUp } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
  maxHeight?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

// Simple syntax highlighting for common patterns
function highlightCode(code: string, language: string): string {
  // Escape HTML
  let highlighted = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  switch (language.toLowerCase()) {
    case "json":
      // Use a single pass tokenizer approach to avoid regex conflicts
      // This prevents the number regex from matching inside span class names
      highlighted = highlighted.replace(
        /("(?:[^"\\]|\\.)*")|(\b-?\d+\.?\d*\b)|(\b(?:true|false|null)\b)/g,
        (match, str, num, bool) => {
          if (str) return `<span class="text-green-400">${str}</span>`;
          if (num) return `<span class="text-amber-400">${num}</span>`;
          if (bool) return `<span class="text-purple-400">${bool}</span>`;
          return match;
        }
      );
      break;

    case "javascript":
    case "typescript":
    case "js":
    case "ts":
      // Comments
      highlighted = highlighted.replace(
        /(\/\/.*$)/gm,
        '<span class="text-zinc-500">$1</span>'
      );
      // Strings
      highlighted = highlighted.replace(
        /(['"`])(?:(?!\1)[^\\]|\\.)*\1/g,
        '<span class="text-green-400">$&</span>'
      );
      // Keywords
      highlighted = highlighted.replace(
        /\b(const|let|var|function|async|await|return|if|else|for|while|try|catch|throw|new|class|import|export|from|default)\b/g,
        '<span class="text-purple-400">$1</span>'
      );
      // Numbers
      highlighted = highlighted.replace(
        /\b(\d+\.?\d*)\b/g,
        '<span class="text-amber-400">$1</span>'
      );
      break;

    case "bash":
    case "shell":
    case "sh":
      // Comments
      highlighted = highlighted.replace(
        /(#.*$)/gm,
        '<span class="text-zinc-500">$1</span>'
      );
      // Strings
      highlighted = highlighted.replace(
        /(['"])(?:(?!\1)[^\\]|\\.)*\1/g,
        '<span class="text-green-400">$&</span>'
      );
      // Commands at start
      highlighted = highlighted.replace(
        /^(\s*)(curl|wget|npm|yarn|pnpm|node|python|pip|git|docker)/gm,
        '$1<span class="text-cyan-400">$2</span>'
      );
      // Flags
      highlighted = highlighted.replace(
        /(\s)(-{1,2}[\w-]+)/g,
        '$1<span class="text-amber-400">$2</span>'
      );
      break;

    case "python":
    case "py":
      // Comments
      highlighted = highlighted.replace(
        /(#.*$)/gm,
        '<span class="text-zinc-500">$1</span>'
      );
      // Strings
      highlighted = highlighted.replace(
        /(['"])(?:(?!\1)[^\\]|\\.)*\1/g,
        '<span class="text-green-400">$&</span>'
      );
      // Keywords
      highlighted = highlighted.replace(
        /\b(def|class|import|from|return|if|elif|else|for|while|try|except|raise|with|as|True|False|None)\b/g,
        '<span class="text-purple-400">$1</span>'
      );
      break;

    case "php":
      // Comments
      highlighted = highlighted.replace(
        /(\/\/.*$|#.*$)/gm,
        '<span class="text-zinc-500">$1</span>'
      );
      // Strings
      highlighted = highlighted.replace(
        /(['"])(?:(?!\1)[^\\]|\\.)*\1/g,
        '<span class="text-green-400">$&</span>'
      );
      // Variables
      highlighted = highlighted.replace(
        /(\$\w+)/g,
        '<span class="text-cyan-400">$1</span>'
      );
      // Keywords
      highlighted = highlighted.replace(
        /\b(function|return|if|else|elseif|foreach|for|while|try|catch|throw|new|class|public|private|protected|static|use|namespace)\b/g,
        '<span class="text-purple-400">$1</span>'
      );
      break;

    case "go":
      // Comments
      highlighted = highlighted.replace(
        /(\/\/.*$)/gm,
        '<span class="text-zinc-500">$1</span>'
      );
      // Strings
      highlighted = highlighted.replace(
        /("(?:[^"\\]|\\.)*"|`[^`]*`)/g,
        '<span class="text-green-400">$1</span>'
      );
      // Keywords
      highlighted = highlighted.replace(
        /\b(func|return|if|else|for|range|package|import|var|const|type|struct|interface|defer|go|chan|select|case|default)\b/g,
        '<span class="text-purple-400">$1</span>'
      );
      break;

    case "ruby":
    case "rb":
      // Comments
      highlighted = highlighted.replace(
        /(#.*$)/gm,
        '<span class="text-zinc-500">$1</span>'
      );
      // Strings
      highlighted = highlighted.replace(
        /(['"])(?:(?!\1)[^\\]|\\.)*\1/g,
        '<span class="text-green-400">$&</span>'
      );
      // Keywords
      highlighted = highlighted.replace(
        /\b(def|end|class|module|require|return|if|elsif|else|unless|while|do|begin|rescue|raise)\b/g,
        '<span class="text-purple-400">$1</span>'
      );
      // Symbols
      highlighted = highlighted.replace(
        /(:\w+)/g,
        '<span class="text-cyan-400">$1</span>'
      );
      break;

    default:
      // No highlighting
      break;
  }

  return highlighted;
}

export function CodeBlock({
  code,
  language = "text",
  title,
  showLineNumbers = false,
  maxHeight,
  collapsible = false,
  defaultCollapsed = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const highlightedCode = useMemo(() => highlightCode(code, language), [code, language]);

  const lines = useMemo(() => code.split("\n"), [code]);
  const lineCount = lines.length;

  const shouldCollapse = collapsible && lineCount > 10;

  return (
    <div className={cn("relative group rounded-lg border bg-zinc-950 overflow-hidden", className)}>
      {/* Header */}
      {(title || shouldCollapse) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
          <div className="flex items-center gap-2">
            {title && (
              <span className="text-xs text-zinc-400 font-mono">{title}</span>
            )}
            {language && language !== "text" && (
              <span className="text-xs text-zinc-500 font-mono bg-zinc-800 px-1.5 py-0.5 rounded">
                {language}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {shouldCollapse && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-zinc-400 hover:text-white"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    <span className="text-xs">Expand ({lineCount} lines)</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    <span className="text-xs">Collapse</span>
                  </>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-zinc-400 hover:text-white"
              onClick={copyCode}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-xs">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  <span className="text-xs">Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Code Content */}
      {(!shouldCollapse || !isCollapsed) && (
        <ScrollArea
          className="w-full"
          style={maxHeight ? { maxHeight } : undefined}
        >
          <div className="p-4 overflow-x-auto">
            {showLineNumbers ? (
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index} className="leading-relaxed">
                      <td className="pr-4 text-right text-zinc-600 select-none font-mono text-xs align-top w-8">
                        {index + 1}
                      </td>
                      <td className="font-mono text-sm text-zinc-100 whitespace-pre">
                        <span
                          dangerouslySetInnerHTML={{
                            __html: highlightCode(line, language),
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <pre className="font-mono text-sm text-zinc-100 whitespace-pre">
                <code
                  dangerouslySetInnerHTML={{ __html: highlightedCode }}
                />
              </pre>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Collapsed placeholder */}
      {shouldCollapse && isCollapsed && (
        <div className="px-4 py-3 text-zinc-500 text-sm font-mono">
          <span className="text-zinc-600">{lines[0]}</span>
          <span className="text-zinc-700 mx-2">...</span>
          <span className="text-zinc-500">({lineCount} lines)</span>
        </div>
      )}

      {/* Floating copy button when no title */}
      {!title && !shouldCollapse && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white bg-zinc-800/50"
          onClick={copyCode}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
