"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sanitizeHTML } from "@/lib/sanitize";
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
  AlertTriangle,
  RefreshCw,
  Info,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { m, AnimatePresence } from "framer-motion";
import {
  generateAboutPage,
  generatePrivacyPolicy,
  generateTermsOfService,
  generateContactPage,
} from "./legal-templates";
import { siteName, frontendUrl } from "@/lib/siteInfo";
import { loadCountriesIndex, type Country } from "@/lib/countries";
import { useTranslations } from "next-intl";

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
  /**
   * Fires when the wizard gains or loses work worth protecting.
   *
   * The host owns Escape and the backdrop, so it is the only place that can
   * turn a dismissal into a confirmation — but only this component knows
   * whether anything has been typed. Kept as a callback rather than lifting the
   * form state up: the state is forty fields across five objects and it belongs
   * here.
   */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * THIS COMPONENT IS A PANEL, NOT A MODAL.
 *
 * It renders `flex flex-col h-full` with no backdrop, no `fixed`, no portal and
 * no z-index — it takes the size of whatever contains it and expects that
 * container to do the overlaying. Rendered bare it is simply a very tall block
 * in the document flow, which is exactly what happened when it was lifted out
 * of the editor that used to wrap it: the whole wizard appeared BELOW the page,
 * off-screen, reachable only by scrolling.
 *
 * Mount it inside `TemplateWizardDialog` (page-editor-studio.tsx), which
 * supplies the overlay, the height and the accessibility wiring.
 */
export const TEMPLATE_WIZARD_TITLE_ID = "template-wizard-title";

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
  onDirtyChange,
}: LegalTemplateWizardProps) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
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

  /**
   * EVERY ANSWER THE GENERATED DOCUMENT DEPENDS ON, as one comparable string.
   * ------------------------------------------------------------------------
   * `generatedContent` used to be written by Generate and then never
   * invalidated. The progress rail lets an owner jump back to any completed
   * step, so this was reachable and wrong:
   *
   *   fill in "Acme Corp" -> step 4 -> Generate -> notice the name is wrong ->
   *   click step 1 -> fix it to "Acme Holdings Ltd" -> Next, Next, Next ->
   *   Apply to Page
   *
   * Nothing on screen contradicted it — the preview showed the same stale HTML
   * — and the result was a live Terms of Service naming the wrong legal entity.
   * The only tell was that the button said "Regenerate", which it says whether
   * or not anything moved.
   *
   * Comparing a signature rather than clearing the content in each of the ~40
   * setters: a new option field added later is covered automatically, whereas a
   * missed setter would silently reopen exactly this hole.
   */
  const inputSignature = JSON.stringify({
    businessInfo,
    aboutOptions,
    privacyOptions,
    termsOptions,
    contactOptions,
  });
  const [generatedFrom, setGeneratedFrom] = useState<string | null>(null);
  /** Generated once, then an answer changed. The document no longer matches. */
  const isStale = Boolean(generatedContent) && generatedFrom !== inputSignature;

  /**
   * Has anything been filled in that would be lost by closing?
   *
   * Reported to the host dialog, which turns Escape and a backdrop click into a
   * confirmation instead of a silent discard. Deliberately not just
   * `currentStep > 0` — somebody who typed an address, two emails and a phone
   * number on step 1 and then hit Escape has just as much to lose.
   */
  /* `useState` with no setter, not `useRef`: this is read DURING render to
     compute `isDirty`, and reading a ref in the render body is exactly what
     React's rules forbid. A never-updated state cell captures the first
     render's value and is legal to read. */
  const [initialSignature] = useState(inputSignature);
  const isDirty =
    currentStep > 0 || Boolean(generatedContent) || inputSignature !== initialSignature;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

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
    /* Stamp WHICH answers produced this document. Read against the live
       signature to know whether it still describes them. */
    setGeneratedFrom(inputSignature);
    setIsGenerating(false);
  };

  const handleApply = () => {
    /* Belt and braces — the button is disabled in this state, but this is the
       call that overwrites a live legal page and it should be impossible to
       reach with a document that does not match the answers on screen. */
    if (!generatedContent || isStale) return;
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
              <Label htmlFor="companyName">{t("company_business_name")} *</Label>
              <Input
                id="companyName"
                value={businessInfo.companyName}
                onChange={(e) => updateBusinessInfo("companyName", e.target.value)}
                placeholder={"e.g." + ", " + t("acme_corporation")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteName">{t("website_platform_name")} *</Label>
              <Input
                id="websiteName"
                value={businessInfo.websiteName}
                onChange={(e) => updateBusinessInfo("websiteName", e.target.value)}
                placeholder={"e.g." + ", " + t("acme_trading")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {/* `htmlFor` pointed at an id nothing carried — `SelectTrigger`
                  renders none — so clicking the label did nothing and the
                  combobox had no accessible name. The id goes on the trigger,
                  which is the element the label is describing. */}
              <Label htmlFor="companyType">{tCommon("business_type")} *</Label>
              <Select
                value={businessInfo.companyType}
                onValueChange={(v) => updateBusinessInfo("companyType", v)}
              >
                <SelectTrigger id="companyType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporation">Corporation</SelectItem>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="sole_proprietor">{t("sole_proprietor")}</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">{t("industry")} *</Label>
              <Select
                value={businessInfo.industry}
                onValueChange={(v) => updateBusinessInfo("industry", v)}
              >
                <SelectTrigger id="industry">
                  <SelectValue placeholder={t("select_industry")} />
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
              <Label htmlFor="websiteUrl">{tCommon("website_url")} *</Label>
              <Input
                id="websiteUrl"
                value={businessInfo.websiteUrl}
                onChange={(e) => updateBusinessInfo("websiteUrl", e.target.value)}
                placeholder="https://www.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="foundedYear">{t("founded_year")}</Label>
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
              <Label>{tCommon("country")} *</Label>
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
                placeholder={`${tCommon("select_country")}…`}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("state_province")}</Label>
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
                placeholder={`${tCommon("select_state")}…`}
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <CitySelect
                value={businessInfo.city}
                onValueChange={(value) => updateBusinessInfo("city", value)}
                countryCode={businessInfo.countryCode}
                stateName={businessInfo.state}
                placeholder={`${tCommon("select_city")}…`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{tCommon("street_address")}</Label>
            <Input
              id="address"
              value={businessInfo.address}
              onChange={(e) => updateBusinessInfo("address", e.target.value)}
              placeholder={"123 Main Street, Suite" + " 100"}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">{tCommon("business_email")} *</Label>
              <Input
                id="email"
                type="email"
                value={businessInfo.email}
                onChange={(e) => updateBusinessInfo("email", e.target.value)}
                placeholder="contact@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">{t("support_email")}</Label>
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
              <Label htmlFor="phone">{tCommon("phone_number")}</Label>
              <Input
                id="phone"
                value={businessInfo.phone}
                onChange={(e) => updateBusinessInfo("phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">{t("registration_number")}</Label>
              <Input
                id="registrationNumber"
                value={businessInfo.registrationNumber}
                onChange={(e) => updateBusinessInfo("registrationNumber", e.target.value)}
                placeholder={t("optional_business_registration")}
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
                { key: "includeHistory", label: t("company_history") },
                { key: "includeMission", label: t("mission_statement") },
                { key: "includeVision", label: t("vision_statement") },
                { key: "includeValues", label: t("core_values") },
                { key: "includeTeam", label: t("team_section") },
                { key: "includeStats", label: t("company_stats") },
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
              <Label>{t("company_description")} *</Label>
              <Textarea
                value={aboutOptions.companyDescription}
                onChange={(e) =>
                  setAboutOptions((prev) => ({
                    ...prev,
                    companyDescription: e.target.value,
                  }))
                }
                placeholder={`${t("describe_your_company_what_you_do")}…`}
                rows={4}
              />
            </div>

            {aboutOptions.includeMission && (
              <div className="space-y-2">
                <Label>{t("mission_statement")}</Label>
                <Textarea
                  value={aboutOptions.missionStatement}
                  onChange={(e) =>
                    setAboutOptions((prev) => ({
                      ...prev,
                      missionStatement: e.target.value,
                    }))
                  }
                  placeholder={`${t("our_mission_is_to")}…`}
                  rows={2}
                />
              </div>
            )}

            {aboutOptions.includeVision && (
              <div className="space-y-2">
                <Label>{t("vision_statement")}</Label>
                <Textarea
                  value={aboutOptions.visionStatement}
                  onChange={(e) =>
                    setAboutOptions((prev) => ({
                      ...prev,
                      visionStatement: e.target.value,
                    }))
                  }
                  placeholder={`${t("we_envision_a_world_where")}…`}
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
                <Label>{t("core_values")}</Label>
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
                    placeholder={`${t("add_a_value")}…`}
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
                  {t("add_achievement")}
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
                { key: "collectsPersonalInfo", label: t("collects_personal_information"), desc: "Name, email, etc." },
                { key: "collectsPaymentInfo", label: t("collects_payment_info"), desc: "Credit cards, billing" },
                { key: "usesCookies", label: t("uses_cookies"), desc: "Browser cookies" },
                { key: "usesAnalytics", label: t("uses_analytics"), desc: "Tracking user behavior" },
                { key: "usesThirdPartyServices", label: t("third_party_services"), desc: "External integrations" },
                { key: "sharesDataWithThirdParties", label: t("shares_data"), desc: "With partners/vendors" },
                { key: "hasUserAccounts", label: t("user_accounts"), desc: "Registration system" },
                { key: "allowsUserContent", label: t("user_generated_content"), desc: "Posts, uploads" },
                { key: "hasNewsletters", label: t("email_newsletters"), desc: "Marketing emails" },
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
                <Label>{t("target_audience")}</Label>
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
                    <SelectItem value="general">{t("general_audience")}</SelectItem>
                    <SelectItem value="children">Includes Children (COPPA)</SelectItem>
                    <SelectItem value="adults_only">Adults Only (18+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("data_retention_period")}</Label>
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
                <Label>{t("analytics_provider")}</Label>
                <Input
                  value={privacyOptions.analyticsProvider}
                  onChange={(e) =>
                    setPrivacyOptions((prev) => ({
                      ...prev,
                      analyticsProvider: e.target.value,
                    }))
                  }
                  placeholder={"e.g." + ", " + "Google Analytics"}
                />
              </div>
            )}
          </div>
        );
      }

      if (stepId === "compliance") {
        return (
          <div className="space-y-6">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary">
                    {t("compliance_information")}
                  </p>
                  <p className="text-xs text-primary mt-1">
                    {t("select_the_privacy_regulations_your_policy")}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{t("gdpr_compliance")}</h4>
                    <p className="text-xs text-muted-foreground">
                      {t("european_union_data_protection")}
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
                    <h4 className="font-medium">{t("ccpa_compliance")}</h4>
                    <p className="text-xs text-muted-foreground">
                      {t("california_consumer_privacy_act")}
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
                    {t("data_deletion_rights")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("users_can_request_data_deletion")}
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
                    {t("data_export_rights")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("users_can_export_their_data")}
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
                { key: "hasUserAccounts", label: t("user_accounts"), desc: "Registration & login" },
                { key: "hasSubscriptions", label: t("subscriptions"), desc: "Recurring payments" },
                { key: "hasPayments", label: tCommon("payments"), desc: "One-time purchases" },
                { key: "hasRefunds", label: t("refund_policy"), desc: "Money-back options" },
                { key: "hasUserContent", label: t("user_content"), desc: "User uploads/posts" },
                { key: "hasAffiliate", label: t("affiliate_program"), desc: "Referral system" },
                { key: "hasAPI", label: t("api_access"), desc: "Developer API" },
                { key: "allowsCommercialUse", label: t("commercial_use"), desc: "Business usage allowed" },
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
                    {t("age_restriction")}
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
                  <Label>{t("refund_period")}</Label>
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
                      <SelectItem value="no refunds">{t("no_refunds")}</SelectItem>
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
                <Label>{tCommon("dispute_resolution")}</Label>
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
                    <SelectItem value="arbitration">{t("binding_arbitration")}</SelectItem>
                    <SelectItem value="litigation">{t("court_litigation")}</SelectItem>
                    <SelectItem value="mediation">{t("mediation_first")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("governing_law")}</Label>
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
                    {t("limitation_of_liability")}
                  </Label>
                  <p className="text-xs text-muted-foreground">{t("cap_on_damages")}</p>
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
                    {t("indemnification_clause")}
                  </Label>
                  <p className="text-xs text-muted-foreground">{t("user_liability_protection")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>{t("prohibited_activities")}</Label>
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
                placeholder={`${t("add_prohibited_activity_and_press_enter")}…`}
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
                <Label className="text-base">{t("contact_departments")}</Label>
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
                  {t("add_department")}
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
                      placeholder={t("department_name")}
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
                <Label>{t("business_hours")}</Label>
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
                <Label>{t("expected_response_time")}</Label>
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
                    <SelectItem value="24-48 hours">{t("n_24_48_hours")}</SelectItem>
                    <SelectItem value="2-3 business days">{t("n_2_3_business_days")}</SelectItem>
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
                { key: "includeForm", label: t("contact_form") },
                { key: "includeMap", label: t("location_map") },
                { key: "includeSocialLinks", label: tCommon("social_links") },
                { key: "includeHours", label: t("business_hours") },
                { key: "includeFAQ", label: t("faq_section") },
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
                  <Label className="text-base">{t("faq_items")}</Label>
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
                    {tCommon("add_faq")}
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
              <h3 className="font-semibold">{t("generated_content_preview")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("review_and_customize_before_applying")}
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
                {generatedContent ? t("regenerate") : t("generate")}
              </Button>
              {/* The stale state needs its own affordance. "Regenerate" reads
                  the same whether or not anything moved, which is exactly how
                  a document naming the wrong company reached a live page. */}
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
                Click &ldquo;Generate&rdquo; to create your {pageType} page content
              </p>
              <Button onClick={handleGenerate} className="gap-2">
                <Sparkles className="w-4 h-4" />
                {t("generate_content")}
              </Button>
            </div>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-16 border rounded-xl">
              <RefreshCw className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">{t("generating_your_content")}…</p>
            </div>
          )}

          {isStale && !isGenerating && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning-ink" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-sm text-warning-ink">
                {t("you_changed_an_answer_after_this")}
              </p>
              <Button size="sm" onClick={handleGenerate} className="gap-2">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Regenerate
              </Button>
            </div>
          )}

          {generatedContent && !isGenerating && (
            /* `max-h-96`, not `h-96`. A fixed height nests a 384px scroller
               inside the dialog's own content band, which on a short window is
               SMALLER than 384px — the wheel then drives the inner box and only
               reaches the outer one once it bottoms out. With `max-h` the
               preview shrinks to fit and there is one scroller. */
            <div className="border rounded-lg overflow-hidden">
              <ScrollArea className="max-h-96">
                {/* Sanitised even though the author is an admin previewing
                    their own input. Every interpolation in `legal-templates.ts`
                    is raw, so typing `<img src=x onerror=…>` into Company
                    Description executed it here — in the session of the one
                    account that can change the whole site. The PUBLIC page has
                    always been safe (it runs `sanitizeHtmlServer`); this closes
                    the admin-side half. */}
                <div
                  className="p-6 prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(generatedContent) }}
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
              {/* The id is load-bearing: the dialog that hosts this panel
                  points `aria-labelledby` at it rather than repeating the title
                  in a visually-hidden node, so a screen reader announces it
                  once. See `TEMPLATE_WIZARD_TITLE_ID`. */}
              <h2 id={TEMPLATE_WIZARD_TITLE_ID} className="font-semibold">
                {pageType.charAt(0).toUpperCase() + pageType.slice(1)} {t("page_template")}
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
                <m.button
                  type="button"
                  /* A real button. This was a `div` with an `onClick`, so the
                     one navigation shortcut in a four-step form was reachable
                     by mouse only — and it advertised `cursor-pointer` plus a
                     hover scale on steps that are inert, because only COMPLETED
                     steps are clickable. */
                  disabled={index >= currentStep}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    index < currentStep ? "cursor-pointer" : "cursor-default",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "text-primary",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}
                  whileHover={index < currentStep ? { scale: 1.02 } : undefined}
                  whileTap={index < currentStep ? { scale: 0.98 } : undefined}
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
                  {/* The label hides below `sm`, so the number needs to carry
                      the name for anyone not looking at the screen. */}
                  <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
                  <span className="sr-only sm:hidden">{step.title}</span>
                </m.button>
                {index < steps.length - 1 && (
                  /* Logical, not physical: the separator points at the next
                      step, which is to the LEFT in Arabic and Farsi. */
                  <ChevronRight
                    className="w-4 h-4 mx-2 text-muted-foreground rtl:rotate-180"
                    aria-hidden="true"
                  />
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
              <m.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStepContent()}
              </m.div>
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
                /* Stale means the preview no longer describes the answers on
                   screen, and this button REPLACES a live legal page with it. */
                disabled={!generatedContent || isStale}
                title={isStale ? t("regenerate_first_an_answer_changed_after") : undefined}
                className="gap-2"
              >
                <Check className="w-4 h-4" />
                {t("apply_to_page")}
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
