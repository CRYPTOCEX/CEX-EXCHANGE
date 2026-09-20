"use client";

import { Fragment, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * A dependency-free sanitising markdown subset for support messages.
 *
 * The repo ships NO markdown renderer and none is added here — this promotes the
 * in-repo precedent from the forex execution runbook dialog, extended with
 * fenced code blocks and ordered lists.
 *
 * TWO RULES THAT ARE SECURITY, NOT STYLE:
 *
 *   Nothing is ever set as HTML. Every branch produces React elements from
 *   plain strings, so a customer pasting `<img onerror=…>` into a ticket — or a
 *   model repeating it back — renders as visible text.
 *
 *   ONLY A ROOT-RELATIVE LINK IS EVER CLICKABLE. `[Withdraw](/finance/withdraw)`
 *   becomes a link; `[click here](https://evil.example)` renders as plain text,
 *   exactly as every markdown link used to. That single rule is what makes this
 *   safe, because it is not a judgement about the URL — a link produced here
 *   CANNOT leave the operator's site, whatever it says.
 *
 *   Nothing the model writes reaches this branch anyway. The AI is forbidden
 *   from typing a URL at all; the paths that become links are rewritten
 *   server-side by `utils/linkify.ts` AFTER being matched against the route
 *   catalog for this install. "Told not to" is not "prevented" — the prevention
 *   is here, in the href test, and it holds even if the instruction fails.
 *
 *   This replaced an absolute ban on links, which was safe and cost the
 *   assistant the ability to make a word clickable. It had to route everything
 *   through a button under the bubble, and started writing sentences explaining
 *   that — "use the button below to jump straight there" — which is the product
 *   describing its own plumbing instead of answering the question.
 */

/**
 * `[label](/path)` — only a root-relative path, never a scheme or a host.
 *
 * THE SECOND CHARACTER IS PART OF THE RULE, not tidiness. `//evil.example` is a
 * protocol-relative URL: it begins with a slash, so "starts with `/`" accepted
 * it, and the browser resolves it against the current scheme and leaves the
 * operator's site. That is precisely the guarantee this regex is the only
 * enforcement of — the model is told never to type a URL, but the paragraph
 * above says the prevention lives here and holds even when the instruction
 * fails, and for `//host` it did not.
 *
 * It is reachable from outside the model too: `RichText` renders `message.text`
 * for EVERY message in a thread, so a customer typing
 * `[Verify your account](//evil.example/login)` handed the agent reading the
 * ticket an underlined, in-platform-looking link to somebody else's site.
 *
 * A backslash is excluded for the same reason — browsers normalise `/\host` to
 * `//host`. Neither can appear in a real route: the catalogue's paths are all
 * single-slash.
 */
const INLINE_LINK = /\[([^\]\n]{1,80})\]\((\/(?![/\\])[A-Za-z0-9/_\-?=&.%]*)\)/g;

/**
 * What this text is sitting ON.
 *
 * ---------------------------------------------------------------------------
 * EVERY LINK IN AN ASSISTANT ANSWER WAS INVISIBLE ON THE ADMIN INBOX
 * ---------------------------------------------------------------------------
 * This renderer's colours were all written for one plate: a card, on the page
 * background. `text-primary` for a link, `bg-muted` for code, `border-border`
 * for a quote.
 *
 * The message bubble has a second plate — `bg-primary text-primary-foreground`,
 * the one that means "this side said it". On the admin inbox EVERY staff
 * message lands on it, including the assistant's, and there `text-primary` is
 * the fill colour. So a link was primary-on-primary: not low contrast, not hard
 * to read — the same colour, a hole in the sentence. Measured on a live ticket,
 * one answer lost three of them:
 *
 *   "You can see everything yourself on ______, which has three parts"
 *
 * It is not only the assistant's own bubble. Copilot's "Suggest a reply" loads
 * the model's draft — already linkified, `[label](/path)` and all — into the
 * composer, so an operator who presses send publishes those links as a HUMAN
 * message, which is on the filled plate on every surface there is.
 *
 * So the colours are a table rather than a literal, indexed by plate. There is
 * no clever inheritance here on purpose: the failure was that one token was
 * used for both "accent" and "fill" and nothing said so out loud.
 */
export type RichTextSurface = "default" | "primary";

const INK: Record<
  RichTextSurface,
  {
    link: string;
    marker: string;
    code: string;
    pre: string;
    quote: string;
    /**
     * A table's rules, per plate.
     *
     * Borders only — no fill on the header row and no zebra striping. A tinted
     * header needs a surface one step off the plate underneath it, and this
     * component does not know what that plate is: the same table renders on a
     * card, on the popover ground of the admin rail, and on the solid brand
     * fill of a message bubble. A hairline is legible on all three.
     */
    tableHead: string;
    tableRow: string;
  }
> = {
  default: {
    link: "text-primary decoration-primary/40 hover:decoration-primary",
    marker: "text-muted-foreground/60",
    code: "bg-muted",
    pre: "bg-muted",
    quote: "border-border text-muted-foreground",
    tableHead: "border-border-strong text-muted-foreground",
    tableRow: "border-border",
  },
  /*
   * On the filled plate the ink IS `primary-foreground`, so a link cannot be
   * distinguished by hue at all — it is the same colour as the sentence around
   * it, by definition.
   *
   * Which is fine, and is why `RouteLink` was built the way it was: the
   * underline and the arrow carry it. The comment there says colour alone does
   * not survive a colour-vision deficiency; this plate is the case where colour
   * alone does not survive at all.
   */
  primary: {
    link: "decoration-primary-foreground/50 hover:decoration-primary-foreground",
    marker: "text-primary-foreground/60",
    code: "bg-primary-foreground/15",
    pre: "bg-primary-foreground/10",
    quote: "border-primary-foreground/30 text-primary-foreground/80",
    tableHead: "border-primary-foreground/40 text-primary-foreground/80",
    tableRow: "border-primary-foreground/20",
  },
};

/**
 * An in-platform link, drawn so it is obviously pressable.
 *
 * The underline and the arrow both matter: colour alone does not survive a
 * colour-vision deficiency, and in a chat bubble a coloured word reads as
 * emphasis rather than as a control. On the filled plate they are the ONLY
 * things carrying it — see `INK`.
 */
function RouteLink({
  href,
  surface,
  children,
}: {
  href: string;
  surface: RichTextSurface;
  children: ReactNode;
}) {
  return (
    <Link
      href={href as any}
      className={cn(
        "inline-flex items-baseline gap-0.5 font-medium underline underline-offset-2 transition-colors",
        INK[surface].link
      )}
    >
      {children}
      <ArrowUpRight className="size-3 shrink-0 self-center" aria-hidden />
    </Link>
  );
}

/**
 * `[1]` — the citation marker, which is a REFERENCE and not a word.
 *
 * ---------------------------------------------------------------------------
 * IT WAS BEING RENDERED AS BODY TEXT, WHICH IS THE ONE THING IT IS NOT
 * ---------------------------------------------------------------------------
 * Providers with no native citation support are instructed to mark each factual
 * sentence with `[n]`, and `parseMarkerCitations` reads those back to build the
 * source chips under the message. The marker then stays in the text.
 *
 * At full body weight it reads as part of the sentence — four bracketed numbers
 * in a four-step list is a lot of punctuation competing with the instructions
 * the customer is trying to follow, and the brackets are the heaviest glyphs on
 * the line.
 *
 * A superscript numeral is the conventional form for exactly this, and it is
 * unambiguous WITHOUT the brackets — the raised position is what says
 * "reference". So the brackets go, the weight drops, and the sentence reads as
 * a sentence.
 *
 * `aria-hidden`, and deliberately: a screen reader announcing "one" mid-sentence
 * is noise, and the sources are already listed as real, labelled links beneath
 * the message. The marker is a visual affordance for people who can see the
 * chips it points at.
 *
 * Bounded to one or two digits, matching `parseMarkerCitations` exactly. A
 * looser rule would eat `[2026]` out of a date and `[10000]` out of a limit.
 */
const CITATION_MARKER = /\[(\d{1,2})\]/g;

function renderCitationMarkers(
  text: string,
  keyPrefix: string,
  surface: RichTextSurface
): ReactNode {
  if (!text.includes("[")) return text;

  const pieces = text.split(CITATION_MARKER);
  if (pieces.length === 1) return text;

  return pieces.map((piece, index) =>
    // The capture groups land on odd indices.
    index % 2 === 1 ? (
      <sup
        key={`${keyPrefix}-m${index}`}
        aria-hidden
        className={cn(
          "ml-px text-[0.65em] font-medium tabular-nums",
          INK[surface].marker
        )}
      >
        {piece}
      </sup>
    ) : (
      <Fragment key={`${keyPrefix}-p${index}`}>{piece}</Fragment>
    )
  );
}

function renderInline(text: string, surface: RichTextSurface): ReactNode {
  const parts: ReactNode[] = [];

  /*
   * Links are resolved FIRST, and their label is rendered as plain text.
   *
   * Running emphasis first would let a label containing `**` or a backtick
   * fragment the match, and the label is authored by `linkify.ts` from the
   * model's own bold text — so `**Withdraw** (/finance/withdraw)` arrives here
   * as `[Withdraw](/finance/withdraw)` with the asterisks already consumed.
   */
  const linkParts = text.split(INLINE_LINK);
  if (linkParts.length > 1) {
    for (let i = 0; i < linkParts.length; i += 3) {
      const before = linkParts[i];
      if (before)
        parts.push(
          <Fragment key={`lt${i}`}>{renderInline(before, surface)}</Fragment>
        );
      const label = linkParts[i + 1];
      const href = linkParts[i + 2];
      if (label !== undefined && href !== undefined) {
        parts.push(
          <RouteLink key={`ln${i}`} href={href} surface={surface}>
            {label}
          </RouteLink>
        );
      }
    }
    return parts;
  }

  // Inline code wins over emphasis: `**not bold**` inside backticks stays literal.
  const segments = text.split(/(`[^`]+`)/g);

  segments.forEach((segment, i) => {
    if (segment.startsWith("`") && segment.endsWith("`") && segment.length > 2) {
      parts.push(
        <code
          key={`c${i}`}
          className={cn(
            "rounded px-1 py-px font-mono text-[0.85em]",
            INK[surface].code
          )}
        >
          {segment.slice(1, -1)}
        </code>
      );
      return;
    }

    const bold = segment.split(/(\*\*[^*]+\*\*)/g);
    bold.forEach((piece, j) => {
      if (piece.startsWith("**") && piece.endsWith("**") && piece.length > 4) {
        parts.push(
          <strong key={`b${i}-${j}`} className="font-semibold">
            {piece.slice(2, -2)}
          </strong>
        );
        return;
      }

      const italic = piece.split(/(?<![*\w])\*([^*\n]+)\*(?![*\w])/g);
      italic.forEach((chunk, k) => {
        if (!chunk) return;
        // The capture groups land on odd indices.
        if (k % 2 === 1) {
          parts.push(
            <em key={`i${i}-${j}-${k}`} className="italic">
              {chunk}
            </em>
          );
        } else {
          parts.push(
            <Fragment key={`t${i}-${j}-${k}`}>
              {renderCitationMarkers(chunk, `t${i}-${j}-${k}`, surface)}
            </Fragment>
          );
        }
      });
    });
  });

  return parts;
}

type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "code"; text: string }
  | { kind: "quote"; lines: string[] }
  | { kind: "table"; head: string[]; rows: string[][] };

const LIST_ITEM = /^\s*([-*•]|\d+[.)])\s+(.*)$/;

/**
 * A pipe table row, and the `|---|---|` rule that turns two lines into a table.
 *
 * ---------------------------------------------------------------------------
 * WITHOUT THIS, A TABLE RENDERS AS ITS OWN SOURCE
 * ---------------------------------------------------------------------------
 * Every other block here existed because the assistant writes it. So does this
 * one — a model asked "what is waiting for me" answers with a queue, an age and
 * a target per row, which is a table, and it will write one whether or not
 * anything can draw it. What the reader got instead was:
 *
 *     | Queue | Waiting | Oldest | Target |
 *     |---|---|---|---|
 *     | Withdrawals | 2 | 421 days | 7 days |
 *
 * — the pipes, the dashes and all, wrapped mid-row in a 26rem panel. It is the
 * single most legible answer the assistant gives and it was the least readable
 * thing on the screen.
 *
 * A LEADING PIPE IS NOT REQUIRED. Models emit both `| a | b |` and `a | b`, and
 * a renderer that only accepts the first silently falls back to a paragraph for
 * the second — which is the same defect with a narrower trigger.
 */
const TABLE_RULE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/;

/** Split a pipe row into cells, tolerating the optional outer pipes. */
function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function looksLikeRow(line: string): boolean {
  // Two cells minimum. One pipe in a sentence is punctuation, not a table.
  return line.includes("|") && cells(line).length > 1;
}

function parseBlocks(input: string): Block[] {
  const lines = String(input || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  /*
   * A table is recognised by its SECOND line, so it is detected with a
   * lookahead rather than by a running accumulator like the other blocks. That
   * keeps a row of pipes that is NOT a table — a sentence with a pipe in it,
   * or a header with no rule under it — falling through to a paragraph, which is
   * how it used to render and is the right thing to degrade to.
   */
  let skipTo = -1;

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] | null = null;
  let fence: string[] | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ kind: "list", ...list });
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote) {
      blocks.push({ kind: "quote", lines: quote });
      quote = null;
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (index < skipTo) continue;

    if (fence !== null) {
      if (/^\s*```/.test(line)) {
        blocks.push({ kind: "code", text: fence.join("\n") });
        fence = null;
      } else {
        fence.push(line);
      }
      continue;
    }

    if (/^\s*```/.test(line)) {
      flushAll();
      fence = [];
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      flushList();
      quote = quote || [];
      quote.push(line.replace(/^\s*>\s?/, ""));
      continue;
    }

    /*
     * A table, if the NEXT line is the rule. Checked before the list rule,
     * because `|---|---|` matches nothing else and a row of cells beginning
     * with a dash would otherwise be eaten as a bullet.
     */
    if (looksLikeRow(line) && TABLE_RULE.test(lines[index + 1] ?? "")) {
      flushAll();
      const head = cells(line);
      const rows: string[][] = [];
      let cursor = index + 2;
      while (cursor < lines.length && looksLikeRow(lines[cursor])) {
        const row = cells(lines[cursor]);
        // Ragged rows are PADDED rather than dropped. A model that writes four
        // headers and a three-cell row has still told the reader something, and
        // losing the row entirely is worse than an empty cell.
        while (row.length < head.length) row.push("");
        rows.push(row.slice(0, head.length));
        cursor++;
      }
      blocks.push({ kind: "table", head, rows });
      skipTo = cursor;
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      flushParagraph();
      flushQuote();
      const ordered = /\d/.test(item[1]);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(item[2]);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  if (fence !== null) blocks.push({ kind: "code", text: fence.join("\n") });
  flushAll();

  return blocks;
}

export function RichText({
  children,
  surface = "default",
  className,
}: {
  children: string;
  /**
   * The plate this is drawn on. `primary` is the solid brand fill the message
   * bubble uses for "this side said it" — see `INK`, where every link in an
   * assistant answer was previously the same colour as the bubble behind it.
   */
  surface?: RichTextSurface;
  className?: string;
}) {
  const blocks = parseBlocks(children);

  if (!blocks.length) return null;

  return (
    <div className={cn("space-y-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}>
      {blocks.map((block, i) => {
        if (block.kind === "code") {
          return (
            <pre
              key={i}
              className={cn(
                "overflow-x-auto rounded-lg p-3 font-mono text-xs leading-relaxed",
                INK[surface].pre
              )}
            >
              <code>{block.text}</code>
            </pre>
          );
        }

        if (block.kind === "quote") {
          return (
            <blockquote
              key={i}
              className={cn("border-l-2 pl-3", INK[surface].quote)}
            >
              {block.lines.map((line, j) => (
                <p key={j}>{renderInline(line, surface)}</p>
              ))}
            </blockquote>
          );
        }

        if (block.kind === "table") {
          return (
            /*
             * The wrapper scrolls, the page does not. A four-column queue table
             * in a 26rem rail is wider than the rail, and the alternative to
             * scrolling it is a panel that pushes the whole admin page sideways.
             */
            <div key={i} className="-mx-1 overflow-x-auto px-1">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className={INK[surface].tableHead}>
                    {block.head.map((cell, j) => (
                      <th
                        key={j}
                        scope="col"
                        className="border-b px-2 py-1.5 font-medium whitespace-nowrap"
                      >
                        {renderInline(cell, surface)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, j) => (
                    <tr key={j} className={INK[surface].tableRow}>
                      {row.map((cell, k) => (
                        <td key={k} className="border-b px-2 py-1.5 align-top">
                          {renderInline(cell, surface)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.kind === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag
              key={i}
              className={cn(
                "ms-4 space-y-1",
                block.ordered ? "list-decimal" : "list-disc"
              )}
            >
              {block.items.map((item, j) => (
                <li key={j} className="ps-1">
                  {renderInline(item, surface)}
                </li>
              ))}
            </Tag>
          );
        }

        return (
          <p key={i} className="leading-relaxed">
            {renderInline(block.text, surface)}
          </p>
        );
      })}
    </div>
  );
}
