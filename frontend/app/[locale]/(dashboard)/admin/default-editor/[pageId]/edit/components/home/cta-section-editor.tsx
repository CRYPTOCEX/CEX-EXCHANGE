"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  CheckCircle,
  User,
  UserX,
  Megaphone
} from "lucide-react";
import { EditorProps } from "./types";
import { cn } from "@/lib/utils";

export function CTASectionEditor({ variables, getValue, updateVariable }: EditorProps) {
  const [previewState, setPreviewState] = useState<'logged-out' | 'logged-in'>('logged-out');
  const features = getValue('cta.features') || [];
  const featuresUser = getValue('cta.featuresUser') || [];

  const addFeature = (type: 'features' | 'featuresUser') => {
    const currentFeatures = type === 'features' ? features : featuresUser;
    updateVariable(`cta.${type}`, [...currentFeatures, `New Feature ${currentFeatures.length + 1}`]);
  };

  const removeFeature = (index: number, type: 'features' | 'featuresUser') => {
    const currentFeatures = type === 'features' ? features : featuresUser;
    const newFeatures = currentFeatures.filter((_: any, i: number) => i !== index);
    updateVariable(`cta.${type}`, newFeatures);
  };

  const updateFeature = (index: number, value: string, type: 'features' | 'featuresUser') => {
    const currentFeatures = type === 'features' ? features : featuresUser;
    const newFeatures = [...currentFeatures];
    newFeatures[index] = value;
    updateVariable(`cta.${type}`, newFeatures);
  };

  // Get the current features based on preview state
  const currentFeatures = previewState === 'logged-in' ? featuresUser : features;
  const defaultFeatures = previewState === 'logged-in'
    ? ['Real-time Data', 'Secure Trading', '24/7 Access']
    : ['No Credit Card Required', 'Free Registration', 'Instant Access'];

  return (
    <div className="space-y-6">
      {/* State Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Preview State:</span>
          <Tabs value={previewState} onValueChange={(v) => setPreviewState(v as any)}>
            <TabsList>
              <TabsTrigger value="logged-out" className="gap-2">
                <UserX className="w-4 h-4" />
                Guest
              </TabsTrigger>
              <TabsTrigger value="logged-in" className="gap-2">
                <User className="w-4 h-4" />
                Logged In
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Badge variant="outline" className="text-xs">
          {previewState === 'logged-in' ? 'Shows user-specific content' : 'Shows registration CTA'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Editor Panel */}
        <div className="space-y-6 xl:col-span-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            CTA Section Settings
          </h3>

          {/* Basic Settings */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="cta-badge">Badge Text</Label>
              <Input
                id="cta-badge"
                value={getValue('cta.badge') || ''}
                onChange={(e) => updateVariable('cta.badge', e.target.value)}
                placeholder="e.g., Join Now"
              />
            </div>

            <div>
              <Label htmlFor="cta-title">Title (Guest Users)</Label>
              <Input
                id="cta-title"
                value={getValue('cta.title') || ''}
                onChange={(e) => updateVariable('cta.title', e.target.value)}
                placeholder="e.g., Ready to Start Trading?"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Logged-in users see "Continue Trading" automatically
              </p>
            </div>

            <div>
              <Label htmlFor="cta-description">Description (Guest Users)</Label>
              <Textarea
                id="cta-description"
                value={getValue('cta.description') || ''}
                onChange={(e) => updateVariable('cta.description', e.target.value)}
                rows={2}
                placeholder="Brief call-to-action description"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Logged-in users see "Explore our markets" automatically
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cta-button">Button (Guest)</Label>
                <Input
                  id="cta-button"
                  value={getValue('cta.button') || ''}
                  onChange={(e) => updateVariable('cta.button', e.target.value)}
                  placeholder="e.g., Create Free Account"
                />
              </div>
              <div>
                <Label htmlFor="cta-button-user">Button (Logged In)</Label>
                <Input
                  id="cta-button-user"
                  value={getValue('cta.buttonUser') || ''}
                  onChange={(e) => updateVariable('cta.buttonUser', e.target.value)}
                  placeholder="e.g., Explore Markets"
                />
              </div>
            </div>
          </div>

          {/* Features for Guest Users */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Features (Guest Users)</Label>
                <p className="text-xs text-muted-foreground">Shown to visitors who aren't logged in</p>
              </div>
              <Button onClick={() => addFeature('features')} size="sm" variant="outline" className="gap-1">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {features.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3 border border-dashed rounded-lg">
                  No features. Defaults: "No Credit Card Required", "Free Registration", "Instant Access"
                </p>
              )}
              {features.map((feature: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value, 'features')}
                    placeholder="Feature text"
                  />
                  <Button
                    onClick={() => removeFeature(index, 'features')}
                    size="icon"
                    variant="outline"
                    className="shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Features for Logged-in Users */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Features (Logged-in Users)</Label>
                <p className="text-xs text-muted-foreground">Shown to authenticated users</p>
              </div>
              <Button onClick={() => addFeature('featuresUser')} size="sm" variant="outline" className="gap-1">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {featuresUser.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3 border border-dashed rounded-lg">
                  No features. Defaults: "Real-time Data", "Secure Trading", "24/7 Access"
                </p>
              )}
              {featuresUser.map((feature: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value, 'featuresUser')}
                    placeholder="Feature text"
                  />
                  <Button
                    onClick={() => removeFeature(index, 'featuresUser')}
                    size="icon"
                    variant="outline"
                    className="shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="relative xl:col-span-2">
          <div className="sticky top-4">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center justify-between">
              <span>LIVE PREVIEW</span>
              <Badge variant="secondary" className="text-xs">
                {previewState === 'logged-in' ? 'Logged In View' : 'Guest View'}
              </Badge>
            </div>

            {/* CTA Section Preview - matching home.tsx exactly */}
            <div className="relative overflow-hidden rounded-xl border">
              <div className="relative py-16 px-6">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-600/10 to-transparent" />

                {/* Floating shapes */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-10 left-10 w-20 h-20 rounded-full opacity-30 blur-[60px] bg-blue-500/50" />
                  <div className="absolute bottom-10 right-10 w-24 h-24 rounded-full opacity-30 blur-[60px] bg-indigo-500/50" />
                </div>

                <div className="relative z-10 text-center max-w-2xl mx-auto">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/10 border border-white/20 mb-6">
                    <Sparkles className="w-4 h-4" />
                    {getValue('cta.badge') || 'Join Now'}
                  </div>

                  {/* Title */}
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    {previewState === 'logged-in'
                      ? 'Continue Trading'
                      : (getValue('cta.title') || 'Ready to Start Trading?')}
                  </h2>

                  {/* Description */}
                  <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
                    {previewState === 'logged-in'
                      ? 'Explore our markets and continue your trading journey.'
                      : (getValue('cta.description') || 'Join thousands of traders who trust our platform. Start your journey to financial freedom today.')}
                  </p>

                  {/* CTA Button */}
                  <div className="flex justify-center mb-8">
                    <button className="group inline-flex items-center justify-center gap-3 h-14 px-8 bg-white text-blue-600 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-white/20 transition-shadow">
                      {previewState === 'logged-in'
                        ? (getValue('cta.buttonUser') || 'Explore Markets')
                        : (getValue('cta.button') || 'Create Free Account')}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap justify-center gap-4 text-sm">
                    {(currentFeatures.length > 0 ? currentFeatures : defaultFeatures).map((feature: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* State comparison hint */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
              <strong>Tip:</strong> Toggle between Guest and Logged In views to see how the CTA section adapts to different user states.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
