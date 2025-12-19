"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountrySelect } from "@/components/ui/country-select";
import { StateSelect } from "@/components/ui/state-select";
import { CitySelect } from "@/components/ui/city-select";
import {
  FileText,
  Building2,
  Globe,
  Mail,
  Shield,
  Scale,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Check,
  Wand2,
  Eye,
  Copy,
  RefreshCw,
  Info,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  generateAboutPage,
  generatePrivacyPolicy,
  generateTermsOfService,
  generateContactPage,
} from "./legal-templates";
import { siteName, frontendUrl } from "@/lib/siteInfo";
import { loadCountriesIndex, type Country } from "@/lib/countries";

// Types for the wizard
export interface BusinessInfo {
  companyName: string;
  companyType: "corporation" | "llc" | "sole_proprietor" | "partnership" | "other";
  websiteName: string;
  websiteUrl: string;
  industry: string;
  foundedYear: string;
  countryCode: string; // ISO2 code for country selector
  country: string; // Display name
  state: string;
  city: string;
  address: string;
  email: string;
  supportEmail: string;
  phone: string;
  registrationNumber?: string;
}

export interface AboutPageOptions {
  includeHistory: boolean;
  includeMission: boolean;
  includeVision: boolean;
  includeValues: boolean;
  includeTeam: boolean;
  includeStats: boolean;
  missionStatement: string;
  visionStatement: string;
  companyDescription: string;
  values: string[];
  achievements: string[];
}

export interface PrivacyOptions {
  collectsPersonalInfo: boolean;
  collectsPaymentInfo: boolean;
  usesCookies: boolean;
  usesAnalytics: boolean;
  usesThirdPartyServices: boolean;
  sharesDataWithThirdParties: boolean;
  hasUserAccounts: boolean;
  allowsUserContent: boolean;
  hasNewsletters: boolean;
  targetAudience: "general" | "children" | "adults_only";
  dataRetentionPeriod: string;
  analyticsProvider: string;
  paymentProcessors: string[];
  thirdPartyServices: string[];
  gdprCompliant: boolean;
  ccpaCompliant: boolean;
  hasDataDeletion: boolean;
  hasDataExport: boolean;
}

export interface TermsOptions {
  hasUserAccounts: boolean;
  hasSubscriptions: boolean;
  hasPayments: boolean;
  hasRefunds: boolean;
  hasUserContent: boolean;
  hasAffiliate: boolean;
  hasAPI: boolean;
  allowsCommercialUse: boolean;
  hasAgeRestriction: boolean;
  minimumAge: string;
  refundPeriod: string;
  subscriptionTerms: string;
  prohibitedActivities: string[];
  intellectualPropertyNotice: string;
  disputeResolution: "arbitration" | "litigation" | "mediation";
  governingLaw: string;
  limitLiability: boolean;
  hasIndemnification: boolean;
}

export interface ContactOptions {
  includeForm: boolean;
  includeMap: boolean;
  includeSocialLinks: boolean;
  includeHours: boolean;
  includeFAQ: boolean;
  businessHours: string;
  responseTime: string;
  departments: { name: string; email: string }[];
  socialLinks: { platform: string; url: string }[];
  faqItems: { question: string; answer: string }[];
}

interface LegalTemplateWizardProps {
  pageType: "about" | "privacy" | "terms" | "contact";
  onGenerate: (content: string) => void;
  onClose: () => void;
}

const STEPS = {
  about: [
    { id: "business", title: "Business Info", icon: Building2 },
    { id: "content", title: "Content Options", icon: FileText },
    { id: "details", title: "Details", icon: Info },
    { id: "preview", title: "Preview & Generate", icon: Eye },
  ],
  privacy: [
    { id: "business", title: "Business Info", icon: Building2 },
    { id: "data", title: "Data Collection", icon: Shield },
    { id: "compliance", title: "Compliance", icon: Scale },
    { id: "preview", title: "Preview & Generate", icon: Eye },
  ],
  terms: [
    { id: "business", title: "Business Info", icon: Building2 },
    { id: "services", title: "Services", icon: Globe },
    { id: "legal", title: "Legal Terms", icon: Scale },
    { id: "preview", title: "Preview & Generate", icon: Eye },
  ],
  contact: [
    { id: "business", title: "Business Info", icon: Building2 },
    { id: "contact", title: "Contact Details", icon: Mail },
    { id: "options", title: "Page Options", icon: FileText },
    { id: "preview", title: "Preview & Generate", icon: Eye },
  ],
};

const INDUSTRIES = [
  "Technology / Software",
  "Finance / Fintech",
  "E-commerce / Retail",
  "Healthcare",
  "Education",
  "Entertainment / Media",
  "Travel / Hospitality",
  "Real Estate",
  "Professional Services",
  "Manufacturing",
  "Cryptocurrency / Blockchain",
  "Gaming",
  "Social Media",
  "Food & Beverage",
  "Other",
];

const DEFAULT_VALUES = [
  "Innovation",
  "Integrity",
  "Customer Focus",
  "Excellence",
  "Transparency",
  "Security",
];

const DEFAULT_PROHIBITED_ACTIVITIES = [
  "Violating any laws or regulations",
  "Infringing intellectual property rights",
  "Transmitting malware or harmful code",
  "Attempting unauthorized access",
  "Harassment or abusive behavior",
  "Fraudulent activities",
  "Spamming or unsolicited communications",
];

export function LegalTemplateWizard({
  pageType,
  onGenerate,
  onClose,
}: LegalTemplateWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);

  // Load countries list on mount
  useEffect(() => {
    loadCountriesIndex().then(setCountries);
  }, []);

  // Business Info State - Use environment variables for defaults
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    companyName: siteName || "",
    companyType: "corporation",
    websiteName: siteName || "",
    websiteUrl: frontendUrl || "",
    industry: "",
    foundedYear: new Date().getFullYear().toString(),
    countryCode: "",
    country: "",
    state: "",
    city: "",
    address: "",
    email: "",
    supportEmail: "",
    phone: "",
    registrationNumber: "",
  });

  // About Page Options
  const [aboutOptions, setAboutOptions] = useState<AboutPageOptions>({
    includeHistory: true,
    includeMission: true,
    includeVision: true,
    includeValues: true,
    includeTeam: false,
    includeStats: true,
    missionStatement: "",
    visionStatement: "",
    companyDescription: "",
    values: [...DEFAULT_VALUES],
    achievements: [],
  });

  // Privacy Options
  const [privacyOptions, setPrivacyOptions] = useState<PrivacyOptions>({
    collectsPersonalInfo: true,
    collectsPaymentInfo: false,
    usesCookies: true,
    usesAnalytics: true,
    usesThirdPartyServices: true,
    sharesDataWithThirdParties: false,
    hasUserAccounts: true,
    allowsUserContent: false,
    hasNewsletters: true,
    targetAudience: "general",
    dataRetentionPeriod: "2 years",
    analyticsProvider: "Google Analytics",
    paymentProcessors: [],
    thirdPartyServices: [],
    gdprCompliant: true,
    ccpaCompliant: true,
    hasDataDeletion: true,
    hasDataExport: true,
  });

  // Terms Options
  const [termsOptions, setTermsOptions] = useState<TermsOptions>({
    hasUserAccounts: true,
    hasSubscriptions: false,
    hasPayments: false,
    hasRefunds: false,
    hasUserContent: false,
    hasAffiliate: false,
    hasAPI: false,
    allowsCommercialUse: false,
    hasAgeRestriction: true,
    minimumAge: "18",
    refundPeriod: "30 days",
    subscriptionTerms: "",
    prohibitedActivities: [...DEFAULT_PROHIBITED_ACTIVITIES],
    intellectualPropertyNotice: "",
    disputeResolution: "arbitration",
    governingLaw: "",
    limitLiability: true,
    hasIndemnification: true,
  });

  // Contact Options
  const [contactOptions, setContactOptions] = useState<ContactOptions>({
    includeForm: true,
    includeMap: false,
    includeSocialLinks: true,
    includeHours: true,
    includeFAQ: true,
    businessHours: "Monday - Friday: 9:00 AM - 6:00 PM",
    responseTime: "24-48 hours",
    departments: [
      { name: "General Inquiries", email: "" },
      { name: "Support", email: "" },
    ],
    socialLinks: [],
    faqItems: [],
  });

  const steps = STEPS[pageType];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);

    // Simulate generation delay for UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    let content = "";
    const effectiveDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    switch (pageType) {
      case "about":
        content = generateAboutPage(businessInfo, aboutOptions);
        break;
      case "privacy":
        content = generatePrivacyPolicy(businessInfo, privacyOptions, effectiveDate);
        break;
      case "terms":
        content = generateTermsOfService(businessInfo, termsOptions, effectiveDate);
        break;
      case "contact":
        content = generateContactPage(businessInfo, contactOptions);
        break;
    }

    setGeneratedContent(content);
    setIsGenerating(false);
  };

  const handleApply = () => {
    onGenerate(generatedContent);
    onClose();
  };

  const updateBusinessInfo = (key: keyof BusinessInfo, value: string) => {
    setBusinessInfo((prev) => ({ ...prev, [key]: value }));
  };

  // Render step content
  const renderStepContent = () => {
    const stepId = steps[currentStep].id;

    // Business Info Step (common for all)
    if (stepId === "business") {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company/Business Name *</Label>
              <Input
                id="companyName"
                value={businessInfo.companyName}
                onChange={(e) => updateBusinessInfo("companyName", e.target.value)}
                placeholder="e.g., Acme Corporation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteName">Website/Platform Name *</Label>
              <Input
                id="websiteName"
                value={businessInfo.websiteName}
                onChange={(e) => updateBusinessInfo("websiteName", e.target.value)}
                placeholder="e.g., Acme Trading"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyType">Business Type *</Label>
              <Select
                value={businessInfo.companyType}
                onValueChange={(v) => updateBusinessInfo("companyType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporation">Corporation</SelectItem>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="sole_proprietor">Sole Proprietor</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry *</Label>
              <Select
                value={businessInfo.industry}
                onValueChange={(v) => updateBusinessInfo("industry", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL *</Label>
              <Input
                id="websiteUrl"
                value={businessInfo.websiteUrl}
                onChange={(e) => updateBusinessInfo("websiteUrl", e.target.value)}
                placeholder="https://www.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="foundedYear">Founded Year</Label>
              <Input
                id="foundedYear"
                value={businessInfo.foundedYear}
                onChange={(e) => updateBusinessInfo("foundedYear", e.target.value)}
                placeholder="2020"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Country *</Label>
              <CountrySelect
                value={businessInfo.countryCode}
                onValueChange={(code, _phoneCode) => {
                  // Get country name from the countries list
                  const countryData = countries.find((c) => c.iso2 === code);
                  setBusinessInfo((prev) => ({
                    ...prev,
                    countryCode: code,
                    country: countryData?.name || code,
                    state: "", // Reset state when country changes
                    city: "", // Reset city when country changes
                  }));
                }}
                placeholder="Select country..."
              />
            </div>
            <div className="space-y-2">
              <Label>State/Province</Label>
              <StateSelect
                value={businessInfo.state}
                onValueChange={(value) => {
                  setBusinessInfo((prev) => ({
                    ...prev,
                    state: value,
                    city: "", // Reset city when state changes
                  }));
                }}
                countryCode={businessInfo.countryCode}
                placeholder="Select state..."
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <CitySelect
                value={businessInfo.city}
                onValueChange={(value) => updateBusinessInfo("city", value)}
                countryCode={businessInfo.countryCode}
                stateName={businessInfo.state}
                placeholder="Select city..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={businessInfo.address}
              onChange={(e) => updateBusinessInfo("address", e.target.value)}
              placeholder="123 Main Street, Suite 100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Business Email *</Label>
              <Input
                id="email"
                type="email"
                value={businessInfo.email}
                onChange={(e) => updateBusinessInfo("email", e.target.value)}
                placeholder="contact@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={businessInfo.supportEmail}
                onChange={(e) => updateBusinessInfo("supportEmail", e.target.value)}
                placeholder="support@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={businessInfo.phone}
                onChange={(e) => updateBusinessInfo("phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Registration Number</Label>
              <Input
                id="registrationNumber"
                value={businessInfo.registrationNumber}
                onChange={(e) => updateBusinessInfo("registrationNumber", e.target.value)}
                placeholder="Optional business registration #"
              />
            </div>
          </div>
        </div>
      );
    }

    // About Page Steps
    if (pageType === "about") {
      if (stepId === "content") {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: "includeHistory", label: "Company History" },
                { key: "includeMission", label: "Mission Statement" },
                { key: "includeVision", label: "Vision Statement" },
                { key: "includeValues", label: "Core Values" },
                { key: "includeTeam", label: "Team Section" },
                { key: "includeStats", label: "Company Stats" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center space-x-2 p-3 border rounded-lg"
                >
                  <Checkbox
                    id={item.key}
                    checked={aboutOptions[item.key as keyof AboutPageOptions] as boolean}
                    onCheckedChange={(checked) =>
                      setAboutOptions((prev) => ({ ...prev, [item.key]: checked }))
                    }
                  />
                  <Label htmlFor={item.key} className="cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Company Description *</Label>
              <Textarea
                value={aboutOptions.companyDescription}
                onChange={(e) =>
                  setAboutOptions((prev) => ({
                    ...prev,
                    companyDescription: e.target.value,
                  }))
                }
                placeholder="Describe your company, what you do, and what makes you unique..."
                rows={4}
              />
            </div>

            {aboutOptions.includeMission && (
              <div className="space-y-2">
                <Label>Mission Statement</Label>
                <Textarea
                  value={aboutOptions.missionStatement}
                  onChange={(e) =>
                    setAboutOptions((prev) => ({
                      ...prev,
                      missionStatement: e.target.value,
                    }))
                  }
                  placeholder="Our mission is to..."
                  rows={2}
                />
              </div>
            )}

            {aboutOptions.includeVision && (
              <div className="space-y-2">
                <Label>Vision Statement</Label>
                <Textarea
                  value={aboutOptions.visionStatement}
                  onChange={(e) =>
                    setAboutOptions((prev) => ({
                      ...prev,
                      visionStatement: e.target.value,
                    }))
                  }
                  placeholder="We envision a world where..."
                  rows={2}
                />
              </div>
            )}
          </div>
        );
      }

      if (stepId === "details") {
        return (
          <div className="space-y-6">
            {aboutOptions.includeValues && (
              <div className="space-y-3">
                <Label>Core Values</Label>
                <div className="flex flex-wrap gap-2">
                  {aboutOptions.values.map((value, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="px-3 py-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() =>
                        setAboutOptions((prev) => ({
                          ...prev,
                          values: prev.values.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      {value} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a value..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value) {
                        setAboutOptions((prev) => ({
                          ...prev,
                          values: [...prev.values, e.currentTarget.value],
                        }));
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label>Key Achievements (Optional)</Label>
              <div className="space-y-2">
                {aboutOptions.achievements.map((achievement, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={achievement}
                      onChange={(e) => {
                        const newAchievements = [...aboutOptions.achievements];
                        newAchievements[index] = e.target.value;
                        setAboutOptions((prev) => ({
                          ...prev,
                          achievements: newAchievements,
                        }));
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setAboutOptions((prev) => ({
                          ...prev,
                          achievements: prev.achievements.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setAboutOptions((prev) => ({
                      ...prev,
                      achievements: [...prev.achievements, ""],
                    }))
                  }
                >
                  Add Achievement
                </Button>
              </div>
            </div>
          </div>
        );
      }
    }

    // Privacy Policy Steps
    if (pageType === "privacy") {
      if (stepId === "data") {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "collectsPersonalInfo", label: "Collects Personal Information", desc: "Name, email, etc." },
                { key: "collectsPaymentInfo", label: "Collects Payment Info", desc: "Credit cards, billing" },
                { key: "usesCookies", label: "Uses Cookies", desc: "Browser cookies" },
                { key: "usesAnalytics", label: "Uses Analytics", desc: "Tracking user behavior" },
                { key: "usesThirdPartyServices", label: "Third-Party Services", desc: "External integrations" },
                { key: "sharesDataWithThirdParties", label: "Shares Data", desc: "With partners/vendors" },
                { key: "hasUserAccounts", label: "User Accounts", desc: "Registration system" },
                { key: "allowsUserContent", label: "User-Generated Content", desc: "Posts, uploads" },
                { key: "hasNewsletters", label: "Email Newsletters", desc: "Marketing emails" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-start space-x-3 p-3 border rounded-lg"
                >
                  <Switch
                    id={item.key}
                    checked={privacyOptions[item.key as keyof PrivacyOptions] as boolean}
                    onCheckedChange={(checked) =>
                      setPrivacyOptions((prev) => ({ ...prev, [item.key]: checked }))
                    }
                  />
                  <div>
                    <Label htmlFor={item.key} className="cursor-pointer font-medium">
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select
                  value={privacyOptions.targetAudience}
                  onValueChange={(v: any) =>
                    setPrivacyOptions((prev) => ({ ...prev, targetAudience: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Audience</SelectItem>
                    <SelectItem value="children">Includes Children (COPPA)</SelectItem>
                    <SelectItem value="adults_only">Adults Only (18+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Retention Period</Label>
                <Select
                  value={privacyOptions.dataRetentionPeriod}
                  onValueChange={(v) =>
                    setPrivacyOptions((prev) => ({ ...prev, dataRetentionPeriod: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 year">1 Year</SelectItem>
                    <SelectItem value="2 years">2 Years</SelectItem>
                    <SelectItem value="3 years">3 Years</SelectItem>
                    <SelectItem value="5 years">5 Years</SelectItem>
                    <SelectItem value="indefinitely">Indefinitely</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {privacyOptions.usesAnalytics && (
              <div className="space-y-2">
                <Label>Analytics Provider</Label>
                <Input
                  value={privacyOptions.analyticsProvider}
                  onChange={(e) =>
                    setPrivacyOptions((prev) => ({
                      ...prev,
                      analyticsProvider: e.target.value,
                    }))
                  }
                  placeholder="e.g., Google Analytics"
                />
              </div>
            )}
          </div>
        );
      }

      if (stepId === "compliance") {
        return (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Compliance Information
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Select the privacy regulations your policy should comply with based on your
                    target audience location.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">GDPR Compliance</h4>
                    <p className="text-xs text-muted-foreground">
                      European Union data protection
                    </p>
                  </div>
                  <Switch
                    checked={privacyOptions.gdprCompliant}
                    onCheckedChange={(checked) =>
                      setPrivacyOptions((prev) => ({ ...prev, gdprCompliant: checked }))
                    }
                  />
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">CCPA Compliance</h4>
                    <p className="text-xs text-muted-foreground">
                      California Consumer Privacy Act
                    </p>
                  </div>
                  <Switch
                    checked={privacyOptions.ccpaCompliant}
                    onCheckedChange={(checked) =>
                      setPrivacyOptions((prev) => ({ ...prev, ccpaCompliant: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Switch
                  id="hasDataDeletion"
                  checked={privacyOptions.hasDataDeletion}
                  onCheckedChange={(checked) =>
                    setPrivacyOptions((prev) => ({ ...prev, hasDataDeletion: checked }))
                  }
                />
                <div>
                  <Label htmlFor="hasDataDeletion" className="cursor-pointer font-medium">
                    Data Deletion Rights
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Users can request data deletion
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Switch
                  id="hasDataExport"
                  checked={privacyOptions.hasDataExport}
                  onCheckedChange={(checked) =>
                    setPrivacyOptions((prev) => ({ ...prev, hasDataExport: checked }))
                  }
                />
                <div>
                  <Label htmlFor="hasDataExport" className="cursor-pointer font-medium">
                    Data Export Rights
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Users can export their data
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      }
    }

    // Terms of Service Steps
    if (pageType === "terms") {
      if (stepId === "services") {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "hasUserAccounts", label: "User Accounts", desc: "Registration & login" },
                { key: "hasSubscriptions", label: "Subscriptions", desc: "Recurring payments" },
                { key: "hasPayments", label: "Payments", desc: "One-time purchases" },
                { key: "hasRefunds", label: "Refund Policy", desc: "Money-back options" },
                { key: "hasUserContent", label: "User Content", desc: "User uploads/posts" },
                { key: "hasAffiliate", label: "Affiliate Program", desc: "Referral system" },
                { key: "hasAPI", label: "API Access", desc: "Developer API" },
                { key: "allowsCommercialUse", label: "Commercial Use", desc: "Business usage allowed" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-start space-x-3 p-3 border rounded-lg"
                >
                  <Switch
                    id={item.key}
                    checked={termsOptions[item.key as keyof TermsOptions] as boolean}
                    onCheckedChange={(checked) =>
                      setTermsOptions((prev) => ({ ...prev, [item.key]: checked }))
                    }
                  />
                  <div>
                    <Label htmlFor={item.key} className="cursor-pointer font-medium">
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Switch
                  id="hasAgeRestriction"
                  checked={termsOptions.hasAgeRestriction}
                  onCheckedChange={(checked) =>
                    setTermsOptions((prev) => ({ ...prev, hasAgeRestriction: checked }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="hasAgeRestriction" className="cursor-pointer font-medium">
                    Age Restriction
                  </Label>
                </div>
                {termsOptions.hasAgeRestriction && (
                  <Select
                    value={termsOptions.minimumAge}
                    onValueChange={(v) =>
                      setTermsOptions((prev) => ({ ...prev, minimumAge: v }))
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="13">13+</SelectItem>
                      <SelectItem value="16">16+</SelectItem>
                      <SelectItem value="18">18+</SelectItem>
                      <SelectItem value="21">21+</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {termsOptions.hasRefunds && (
                <div className="space-y-2 p-3 border rounded-lg">
                  <Label>Refund Period</Label>
                  <Select
                    value={termsOptions.refundPeriod}
                    onValueChange={(v) =>
                      setTermsOptions((prev) => ({ ...prev, refundPeriod: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7 days">7 Days</SelectItem>
                      <SelectItem value="14 days">14 Days</SelectItem>
                      <SelectItem value="30 days">30 Days</SelectItem>
                      <SelectItem value="60 days">60 Days</SelectItem>
                      <SelectItem value="no refunds">No Refunds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        );
      }

      if (stepId === "legal") {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dispute Resolution</Label>
                <Select
                  value={termsOptions.disputeResolution}
                  onValueChange={(v: any) =>
                    setTermsOptions((prev) => ({ ...prev, disputeResolution: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arbitration">Binding Arbitration</SelectItem>
                    <SelectItem value="litigation">Court Litigation</SelectItem>
                    <SelectItem value="mediation">Mediation First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Governing Law</Label>
                <Input
                  value={termsOptions.governingLaw}
                  onChange={(e) =>
                    setTermsOptions((prev) => ({ ...prev, governingLaw: e.target.value }))
                  }
                  placeholder={`Laws of ${businessInfo.state || businessInfo.country}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Switch
                  id="limitLiability"
                  checked={termsOptions.limitLiability}
                  onCheckedChange={(checked) =>
                    setTermsOptions((prev) => ({ ...prev, limitLiability: checked }))
                  }
                />
                <div>
                  <Label htmlFor="limitLiability" className="cursor-pointer font-medium">
                    Limitation of Liability
                  </Label>
                  <p className="text-xs text-muted-foreground">Cap on damages</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Switch
                  id="hasIndemnification"
                  checked={termsOptions.hasIndemnification}
                  onCheckedChange={(checked) =>
                    setTermsOptions((prev) => ({ ...prev, hasIndemnification: checked }))
                  }
                />
                <div>
                  <Label htmlFor="hasIndemnification" className="cursor-pointer font-medium">
                    Indemnification Clause
                  </Label>
                  <p className="text-xs text-muted-foreground">User liability protection</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Prohibited Activities</Label>
              <div className="flex flex-wrap gap-2">
                {termsOptions.prohibitedActivities.map((activity, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="px-3 py-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground text-xs"
                    onClick={() =>
                      setTermsOptions((prev) => ({
                        ...prev,
                        prohibitedActivities: prev.prohibitedActivities.filter(
                          (_, i) => i !== index
                        ),
                      }))
                    }
                  >
                    {activity} ×
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add prohibited activity and press Enter..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value) {
                    setTermsOptions((prev) => ({
                      ...prev,
                      prohibitedActivities: [
                        ...prev.prohibitedActivities,
                        e.currentTarget.value,
                      ],
                    }));
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
          </div>
        );
      }
    }

    // Contact Page Steps
    if (pageType === "contact") {
      if (stepId === "contact") {
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Contact Departments</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setContactOptions((prev) => ({
                      ...prev,
                      departments: [...prev.departments, { name: "", email: "" }],
                    }))
                  }
                >
                  Add Department
                </Button>
              </div>
              <div className="space-y-3">
                {contactOptions.departments.map((dept, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <Input
                      value={dept.name}
                      onChange={(e) => {
                        const newDepts = [...contactOptions.departments];
                        newDepts[index].name = e.target.value;
                        setContactOptions((prev) => ({ ...prev, departments: newDepts }));
                      }}
                      placeholder="Department name"
                      className="flex-1"
                    />
                    <Input
                      value={dept.email}
                      onChange={(e) => {
                        const newDepts = [...contactOptions.departments];
                        newDepts[index].email = e.target.value;
                        setContactOptions((prev) => ({ ...prev, departments: newDepts }));
                      }}
                      placeholder="email@example.com"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setContactOptions((prev) => ({
                          ...prev,
                          departments: prev.departments.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Hours</Label>
                <Input
                  value={contactOptions.businessHours}
                  onChange={(e) =>
                    setContactOptions((prev) => ({
                      ...prev,
                      businessHours: e.target.value,
                    }))
                  }
                  placeholder="Mon-Fri: 9AM - 6PM"
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Response Time</Label>
                <Select
                  value={contactOptions.responseTime}
                  onValueChange={(v) =>
                    setContactOptions((prev) => ({ ...prev, responseTime: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Within 1 hour">Within 1 hour</SelectItem>
                    <SelectItem value="Within 4 hours">Within 4 hours</SelectItem>
                    <SelectItem value="24 hours">24 hours</SelectItem>
                    <SelectItem value="24-48 hours">24-48 hours</SelectItem>
                    <SelectItem value="2-3 business days">2-3 business days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      }

      if (stepId === "options") {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: "includeForm", label: "Contact Form" },
                { key: "includeMap", label: "Location Map" },
                { key: "includeSocialLinks", label: "Social Links" },
                { key: "includeHours", label: "Business Hours" },
                { key: "includeFAQ", label: "FAQ Section" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center space-x-2 p-3 border rounded-lg"
                >
                  <Checkbox
                    id={item.key}
                    checked={contactOptions[item.key as keyof ContactOptions] as boolean}
                    onCheckedChange={(checked) =>
                      setContactOptions((prev) => ({
                        ...prev,
                        [item.key]: checked,
                      }))
                    }
                  />
                  <Label htmlFor={item.key} className="cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>

            {contactOptions.includeFAQ && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">FAQ Items</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setContactOptions((prev) => ({
                        ...prev,
                        faqItems: [...prev.faqItems, { question: "", answer: "" }],
                      }))
                    }
                  >
                    Add FAQ
                  </Button>
                </div>
                <div className="space-y-3">
                  {contactOptions.faqItems.map((faq, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={faq.question}
                          onChange={(e) => {
                            const newFaqs = [...contactOptions.faqItems];
                            newFaqs[index].question = e.target.value;
                            setContactOptions((prev) => ({ ...prev, faqItems: newFaqs }));
                          }}
                          placeholder="Question"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            setContactOptions((prev) => ({
                              ...prev,
                              faqItems: prev.faqItems.filter((_, i) => i !== index),
                            }))
                          }
                        >
                          ×
                        </Button>
                      </div>
                      <Textarea
                        value={faq.answer}
                        onChange={(e) => {
                          const newFaqs = [...contactOptions.faqItems];
                          newFaqs[index].answer = e.target.value;
                          setContactOptions((prev) => ({ ...prev, faqItems: newFaqs }));
                        }}
                        placeholder="Answer"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }
    }

    // Preview Step (common for all)
    if (stepId === "preview") {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Generated Content Preview</h3>
              <p className="text-sm text-muted-foreground">
                Review and customize before applying
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {generatedContent ? "Regenerate" : "Generate"}
              </Button>
              {generatedContent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(generatedContent)}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
              )}
            </div>
          </div>

          {!generatedContent && !isGenerating && (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl">
              <Wand2 className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Click "Generate" to create your {pageType} page content
              </p>
              <Button onClick={handleGenerate} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Generate Content
              </Button>
            </div>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-16 border rounded-xl">
              <RefreshCw className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Generating your content...</p>
            </div>
          )}

          {generatedContent && !isGenerating && (
            <div className="border rounded-xl overflow-hidden">
              <ScrollArea className="h-96">
                <div
                  className="p-6 prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: generatedContent }}
                />
              </ScrollArea>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const canProceed = () => {
    const stepId = steps[currentStep].id;

    if (stepId === "business") {
      return (
        businessInfo.companyName &&
        businessInfo.websiteName &&
        businessInfo.websiteUrl &&
        businessInfo.industry &&
        businessInfo.email &&
        businessInfo.countryCode
      );
    }

    if (stepId === "preview") {
      return !!generatedContent;
    }

    return true;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b bg-linear-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">
                {pageType.charAt(0).toUpperCase() + pageType.slice(1)} Page Template
              </h2>
              <p className="text-sm text-muted-foreground">
                Generate professional {pageType} page content
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="shrink-0 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <motion.div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "text-primary",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => index < currentStep && setCurrentStep(index)}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      isActive && "bg-primary-foreground/20",
                      isCompleted && "bg-primary/20",
                      !isActive && !isCompleted && "bg-muted"
                    )}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : index + 1}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
                </motion.div>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content - flex-1 with min-h-0 ensures proper scrolling */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-4 border-t bg-muted/30">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex gap-2">
            {currentStep === steps.length - 1 ? (
              <Button
                onClick={handleApply}
                disabled={!generatedContent}
                className="gap-2"
              >
                <Check className="w-4 h-4" />
                Apply to Page
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
