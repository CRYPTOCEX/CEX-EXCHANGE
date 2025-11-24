"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash, ArrowUp, ArrowDown, Edit, Check, X } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  LabeledInput,
  LabeledSelect,
  LabeledTextarea,
} from "../../structure-tab/ui-components";
import type { SettingsProps } from "../settings-map";
export function TestimonialSettings({
  element,
  settings,
  onSettingChange,
}: SettingsProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const testimonials = settings.testimonials || [
    {
      quote:
        settings.quote ||
        "This product has completely transformed how we work.",
      author: settings.author || "Jane Smith",
      role: settings.role || "CEO, Company Inc.",
      avatarSrc: settings.avatarSrc || "/placeholder.svg?height=50&width=50",
      rating: settings.rating || 5,
    },
  ];
  const updateTestimonial = (index: number, field: string, value: any) => {
    const updated = [...testimonials];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onSettingChange("testimonials", updated);
  };
  const removeTestimonial = (index: number) => {
    const updated = [...testimonials];
    updated.splice(index, 1);
    onSettingChange("testimonials", updated);
    if (editingIndex === index) setEditingIndex(null);
  };
  const moveTestimonial = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= testimonials.length) return;
    const updated = [...testimonials];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onSettingChange("testimonials", updated);
    if (editingIndex === index) setEditingIndex(newIndex);
    else if (editingIndex === newIndex) setEditingIndex(index);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <LabeledSelect
          id="displayType"
          label="Display Type"
          value={settings.displayType || "card"}
          onValueChange={(value) => onSettingChange("displayType", value)}
          options={[
            {
              value: "card",
              label: "Card",
            },
            {
              value: "slider",
              label: "Slider",
            },
          ]}
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs font-medium">Testimonials</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const updated = [
                ...testimonials,
                {
                  quote: "Great product, would recommend!",
                  author: "New Customer",
                  role: "Position, Company",
                  avatarSrc: "/placeholder.svg?height=50&width=50",
                  rating: 5,
                },
              ];
              onSettingChange("testimonials", updated);
            }}
            className="h-6 text-xs gap-1"
          >
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-2">
          {testimonials.map((testimonial: any, index: number) => {
            return (
              <div key={index} className="border rounded-md p-2 bg-gray-50">
                {editingIndex === index ? (
                  <div className="space-y-2">
                    <LabeledTextarea
                      id={`quote-${index}`}
                      label="Quote"
                      value={testimonial.quote}
                      onChange={(e) =>
                        updateTestimonial(index, "quote", e.target.value)
                      }
                      rows={2}
                      className="h-16 text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <LabeledInput
                        id={`author-${index}`}
                        label="Author"
                        value={testimonial.author}
                        onChange={(e) =>
                          updateTestimonial(index, "author", e.target.value)
                        }
                        className="h-7 text-xs"
                      />
                      <LabeledInput
                        id={`role-${index}`}
                        label="Role/Company"
                        value={testimonial.role}
                        onChange={(e) =>
                          updateTestimonial(index, "role", e.target.value)
                        }
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Avatar</Label>
                      <ImageUpload
                        value={testimonial.avatarSrc}
                        onChange={(file) => {
                          if (file) {
                            const imageUrl = URL.createObjectURL(file);
                            updateTestimonial(index, "avatarSrc", imageUrl);
                          }
                        }}
                        size="xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Rating (0-5)</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          min={0}
                          max={5}
                          step={1}
                          value={[testimonial.rating || 5]}
                          onValueChange={(value) =>
                            updateTestimonial(index, "rating", value[0])
                          }
                          className="flex-1"
                        />
                        <span className="text-xs w-6 text-right">
                          {testimonial.rating || 5}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingIndex(null)}
                        className="h-7 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setEditingIndex(null)}
                        className="h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" /> Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        <img
                          src={testimonial.avatarSrc || "/placeholder.svg"}
                          alt={testimonial.author}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {testimonial.author}
                        </div>
                        <div className="text-xs text-gray-500">
                          {testimonial.role}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveTestimonial(index, "up")}
                        disabled={index === 0}
                        className={`h-6 w-6 p-0 ${index === 0 ? "opacity-0" : ""}`}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveTestimonial(index, "down")}
                        disabled={index === testimonials.length - 1}
                        className={`h-6 w-6 p-0 ${index === testimonials.length - 1 ? "opacity-0" : ""}`}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingIndex(index)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTestimonial(index)}
                        disabled={testimonials.length <= 1}
                        className="h-6 w-6 p-0 text-red-500"
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {testimonials.length === 0 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              No testimonials added yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
