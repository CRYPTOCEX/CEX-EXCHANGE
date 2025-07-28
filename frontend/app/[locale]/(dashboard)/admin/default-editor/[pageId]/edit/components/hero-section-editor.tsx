"use client";

import React, { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Sparkles, ArrowRight } from "lucide-react";
import { EditorProps } from "./types";

export const HeroSectionEditor = React.memo(function HeroSectionEditor({ 
  variables, 
  getValue, 
  updateVariable 
}: EditorProps) {
  const heroFeatures = getValue('hero.features') || [];

  const addHeroFeature = useCallback(() => {
    const newFeatures = [...heroFeatures, `New Feature ${heroFeatures.length + 1}`];
    updateVariable('hero.features', newFeatures);
  }, [heroFeatures, updateVariable]);

  const removeHeroFeature = useCallback((index: number) => {
    const newFeatures = heroFeatures.filter((_: any, i: number) => i !== index);
    updateVariable('hero.features', newFeatures);
  }, [heroFeatures, updateVariable]);

  const updateHeroFeature = useCallback((index: number, value: string) => {
    const newFeatures = [...heroFeatures];
    newFeatures[index] = value;
    updateVariable('hero.features', newFeatures);
  }, [heroFeatures, updateVariable]);

  const handleBadgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('hero.badge', e.target.value);
  }, [updateVariable]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('hero.title', e.target.value);
  }, [updateVariable]);

  const handleSubtitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('hero.subtitle', e.target.value);
  }, [updateVariable]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateVariable('hero.description', e.target.value);
  }, [updateVariable]);

  const handleCtaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('hero.cta', e.target.value);
  }, [updateVariable]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Editor */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="hero-badge">Badge Text</Label>
          <Input
            id="hero-badge"
            value={getValue('hero.badge')}
            onChange={handleBadgeChange}
            placeholder="e.g., #1 Crypto Trading Platform"
          />
        </div>
        
        <div>
          <Label htmlFor="hero-title">Main Title</Label>
          <Input
            id="hero-title"
            value={getValue('hero.title')}
            onChange={handleTitleChange}
            placeholder="e.g., Trade Crypto"
          />
        </div>
        
        <div>
          <Label htmlFor="hero-subtitle">Subtitle</Label>
          <Input
            id="hero-subtitle"
            value={getValue('hero.subtitle')}
            onChange={handleSubtitleChange}
            placeholder="e.g., Like a Pro"
          />
        </div>
        
        <div>
          <Label htmlFor="hero-description">Description</Label>
          <Textarea
            id="hero-description"
            value={getValue('hero.description')}
            onChange={handleDescriptionChange}
            rows={3}
            placeholder="Brief description of your platform"
          />
        </div>
        
        <div>
          <Label htmlFor="hero-cta">Call to Action Button</Label>
          <Input
            id="hero-cta"
            value={getValue('hero.cta')}
            onChange={handleCtaChange}
            placeholder="e.g., Start Trading Free"
          />
        </div>

        {/* Hero Features */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>Hero Features</Label>
            <Button onClick={addHeroFeature} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add Feature
            </Button>
          </div>
          <div className="space-y-2">
            {heroFeatures.map((feature: string, index: number) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={feature}
                  onChange={(e) => updateHeroFeature(index, e.target.value)}
                  placeholder="Feature text"
                />
                <Button
                  onClick={() => removeHeroFeature(index)}
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

      {/* Preview */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/30 rounded-lg p-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Sparkles className="w-3 h-3 mr-1" />
            {getValue('hero.badge')}
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              {getValue('hero.title')}
            </h1>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {getValue('hero.subtitle')}
            </h2>
          </div>
          
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {getValue('hero.description')}
          </p>
          
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {heroFeatures.map((feature: string, index: number) => (
              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                ✓ {feature}
              </span>
            ))}
          </div>
          
          <div className="pt-4">
            <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              {getValue('hero.cta')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}); 