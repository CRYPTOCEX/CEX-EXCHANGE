"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

interface RatingFormControlProps {
  field: any; // from react-hook-form
  error?: string;
  maxRating?: number;
}

export function RatingFormControl({
  field,
  error,
  maxRating = 5,
}: RatingFormControlProps) {
  // Initialize rating state from the field value (default to 0)
  const [rating, setRating] = useState<number>(field.value || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);

  // Sync local rating state when field.value changes externally
  useEffect(() => {
    if (field.value !== rating) {
      setRating(field.value || 0);
    }
  }, [field.value]);

  const handleClick = (value: number) => {
    setRating(value);
    field.onChange(value);
  };

  return (
    <div>
      <div className="flex gap-2">
        {Array.from({ length: maxRating }, (_, i) => {
          const currentRating = i + 1;
          return (
            <Icon
              key={i}
              icon="uim:star"
              className={cn(
                "w-6 h-6 cursor-pointer",
                currentRating <= (hoverRating || rating)
                  ? "text-yellow-400"
                  : "text-zinc-300"
              )}
              onMouseOver={() => setHoverRating(currentRating)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => handleClick(currentRating)}
            />
          );
        })}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
