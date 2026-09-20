"use client";

import React from "react";
import { useTranslations } from "next-intl";

/**
 * Safely parses the metadata string.
 */
export const parseMetadata = (
  metadata: string | null
): Record<string, any> | null => {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata);
  } catch (error) {
    console.error("Error parsing metadata:", error);
    return null;
  }
};

/**
 * Displays metadata as pretty‑printed JSON.
 */
export const MetadataDisplay = ({ metadata }: { metadata: string | null }) => {
  const t = useTranslations("dashboard_admin");
  const parsed = parseMetadata(metadata);
  if (!parsed)
    return (
      <p className="text-sm text-subtle-foreground">
        {t("no_metadata_available_or_invalid_format")}.
      </p>
    );
  return (
    <pre className="bg-muted p-3 rounded text-sm overflow-auto">
      {JSON.stringify(parsed, null, 2)}
    </pre>
  );
};
