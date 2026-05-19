import type { Section } from "@/types/builder";

export function exportSectionToJson(section: Section): string {
  try {
    // Create a copy of the section to avoid modifying the original
    const sectionCopy = JSON.parse(JSON.stringify(section));

    // Remove any properties that shouldn't be included in the export
    delete sectionCopy.snapshots;

    // Convert to a formatted JSON string
    return JSON.stringify(sectionCopy, null, 2);
  } catch (error) {
    console.error("Error exporting section to JSON:", error);
    throw new Error("Failed to export section");
  }
}

export function downloadSectionAsJson(section: Section) {
  try {
    const jsonString = exportSectionToJson(section);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Create a temporary link and trigger the download
    const a = document.createElement("a");
    a.href = url;
    a.download = `section-${section.id}.json`;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading section:", error);
    throw new Error("Failed to download section");
  }
}
