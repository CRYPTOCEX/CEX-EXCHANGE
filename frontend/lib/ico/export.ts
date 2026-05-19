/**
 * Converts an array of objects to a CSV string
 */
export function objectsToCSV(data: any[]): string {
  if (data.length === 0) return "";

  // Get headers from the first object
  const headers = Object.keys(data[0]);

  // Create CSV header row
  const headerRow = headers.join(",");

  // Create data rows
  const rows = data.map((obj) => {
    return headers
      .map((header) => {
        // Handle values that need quotes (strings with commas, quotes, or newlines)
        const value = obj[header];
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"') || value.includes("\n"))
        ) {
          // Escape quotes by doubling them and wrap in quotes
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",");
  });

  // Combine header and rows
  return [headerRow, ...rows].join("\n");
}

/**
 * Triggers a file download with the given content
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  // Create a blob with the content
  const blob = new Blob([content], { type: mimeType });

  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor element
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // Append to the document, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL
  URL.revokeObjectURL(url);
}

/**
 * Format a date string as YYYY-MM-DD
 */
export function formatDateForFilename(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}
