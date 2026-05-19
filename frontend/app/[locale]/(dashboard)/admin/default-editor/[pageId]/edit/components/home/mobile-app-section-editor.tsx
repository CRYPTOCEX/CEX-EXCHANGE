"use client";

import React, { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Smartphone, ExternalLink } from "lucide-react";
import { EditorProps } from "./types";
import { Link } from "@/i18n/routing";

export const MobileAppSectionEditor = React.memo(function MobileAppSectionEditor({
  variables,
  getValue,
  updateVariable
}: EditorProps) {
  const handleEnabledChange = useCallback((checked: boolean) => {
    updateVariable('mobileApp.enabled', checked);
  }, [updateVariable]);

  const handleBadgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('mobileApp.badge', e.target.value);
  }, [updateVariable]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('mobileApp.title', e.target.value);
  }, [updateVariable]);

  const handleSubtitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('mobileApp.subtitle', e.target.value);
  }, [updateVariable]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateVariable('mobileApp.description', e.target.value);
  }, [updateVariable]);

  const features = getValue('mobileApp.features') || [];

  const addFeature = useCallback(() => {
    const newFeatures = [...features, {
      title: `Feature ${features.length + 1}`,
      description: "Feature description",
      icon: "Star",
      gradient: "from-blue-500 to-cyan-500"
    }];
    updateVariable('mobileApp.features', newFeatures);
  }, [features, updateVariable]);

  const removeFeature = useCallback((index: number) => {
    const newFeatures = features.filter((_: any, i: number) => i !== index);
    updateVariable('mobileApp.features', newFeatures);
  }, [features, updateVariable]);

  const updateFeature = useCallback((index: number, field: string, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    updateVariable('mobileApp.features', newFeatures);
  }, [features, updateVariable]);

  const isEnabled = getValue('mobileApp.enabled') !== false;

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Mobile App Section
        </h3>

        <div className="flex items-center justify-between mb-6 pb-6 border-b">
          <div>
            <Label htmlFor="mobile-enabled" className="text-base font-medium">
              Show Mobile App Section
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Display the mobile app download section on the landing page
            </p>
          </div>
          <Switch
            id="mobile-enabled"
            checked={isEnabled}
            onCheckedChange={handleEnabledChange}
          />
        </div>

        {isEnabled && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-400">
                <strong>Note:</strong> App Store and Google Play links are configured in{" "}
                <Link href="/admin/settings" className="underline inline-flex items-center gap-1">
                  Admin Settings <ExternalLink className="w-3 h-3" />
                </Link>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mobile-badge">Badge Text</Label>
                <Input
                  id="mobile-badge"
                  value={getValue('mobileApp.badge') || ''}
                  onChange={handleBadgeChange}
                  placeholder="e.g., Download Our App"
                />
              </div>
              <div>
                <Label htmlFor="mobile-title">Title</Label>
                <Input
                  id="mobile-title"
                  value={getValue('mobileApp.title') || ''}
                  onChange={handleTitleChange}
                  placeholder="e.g., Trade on the Go"
                />
              </div>
              <div>
                <Label htmlFor="mobile-subtitle">Subtitle</Label>
                <Input
                  id="mobile-subtitle"
                  value={getValue('mobileApp.subtitle') || ''}
                  onChange={handleSubtitleChange}
                  placeholder="e.g., Anytime, Anywhere"
                />
              </div>
              <div>
                <Label htmlFor="mobile-description">Description</Label>
                <Textarea
                  id="mobile-description"
                  value={getValue('mobileApp.description') || ''}
                  onChange={handleDescriptionChange}
                  placeholder="Brief description of the mobile app"
                  rows={2}
                />
              </div>
            </div>

            {/* Features */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <Label>App Features</Label>
                <Button onClick={addFeature} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Feature
                </Button>
              </div>
              <div className="space-y-3">
                {features.map((feature: any, index: number) => (
                  <div key={index} className="flex gap-3 items-start p-3 rounded-lg border bg-muted/30">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Title</Label>
                        <Input
                          value={feature.title || ''}
                          onChange={(e) => updateFeature(index, 'title', e.target.value)}
                          placeholder="Feature title"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Icon</Label>
                        <Input
                          value={feature.icon || ''}
                          onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                          placeholder="e.g., Shield, Zap"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={feature.description || ''}
                          onChange={(e) => updateFeature(index, 'description', e.target.value)}
                          placeholder="Feature description"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => removeFeature(index)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {features.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg border-dashed">
                    No features added yet. Click &quot;Add Feature&quot; to create one.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="p-4 border rounded-lg bg-gradient-to-br from-zinc-900/50 to-zinc-800/50">
        <h4 className="text-sm font-medium mb-4 text-muted-foreground">Mobile App Preview</h4>

        {isEnabled ? (
          <div className="rounded-xl bg-black/30 p-6">
            <div className="flex items-start gap-6">
              <div className="flex-1">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-4">
                  <Smartphone className="w-3 h-3" />
                  {getValue('mobileApp.badge') || 'Download Our App'}
                </span>
                <h3 className="text-2xl font-bold mb-1">
                  {getValue('mobileApp.title') || 'Trade on the Go'}
                </h3>
                <p className="text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                  {getValue('mobileApp.subtitle') || 'Anytime, Anywhere'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {getValue('mobileApp.description') || 'Experience seamless trading with our mobile app'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {features.slice(0, 4).map((feature: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center">
                        <span className="text-purple-400">★</span>
                      </div>
                      {feature.title}
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-32 h-48 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl ring-1 ring-white/10 flex items-center justify-center">
                <Smartphone className="w-12 h-12 text-white/20" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 rounded-xl bg-black/30 border border-dashed border-white/10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Smartphone className="w-5 h-5" />
              <span>Mobile app section is disabled</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
