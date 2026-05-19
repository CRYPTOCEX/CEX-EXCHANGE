import { $fetch } from "@/lib/api";
import type { Section } from "@/types/builder";

export interface GenerateSectionOptions {
  prompt: string;
  sectionType?: string;
  styleGuide?: string;
  feedback?: string;
  previousSection?: Section;
}

export async function generateSectionWithAI({
  prompt,
  sectionType = "general",
  styleGuide,
  feedback,
  previousSection,
}: GenerateSectionOptions): Promise<{
  section: Section | null;
  error: string | null;
}> {
  try {
    const response = await $fetch<{ section: Section; error?: string }>({
      url: "/api/ai/generate-section",
      method: "POST",
      body: {
        prompt,
        sectionType,
        styleGuide,
        feedback,
        previousSection,
      },
      successMessage: "Section generated successfully!",
      errorMessage: "Failed to generate section",
    });

    if (response.error || !response.data?.section) {
      return {
        section: null,
        error: response.error || "Failed to generate section",
      };
    }

    return { section: response.data.section, error: null };
  } catch (error) {
    console.error("Error generating section with AI:", error);
    return { section: null, error: "An unexpected error occurred" };
  }
}
