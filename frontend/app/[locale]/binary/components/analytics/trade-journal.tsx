"use client";

/**
 * Trade Journal Component
 *
 * Allows users to add notes and tags to trades for analysis.
 *
 * Tags are user-authored and unbounded, so colour cannot carry tag identity —
 * over about six keys a hue stops separating anything. Selected tags take one
 * accent treatment (R2: the accent means "interactive"), and the tag text is
 * the identity.
 */

import { memo, useState, useCallback } from "react";
import {
  Edit3,
  Tag,
  Save,
  X,
  Star,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import type { CompletedOrder } from "@/store/trade/use-binary-store";
import type { OrderSide } from "@/types/binary-trading";
import { useTranslations } from "next-intl";
import {
  Panel,
  PanelTitle,
  ToneChip,
  ToneDot,
  pnlTone,
  toneText,
} from "./analytics-ui";

// Helper function to determine if an order side is bullish (upward direction)
function isBullishSide(side: OrderSide | string): boolean {
  return side === "RISE" || side === "HIGHER" || side === "TOUCH" || side === "CALL" || side === "UP";
}

// ============================================================================
// SHARED CLASS STRINGS
// ============================================================================

const FIELD_CLASS =
  "bg-card text-foreground border border-border-strong rounded-lg text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-ring/50";

const MUTED_BUTTON_CLASS =
  "bg-surface-3 text-muted-foreground hover:bg-surface-3/80 hover:text-foreground transition-colors";

// ============================================================================
// TYPES
// ============================================================================

interface TradeNote {
  orderId: string;
  note: string;
  tags: string[];
  rating: number; // 1-5
  createdAt: Date;
  updatedAt: Date;
}

interface TradeJournalProps {
  trades: CompletedOrder[];
  currency?: string;
  /** @deprecated Tokens are theme-aware; kept so existing call sites compile. */
  theme?: "dark" | "light";
  onSaveNote?: (orderId: string, note: string, tags: string[], rating: number) => void;
}

interface TradeNoteEditorProps {
  trade: CompletedOrder;
  existingNote?: TradeNote;
  onSave: (note: string, tags: string[], rating: number) => void;
  onCancel: () => void;
}

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

const STORAGE_KEY = "binary-trade-journal";

function loadNotes(): Record<string, TradeNote> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    // Convert date strings back to Date objects
    Object.keys(parsed).forEach((key) => {
      parsed[key].createdAt = new Date(parsed[key].createdAt);
      parsed[key].updatedAt = new Date(parsed[key].updatedAt);
    });
    return parsed;
  } catch {
    return {};
  }
}

function saveNotes(notes: Record<string, TradeNote>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// ============================================================================
// PREDEFINED TAGS
// ============================================================================

const PREDEFINED_TAGS = [
  "Trend Following",
  "Reversal",
  "Breakout",
  "Support/Resistance",
  "News Event",
  "Emotional Trade",
  "Well Planned",
  "FOMO",
  "Revenge Trade",
  "Technical Analysis",
  "Fundamental Analysis",
  "Pattern Trade",
  "Scalp",
  "Impulse Trade",
];

// ============================================================================
// TAG CHIP
// ============================================================================

const TagChip = memo(function TagChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-foreground bg-primary/10 ring-1 ring-primary/40">
      {label}
      {onRemove ? (
        <button onClick={onRemove} className="hover:text-destructive">
          <X size={12} />
        </button>
      ) : null}
    </span>
  );
});

// ============================================================================
// NOTE EDITOR COMPONENT
// ============================================================================

const TradeNoteEditor = memo(function TradeNoteEditor({
  trade,
  existingNote,
  onSave,
  onCancel,
}: TradeNoteEditorProps) {
  const tBinaryComponents = useTranslations("binary_components");
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [note, setNote] = useState(existingNote?.note || "");
  const [tags, setTags] = useState<string[]>(existingNote?.tags || []);
  const [rating, setRating] = useState(existingNote?.rating || 0);
  const [customTag, setCustomTag] = useState("");

  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags([...tags, customTag.trim()]);
      setCustomTag("");
    }
  };

  const handleSave = () => {
    onSave(note, tags, rating);
  };

  return (
    <div className="bg-surface-3 rounded-lg p-4 space-y-4">
      {/* Trade info header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">
            {trade.symbol.replace("USDT", "").replace("/", "")}
          </span>
          <ToneChip tone={trade.status === "WIN" ? "up" : "down"} className="py-0.5">
            {trade.status}
          </ToneChip>
        </div>
        <span className="text-xs text-muted-foreground">
          {trade.expiryTime.toLocaleDateString()}
        </span>
      </div>

      {/* Note textarea */}
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-2">
          {tCommon("trade_notes")}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("what_did_you_learn_from_this")}
          className={`w-full h-24 p-3 resize-none ${FIELD_CLASS}`}
        />
      </div>

      {/* Rating. A rating is a magnitude on one scale, so it is filled-vs-empty
          on a single hue rather than a status colour. */}
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-2">
          {t("trade_quality_rating")}
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`p-1 transition-colors ${
                star <= rating ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Star size={20} fill={star <= rating ? "currentColor" : "none"} />
            </button>
          ))}
          <span className="text-xs text-muted-foreground ml-2">
            {rating === 0
              ? tBinaryComponents("not_rated")
              : rating === 1
                ? tBinaryComponents("poor")
                : rating === 2
                  ? tBinaryComponents("below_average")
                  : rating === 3
                    ? tCommon("average")
                    : rating === 4
                      ? tCommon("good")
                      : tCommon("excellent")}
          </span>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-2">
          Tags
        </label>

        {/* Selected tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag) => (
              <TagChip key={tag} label={tag} onRemove={() => handleRemoveTag(tag)} />
            ))}
          </div>
        )}

        {/* Predefined tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {PREDEFINED_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
            <button
              key={tag}
              onClick={() => handleAddTag(tag)}
              className={`px-2 py-1 rounded text-xs ${MUTED_BUTTON_CLASS}`}
            >
              + {tag}
            </button>
          ))}
        </div>

        {/* Custom tag input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCustomTag()}
            placeholder={`${t("add_custom_tag")}…`}
            className={`flex-1 px-3 py-2 ${FIELD_CLASS}`}
          />
          <button
            onClick={handleAddCustomTag}
            disabled={!customTag.trim()}
            className={`px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${MUTED_BUTTON_CLASS}`}
          >
            Add
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Save size={14} />
          Save
        </button>
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TradeJournal = memo(function TradeJournal({
  trades,
  onSaveNote,
}: TradeJournalProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [notes, setNotes] = useState<Record<string, TradeNote>>(() => loadNotes());
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // Handle saving a note
  const handleSaveNote = useCallback(
    (orderId: string, note: string, tags: string[], rating: number) => {
      const now = new Date();
      const existingNote = notes[orderId];

      const updatedNote: TradeNote = {
        orderId,
        note,
        tags,
        rating,
        createdAt: existingNote?.createdAt || now,
        updatedAt: now,
      };

      const updatedNotes = {
        ...notes,
        [orderId]: updatedNote,
      };

      setNotes(updatedNotes);
      saveNotes(updatedNotes);
      setEditingTradeId(null);

      if (onSaveNote) {
        onSaveNote(orderId, note, tags, rating);
      }
    },
    [notes, onSaveNote]
  );

  // Get all unique tags from notes
  const allTags = Array.from(
    new Set(Object.values(notes).flatMap((note) => note.tags))
  );

  // Filter trades
  const filteredTrades = trades.filter((trade) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const note = notes[trade.id];
      const matchesSymbol = trade.symbol.toLowerCase().includes(query);
      const matchesNote = note?.note.toLowerCase().includes(query);
      const matchesTags = note?.tags.some((tag) =>
        tag.toLowerCase().includes(query)
      );
      if (!matchesSymbol && !matchesNote && !matchesTags) return false;
    }

    // Tag filter
    if (filterTag) {
      const note = notes[trade.id];
      if (!note?.tags.includes(filterTag)) return false;
    }

    return true;
  });

  // Sort trades by time (most recent first)
  const sortedTrades = [...filteredTrades].sort(
    (a, b) => b.expiryTime.getTime() - a.expiryTime.getTime()
  );

  return (
    <Panel className="overflow-hidden">
      {/* Header. The rule under this block used to be written as a literal
          "${borderClass}" inside a plain string, so it never resolved and no
          border was ever drawn. */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <PanelTitle>{t("trade_journal")}</PanelTitle>
          <span className="text-xs text-muted-foreground">
            {Object.keys(notes).length} {t("notes_saved")}
          </span>
        </div>

        {/* Search and filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`${t("search_trades_notes_tags")}…`}
              className={`w-full pl-10 pr-4 py-2 ${FIELD_CLASS}`}
            />
          </div>

          {allTags.length > 0 && (
            <select
              value={filterTag || ""}
              onChange={(e) => setFilterTag(e.target.value || null)}
              className={`px-3 py-2 ${FIELD_CLASS}`}
            >
              <option value="">{tCommon("all_tags")}</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Trades list */}
      <div className="max-h-[500px] overflow-y-auto">
        {sortedTrades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            <p>{tCommon("no_trades_found")}</p>
            <p className="text-xs mt-1">
              {searchQuery || filterTag
                ? t("try_adjusting_your_filters")
                : t("complete_some_trades_to_start_journaling")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedTrades.map((trade) => {
              const note = notes[trade.id];
              const isEditing = editingTradeId === trade.id;
              const isExpanded = expandedTradeId === trade.id;
              const pnl =
                trade.status === "WIN"
                  ? trade.profit || 0
                  : -(trade.profit || trade.amount);
              const outcomeTone = trade.status === "WIN" ? "up" : "down";

              return (
                <div key={trade.id} className="hover:bg-surface-3/50 transition-colors">
                  {/* Trade row */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer"
                    onClick={() => setExpandedTradeId(isExpanded ? null : trade.id)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Status indicator */}
                      <ToneDot tone={outcomeTone} />

                      {/* Trade info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {trade.symbol.replace("USDT", "").replace("/", "")}
                          </span>
                          <ToneChip
                            tone={isBullishSide(trade.side) ? "up" : "down"}
                            className="px-1.5"
                          >
                            {trade.side}
                          </ToneChip>
                          {note && note.rating > 0 && (
                            <div className="flex items-center">
                              {Array.from({ length: note.rating }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={10}
                                  className="text-primary"
                                  fill="currentColor"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {trade.expiryTime.toLocaleDateString()}{" "}
                          {trade.expiryTime.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Tags preview */}
                      {note && note.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag size={12} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {note.tags.length}
                          </span>
                        </div>
                      )}

                      {/* Note indicator */}
                      {note && note.note && (
                        <MessageSquare size={14} className="text-primary" />
                      )}

                      {/* P/L */}
                      <span
                        className={`text-sm font-semibold ${toneText[pnlTone(pnl)]}`}
                      >
                        {pnl >= 0 ? "+" : ""}
                        {pnl.toFixed(2)}
                      </span>

                      {/* Expand icon */}
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-muted-foreground" />
                      ) : (
                        <ChevronDown size={16} className="text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      {isEditing ? (
                        <TradeNoteEditor
                          trade={trade}
                          existingNote={note}
                          onSave={(noteText, tags, rating) =>
                            handleSaveNote(trade.id, noteText, tags, rating)
                          }
                          onCancel={() => setEditingTradeId(null)}
                        />
                      ) : (
                        <div className="bg-surface-3 rounded-lg p-4">
                          {note ? (
                            <>
                              {/* Note content */}
                              {note.note && (
                                <p className="text-sm text-foreground mb-3">{note.note}</p>
                              )}

                              {/* Tags */}
                              {note.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {note.tags.map((tag) => (
                                    <TagChip key={tag} label={tag} />
                                  ))}
                                </div>
                              )}

                              {/* Edit button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTradeId(trade.id);
                                }}
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                              >
                                <Edit3 size={12} />
                                {t("edit_note")}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTradeId(trade.id);
                              }}
                              className="w-full py-4 text-center text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Edit3 size={16} className="mx-auto mb-1" />
                              <span className="text-sm">{t("add_note_to_this_trade")}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
});

export default TradeJournal;
