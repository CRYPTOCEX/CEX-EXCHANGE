"use client";

/**
 * Trade Journal Component
 *
 * Allows users to add notes and tags to trades for analysis.
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
  Filter,
} from "lucide-react";
import type { CompletedOrder } from "@/store/trade/use-binary-store";
import type { OrderSide } from "@/types/binary-trading";
import { useTranslations } from "next-intl";

// Helper function to determine if an order side is bullish (upward direction)
function isBullishSide(side: OrderSide | string): boolean {
  return side === "RISE" || side === "HIGHER" || side === "TOUCH" || side === "CALL" || side === "UP";
}

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
  theme?: "dark" | "light";
  onSaveNote?: (orderId: string, note: string, tags: string[], rating: number) => void;
}

interface TradeNoteEditorProps {
  trade: CompletedOrder;
  existingNote?: TradeNote;
  onSave: (note: string, tags: string[], rating: number) => void;
  onCancel: () => void;
  theme?: "dark" | "light";
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
// NOTE EDITOR COMPONENT
// ============================================================================

const TradeNoteEditor = memo(function TradeNoteEditor({
  trade,
  existingNote,
  onSave,
  onCancel,
  theme = "dark",
}: TradeNoteEditorProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [note, setNote] = useState(existingNote?.note || "");
  const [tags, setTags] = useState<string[]>(existingNote?.tags || []);
  const [rating, setRating] = useState(existingNote?.rating || 0);
  const [customTag, setCustomTag] = useState("");

  // Theme classes
  const bgClass = theme === "dark" ? "bg-zinc-800" : "bg-zinc-100";
  const inputBgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const borderClass = theme === "dark" ? "border-zinc-700" : "border-zinc-300";

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
    <div className={`${bgClass} rounded-lg p-4 space-y-4`}>
      {/* Trade info header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${textClass}`}>
            {trade.symbol.replace("USDT", "").replace("/", "")}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              trade.status === "WIN"
                ? "bg-green-500/20 text-green-500"
                : "bg-red-500/20 text-red-500"
            }`}
          >
            {trade.status}
          </span>
        </div>
        <span className={`text-xs ${subtitleClass}`}>
          {trade.expiryTime.toLocaleDateString()}
        </span>
      </div>

      {/* Note textarea */}
      <div>
        <label className={`text-xs ${subtitleClass} uppercase tracking-wide block mb-2`}>
          {tCommon("trade_notes")}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("what_did_you_learn_from_this")}
          className={`w-full h-24 ${inputBgClass} ${textClass} border ${borderClass} rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
        />
      </div>

      {/* Rating */}
      <div>
        <label className={`text-xs ${subtitleClass} uppercase tracking-wide block mb-2`}>
          {t("trade_quality_rating")}
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`p-1 transition-colors ${
                star <= rating ? "text-yellow-500" : subtitleClass
              }`}
            >
              <Star size={20} fill={star <= rating ? "currentColor" : "none"} />
            </button>
          ))}
          <span className={`text-xs ${subtitleClass} ml-2`}>
            {rating === 0
              ? "Not rated"
              : rating === 1
                ? "Poor"
                : rating === 2
                  ? "Below average"
                  : rating === 3
                    ? "Average"
                    : rating === 4
                      ? "Good"
                      : "Excellent"}
          </span>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className={`text-xs ${subtitleClass} uppercase tracking-wide block mb-2`}>
          Tags
        </label>

        {/* Selected tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  theme === "dark"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-500"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Predefined tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {PREDEFINED_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
            <button
              key={tag}
              onClick={() => handleAddTag(tag)}
              className={`px-2 py-1 rounded text-xs ${
                theme === "dark"
                  ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                  : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
              } transition-colors`}
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
            placeholder={t("add_custom_tag_ellipsis")}
            className={`flex-1 ${inputBgClass} ${textClass} border ${borderClass} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
          />
          <button
            onClick={handleAddCustomTag}
            disabled={!customTag.trim()}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              theme === "dark"
                ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-50"
                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 disabled:opacity-50"
            } transition-colors`}
          >
            Add
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className={`px-4 py-2 rounded-lg text-sm ${
            theme === "dark"
              ? "text-zinc-400 hover:bg-zinc-700"
              : "text-zinc-600 hover:bg-zinc-200"
          } transition-colors`}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2"
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
  currency = "USDT",
  theme = "dark",
  onSaveNote,
}: TradeJournalProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [notes, setNotes] = useState<Record<string, TradeNote>>(() => loadNotes());
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // Theme classes
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const inputBgClass = theme === "dark" ? "bg-zinc-800" : "bg-zinc-100";
  const hoverBgClass = theme === "dark" ? "hover:bg-zinc-800/50" : "hover:bg-zinc-50";

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
    <div className={`${bgClass} border ${borderClass} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className="px-6 py-4 border-b ${borderClass}">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-medium ${subtitleClass} uppercase tracking-wide`}>
            {t("trade_journal")}
          </h3>
          <span className={`text-xs ${subtitleClass}`}>
            {Object.keys(notes).length} {t("notes_saved")}
          </span>
        </div>

        {/* Search and filter */}
        <div className="flex gap-3">
          <div className={`flex-1 relative`}>
            <Search
              size={16}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${subtitleClass}`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search_trades_notes_tags_ellipsis")}
              className={`w-full ${inputBgClass} ${textClass} border ${borderClass} rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
            />
          </div>

          {allTags.length > 0 && (
            <select
              value={filterTag || ""}
              onChange={(e) => setFilterTag(e.target.value || null)}
              className={`${inputBgClass} ${textClass} border ${borderClass} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
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
          <div className={`text-center py-8 ${subtitleClass}`}>
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            <p>{tCommon("no_trades_found")}</p>
            <p className="text-xs mt-1">
              {searchQuery || filterTag
                ? "Try adjusting your filters"
                : "Complete some trades to start journaling"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {sortedTrades.map((trade) => {
              const note = notes[trade.id];
              const isEditing = editingTradeId === trade.id;
              const isExpanded = expandedTradeId === trade.id;
              const pnl =
                trade.status === "WIN"
                  ? trade.profit || 0
                  : -(trade.profit || trade.amount);

              return (
                <div key={trade.id} className={`${hoverBgClass} transition-colors`}>
                  {/* Trade row */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer"
                    onClick={() => setExpandedTradeId(isExpanded ? null : trade.id)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Status indicator */}
                      <div
                        className={`w-2 h-2 rounded-full ${
                          trade.status === "WIN" ? "bg-green-500" : "bg-red-500"
                        }`}
                      />

                      {/* Trade info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${textClass}`}>
                            {trade.symbol.replace("USDT", "").replace("/", "")}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              isBullishSide(trade.side)
                                ? "bg-green-500/20 text-green-500"
                                : "bg-red-500/20 text-red-500"
                            }`}
                          >
                            {trade.side}
                          </span>
                          {note && note.rating > 0 && (
                            <div className="flex items-center">
                              {Array.from({ length: note.rating }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={10}
                                  className="text-yellow-500"
                                  fill="currentColor"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <div className={`text-xs ${subtitleClass}`}>
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
                          <Tag size={12} className={subtitleClass} />
                          <span className={`text-xs ${subtitleClass}`}>
                            {note.tags.length}
                          </span>
                        </div>
                      )}

                      {/* Note indicator */}
                      {note && note.note && (
                        <MessageSquare size={14} className="text-blue-500" />
                      )}

                      {/* P/L */}
                      <span
                        className={`text-sm font-semibold ${
                          pnl >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {pnl >= 0 ? "+" : ""}
                        {pnl.toFixed(2)}
                      </span>

                      {/* Expand icon */}
                      {isExpanded ? (
                        <ChevronUp size={16} className={subtitleClass} />
                      ) : (
                        <ChevronDown size={16} className={subtitleClass} />
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
                          theme={theme}
                        />
                      ) : (
                        <div className={`${theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-50"} rounded-lg p-4`}>
                          {note ? (
                            <>
                              {/* Note content */}
                              {note.note && (
                                <p className={`text-sm ${textClass} mb-3`}>{note.note}</p>
                              )}

                              {/* Tags */}
                              {note.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {note.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className={`px-2 py-0.5 rounded text-xs ${
                                        theme === "dark"
                                          ? "bg-blue-500/20 text-blue-400"
                                          : "bg-blue-100 text-blue-600"
                                      }`}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Edit button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTradeId(trade.id);
                                }}
                                className={`text-xs ${subtitleClass} hover:text-blue-500 flex items-center gap-1 transition-colors`}
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
                              className={`w-full py-4 text-center ${subtitleClass} hover:text-blue-500 transition-colors`}
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
    </div>
  );
});

export default TradeJournal;
