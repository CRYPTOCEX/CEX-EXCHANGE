"use client";

import React, { useEffect, useRef, memo, useMemo } from "react";
import { cn } from "@/lib/utils";

interface EditableContentProps {
  content: string;
  isEditMode: boolean;
  onTextChange: (e: React.FormEvent<HTMLDivElement>) => void;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
  tagProps?: React.HTMLAttributes<HTMLElement>;
}

export const EditableContent = memo<EditableContentProps>(
  ({
    content,
    isEditMode,
    onTextChange,
    as: Component = "div",
    className = "",
    style = {},
    tagProps = {},
  }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (ref.current && isEditMode) {
        ref.current.innerHTML = content;
      }
    }, [content, isEditMode]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      onTextChange(e);
    };

    // Memoized combined styles for better performance
    const combinedStyle = useMemo(
      (): React.CSSProperties => ({
        width: "100%",
        display: "block",
        // Normalize contentEditable styling to match regular elements
        outline: "none",
        border: "none",
        background: "transparent",
        // DON'T reset margin/padding to 0 - let the element settings control this
        // margin: 0,
        // padding: 0,
        // Ensure consistent text rendering
        lineHeight: style.lineHeight || "1.5", // Provide default line height
        fontFamily: "inherit",
        fontSize: "inherit",
        fontWeight: "inherit",
        color: "inherit",
        textAlign: "inherit",
        letterSpacing: "inherit",
        // Ensure minimum height for text elements
        minHeight: style.minHeight || "1.2em",
        // Override contentEditable defaults
        wordBreak: "inherit",
        whiteSpace: "inherit",
        ...style,
      }),
      [style]
    );

    // Memoized class names for better performance - reset margins but preserve padding
    const normalizedClassName = useMemo(
      () =>
        cn(
          "w-full block outline-none editable-content",
          "[&>*]:m-0 [&>p]:m-0 [&>h1]:m-0 [&>h2]:m-0 [&>h3]:m-0 [&>h4]:m-0 [&>h5]:m-0 [&>h6]:m-0 [&>div]:m-0 [&>span]:m-0",
          className
        ),
      [className]
    );

    // Memoized element props for edit mode
    const editModeProps = useMemo(
      () => ({
        ref,
        contentEditable: true,
        suppressContentEditableWarning: true,
        onInput: handleInput,
        className: normalizedClassName,
        style: combinedStyle,
        ...tagProps,
        dangerouslySetInnerHTML: { __html: content },
      }),
      [content, normalizedClassName, combinedStyle, tagProps]
    );

    // Memoized element props for preview mode
    const previewModeProps = useMemo(
      () => ({
        className: normalizedClassName,
        style: combinedStyle,
        ...tagProps,
        dangerouslySetInnerHTML: { __html: content },
      }),
      [content, normalizedClassName, combinedStyle, tagProps]
    );

    if (isEditMode) {
      return React.createElement(Component, editModeProps);
    }

    return React.createElement(Component, previewModeProps);
  }
);

EditableContent.displayName = "EditableContent";
