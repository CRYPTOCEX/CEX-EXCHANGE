"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Users,
  DollarSign,
  TrendingUp,
  Target,
  CheckCircle,
  Settings,
  Award,
  Star,
  Shield,
  Zap,
  CreditCard,
  Smartphone,
  Eye,
  Globe,
  Heart,
  Clock,
  Gift,
  Headphones,
  Lock,
  Database,
  Cloud,
  Rocket,
  Lightbulb,
  Wallet,
  Activity,
  LineChart,
  PieChart,
  GripVertical
} from "lucide-react";
import { EditorProps, Step } from "./types";
import { cn } from "@/lib/utils";

// Icon mapping
const iconMap: Record<string, any> = {
  Users, DollarSign, TrendingUp, Target, CheckCircle, Settings, Award, Star,
  Shield, Zap, CreditCard, Smartphone, Eye, Globe, Heart, Clock,
  Gift, Headphones, Lock, Database, Cloud, Rocket, Lightbulb, Wallet,
  Activity, LineChart, PieChart
};

const iconOptions = [
  { value: "Users", label: "Create Account" },
  { value: "Wallet", label: "Fund Wallet" },
  { value: "TrendingUp", label: "Start Trading" },
  { value: "Target", label: "Set Goals" },
  { value: "CheckCircle", label: "Complete" },
  { value: "Settings", label: "Configure" },
  { value: "Award", label: "Achieve" },
  { value: "Star", label: "Rate/Review" },
  { value: "Shield", label: "Secure" },
  { value: "Zap", label: "Quick Start" },
  { value: "CreditCard", label: "Payment" },
  { value: "Smartphone", label: "Mobile Setup" },
  { value: "Eye", label: "Explore" },
  { value: "Globe", label: "Connect" },
  { value: "Heart", label: "Favorite" },
  { value: "Clock", label: "Schedule" },
  { value: "Gift", label: "Rewards" },
  { value: "Headphones", label: "Get Support" },
  { value: "Lock", label: "Verify" },
  { value: "Database", label: "Backup" },
  { value: "Cloud", label: "Sync" },
  { value: "Rocket", label: "Launch" },
  { value: "Lightbulb", label: "Learn" },
  { value: "Activity", label: "Activity" },
  { value: "LineChart", label: "Chart" },
  { value: "PieChart", label: "Analytics" },
];

const gradientOptions = [
  { value: "from-blue-500 to-cyan-500", label: "Blue to Cyan" },
  { value: "from-purple-500 to-pink-500", label: "Purple to Pink" },
  { value: "from-orange-500 to-red-500", label: "Orange to Red" },
  { value: "from-green-500 to-emerald-500", label: "Green to Emerald" },
  { value: "from-indigo-500 to-purple-500", label: "Indigo to Purple" },
  { value: "from-cyan-500 to-blue-500", label: "Cyan to Blue" },
  { value: "from-emerald-500 to-teal-500", label: "Emerald to Teal" },
  { value: "from-yellow-500 to-orange-500", label: "Yellow to Orange" },
  { value: "from-rose-500 to-pink-500", label: "Rose to Pink" },
  { value: "from-violet-500 to-fuchsia-500", label: "Violet to Fuchsia" },
];

function getIconComponent(iconName: string) {
  return iconMap[iconName] || Users;
}

export function GettingStartedEditor({ variables, getValue, updateVariable }: EditorProps) {
  const steps = getValue('gettingStarted.steps') || [];

  const addStep = () => {
    const stepNumber = steps.length + 1;
    const newStep: Step = {
      step: stepNumber.toString().padStart(2, '0'),
      title: `Step ${stepNumber}`,
      description: "Describe this step",
      icon: stepNumber === 1 ? "Users" : stepNumber === 2 ? "Wallet" : "TrendingUp",
      gradient: stepNumber === 1 ? "from-blue-500 to-cyan-500" : stepNumber === 2 ? "from-purple-500 to-pink-500" : "from-orange-500 to-red-500"
    };
    updateVariable('gettingStarted.steps', [...steps, newStep]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_: any, i: number) => i !== index);
    const reorderedSteps = newSteps.map((step: Step, i: number) => ({
      ...step,
      step: (i + 1).toString().padStart(2, '0')
    }));
    updateVariable('gettingStarted.steps', reorderedSteps);
  };

  const updateStep = (index: number, field: keyof Step, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    updateVariable('gettingStarted.steps', newSteps);
  };

  // Default steps for preview
  const defaultSteps = [
    { step: "01", title: "Create Account", description: "Sign up in seconds with just your email.", icon: "Users", gradient: "from-blue-500 to-cyan-500" },
    { step: "02", title: "Fund Your Wallet", description: "Deposit funds using multiple payment methods.", icon: "Wallet", gradient: "from-purple-500 to-pink-500" },
    { step: "03", title: "Start Trading", description: "Access markets and start trading instantly.", icon: "TrendingUp", gradient: "from-orange-500 to-red-500" },
  ];

  const displaySteps = steps.length > 0 ? steps : defaultSteps;

  return (
    <div className="space-y-6">
      {/* Section Header Editor */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-4 xl:col-span-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Getting Started Section
          </h3>

          <div>
            <Label htmlFor="getting-started-badge">Badge Text</Label>
            <Input
              id="getting-started-badge"
              value={getValue('gettingStarted.badge') || ''}
              onChange={(e) => updateVariable('gettingStarted.badge', e.target.value)}
              placeholder="e.g., Get Started"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="getting-started-title">Title</Label>
              <Input
                id="getting-started-title"
                value={getValue('gettingStarted.title') || ''}
                onChange={(e) => updateVariable('gettingStarted.title', e.target.value)}
                placeholder="e.g., Start Trading"
              />
            </div>
            <div>
              <Label htmlFor="getting-started-subtitle">Subtitle (Gradient)</Label>
              <Input
                id="getting-started-subtitle"
                value={getValue('gettingStarted.subtitle') || ''}
                onChange={(e) => updateVariable('gettingStarted.subtitle', e.target.value)}
                placeholder="e.g., in Minutes"
              />
            </div>
          </div>
        </div>

        {/* Header Preview */}
        <div className="relative rounded-xl border overflow-hidden xl:col-span-2">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-5 left-10 w-20 h-20 rounded-full opacity-20 blur-[60px] bg-purple-500/40" />
            <div className="absolute bottom-5 right-10 w-24 h-24 rounded-full opacity-20 blur-[60px] bg-cyan-500/40" />
          </div>
          <div className="relative p-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-primary/10 border border-primary/20 text-primary mb-4">
              <Rocket className="w-4 h-4" />
              {getValue('gettingStarted.badge') || 'Get Started'}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">
              {getValue('gettingStarted.title') || 'Start Trading'}{" "}
              <span className="bg-linear-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                {getValue('gettingStarted.subtitle') || 'in Minutes'}
              </span>
            </h2>
          </div>
        </div>
      </div>

      {/* Steps Editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Steps</h3>
            <p className="text-sm text-muted-foreground">Define the onboarding steps for new users</p>
          </div>
          <Button onClick={addStep} size="sm" variant="outline" className="gap-1">
            <Plus className="w-4 h-4" />
            Add Step
          </Button>
        </div>

        {/* Step Cards */}
        <div className="space-y-3">
          {steps.length === 0 && (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <Rocket className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">No steps configured. Using defaults.</p>
              <Button onClick={addStep} size="sm" variant="outline" className="gap-1">
                <Plus className="w-4 h-4" />
                Add First Step
              </Button>
            </div>
          )}

          {steps.map((step: Step, index: number) => {
            const IconComponent = getIconComponent(step.icon);
            return (
              <div key={index} className="p-4 border rounded-lg bg-card">
                <div className="flex items-start gap-4">
                  {/* Step Preview Icon */}
                  <div className="relative shrink-0">
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center bg-linear-to-br",
                      step.gradient
                    )}>
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-background border-2 border-border flex items-center justify-center text-xs font-bold">
                      {step.step}
                    </div>
                  </div>

                  {/* Step Editor */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Step Number</Label>
                      <Input
                        value={step.step}
                        onChange={(e) => updateStep(index, 'step', e.target.value)}
                        placeholder="01"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Title</Label>
                      <Input
                        value={step.title}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        placeholder="Step title"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Icon</Label>
                      <Select value={step.icon} onValueChange={(v) => updateStep(index, 'icon', v)}>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions.map((opt) => {
                            const Icon = iconMap[opt.value];
                            return (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  {opt.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Gradient</Label>
                      <Select value={step.gradient} onValueChange={(v) => updateStep(index, 'gradient', v)}>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {gradientOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-4 h-4 rounded bg-linear-to-r", opt.value)} />
                                {opt.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={step.description}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        placeholder="Brief step description"
                        className="h-9"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => removeStep(index)}
                        size="sm"
                        variant="outline"
                        className="w-full h-9 text-destructive hover:text-destructive gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Section Preview */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
          <span>SECTION PREVIEW</span>
          <Badge variant="secondary" className="text-xs">
            {displaySteps.length} steps
          </Badge>
        </div>

        <div className="relative overflow-hidden rounded-xl border">
          {/* Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-1/4 w-32 h-32 rounded-full opacity-20 blur-[80px] bg-purple-500/40" />
            <div className="absolute bottom-10 right-1/4 w-40 h-40 rounded-full opacity-20 blur-[80px] bg-cyan-500/40" />
          </div>

          <div className="relative py-12 px-6">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-primary/10 border border-primary/20 text-primary mb-4">
                <Rocket className="w-4 h-4" />
                {getValue('gettingStarted.badge') || 'Get Started'}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                {getValue('gettingStarted.title') || 'Start Trading'}{" "}
                <span className="bg-linear-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  {getValue('gettingStarted.subtitle') || 'in Minutes'}
                </span>
              </h2>
            </div>

            {/* Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Connection line */}
              <div className="hidden md:block absolute top-14 left-[15%] right-[15%] h-0.5">
                <div className="h-full bg-linear-to-r from-blue-500/50 via-purple-500/50 to-cyan-500/50" />
              </div>

              {displaySteps.map((step: Step, index: number) => {
                const IconComponent = getIconComponent(step.icon);
                return (
                  <div key={index} className="relative">
                    <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 p-6 text-center shadow-lg">
                      <div className="relative inline-block mb-4">
                        <div className={cn(
                          "w-16 h-16 rounded-xl flex items-center justify-center bg-linear-to-br mx-auto",
                          step.gradient
                        )}>
                          <IconComponent className="w-8 h-8 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center text-xs font-bold">
                          {step.step}
                        </div>
                      </div>
                      <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
