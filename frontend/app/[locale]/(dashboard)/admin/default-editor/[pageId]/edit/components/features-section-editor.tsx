"use client";

import React, { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sparkles, Shield, Zap, BarChart3, Users, Target, DollarSign, 
         Smartphone, Globe, Award, Star, Heart, Lock, Cpu, Wifi, Clock, 
         TrendingUp, CheckCircle, Settings, CreditCard, Gift, Headphones,
         Eye, Layers, Rocket, Lightbulb, Database, Cloud } from "lucide-react";
import { EditorProps } from "./types";

// Create icon options - only using icons that are definitely available
const ICON_OPTIONS = [
  { value: "Shield", label: "Shield", component: Shield },
  { value: "Zap", label: "Lightning", component: Zap },
  { value: "BarChart3", label: "Analytics", component: BarChart3 },
  { value: "Users", label: "Users", component: Users },
  { value: "Target", label: "Target", component: Target },
  { value: "DollarSign", label: "Money", component: DollarSign },
  { value: "Smartphone", label: "Mobile", component: Smartphone },
  { value: "Globe", label: "Global", component: Globe },
  { value: "Award", label: "Award", component: Award },
  { value: "Star", label: "Star", component: Star },
  { value: "Heart", label: "Favorite", component: Heart },
  { value: "Lock", label: "Security", component: Lock },
  { value: "Cpu", label: "Performance", component: Cpu },
  { value: "Wifi", label: "Connectivity", component: Wifi },
  { value: "Clock", label: "Time", component: Clock },
  { value: "TrendingUp", label: "Growth", component: TrendingUp },
  { value: "CheckCircle", label: "Success", component: CheckCircle },
  { value: "Settings", label: "Settings", component: Settings },
  { value: "CreditCard", label: "Payment", component: CreditCard },
  { value: "Gift", label: "Rewards", component: Gift },
  { value: "Headphones", label: "Support", component: Headphones },
  { value: "Eye", label: "Visibility", component: Eye },
  { value: "Layers", label: "Layers", component: Layers },
  { value: "Rocket", label: "Launch", component: Rocket },
  { value: "Lightbulb", label: "Innovation", component: Lightbulb },
  { value: "Database", label: "Data", component: Database },
  { value: "Cloud", label: "Cloud", component: Cloud },
];

// Log available icons for debugging
console.log(`📦 Feature icons loaded: ${ICON_OPTIONS.length} icons available`);

const GRADIENT_OPTIONS = [
  { value: "from-blue-400 to-cyan-500", label: "Blue to Cyan", preview: "linear-gradient(135deg, rgb(96 165 250), rgb(34 211 238))" },
  { value: "from-green-400 to-emerald-500", label: "Green to Emerald", preview: "linear-gradient(135deg, rgb(74 222 128), rgb(16 185 129))" },
  { value: "from-yellow-400 to-orange-500", label: "Yellow to Orange", preview: "linear-gradient(135deg, rgb(251 191 36), rgb(249 115 22))" },
  { value: "from-purple-400 to-pink-500", label: "Purple to Pink", preview: "linear-gradient(135deg, rgb(196 181 253), rgb(236 72 153))" },
  { value: "from-red-400 to-rose-500", label: "Red to Rose", preview: "linear-gradient(135deg, rgb(248 113 113), rgb(244 63 94))" },
  { value: "from-indigo-400 to-blue-500", label: "Indigo to Blue", preview: "linear-gradient(135deg, rgb(129 140 248), rgb(59 130 246))" },
  { value: "from-teal-400 to-cyan-500", label: "Teal to Cyan", preview: "linear-gradient(135deg, rgb(45 212 191), rgb(34 211 238))" },
  { value: "from-pink-400 to-rose-500", label: "Pink to Rose", preview: "linear-gradient(135deg, rgb(244 114 182), rgb(244 63 94))" },
  { value: "from-emerald-400 to-teal-500", label: "Emerald to Teal", preview: "linear-gradient(135deg, rgb(52 211 153), rgb(20 184 166))" },
  { value: "from-orange-400 to-red-500", label: "Orange to Red", preview: "linear-gradient(135deg, rgb(251 146 60), rgb(239 68 68))" },
  { value: "from-violet-400 to-purple-500", label: "Violet to Purple", preview: "linear-gradient(135deg, rgb(167 139 250), rgb(147 51 234))" },
  { value: "from-amber-400 to-orange-500", label: "Amber to Orange", preview: "linear-gradient(135deg, rgb(251 191 36), rgb(249 115 22))" },
  { value: "from-lime-400 to-green-500", label: "Lime to Green", preview: "linear-gradient(135deg, rgb(163 230 53), rgb(34 197 94))" },
  { value: "from-sky-400 to-blue-500", label: "Sky to Blue", preview: "linear-gradient(135deg, rgb(56 189 248), rgb(59 130 246))" },
  { value: "from-fuchsia-400 to-pink-500", label: "Fuchsia to Pink", preview: "linear-gradient(135deg, rgb(232 121 249), rgb(236 72 153))" },
];

export const FeaturesSectionEditor = React.memo(function FeaturesSectionEditor({ 
  variables, 
  getValue, 
  updateVariable 
}: EditorProps) {
  const features = getValue('features') || [];

  const addFeature = useCallback(() => {
    const newFeature = {
      title: `New Feature ${features.length + 1}`,
      description: "Feature description",
      icon: "Shield",
      gradient: "from-blue-400 to-cyan-500",
      bg: "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20"
    };
    updateVariable('features', [...features, newFeature]);
  }, [features, updateVariable]);

  const removeFeature = useCallback((index: number) => {
    const newFeatures = features.filter((_: any, i: number) => i !== index);
    updateVariable('features', newFeatures);
  }, [features, updateVariable]);

  const updateFeature = useCallback((index: number, field: string, value: any) => {
    const newFeatures = [...features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    
    // Auto-update background gradient based on main gradient
    if (field === 'gradient') {
      const gradientMap: Record<string, string> = {
        "from-blue-400 to-cyan-500": "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20",
        "from-green-400 to-emerald-500": "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20",
        "from-yellow-400 to-orange-500": "from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20",
        "from-purple-400 to-pink-500": "from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20",
        "from-red-400 to-rose-500": "from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20",
        "from-indigo-400 to-blue-500": "from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20",
        "from-teal-400 to-cyan-500": "from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20",
        "from-pink-400 to-rose-500": "from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20",
        "from-emerald-400 to-teal-500": "from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20",
        "from-orange-400 to-red-500": "from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20",
        "from-violet-400 to-purple-500": "from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20",
        "from-amber-400 to-orange-500": "from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20",
        "from-lime-400 to-green-500": "from-lime-50 to-green-50 dark:from-lime-950/20 dark:to-green-950/20",
        "from-sky-400 to-blue-500": "from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20",
        "from-fuchsia-400 to-pink-500": "from-fuchsia-50 to-pink-50 dark:from-fuchsia-950/20 dark:to-pink-950/20",
      };
      newFeatures[index].bg = gradientMap[value] || "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20";
    }
    
    updateVariable('features', newFeatures);
  }, [features, updateVariable]);

  // Section-level handlers
  const handleBadgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('featuresSection.badge', e.target.value);
  }, [updateVariable]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('featuresSection.title', e.target.value);
  }, [updateVariable]);

  const handleSubtitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('featuresSection.subtitle', e.target.value);
  }, [updateVariable]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateVariable('featuresSection.description', e.target.value);
  }, [updateVariable]);

  return (
    <div className="space-y-6">
      {/* Section Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4 col-span-full">Section Settings</h3>
        
        <div>
          <Label htmlFor="features-badge">Badge Text</Label>
          <Input
            id="features-badge"
            value={getValue('featuresSection.badge')}
            onChange={handleBadgeChange}
            placeholder="e.g., Why Choose Us"
          />
        </div>

        <div>
          <Label htmlFor="features-title">Main Title</Label>
          <Input
            id="features-title"
            value={getValue('featuresSection.title')}
            onChange={handleTitleChange}
            placeholder="e.g., Built for"
          />
        </div>

        <div>
          <Label htmlFor="features-subtitle">Subtitle</Label>
          <Input
            id="features-subtitle"
            value={getValue('featuresSection.subtitle')}
            onChange={handleSubtitleChange}
            placeholder="e.g., Professional Traders"
          />
        </div>

        <div>
          <Label htmlFor="features-description">Description</Label>
          <Textarea
            id="features-description"
            value={getValue('featuresSection.description')}
            onChange={handleDescriptionChange}
            rows={3}
            placeholder="Section description"
          />
        </div>
      </div>

      {/* Features List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Features</h3>
          <Button onClick={addFeature} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Feature
          </Button>
        </div>

        <div className="space-y-4">
          {features.map((feature: any, index: number) => {
            // Safely get the icon component with fallback
            const iconOption = ICON_OPTIONS.find(icon => icon.value === feature.icon);
            const IconComponent = iconOption?.component || Shield;
            
            return (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Feature {index + 1}</h4>
                  <Button
                    onClick={() => removeFeature(index)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={feature.title || ""}
                      onChange={(e) => updateFeature(index, 'title', e.target.value)}
                      placeholder="Feature title"
                    />
                  </div>

                  <div>
                    <Label>Icon</Label>
                    <Select
                      value={feature.icon || "Shield"}
                      onValueChange={(value) => updateFeature(index, 'icon', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select icon" />
                      </SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((icon) => {
                          const Icon = icon.component;
                          return (
                            <SelectItem key={icon.value} value={icon.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {icon.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={feature.description || ""}
                      onChange={(e) => updateFeature(index, 'description', e.target.value)}
                      placeholder="Feature description"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Gradient</Label>
                    <Select
                      value={feature.gradient || "from-blue-400 to-cyan-500"}
                      onValueChange={(value) => updateFeature(index, 'gradient', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gradient" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADIENT_OPTIONS.map((gradient) => (
                          <SelectItem key={gradient.value} value={gradient.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ background: gradient.preview }}
                              />
                              {gradient.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preview */}
                  <div className="md:col-span-1">
                    <Label>Preview</Label>
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${feature.bg || "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${feature.gradient || "from-blue-400 to-cyan-500"} flex items-center justify-center`}>
                          <IconComponent className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h5 className="font-medium text-sm">{feature.title || "Feature Title"}</h5>
                          <p className="text-xs text-muted-foreground">{feature.description || "Description"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}); 