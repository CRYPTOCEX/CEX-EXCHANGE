"use client";

import type React from "react";

import { useState, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface TagInputProps {
  title?: string;
  description?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  error?: boolean;
  errorMessage?: string;
}

export function TagInput({
  title,
  description,
  tags,
  onChange,
  placeholder = "Add tag...",
  maxTags = 10,
  error,
  errorMessage,
}: TagInputProps) {
  const t = useTranslations("ext");
  const [inputValue, setInputValue] = useState("");
  const [isAtMaxTags, setIsAtMaxTags] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsAtMaxTags(false);
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();

    if (!trimmedTag) return;
    if (tags.includes(trimmedTag)) return;
    if (tags.length >= maxTags) {
      setIsAtMaxTags(true);
      return;
    }

    onChange([...tags, trimmedTag]);
    setInputValue("");
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
    setIsAtMaxTags(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === "," && inputValue) {
      e.preventDefault();
      addTag(inputValue.replace(",", ""));
    }
  };

  return (
    <div className="space-y-2">
      {title && <Label htmlFor="tag-input">{title}</Label>}

      <div
        className={`flex flex-wrap gap-2 p-2 border rounded-md bg-background ${
          error ? "border-2 border-red-500" : "border-input"
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="flex items-center gap-1 px-3 py-1.5"
          >
            {tag}
            <X
              className="h-3 w-3 cursor-pointer hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
            />
          </Badge>
        ))}

        <Input
          ref={inputRef}
          id="tag-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] p-0 h-8"
          hasRing={false}
          hasShadow={false}
        />
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {isAtMaxTags && (
        <p className="text-sm text-amber-500">
          {t("maximum_of")}
          {maxTags}
          {t("tags_allowed")}
        </p>
      )}

      {error && errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
