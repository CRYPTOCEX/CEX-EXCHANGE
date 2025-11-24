"use client";

import { useState, useEffect, useRef } from "react";
import { FieldLibraryPanel } from "./field-library-panel";
import { LevelPresetsPanel } from "./level-presets-panel";
import { SettingsPanel } from "./settings-panel";
import { COUNTRY_OPTIONS } from "@/utils/countries";

// Level presets
export const LEVEL_PRESETS = [
  {
    id: "basic-verification",
    name: "Basic Verification (Tier 1)",
    description: "Essential user information for initial account setup",
    fields: [
      {
        id: "full-name",
        type: "TEXT" as KycFieldType,
        label: "Full Name",
        placeholder: "Enter your full legal name",
        required: true,
        description: "Your name as it appears on official documents",
        order: 0,
      },
      {
        id: "email",
        type: "EMAIL" as KycFieldType,
        label: "Email Address",
        placeholder: "your.email@example.com",
        required: true,
        description: "We'll send a verification link to this email",
        order: 1,
      },
      {
        id: "dob",
        type: "DATE" as KycFieldType,
        label: "Date of Birth",
        required: true,
        description: "You must be at least 18 years old to use our platform",
        order: 2,
      },
      {
        id: "country",
        type: "SELECT" as KycFieldType,
        label: "Country of Residence",
        required: true,
        description: "Select the country where you currently reside",
        options: COUNTRY_OPTIONS,
        order: 3,
      },
      {
        id: "terms",
        type: "CHECKBOX" as KycFieldType,
        label: "Terms and Conditions",
        required: true,
        description: "I agree to the Terms of Service and Privacy Policy",
        order: 4,
      },
    ],
  },
  {
    id: "identity-verification",
    name: "Identity Verification (Tier 2)",
    description: "Government ID verification for enhanced account security",
    fields: [
      {
        id: "identity-verification",
        type: "IDENTITY" as KycFieldType,
        label: "Identity Verification",
        required: true,
        description:
          "Please provide your government-issued ID for verification",
        order: 0,
        documentTypes: [
          { value: "passport", label: "Passport" },
          { value: "drivers-license", label: "Driver's License" },
          { value: "national-id", label: "National ID Card" },
        ],
        defaultDocumentType: "passport",
        requireSelfie: true,
      },
      {
        id: "address-line1",
        type: "TEXT" as KycFieldType,
        label: "Street Address",
        required: true,
        placeholder: "123 Main St",
        order: 1,
      },
      {
        id: "city",
        type: "TEXT" as KycFieldType,
        label: "City",
        required: true,
        order: 2,
      },
      {
        id: "postal-code",
        type: "TEXT" as KycFieldType,
        label: "Postal Code",
        required: true,
        order: 3,
      },
    ],
  },
  {
    id: "address-verification",
    name: "Address Verification (Tier 3)",
    description: "Proof of address verification for enhanced security",
    fields: [
      {
        id: "address-line1",
        type: "TEXT" as KycFieldType,
        label: "Street Address",
        required: true,
        placeholder: "123 Main St",
        order: 0,
      },
      {
        id: "address-line2",
        type: "TEXT" as KycFieldType,
        label: "Apartment, Suite, etc. (optional)",
        required: false,
        placeholder: "Apt 4B",
        order: 1,
      },
      {
        id: "city",
        type: "TEXT" as KycFieldType,
        label: "City",
        required: true,
        order: 2,
      },
      {
        id: "state",
        type: "TEXT" as KycFieldType,
        label: "State/Province/Region",
        required: true,
        order: 3,
      },
      {
        id: "postal-code",
        type: "TEXT" as KycFieldType,
        label: "Postal Code",
        required: true,
        order: 4,
      },
      {
        id: "proof-of-address",
        type: "FILE" as KycFieldType,
        label: "Proof of Address Document",
        required: true,
        description:
          "Upload a utility bill, bank statement, or government letter (less than 3 months old)",
        accept: "image/jpeg,image/png,image/jpg,application/pdf",
        order: 5,
      },
    ],
  },
  {
    id: "financial-verification",
    name: "Financial Verification (Tier 4)",
    description: "Financial information for regulatory compliance",
    fields: [
      {
        id: "employment-status",
        type: "SELECT" as KycFieldType,
        label: "Employment Status",
        required: true,
        options: [
          { value: "employed", label: "Employed" },
          { value: "self-employed", label: "Self-Employed" },
          { value: "unemployed", label: "Unemployed" },
          { value: "student", label: "Student" },
          { value: "retired", label: "Retired" },
        ],
        order: 0,
      },
      {
        id: "occupation",
        type: "TEXT" as KycFieldType,
        label: "Occupation",
        required: true,
        conditional: {
          field: "employment-status",
          operator: "EQUALS",
          value: "employed",
        },
        order: 1,
      },
      {
        id: "company-name",
        type: "TEXT" as KycFieldType,
        label: "Company Name",
        required: true,
        conditional: {
          field: "employment-status",
          operator: "EQUALS",
          value: "employed",
        },
        order: 2,
      },
      {
        id: "business-type",
        type: "TEXT" as KycFieldType,
        label: "Business Type",
        required: true,
        conditional: {
          field: "employment-status",
          operator: "EQUALS",
          value: "self-employed",
        },
        order: 3,
      },
      {
        id: "annual-income",
        type: "SELECT" as KycFieldType,
        label: "Annual Income Range",
        required: true,
        options: [
          { value: "under-25k", label: "Under $25,000" },
          { value: "25k-50k", label: "$25,000 - $50,000" },
          { value: "50k-100k", label: "$50,000 - $100,000" },
          { value: "100k-250k", label: "$100,000 - $250,000" },
          { value: "250k-1m", label: "$250,000 - $1,000,000" },
          { value: "over-1m", label: "Over $1,000,000" },
        ],
        order: 4,
      },
      {
        id: "source-of-funds",
        type: "SELECT" as KycFieldType,
        label: "Primary Source of Funds",
        required: true,
        description:
          "Select the primary source of funds you'll use for trading",
        options: [
          { value: "salary", label: "Salary/Employment Income" },
          { value: "investments", label: "Investment Returns" },
          { value: "savings", label: "Personal Savings" },
          { value: "inheritance", label: "Inheritance" },
          { value: "business", label: "Business Income" },
          { value: "other", label: "Other" },
        ],
        order: 5,
      },
      {
        id: "funds-source-other",
        type: "TEXT" as KycFieldType,
        label: "Please Specify Other Source",
        required: true,
        conditional: {
          field: "source-of-funds",
          operator: "EQUALS",
          value: "other",
        },
        order: 6,
      },
      {
        id: "proof-of-funds",
        type: "FILE" as KycFieldType,
        label: "Proof of Source of Funds",
        required: true,
        description:
          "Upload documentation supporting your source of funds (bank statement, payslip, etc.)",
        accept: "image/jpeg,image/png,image/jpg,application/pdf",
        order: 7,
      },
    ],
  },
  {
    id: "trading-experience",
    name: "Trading Experience (Tier 5)",
    description: "Trading experience and risk profile assessment",
    fields: [
      {
        id: "crypto-experience",
        type: "SELECT" as KycFieldType,
        label: "Cryptocurrency Trading Experience",
        required: true,
        options: [
          { value: "none", label: "No Experience" },
          { value: "beginner", label: "Beginner (< 1 year)" },
          { value: "intermediate", label: "Intermediate (1-3 years)" },
          { value: "advanced", label: "Advanced (3+ years)" },
          { value: "professional", label: "Professional Trader" },
        ],
        order: 0,
      },
      {
        id: "trading-frequency",
        type: "SELECT" as KycFieldType,
        label: "Expected Trading Frequency",
        required: true,
        options: [
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
          { value: "quarterly", label: "Quarterly" },
          { value: "rarely", label: "Rarely" },
        ],
        order: 1,
      },
      {
        id: "investment-horizon",
        type: "SELECT" as KycFieldType,
        label: "Investment Horizon",
        required: true,
        options: [
          { value: "short", label: "Short-term (< 1 year)" },
          { value: "medium", label: "Medium-term (1-3 years)" },
          { value: "long", label: "Long-term (3+ years)" },
        ],
        order: 2,
      },
      {
        id: "risk-tolerance",
        type: "SELECT" as KycFieldType,
        label: "Risk Tolerance",
        required: true,
        options: [
          { value: "conservative", label: "Conservative" },
          { value: "moderate", label: "Moderate" },
          { value: "aggressive", label: "Aggressive" },
        ],
        order: 3,
      },
      {
        id: "crypto-interests",
        type: "CHECKBOX" as KycFieldType,
        label: "Cryptocurrencies of Interest",
        required: true,
        options: [
          { value: "btc", label: "Bitcoin (BTC)" },
          { value: "eth", label: "Ethereum (ETH)" },
          { value: "sol", label: "Solana (SOL)" },
          { value: "ada", label: "Cardano (ADA)" },
          { value: "dot", label: "Polkadot (DOT)" },
          { value: "defi", label: "DeFi Tokens" },
          { value: "nft", label: "NFTs" },
          { value: "stablecoins", label: "Stablecoins" },
        ],
        order: 4,
      },
      {
        id: "trading-purpose",
        type: "SELECT" as KycFieldType,
        label: "Primary Purpose for Trading",
        required: true,
        options: [
          { value: "investment", label: "Long-term Investment" },
          { value: "trading", label: "Active Trading" },
          { value: "payments", label: "Payments and Transfers" },
          { value: "business", label: "Business Operations" },
          { value: "diversification", label: "Portfolio Diversification" },
        ],
        order: 5,
      },
      {
        id: "pep-check",
        type: "RADIO" as KycFieldType,
        label: "Are you a Politically Exposed Person (PEP)?",
        required: true,
        description:
          "A PEP is an individual who is or has been entrusted with a prominent public function",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
        order: 6,
      },
      {
        id: "pep-details",
        type: "TEXTAREA" as KycFieldType,
        label: "PEP Details",
        required: true,
        description: "Please provide details about your political exposure",
        conditional: {
          field: "pep-check",
          operator: "EQUALS",
          value: "yes",
        },
        order: 7,
      },
    ],
  },
];

interface LeftSidebarProps {
  activeSidebar: "fields" | "presets" | "settings";
  handleAddField: (type: KycFieldType, position?: number) => void;
  applyLevelPreset: (presetId: string) => void;
  setLeftSidebarOpen: (open: boolean) => void;
  levelNumber: number;
  setLevelNumber?: (level: number) => void;
  levelDescription: string;
  setLevelDescription?: (description: string) => void;
  levelName: string;
  setLevelName?: (name: string) => void;
  onChangesUnsaved?: () => void;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
  setStatus?: (status: "DRAFT" | "ACTIVE" | "INACTIVE") => void;
  currentLevel: KycLevel | null;
  setCurrentLevel?: (level: KycLevel) => void;
  onOpenVerificationServices?: () => void;
}

export function LeftSidebar({
  activeSidebar,
  handleAddField,
  applyLevelPreset,
  setLeftSidebarOpen,
  levelNumber,
  setLevelNumber,
  levelDescription,
  setLevelDescription,
  levelName,
  setLevelName,
  onChangesUnsaved,
  status,
  setStatus,
  currentLevel,
  setCurrentLevel,
  onOpenVerificationServices,
}: LeftSidebarProps) {
  const [sidebarHeight, setSidebarHeight] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateHeight = () => {
      if (sidebarRef.current) {
        setSidebarHeight(sidebarRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  return (
    <div
      ref={sidebarRef}
      className="w-80 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-full"
    >
      {activeSidebar === "fields" && (
        <FieldLibraryPanel
          handleAddField={handleAddField}
          setLeftSidebarOpen={setLeftSidebarOpen}
        />
      )}

      {activeSidebar === "presets" && (
        <LevelPresetsPanel
          applyLevelPreset={applyLevelPreset}
          setLeftSidebarOpen={setLeftSidebarOpen}
          sidebarHeight={sidebarHeight}
        />
      )}

      {activeSidebar === "settings" && (
        <SettingsPanel
          levelNumber={levelNumber}
          setLevelNumber={setLevelNumber}
          levelDescription={levelDescription}
          setLevelDescription={setLevelDescription}
          levelName={levelName}
          setLevelName={setLevelName}
          setLeftSidebarOpen={setLeftSidebarOpen}
          onChangesUnsaved={onChangesUnsaved}
          status={status}
          setStatus={setStatus}
          currentLevel={currentLevel}
          onOpenVerificationServices={onOpenVerificationServices}
        />
      )}
    </div>
  );
}
