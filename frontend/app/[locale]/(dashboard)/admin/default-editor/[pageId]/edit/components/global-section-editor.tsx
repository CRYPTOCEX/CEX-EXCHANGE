"use client";

import React, { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users, Globe, Shield, Award, BarChart3, Target,
         TrendingUp, Star, Heart, Clock, Zap, DollarSign, Eye, 
         CheckCircle, Smartphone, Cpu, Database, Cloud, Gift } from "lucide-react";
import { EditorProps } from "./types";

// Create stat icon options - only using icons that are definitely available
const STAT_ICON_OPTIONS = [
  { value: "Users", label: "Users", component: Users },
  { value: "Globe", label: "Global", component: Globe },
  { value: "Shield", label: "Security", component: Shield },
  { value: "Award", label: "Awards", component: Award },
  { value: "BarChart3", label: "Analytics", component: BarChart3 },
  { value: "Target", label: "Goals", component: Target },
  { value: "TrendingUp", label: "Growth", component: TrendingUp },
  { value: "Star", label: "Rating", component: Star },
  { value: "Heart", label: "Satisfaction", component: Heart },
  { value: "Clock", label: "Uptime", component: Clock },
  { value: "Zap", label: "Performance", component: Zap },
  { value: "DollarSign", label: "Revenue", component: DollarSign },
  { value: "Eye", label: "Views", component: Eye },
  { value: "CheckCircle", label: "Success", component: CheckCircle },
  { value: "Smartphone", label: "Mobile", component: Smartphone },
  { value: "Cpu", label: "Processing", component: Cpu },
  { value: "Database", label: "Storage", component: Database },
  { value: "Cloud", label: "Cloud", component: Cloud },
  { value: "Gift", label: "Benefits", component: Gift },
];

// Log available icons for debugging
console.log(`📊 Stat icons loaded: ${STAT_ICON_OPTIONS.length} icons available`);

export const GlobalSectionEditor = React.memo(function GlobalSectionEditor({ 
  variables, 
  getValue, 
  updateVariable 
}: EditorProps) {
  const stats = getValue('globalSection.stats') || [];
  const platformFeatureItems = getValue('globalSection.platformFeatures.items') || [];

  const addStat = useCallback(() => {
    const newStat = {
      icon: "Users",
      label: "New Stat",
      value: "100+"
    };
    updateVariable('globalSection.stats', [...stats, newStat]);
  }, [stats, updateVariable]);

  const removeStat = useCallback((index: number) => {
    const newStats = stats.filter((_: any, i: number) => i !== index);
    updateVariable('globalSection.stats', newStats);
  }, [stats, updateVariable]);

  const updateStat = useCallback((index: number, field: string, value: any) => {
    const newStats = [...stats];
    newStats[index] = { ...newStats[index], [field]: value };
    updateVariable('globalSection.stats', newStats);
  }, [stats, updateVariable]);

  const addPlatformFeature = useCallback(() => {
    updateVariable('globalSection.platformFeatures.items', [...platformFeatureItems, "New Platform Feature"]);
  }, [platformFeatureItems, updateVariable]);

  const removePlatformFeature = useCallback((index: number) => {
    const newItems = platformFeatureItems.filter((_: any, i: number) => i !== index);
    updateVariable('globalSection.platformFeatures.items', newItems);
  }, [platformFeatureItems, updateVariable]);

  const updatePlatformFeature = useCallback((index: number, value: string) => {
    const newItems = [...platformFeatureItems];
    newItems[index] = value;
    updateVariable('globalSection.platformFeatures.items', newItems);
  }, [platformFeatureItems, updateVariable]);

  // Section-level handlers
  const handleBadgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('globalSection.badge', e.target.value);
  }, [updateVariable]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('globalSection.title', e.target.value);
  }, [updateVariable]);

  const handleSubtitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('globalSection.subtitle', e.target.value);
  }, [updateVariable]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateVariable('globalSection.description', e.target.value);
  }, [updateVariable]);

  const handlePlatformTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('globalSection.platformFeatures.title', e.target.value);
  }, [updateVariable]);

  return (
    <div className="space-y-6">
      {/* Section Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4 col-span-full">Section Settings</h3>
        
        <div>
          <Label htmlFor="global-badge">Badge Text</Label>
          <Input
            id="global-badge"
            value={getValue('globalSection.badge')}
            onChange={handleBadgeChange}
            placeholder="e.g., Global Platform"
          />
        </div>

        <div>
          <Label htmlFor="global-title">Main Title</Label>
          <Input
            id="global-title"
            value={getValue('globalSection.title')}
            onChange={handleTitleChange}
            placeholder="e.g., Reliable"
          />
        </div>

        <div>
          <Label htmlFor="global-subtitle">Subtitle</Label>
          <Input
            id="global-subtitle"
            value={getValue('globalSection.subtitle')}
            onChange={handleSubtitleChange}
            placeholder="e.g., Trading Platform"
          />
        </div>

        <div>
          <Label htmlFor="global-description">Description</Label>
          <Textarea
            id="global-description"
            value={getValue('globalSection.description')}
            onChange={handleDescriptionChange}
            rows={3}
            placeholder="Section description"
          />
        </div>
      </div>

      {/* Stats */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Statistics</h3>
          <Button onClick={addStat} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Stat
          </Button>
        </div>

        <div className="space-y-4">
          {stats.map((stat: any, index: number) => {
            // Safely get the icon component with fallback
            const iconOption = STAT_ICON_OPTIONS.find(icon => icon.value === stat.icon);
            const IconComponent = iconOption?.component || Users;
            
            return (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Stat {index + 1}</h4>
                  <Button
                    onClick={() => removeStat(index)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Icon</Label>
                    <Select
                      value={stat.icon || "Users"}
                      onValueChange={(value) => updateStat(index, 'icon', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select icon" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAT_ICON_OPTIONS.map((icon) => {
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

                  <div>
                    <Label>Label</Label>
                    <Input
                      value={stat.label || ""}
                      onChange={(e) => updateStat(index, 'label', e.target.value)}
                      placeholder="Stat label"
                    />
                  </div>

                  <div>
                    <Label>Value</Label>
                    <Input
                      value={stat.value || ""}
                      onChange={(e) => updateStat(index, 'value', e.target.value)}
                      placeholder="Stat value"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{stat.value || "Value"}</div>
                      <div className="text-sm text-muted-foreground">{stat.label || "Label"}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform Features */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Platform Features</h3>
            <div className="mt-2">
              <Label htmlFor="platform-title">Section Title</Label>
              <Input
                id="platform-title"
                value={getValue('globalSection.platformFeatures.title')}
                onChange={handlePlatformTitleChange}
                placeholder="e.g., Platform Features"
              />
            </div>
          </div>
          <Button onClick={addPlatformFeature} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Feature
          </Button>
        </div>

        <div className="space-y-2">
          {platformFeatureItems.map((item: string, index: number) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) => updatePlatformFeature(index, e.target.value)}
                placeholder="Platform feature"
              />
              <Button
                onClick={() => removePlatformFeature(index)}
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}); 