"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Sparkles, ArrowRight, CheckCircle } from "lucide-react";
import { EditorProps } from "./types";

export function CTASectionEditor({ variables, getValue, updateVariable }: EditorProps) {
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

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">CTA Section</h3>
          
          <div>
            <Label htmlFor="cta-badge">Badge</Label>
            <Input
              id="cta-badge"
              value={getValue('cta.badge')}
              onChange={(e) => updateVariable('cta.badge', e.target.value)}
              placeholder="e.g., Start Your Journey"
            />
          </div>
          
          <div>
            <Label htmlFor="cta-title">Title</Label>
            <Input
              id="cta-title"
              value={getValue('cta.title')}
              onChange={(e) => updateVariable('cta.title', e.target.value)}
              placeholder="e.g., Ready to Start Trading?"
            />
          </div>
          
          <div>
            <Label htmlFor="cta-description">Description</Label>
            <Textarea
              id="cta-description"
              value={getValue('cta.description')}
              onChange={(e) => updateVariable('cta.description', e.target.value)}
              rows={3}
              placeholder="Brief call-to-action description"
            />
          </div>
          
          <div>
            <Label htmlFor="cta-button">Button Text (New Users)</Label>
            <Input
              id="cta-button"
              value={getValue('cta.button')}
              onChange={(e) => updateVariable('cta.button', e.target.value)}
              placeholder="e.g., Get Started Now"
            />
          </div>
          
          <div>
            <Label htmlFor="cta-button-user">Button Text (Logged-in Users)</Label>
            <Input
              id="cta-button-user"
              value={getValue('cta.buttonUser')}
              onChange={(e) => updateVariable('cta.buttonUser', e.target.value)}
              placeholder="e.g., Start Trading"
            />
          </div>
        </div>

        {/* Section Preview */}
        <div className="border rounded-lg p-6 bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-950/50 dark:to-red-950/50">
          <div className="text-center">
            <div className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/50 px-4 py-2 text-sm font-medium text-orange-800 dark:text-orange-300 mb-4">
              <Sparkles className="w-4 h-4 mr-2" />
              {getValue('cta.badge')}
            </div>
            
            <h2 className="text-2xl font-bold mb-4">
              {getValue('cta.title')}
            </h2>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
              {getValue('cta.description')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl font-semibold text-white shadow-xl">
                {getValue('cta.button')}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-orange-200 dark:border-orange-800 rounded-xl font-semibold text-orange-600 dark:text-orange-400">
                {getValue('cta.buttonUser')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features for New Users */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Features (New Users)</h3>
          <Button onClick={() => addFeature('features')} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Feature
          </Button>
        </div>

        <div className="space-y-2">
          {features.map((feature: string, index: number) => (
            <div key={index} className="flex gap-2">
              <Input
                value={feature}
                onChange={(e) => updateFeature(index, e.target.value, 'features')}
                placeholder="Feature text"
              />
              <Button 
                onClick={() => removeFeature(index, 'features')} 
                size="sm" 
                variant="outline"
                className="shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Features Preview */}
        {features.length > 0 && (
          <div className="mt-4 p-4 border rounded-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
            <h4 className="font-semibold mb-3 text-center">Features for New Users</h4>
            <div className="flex flex-wrap justify-center gap-3">
              {features.map((feature: string, index: number) => (
                <div key={index} className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Features for Logged-in Users */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Features (Logged-in Users)</h3>
          <Button onClick={() => addFeature('featuresUser')} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Feature
          </Button>
        </div>

        <div className="space-y-2">
          {featuresUser.map((feature: string, index: number) => (
            <div key={index} className="flex gap-2">
              <Input
                value={feature}
                onChange={(e) => updateFeature(index, e.target.value, 'featuresUser')}
                placeholder="Feature text"
              />
              <Button 
                onClick={() => removeFeature(index, 'featuresUser')} 
                size="sm" 
                variant="outline"
                className="shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Features User Preview */}
        {featuresUser.length > 0 && (
          <div className="mt-4 p-4 border rounded-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
            <h4 className="font-semibold mb-3 text-center">Features for Logged-in Users</h4>
            <div className="flex flex-wrap justify-center gap-3">
              {featuresUser.map((feature: string, index: number) => (
                <div key={index} className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full text-sm">
                  <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Combined CTA Preview */}
      <div className="p-6 border rounded-lg bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <h4 className="text-sm font-medium mb-4 text-center text-gray-600 dark:text-gray-400">
          Complete CTA Section Preview
        </h4>
        
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/50 px-4 py-2 text-sm font-medium text-orange-800 dark:text-orange-300 mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            {getValue('cta.badge')}
          </div>
          
          <h2 className="text-2xl font-bold mb-4">
            {getValue('cta.title')}
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {getValue('cta.description')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl font-semibold text-white shadow-xl">
              {getValue('cta.button')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          {(features.length > 0 || featuresUser.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">For New Users</h4>
                  <div className="space-y-2">
                    {features.map((feature: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {featuresUser.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">For Logged-in Users</h4>
                  <div className="space-y-2">
                    {featuresUser.map((feature: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 