"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash, ArrowUp, ArrowDown, Check, X } from "lucide-react";
import {
  LabeledSelect,
  LabeledSlider,
} from "../../structure-tab/ui-components";
import { ImageUpload } from "@/components/ui/image-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollapsibleSection } from "../../../ui/collapsible-section";
import type { SettingsProps } from "../settings-map";

// Define types for the image grid settings
interface ImageObject {
  light: string;
  dark: string;
}
interface ImageColumns {
  col1: ImageObject[];
  col2: ImageObject[];
  col3: ImageObject[];
  [key: string]: ImageObject[];
}
interface AnimationDirections {
  col1: string;
  col2: string;
  col3: string;
  [key: string]: string;
}
interface AnimationSpeeds {
  col1: string;
  col2: string;
  col3: string;
  [key: string]: string;
}
interface Scale {
  x: number;
  y: number;
  z: number;
}
interface AnimatedImageGridSettings {
  imageColumns?: ImageColumns;
  animationDirections?: AnimationDirections;
  animationSpeeds?: AnimationSpeeds;
  gap?: number;
  columns?: number;
  scale?: Scale;
  perspective?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  translateX?: number;
  translateY?: number;
}

// Define column key type
type ColumnKey = "col1" | "col2" | "col3";
interface StatsSettingsProps extends SettingsProps {
  settings: AnimatedImageGridSettings;
}
export function AnimatedImageGridSettings({
  element,
  settings,
  onSettingChange,
  onElementUpdate,
}: StatsSettingsProps) {
  const [activeTab, setActiveTab] = useState<string>("general");
  const [openColumnIds, setOpenColumnIds] = useState<string[]>([]);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(
    null
  );
  const [localSettings, setLocalSettings] =
    useState<AnimatedImageGridSettings>(settings);

  // Initialize default columns if not present
  const imageColumns: ImageColumns = localSettings.imageColumns || {
    col1: [
      {
        light: "/placeholder.svg?height=200&width=300",
        dark: "/placeholder.svg?height=200&width=300",
      },
      {
        light: "/placeholder.svg?height=200&width=300",
        dark: "/placeholder.svg?height=200&width=300",
      },
      {
        light: "/placeholder.svg?height=200&width=300",
        dark: "/placeholder.svg?height=200&width=300",
      },
      {
        light: "/placeholder.svg?height=200&width=300",
        dark: "/placeholder.svg?height=200&width=300",
      },
    ],
    col2: [
      {
        light: "/placeholder.svg?height=200&width=300",
        dark: "/placeholder.svg?height=200&width=300",
      },
      {
        light: "/placeholder.svg?height=200&width=300",
        dark: "/placeholder.svg?height=200&width=300",
      },
      {
        light: "/placeholder.svg?height=200&width=300",
        dark: "/placeholder.svg?height=200&width=300",
      },
      {
        light: "/placeholder.svg?height=200&width=300",
        dark: "/placeholder.svg?height=200&width=300",
      },
    ],
    col3: [
      {
        light: "/placeholder.svg?height=200&width=300",
        dark: "/placeholder.svg?height=200&width=300",
      },
      {
        light: "/placeholder.svg?height=200&width=300",
        dark: "/placeholder.svg?height=200&width=300",
      },
      {
        light: "/placeholder.svg?height=200&width=300",
        dark: "/placeholder.svg?height=200&width=300",
      },
      {
        light: "/placeholder.svg?height=200&width=300",
        dark: "/placeholder.svg?height=200&width=300",
      },
    ],
  };
  const animationDirections: AnimationDirections =
    localSettings.animationDirections || {
      col1: "up",
      col2: "down",
      col3: "up",
    };
  const animationSpeeds: AnimationSpeeds = localSettings.animationSpeeds || {
    col1: "normal",
    col2: "normal",
    col3: "slow",
  };

  // Update local settings when props change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Make sure columns setting is always 3
  useEffect(() => {
    if (localSettings.columns !== 3) {
      const updatedSettings = {
        ...localSettings,
        columns: 3,
      };
      setLocalSettings(updatedSettings);
      onSettingChange("columns", 3);
    }
  }, [localSettings, onSettingChange]);

  // Toggle column collapsible section
  const toggleColumnSection = (colKey: string): void => {
    setOpenColumnIds((prev) =>
      prev.includes(colKey)
        ? prev.filter((id) => id !== colKey)
        : [...prev, colKey]
    );
  };

  // Handle adding an image to a column
  const handleAddImage = (colKey: string): void => {
    const newImageColumns = {
      ...imageColumns,
    };
    // Use type assertion to satisfy TypeScript
    const typedColKey = colKey as keyof typeof newImageColumns;
    if (!newImageColumns[typedColKey]) {
      newImageColumns[typedColKey] = [];
    }
    newImageColumns[typedColKey] = [
      ...newImageColumns[typedColKey],
      {
        light: "/placeholder.svg?height=200&width=300",
        dark: "/placeholder.svg?height=200&width=300",
      },
    ];
    const updatedSettings = {
      ...localSettings,
      imageColumns: newImageColumns,
    };
    setLocalSettings(updatedSettings);
    onSettingChange("imageColumns", newImageColumns);
  };

  // Handle removing an image from a column
  const handleRemoveImage = (colKey: string, index: number): void => {
    const newImageColumns = {
      ...imageColumns,
    };
    // Use type assertion to satisfy TypeScript
    const typedColKey = colKey as keyof typeof newImageColumns;
    if (
      newImageColumns[typedColKey] &&
      newImageColumns[typedColKey].length > index
    ) {
      newImageColumns[typedColKey] = newImageColumns[typedColKey].filter(
        (_, i) => i !== index
      );
      const updatedSettings = {
        ...localSettings,
        imageColumns: newImageColumns,
      };
      setLocalSettings(updatedSettings);
      onSettingChange("imageColumns", newImageColumns);
    }
  };

  // Handle updating an image - convert File to string if needed
  const handleUpdateImage = (
    colKey: string,
    index: number,
    mode: "light" | "dark",
    fileOrUrl: File | string | null
  ): void => {
    if (fileOrUrl === null) return; // Don't update if null

    const newImageColumns = {
      ...imageColumns,
    };
    // Use type assertion to satisfy TypeScript
    const typedColKey = colKey as keyof typeof newImageColumns;
    if (
      newImageColumns[typedColKey] &&
      newImageColumns[typedColKey].length > index
    ) {
      // Convert File to string URL if needed
      const urlValue =
        fileOrUrl instanceof File ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
      newImageColumns[typedColKey][index] = {
        ...newImageColumns[typedColKey][index],
        [mode]: urlValue,
      };
      const updatedSettings = {
        ...localSettings,
        imageColumns: newImageColumns,
      };
      setLocalSettings(updatedSettings);
      onSettingChange("imageColumns", newImageColumns);
    }
  };

  // Handle moving an image up or down
  const handleMoveImage = (
    colKey: string,
    index: number,
    direction: "up" | "down"
  ): void => {
    const newImageColumns = {
      ...imageColumns,
    };
    // Use type assertion to satisfy TypeScript
    const typedColKey = colKey as keyof typeof newImageColumns;
    if (!newImageColumns[typedColKey]) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newImageColumns[typedColKey].length) return;
    const images = [...newImageColumns[typedColKey]];
    [images[index], images[newIndex]] = [images[newIndex], images[index]];
    newImageColumns[typedColKey] = images;
    const updatedSettings = {
      ...localSettings,
      imageColumns: newImageColumns,
    };
    setLocalSettings(updatedSettings);
    onSettingChange("imageColumns", newImageColumns);
    if (editingImageIndex === index) {
      setEditingImageIndex(newIndex);
    } else if (editingImageIndex === newIndex) {
      setEditingImageIndex(index);
    }
  };

  // Handle direction change
  const handleDirectionChange = (colKey: string, value: string): void => {
    // Use type assertion to satisfy TypeScript
    const typedColKey = colKey as keyof typeof animationDirections;
    const newDirections = {
      ...animationDirections,
      [typedColKey]: value,
    };
    const updatedSettings = {
      ...localSettings,
      animationDirections: newDirections,
    };
    setLocalSettings(updatedSettings);
    onSettingChange("animationDirections", newDirections);
  };

  // Handle speed change
  const handleSpeedChange = (colKey: string, value: string): void => {
    // Use type assertion to satisfy TypeScript
    const typedColKey = colKey as keyof typeof animationSpeeds;
    const newSpeeds = {
      ...animationSpeeds,
      [typedColKey]: value,
    };
    const updatedSettings = {
      ...localSettings,
      animationSpeeds: newSpeeds,
    };
    setLocalSettings(updatedSettings);
    onSettingChange("animationSpeeds", newSpeeds);
  };

  // Handle scale change
  const handleScaleChange = (axis: "x" | "y", value: number): void => {
    const newScale = {
      ...(localSettings.scale || {
        x: 0.9,
        y: 0.8,
        z: 1,
      }),
      [axis]: value,
    };
    const updatedSettings = {
      ...localSettings,
      scale: newScale,
    };
    setLocalSettings(updatedSettings);
    onSettingChange("scale", newScale);
  };

  // Helper function to handle ImageUpload onChange
  const handleImageUploadChange = (
    colKey: string,
    index: number,
    mode: "light" | "dark",
    fileOrNull: File | null
  ): void => {
    if (fileOrNull === null) {
      // If null, set to default placeholder
      handleUpdateImage(
        colKey,
        index,
        mode,
        "/placeholder.svg?height=200&width=300"
      );
    } else {
      // Otherwise, use the file
      handleUpdateImage(colKey, index, mode, fileOrNull);
    }
  };
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="transform">3D Transform</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="space-y-4">
            <LabeledSlider
              id="gap"
              label="Gap Between Columns"
              min={0}
              max={24}
              step={1}
              value={localSettings.gap || 12}
              onValueChange={(value) => {
                const updatedSettings = {
                  ...localSettings,
                  gap: value,
                };
                setLocalSettings(updatedSettings);
                onSettingChange("gap", value);
              }}
            />
          </div>

          <div className="space-y-3 mt-4">
            {Array.from({
              length: 3,
            }).map((_, i) => {
              // Use explicit string typing here
              const colKey = `col${i + 1}` as ColumnKey;
              const isOpen = openColumnIds.includes(colKey);
              return (
                <CollapsibleSection
                  key={i}
                  title={`Column ${i + 1}`}
                  isOpen={isOpen}
                  onToggle={() => toggleColumnSection(colKey)}
                >
                  <div className="space-y-4">
                    <LabeledSelect
                      id={`${colKey}-direction`}
                      label="Direction"
                      value={animationDirections[colKey] || "up"}
                      onValueChange={(value) =>
                        handleDirectionChange(colKey, value)
                      }
                      options={[
                        {
                          value: "up",
                          label: "Up",
                        },
                        {
                          value: "down",
                          label: "Down",
                        },
                      ]}
                    />

                    <LabeledSelect
                      id={`${colKey}-speed`}
                      label="Speed"
                      value={animationSpeeds[colKey] || "normal"}
                      onValueChange={(value) =>
                        handleSpeedChange(colKey, value)
                      }
                      options={[
                        {
                          value: "slow",
                          label: "Slow",
                        },
                        {
                          value: "normal",
                          label: "Normal",
                        },
                        {
                          value: "fast",
                          label: "Fast",
                        },
                      ]}
                    />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <Label>Images</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddImage(colKey)}
                          className="h-7 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Image
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-2">
                        {imageColumns[colKey]?.map((image, index) => {
                          return (
                            <div
                              key={index}
                              className="border rounded-md p-2 bg-gray-50"
                            >
                              {editingImageIndex === index ? (
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs">
                                      Light Mode Image
                                    </Label>
                                    <div className="h-24">
                                      <ImageUpload
                                        value={image.light}
                                        onChange={(fileOrNull) =>
                                          handleImageUploadChange(
                                            colKey,
                                            index,
                                            "light",
                                            fileOrNull
                                          )
                                        }
                                        size="sm"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <Label className="text-xs">
                                      Dark Mode Image
                                    </Label>
                                    <div className="h-24">
                                      <ImageUpload
                                        value={image.dark}
                                        onChange={(fileOrNull) =>
                                          handleImageUploadChange(
                                            colKey,
                                            index,
                                            "dark",
                                            fileOrNull
                                          )
                                        }
                                        size="sm"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex justify-end gap-2 mt-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingImageIndex(null)}
                                      className="h-7 text-xs"
                                    >
                                      <X className="h-3 w-3 mr-1" /> Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => setEditingImageIndex(null)}
                                      className="h-7 text-xs"
                                    >
                                      <Check className="h-3 w-3 mr-1" /> Done
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                                      <img
                                        src={image.light || "/placeholder.svg"}
                                        alt={`Image ${index + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Image {index + 1}
                                    </div>
                                  </div>

                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handleMoveImage(colKey, index, "up")
                                      }
                                      disabled={index === 0}
                                      className="h-6 w-6 p-0"
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handleMoveImage(colKey, index, "down")
                                      }
                                      disabled={
                                        index ===
                                        (imageColumns[colKey]?.length || 0) - 1
                                      }
                                      className="h-6 w-6 p-0"
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        setEditingImageIndex(index)
                                      }
                                      className="h-6 w-6 p-0"
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handleRemoveImage(colKey, index)
                                      }
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

                        {(!imageColumns[colKey] ||
                          imageColumns[colKey].length === 0) && (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            No images added yet
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="transform" className="space-y-4">
          <CollapsibleSection title="Perspective" isOpen={true}>
            <LabeledSlider
              id="perspective"
              label="Perspective (px)"
              min={100}
              max={2000}
              step={50}
              value={localSettings.perspective || 700}
              onValueChange={(value) => {
                const updatedSettings = {
                  ...localSettings,
                  perspective: value,
                };
                setLocalSettings(updatedSettings);
                onSettingChange("perspective", value);
              }}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Rotation" isOpen={true}>
            <div className="space-y-4">
              <LabeledSlider
                id="rotateX"
                label="Rotate X (deg)"
                min={-45}
                max={45}
                step={1}
                value={localSettings.rotateX || 15}
                onValueChange={(value) => {
                  const updatedSettings = {
                    ...localSettings,
                    rotateX: value,
                  };
                  setLocalSettings(updatedSettings);
                  onSettingChange("rotateX", value);
                }}
              />

              <LabeledSlider
                id="rotateY"
                label="Rotate Y (deg)"
                min={-45}
                max={45}
                step={1}
                value={localSettings.rotateY || -9}
                onValueChange={(value) => {
                  const updatedSettings = {
                    ...localSettings,
                    rotateY: value,
                  };
                  setLocalSettings(updatedSettings);
                  onSettingChange("rotateY", value);
                }}
              />

              <LabeledSlider
                id="rotateZ"
                label="Rotate Z (deg)"
                min={-45}
                max={45}
                step={1}
                value={localSettings.rotateZ || 32}
                onValueChange={(value) => {
                  const updatedSettings = {
                    ...localSettings,
                    rotateZ: value,
                  };
                  setLocalSettings(updatedSettings);
                  onSettingChange("rotateZ", value);
                }}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Scale" isOpen={true}>
            <div className="space-y-4">
              <LabeledSlider
                id="scaleX"
                label="Scale X"
                min={0.5}
                max={1.5}
                step={0.1}
                value={
                  (
                    localSettings.scale || {
                      x: 0.9,
                      y: 0.8,
                      z: 1,
                    }
                  ).x
                }
                onValueChange={(value) => handleScaleChange("x", value)}
              />

              <LabeledSlider
                id="scaleY"
                label="Scale Y"
                min={0.5}
                max={1.5}
                step={0.1}
                value={
                  (
                    localSettings.scale || {
                      y: 0.8,
                      x: 0.9,
                      z: 1,
                    }
                  ).y
                }
                onValueChange={(value) => handleScaleChange("y", value)}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Position" isOpen={true}>
            <div className="space-y-4">
              <LabeledSlider
                id="translateX"
                label="Translate X (%)"
                min={-20}
                max={20}
                step={1}
                value={localSettings.translateX || 7}
                onValueChange={(value) => {
                  const updatedSettings = {
                    ...localSettings,
                    translateX: value,
                  };
                  setLocalSettings(updatedSettings);
                  onSettingChange("translateX", value);
                }}
              />

              <LabeledSlider
                id="translateY"
                label="Translate Y (%)"
                min={-20}
                max={20}
                step={1}
                value={localSettings.translateY || -2}
                onValueChange={(value) => {
                  const updatedSettings = {
                    ...localSettings,
                    translateY: value,
                  };
                  setLocalSettings(updatedSettings);
                  onSettingChange("translateY", value);
                }}
              />
            </div>
          </CollapsibleSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
