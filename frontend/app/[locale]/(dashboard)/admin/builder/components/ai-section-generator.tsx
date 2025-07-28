"use client";

import type React from "react";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  X,
  RefreshCw,
  Check,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { generateSectionWithAI } from "@/lib/ai/ai-utils";
import { useSavedSectionsStore } from "@/store/saved-sections-store";
import { useToast } from "@/hooks/use-toast";
import type { Section } from "@/types/builder";
import SectionRenderer from "./renderers/section-renderer";
import { useTranslations } from "next-intl";

interface AISectionGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  isInline?: boolean; // New prop to determine if it's rendered inline or as a modal
  onSectionGenerated?: (section: Section) => void; // Callback for when a section is generated
}

const sectionTypes = [
  { value: "hero", label: "Hero Section" },
  { value: "features", label: "Features Section" },
  { value: "pricing", label: "Pricing Section" },
  { value: "testimonials", label: "Testimonials Section" },
  { value: "contact", label: "Contact Section" },
  { value: "footer", label: "Footer Section" },
  { value: "cta", label: "Call to Action Section" },
  { value: "about", label: "About Section" },
  { value: "services", label: "Services Section" },
  { value: "team", label: "Team Section" },
  { value: "faq", label: "FAQ Section" },
  { value: "general", label: "General Section" },
];

export function AISectionGenerator({
  isOpen,
  onClose,
  isInline = false,
  onSectionGenerated,
}: AISectionGeneratorProps) {
  const t = useTranslations("dashboard");
  const [prompt, setPrompt] = useState("");
  const [sectionType, setSectionType] = useState("general");
  const [styleGuide, setStyleGuide] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSection, setGeneratedSection] = useState<Section | null>(
    null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [feedbackPrompt, setFeedbackPrompt] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const { toast } = useToast();
  const addSection = useSavedSectionsStore((state) => state.addSection);

  const handleSelectClick = (e: React.MouseEvent) => {
    // Prevent the click from propagating to parent elements
    e.stopPropagation();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedSection(null);
    setShowPreview(false);

    try {
      const { section, error } = await generateSectionWithAI({
        prompt,
        sectionType,
        styleGuide: styleGuide.trim() || undefined,
      });

      if (error || !section) {
        toast({
          title: "Error",
          description: error || "Failed to generate section",
          variant: "destructive",
        });
        return;
      }

      setGeneratedSection(section);
      setShowPreview(true);

      toast({
        title: "Success",
        description: "Section generated successfully!",
      });

      // If there's a callback for section generation, call it
      if (onSectionGenerated) {
        onSectionGenerated(section);
      }
    } catch (error) {
      console.error("Error generating section:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImproveSection = async () => {
    if (!generatedSection || !feedbackPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please provide feedback on how to improve the section",
        variant: "destructive",
      });
      return;
    }

    setIsImproving(true);

    try {
      const { section, error } = await generateSectionWithAI({
        prompt: prompt,
        sectionType,
        styleGuide: styleGuide.trim() || undefined,
        feedback: feedbackPrompt,
        previousSection: generatedSection,
      });

      if (error || !section) {
        toast({
          title: "Error",
          description: error || "Failed to improve section",
          variant: "destructive",
        });
        return;
      }

      setGeneratedSection(section);
      setFeedbackPrompt("untitled");

      toast({
        title: "Success",
        description: "Section improved successfully!",
      });

      // If there's a callback for section generation, call it with the improved section
      if (onSectionGenerated) {
        onSectionGenerated(section);
      }
    } catch (error) {
      console.error("Error improving section:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsImproving(false);
    }
  };

  const handleSaveSection = () => {
    if (generatedSection) {
      addSection(generatedSection);
      toast({
        title: "Success",
        description: "Section saved to your library",
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setPrompt("untitled");
    setSectionType("general");
    setStyleGuide("");
    setGeneratedSection(null);
    setShowPreview(false);
    setFeedbackPrompt("untitled");
    onClose();
  };

  const content = (
    <>
      {!showPreview ? (
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="section-type">{t("section_type")}</Label>
            <div onClick={handleSelectClick} className="w-full">
              <Select value={sectionType} onValueChange={setSectionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section type" />
                </SelectTrigger>
                <SelectContent>
                  {sectionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="prompt">{t("describe_what_you_want")}</Label>
            <Textarea
              id="prompt"
              placeholder="Describe the section you want to create..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              {t("example_create_a_call-to-action_button")}
            </p>
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="style-guide"
              className="flex items-center justify-between"
            >
              <span>{t("style_guide_(optional)")}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() =>
                  setStyleGuide(
                    "Use purple as the primary color. Make it modern and minimalist."
                  )
                }
              >
                {t("add_example")}
              </Button>
            </Label>
            <Textarea
              id="style-guide"
              placeholder="Add any style preferences or brand guidelines..."
              value={styleGuide}
              onChange={(e) => setStyleGuide(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="bg-purple-600 hover:bg-purple-700 mt-4"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("Generating")}.
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {t("generate_section")}
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-green-600 flex items-center">
              <Sparkles className="h-4 w-4 mr-1" />
              {t("section_generated_successfully")}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(false)}
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              {t("back_to_generator")}
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="bg-gray-50 p-2 text-xs font-medium border-b">
              {t("Preview")}
            </div>
            <div className="p-4 max-h-[400px] overflow-auto bg-white">
              {generatedSection && (
                <SectionRenderer section={generatedSection} isPreview={true} />
              )}
            </div>
          </div>

          <div className="grid gap-2 mt-2">
            <Label htmlFor="feedback" className="flex items-center">
              <span>{t("want_to_improve_it")}</span>
            </Label>
            <Textarea
              id="feedback"
              placeholder="Describe how you'd like to improve this section..."
              value={feedbackPrompt}
              onChange={(e) => setFeedbackPrompt(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-2 mt-2">
            <Button
              onClick={handleImproveSection}
              disabled={isImproving || !feedbackPrompt.trim()}
              className="bg-blue-600 hover:bg-blue-700 flex-1"
            >
              {isImproving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("Improving")}.
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t("improve_section")}
                </>
              )}
            </Button>
            <Button
              onClick={handleSaveSection}
              className="bg-green-600 hover:bg-green-700 flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              {t("save_to_library")}
            </Button>
          </div>

          <div className="flex justify-center gap-2 mt-2 border-t pt-4">
            <span className="text-sm text-muted-foreground mr-2">
              {t("how_was_this_generation")}
            </span>
            <Button variant="outline" size="sm" className="h-8 text-green-600">
              <ThumbsUp className="h-4 w-4 mr-1" />
              {t("Good")}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-red-600">
              <ThumbsDown className="h-4 w-4 mr-1" />
              {t("needs_work")}
            </Button>
          </div>
        </div>
      )}
    </>
  );

  // If it's inline, just return the content
  if (isInline) {
    return content;
  }

  // Otherwise, wrap it in a Dialog
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl font-bold">
            <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
            {t("ai_section_generator")}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {content}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
          >
            {t("Cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
