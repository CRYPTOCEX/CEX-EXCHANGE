"use client";

import type React from "react";
import { useState, useRef, type KeyboardEvent, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "next-intl";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  disabled?: boolean;
}

export function TagInput({
  value = [],
  onChange,
  placeholder = "Add tags...",
  maxTags,
  className,
  disabled = false,
}: TagInputProps) {
  const t = useTranslations("components/ui/tag-input");
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [showLimitMessage, setShowLimitMessage] = useState(false);

  // Check if we've reached the limit
  const isAtLimit = maxTags !== undefined && value.length >= maxTags;

  // Show limit message for 3 seconds when trying to add a tag at the limit
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showLimitMessage) {
      timeout = setTimeout(() => {
        setShowLimitMessage(false);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [showLimitMessage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // If the last character is a comma, add the tag
    if (newValue.endsWith(",")) {
      const tagValue = newValue.slice(0, -1).trim();
      if (tagValue && !value.includes(tagValue)) {
        if (isAtLimit) {
          setShowLimitMessage(true);
          return;
        }
        onChange([...value, tagValue]);
      }
      setInputValue("");
    } else {
      setInputValue(newValue);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Add tag on Enter
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();

      if (isAtLimit) {
        setShowLimitMessage(true);
        return;
      }

      const tagValue = inputValue.trim();
      if (!value.includes(tagValue)) {
        onChange([...value, tagValue]);
      }
      setInputValue("");
    }

    // Remove last tag on Backspace if input is empty
    if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
    // Hide limit message when a tag is removed
    if (showLimitMessage) {
      setShowLimitMessage(false);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex flex-wrap gap-2 p-2 border rounded-md min-h-12 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          isAtLimit && "border-amber-400 bg-amber-50 dark:bg-amber-950/20",
          className,
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={handleContainerClick}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="h-7 text-sm">
            {tag}
            {!disabled && (
              <button
                type="button"
                className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring"
                onClick={() => removeTag(tag)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {tag} tag</span>
              </button>
            )}
          </Badge>
        ))}
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] border-0 p-0 h-7 focus-visible:ring-0 focus-visible:ring-offset-0"
          disabled={disabled || isAtLimit}
          aria-describedby={isAtLimit ? "tag-limit-message" : undefined}
        />
      </div>

      {showLimitMessage && (
        <Alert className="py-2 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription
            id="tag-limit-message"
            className="text-amber-700 dark:text-amber-400 text-sm"
          >
            {t("maximum_of")} {maxTags} {t("tags_reached")}.{" "}
            {t("remove_a_tag_to_add_a_new_one")}.
          </AlertDescription>
        </Alert>
      )}

      {isAtLimit && !showLimitMessage && (
        <p
          id="tag-limit-message"
          className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"
        >
          <AlertCircle className="h-3 w-3" />
          {t("maximum_of")} {maxTags} {t("tags_reached")}
        </p>
      )}
    </div>
  );
}
