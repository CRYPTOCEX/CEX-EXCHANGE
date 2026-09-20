"use client";

import React, { useEffect, useRef, memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { SafeHtml, sanitizeHtml } from "../../shared/safe-html";

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
    // Track the last sanitized value we applied to the contenteditable DOM
    // node so we don't clobber the user's in-flight edits (which would reset
    // the selection/caret). We only re-apply when the incoming `content`
    // actually changed AND the element isn't currently focused.
    const lastAppliedRef = useRef<string | null>(null);

    useEffect(() => {
      if (!ref.current || !isEditMode) return;

      const sanitized = sanitizeHtml(content);

      // Skip the assignment if the sanitized value already matches what we
      // applied last time — this prevents the caret from jumping back to the
      // start of the contenteditable on every keystroke re-render.
      if (lastAppliedRef.current === sanitized) return;

      // Never rewrite innerHTML while the user is actively typing into this
      // node; doing so resets the selection. Their input has already been
      // reflected in the DOM by the browser, and the parent state will sync
      // via onInput.
      const isFocused =
        typeof document !== "undefined" &&
        document.activeElement === ref.current;
      if (isFocused && ref.current.innerHTML === sanitized) {
        lastAppliedRef.current = sanitized;
        return;
      }
      if (isFocused) return;

      // Only touch the DOM if it actually differs from the sanitized target
      // (the browser may have normalized attributes/whitespace).
      if (ref.current.innerHTML !== sanitized) {
        ref.current.innerHTML = sanitized;
      }
      lastAppliedRef.current = sanitized;
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

    if (isEditMode) {
      // The contenteditable path is uncontrolled: we set innerHTML via the
      // effect above (always through DOMPurify). We deliberately do NOT pass
      // dangerouslySetInnerHTML here — that would force React to keep
      // re-syncing and fight the browser's contenteditable state.
      return React.createElement(Component, {
        ref,
        contentEditable: true,
        suppressContentEditableWarning: true,
        onInput: handleInput,
        className: normalizedClassName,
        style: combinedStyle,
        ...tagProps,
      });
    }

    // Preview mode flows through SafeHtml, which sanitizes once and renders
    // via the single remaining dangerouslySetInnerHTML call in the codebase.
    return (
      <SafeHtml
        tag={Component}
        html={content}
        className={normalizedClassName}
        style={combinedStyle}
        {...tagProps}
      />
    );
  }
);

EditableContent.displayName = "EditableContent";
