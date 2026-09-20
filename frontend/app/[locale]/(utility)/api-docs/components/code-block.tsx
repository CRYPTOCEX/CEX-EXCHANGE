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

/**
 * Syntax theme.
 *
 * This is a hand-rolled highlighter — no Prism, no Shiki, no third-party
 * stylesheet — so the whole theme is these five roles and it moves onto tokens
 * cleanly. Roles are categorical (a string is not "more successful" than a
 * number), so they take `--chart-*` slots rather than status tokens.
 *
 * The block itself grounds on `--surface-2`, which is the only step where every
 * ramp slot clears 4.5:1 in BOTH themes — measured light / dark: chart-2 gold
 * 4.99/4.86, chart-3 green 4.55/5.24, chart-4 violet 5.23/4.59, chart-6 cyan
 * 4.78/5.01, subtle-foreground 4.71/4.93, foreground 18.75/15.00. On
 * `--surface-3` four of those fall to 4.04–4.47 and the block would be
 * measurably harder to read in one theme or the other.
 *
 * Note this block used to be a hardcoded near-black ground with near-white ink
 * and no light variant at all: in light mode it was a black slab pasted into a
 * white card, and the collapsed-preview line sat at roughly 2.4:1 on it. It now
 * follows the theme.
 */
const SYNTAX = {
  comment: "text-subtle-foreground",
  string: "text-chart-3",
  number: "text-chart-2",
  keyword: "text-chart-4",
  /** Shell commands, PHP variables, Ruby symbols — the "named thing" role. */
  ident: "text-chart-6",
} as const;

const mark = (role: keyof typeof SYNTAX, body: string) =>
  `<span class="${SYNTAX[role]}">${body}</span>`;

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
          if (str) return mark("string", str);
          if (num) return mark("number", num);
          if (bool) return mark("keyword", bool);
          return match;
        }
      );
      break;

    case "javascript":
    case "typescript":
    case "js":
    case "ts":
      // Comments
      highlighted = highlighted.replace(/(\/\/.*$)/gm, mark("comment", "$1"));
      // Strings
      highlighted = highlighted.replace(
        /(['"`])(?:(?!\1)[^\\]|\\.)*\1/g,
        mark("string", "$&")
      );
      // Keywords
      highlighted = highlighted.replace(
        /\b(const|let|var|function|async|await|return|if|else|for|while|try|catch|throw|new|class|import|export|from|default)\b/g,
        mark("keyword", "$1")
      );
      // Numbers
      highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, mark("number", "$1"));
      break;

    case "bash":
    case "shell":
    case "sh":
      // Comments
      highlighted = highlighted.replace(/(#.*$)/gm, mark("comment", "$1"));
      // Strings
      highlighted = highlighted.replace(
        /(['"])(?:(?!\1)[^\\]|\\.)*\1/g,
        mark("string", "$&")
      );
      // Commands at start
      highlighted = highlighted.replace(
        /^(\s*)(curl|wget|npm|yarn|pnpm|node|python|pip|git|docker)/gm,
        `$1${mark("ident", "$2")}`
      );
      // Flags
      highlighted = highlighted.replace(
        /(\s)(-{1,2}[\w-]+)/g,
        `$1${mark("number", "$2")}`
      );
      break;

    case "python":
    case "py":
      // Comments
      highlighted = highlighted.replace(/(#.*$)/gm, mark("comment", "$1"));
      // Strings
      highlighted = highlighted.replace(
        /(['"])(?:(?!\1)[^\\]|\\.)*\1/g,
        mark("string", "$&")
      );
      // Keywords
      highlighted = highlighted.replace(
        /\b(def|class|import|from|return|if|elif|else|for|while|try|except|raise|with|as|True|False|None)\b/g,
        mark("keyword", "$1")
      );
      break;

    case "php":
      // Comments
      highlighted = highlighted.replace(/(\/\/.*$|#.*$)/gm, mark("comment", "$1"));
      // Strings
      highlighted = highlighted.replace(
        /(['"])(?:(?!\1)[^\\]|\\.)*\1/g,
        mark("string", "$&")
      );
      // Variables
      highlighted = highlighted.replace(/(\$\w+)/g, mark("ident", "$1"));
      // Keywords
      highlighted = highlighted.replace(
        /\b(function|return|if|else|elseif|foreach|for|while|try|catch|throw|new|class|public|private|protected|static|use|namespace)\b/g,
        mark("keyword", "$1")
      );
      break;

    case "go":
      // Comments
      highlighted = highlighted.replace(/(\/\/.*$)/gm, mark("comment", "$1"));
      // Strings
      highlighted = highlighted.replace(
        /("(?:[^"\\]|\\.)*"|`[^`]*`)/g,
        mark("string", "$1")
      );
      // Keywords
      highlighted = highlighted.replace(
        /\b(func|return|if|else|for|range|package|import|var|const|type|struct|interface|defer|go|chan|select|case|default)\b/g,
        mark("keyword", "$1")
      );
      break;

    case "ruby":
    case "rb":
      // Comments
      highlighted = highlighted.replace(/(#.*$)/gm, mark("comment", "$1"));
      // Strings
      highlighted = highlighted.replace(
        /(['"])(?:(?!\1)[^\\]|\\.)*\1/g,
        mark("string", "$&")
      );
      // Keywords
      highlighted = highlighted.replace(
        /\b(def|end|class|module|require|return|if|elsif|else|unless|while|do|begin|rescue|raise)\b/g,
        mark("keyword", "$1")
      );
      // Symbols
      highlighted = highlighted.replace(/(:\w+)/g, mark("ident", "$1"));
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
  // Line-numbered mode highlights per line (same as before); memoised so it is
  // not recomputed on every keystroke elsewhere in the playground.
  const highlightedLines = useMemo(
    () => (showLineNumbers ? lines.map((line) => highlightCode(line, language)) : null),
    [showLineNumbers, lines, language]
  );
  const lineCount = lines.length;

  const shouldCollapse = collapsible && lineCount > 10;

  return (
    <div
      className={cn(
        "relative group rounded-lg border border-border bg-surface-2 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      {(title || shouldCollapse) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-3">
          <div className="flex items-center gap-2">
            {title && (
              <span className="text-xs text-muted-foreground font-mono">{title}</span>
            )}
            {language && language !== "text" && (
              <span className="text-xs text-subtle-foreground font-mono bg-surface-2 px-1.5 py-0.5 rounded">
                {language}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {shouldCollapse && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
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
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={copyCode}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1 text-success" />
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
                      <td className="pr-4 text-right text-subtle-foreground select-none font-mono text-xs align-top w-8">
                        {index + 1}
                      </td>
                      <td className="font-mono text-sm text-foreground whitespace-pre">
                        <span
                          dangerouslySetInnerHTML={{
                            __html: highlightedLines?.[index] ?? "",
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <pre className="font-mono text-sm text-foreground whitespace-pre">
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
        <div className="px-4 py-3 text-muted-foreground text-sm font-mono">
          <span className="text-foreground">{lines[0]}</span>
          <span className="text-subtle-foreground mx-2">...</span>
          <span className="text-muted-foreground">({lineCount} lines)</span>
        </div>
      )}

      {/* Floating copy button when no title */}
      {!title && !shouldCollapse && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground bg-surface-3/80"
          onClick={copyCode}
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
