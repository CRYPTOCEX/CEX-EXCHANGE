"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Users, DollarSign, TrendingUp, Target, CheckCircle, Settings, Award, Star,
         Shield, Zap, CreditCard, Smartphone, Eye, Globe, Heart, Clock,
         Gift, Headphones, Lock, Database, Cloud, Rocket, Lightbulb } from "lucide-react";
import { EditorProps, Step } from "./types";

// Create icon options - only using icons that are definitely available
const iconOptions = [
  { value: "Users", label: "Create Account", icon: Users },
  { value: "DollarSign", label: "Add Funds", icon: DollarSign },
  { value: "TrendingUp", label: "Start Trading", icon: TrendingUp },
  { value: "Target", label: "Set Goals", icon: Target },
  { value: "CheckCircle", label: "Complete", icon: CheckCircle },
  { value: "Settings", label: "Configure", icon: Settings },
  { value: "Award", label: "Achieve", icon: Award },
  { value: "Star", label: "Rate/Review", icon: Star },
  { value: "Shield", label: "Secure", icon: Shield },
  { value: "Zap", label: "Quick Start", icon: Zap },
  { value: "CreditCard", label: "Payment", icon: CreditCard },
  { value: "Smartphone", label: "Mobile Setup", icon: Smartphone },
  { value: "Eye", label: "Explore", icon: Eye },
  { value: "Globe", label: "Connect", icon: Globe },
  { value: "Heart", label: "Favorite", icon: Heart },
  { value: "Clock", label: "Schedule", icon: Clock },
  { value: "Gift", label: "Rewards", icon: Gift },
  { value: "Headphones", label: "Get Support", icon: Headphones },
  { value: "Lock", label: "Verify", icon: Lock },
  { value: "Database", label: "Backup", icon: Database },
  { value: "Cloud", label: "Sync", icon: Cloud },
  { value: "Rocket", label: "Launch", icon: Rocket },
  { value: "Lightbulb", label: "Learn", icon: Lightbulb },
];

// Log available icons for debugging
console.log(`🚀 Step icons loaded: ${iconOptions.length} icons available`);

const gradientOptions = [
  { value: "from-blue-500 to-purple-500", label: "Blue to Purple" },
  { value: "from-green-500 to-blue-500", label: "Green to Blue" },
  { value: "from-purple-500 to-pink-500", label: "Purple to Pink" },
  { value: "from-yellow-500 to-orange-500", label: "Yellow to Orange" },
  { value: "from-red-500 to-pink-500", label: "Red to Pink" },
  { value: "from-indigo-500 to-purple-500", label: "Indigo to Purple" },
  { value: "from-cyan-500 to-blue-500", label: "Cyan to Blue" },
  { value: "from-emerald-500 to-teal-500", label: "Emerald to Teal" },
  { value: "from-orange-500 to-red-500", label: "Orange to Red" },
  { value: "from-violet-500 to-fuchsia-500", label: "Violet to Fuchsia" },
  { value: "from-teal-500 to-cyan-500", label: "Teal to Cyan" },
  { value: "from-rose-500 to-pink-500", label: "Rose to Pink" },
  { value: "from-amber-500 to-yellow-500", label: "Amber to Yellow" },
  { value: "from-lime-500 to-green-500", label: "Lime to Green" },
  { value: "from-sky-500 to-indigo-500", label: "Sky to Indigo" },
];

function getIconComponent(iconName: string) {
  const iconOption = iconOptions.find(opt => opt.value === iconName);
  const IconComponent = iconOption ? iconOption.icon : Users;
  // Add safety check
  return IconComponent && typeof IconComponent === 'function' ? IconComponent : Users;
}

export function GettingStartedEditor({ variables, getValue, updateVariable }: EditorProps) {
  const steps = getValue('gettingStarted.steps') || [];

  const addStep = () => {
    const newStep: Step = {
      step: (steps.length + 1).toString(),
      title: "New Step",
      description: "Step description",
      icon: "Users",
      gradient: "from-blue-500 to-purple-500"
    };
    updateVariable('gettingStarted.steps', [...steps, newStep]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_: any, i: number) => i !== index);
    // Reorder step numbers
    const reorderedSteps = newSteps.map((step: Step, i: number) => ({
      ...step,
      step: (i + 1).toString()
    }));
    updateVariable('gettingStarted.steps', reorderedSteps);
  };

  const updateStep = (index: number, field: keyof Step, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    updateVariable('gettingStarted.steps', newSteps);
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Section Header</h3>
          
          <div>
            <Label htmlFor="getting-started-badge">Badge</Label>
            <Input
              id="getting-started-badge"
              value={getValue('gettingStarted.badge')}
              onChange={(e) => updateVariable('gettingStarted.badge', e.target.value)}
              placeholder="e.g., Get Started"
            />
          </div>
          
          <div>
            <Label htmlFor="getting-started-title">Title</Label>
            <Input
              id="getting-started-title"
              value={getValue('gettingStarted.title')}
              onChange={(e) => updateVariable('gettingStarted.title', e.target.value)}
              placeholder="e.g., Start Your"
            />
          </div>
          
          <div>
            <Label htmlFor="getting-started-subtitle">Subtitle</Label>
            <Input
              id="getting-started-subtitle"
              value={getValue('gettingStarted.subtitle')}
              onChange={(e) => updateVariable('gettingStarted.subtitle', e.target.value)}
              placeholder="e.g., Trading Journey"
            />
          </div>
        </div>

        {/* Section Header Preview */}
        <div className="border rounded-lg p-6 bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950/50 dark:to-pink-950/50">
          <div className="text-center">
            <div className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/50 px-4 py-2 text-sm font-medium text-purple-800 dark:text-purple-300 mb-4">
              <Target className="w-4 h-4 mr-2" />
              {getValue('gettingStarted.badge')}
            </div>
            
            <h2 className="text-2xl font-bold mb-2">
              {getValue('gettingStarted.title')}{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {getValue('gettingStarted.subtitle')}
              </span>
            </h2>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Steps</h3>
          <Button onClick={addStep} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Step
          </Button>
        </div>

        <div className="grid gap-4">
          {steps.map((step: Step, index: number) => {
            const IconComponent = getIconComponent(step.icon);
            
            return (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Step {step.step}</CardTitle>
                    <Button 
                      onClick={() => removeStep(index)} 
                      size="sm" 
                      variant="outline"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {/* Step Editor */}
                    <div className="space-y-3">
                      <div>
                        <Label>Step Number</Label>
                        <Input
                          value={step.step}
                          onChange={(e) => updateStep(index, 'step', e.target.value)}
                          placeholder="1"
                        />
                      </div>
                      
                      <div>
                        <Label>Title</Label>
                        <Input
                          value={step.title}
                          onChange={(e) => updateStep(index, 'title', e.target.value)}
                          placeholder="Step title"
                        />
                      </div>
                      
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={step.description}
                          onChange={(e) => updateStep(index, 'description', e.target.value)}
                          rows={2}
                          placeholder="Step description"
                        />
                      </div>
                      
                      <div>
                        <Label>Icon</Label>
                        <Select
                          value={step.icon}
                          onValueChange={(value) => updateStep(index, 'icon', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {iconOptions.map((option) => {
                              const IconComp = option.icon;
                              return (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    <IconComp className="w-4 h-4" />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Gradient</Label>
                        <Select
                          value={step.gradient}
                          onValueChange={(value) => updateStep(index, 'gradient', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {gradientOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ background: option.value.replace(/from-(\w+)-(\d+)/g, 'rgb(var(--$1-$2))').replace(/to-(\w+)-(\d+)/g, 'rgb(var(--$1-$2))') }}
                                  />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Step Preview */}
                    <div className="flex items-center justify-center p-6 border border-dashed border-gray-300 rounded-lg">
                      <div className="text-center space-y-3">
                        <div className={`w-12 h-12 rounded-xl mx-auto bg-gradient-to-r ${step.gradient} flex items-center justify-center`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Step {step.step}</div>
                          <div className="font-medium text-sm">{step.title}</div>
                          <div className="text-xs text-muted-foreground">{step.description}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Steps Flow Preview */}
        {steps.length > 0 && (
          <div className="mt-6 p-6 border rounded-lg bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
            <h4 className="text-sm font-medium mb-4 text-center text-gray-600 dark:text-gray-400">
              Steps Flow Preview
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((step: Step, index: number) => {
                const IconComponent = getIconComponent(step.icon);
                return (
                  <div key={index} className="text-center">
                    <div className={`relative w-16 h-16 rounded-full bg-gradient-to-r ${step.gradient} flex items-center justify-center mx-auto mb-4`}>
                      <IconComponent className="w-8 h-8 text-white" />
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-xs font-bold">
                        {step.step}
                      </div>
                    </div>
                    <h4 className="font-semibold mb-2">{step.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 