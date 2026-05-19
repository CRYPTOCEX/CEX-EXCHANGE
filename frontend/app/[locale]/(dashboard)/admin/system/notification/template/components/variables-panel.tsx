"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface VariableInfo {
  code: string;
  example: string;
  description: string;
}

interface VariableCategory {
  name: string;
  variables: VariableInfo[];
  expanded: boolean;
}

interface VariablesPanelProps {
  shortCodes: string[];
  onInsertVariable: (code: string) => void;
}

// Comprehensive variable definitions
const allVariables: Record<string, VariableCategory> = {
  user: {
    name: "User Information",
    expanded: true,
    variables: [
      { code: "FIRSTNAME", example: "John", description: "User's first name" },
      { code: "LASTNAME", example: "Smith", description: "User's last name" },
      { code: "EMAIL", example: "john@example.com", description: "User's email" },
      { code: "DISPLAY_NAME", example: "JohnS", description: "Display name" },
      { code: "RECEIVER_NAME", example: "John Smith", description: "Receiver's name" },
      { code: "SENDER_NAME", example: "Jane Doe", description: "Sender's name" },
      { code: "CUSTOMER_NAME", example: "John Smith", description: "Customer's name" },
    ],
  },
  authentication: {
    name: "Authentication",
    expanded: false,
    variables: [
      { code: "TOKEN", example: "ABC123XYZ", description: "Verification token" },
      { code: "URL", example: "https://example.com", description: "Application URL" },
      { code: "LAST_LOGIN", example: "2024-01-15", description: "Last login date" },
    ],
  },
  dates: {
    name: "Date & Time",
    expanded: false,
    variables: [
      { code: "CREATED_AT", example: "2024-01-15", description: "Creation date" },
      { code: "UPDATED_AT", example: "2024-01-15", description: "Update date" },
      { code: "TIME", example: "14:30:00", description: "Time value" },
      { code: "ORDER_DATE", example: "2024-01-15", description: "Order date" },
    ],
  },
  financial: {
    name: "Financial",
    expanded: false,
    variables: [
      { code: "AMOUNT", example: "99.99", description: "Amount" },
      { code: "CURRENCY", example: "USDT", description: "Currency" },
      { code: "NEW_BALANCE", example: "1,250.50", description: "New balance" },
      { code: "FEE", example: "2.50", description: "Fee" },
      { code: "PROFIT", example: "150.00", description: "Profit" },
      { code: "LOSS", example: "25.00", description: "Loss" },
      { code: "ORDER_TOTAL", example: "499.99", description: "Order total" },
    ],
  },
  trading: {
    name: "Trading",
    expanded: false,
    variables: [
      { code: "SYMBOL", example: "BTC/USDT", description: "Trading pair" },
      { code: "SIDE", example: "BUY", description: "Trade side" },
      { code: "ENTRY_PRICE", example: "42,500.00", description: "Entry price" },
      { code: "EXIT_PRICE", example: "43,200.00", description: "Exit price" },
      { code: "WIN_RATE", example: "68.5", description: "Win rate %" },
      { code: "ROI", example: "24.5", description: "ROI %" },
    ],
  },
  kyc: {
    name: "KYC",
    expanded: false,
    variables: [
      { code: "LEVEL", example: "2", description: "KYC level" },
      { code: "STATUS", example: "Approved", description: "KYC status" },
    ],
  },
  investment: {
    name: "Investment",
    expanded: false,
    variables: [
      { code: "PLAN_NAME", example: "Premium Plan", description: "Plan name" },
      { code: "DURATION", example: "90", description: "Duration" },
      { code: "TIMEFRAME", example: "days", description: "Timeframe" },
    ],
  },
  transaction: {
    name: "Transactions",
    expanded: false,
    variables: [
      { code: "TRANSACTION_ID", example: "TXN-ABC123", description: "Transaction ID" },
      { code: "HASH", example: "0x1234...abcd", description: "Blockchain hash" },
      { code: "TO_ADDRESS", example: "0xABCD...1234", description: "Recipient address" },
      { code: "ACTION", example: "Deposit", description: "Action type" },
    ],
  },
  support: {
    name: "Support",
    expanded: false,
    variables: [
      { code: "TICKET_ID", example: "TICKET-12345", description: "Ticket ID" },
      { code: "MESSAGE", example: "Your request...", description: "Message content" },
      { code: "NOTE", example: "Additional info", description: "Note" },
    ],
  },
  application: {
    name: "Applications",
    expanded: false,
    variables: [
      { code: "APPLICATION_ID", example: "APP-56789", description: "Application ID" },
      { code: "REJECTION_REASON", example: "Incomplete docs", description: "Rejection reason" },
      { code: "REASON", example: "Manual review", description: "General reason" },
    ],
  },
};

export function VariablesPanel({
  shortCodes,
  onInsertVariable,
}: VariablesPanelProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState(allVariables);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // Filter variables based on search and show template-specific first
  const filteredCategories = Object.entries(categories).reduce(
    (acc, [key, category]) => {
      const filteredVariables = category.variables.filter((variable) => {
        const matchesSearch =
          searchQuery === "" ||
          variable.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          variable.description.toLowerCase().includes(searchQuery.toLowerCase());

        const isInTemplate = shortCodes.includes(variable.code);
        // Show all matching if searching, otherwise only template variables when not searching
        return matchesSearch && (searchQuery !== "" || isInTemplate);
      });

      if (filteredVariables.length > 0 || searchQuery !== "") {
        acc[key] = {
          ...category,
          variables:
            searchQuery === ""
              ? filteredVariables
              : category.variables.filter(
                  (v) =>
                    v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    v.description.toLowerCase().includes(searchQuery.toLowerCase())
                ),
        };
      }

      return acc;
    },
    {} as Record<string, VariableCategory>
  );

  const toggleCategory = (categoryKey: string) => {
    setCategories((prev) => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        expanded: !prev[categoryKey].expanded,
      },
    }));
  };

  const handleCopyVariable = (variableCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const variableText = `%${variableCode}%`;
    navigator.clipboard.writeText(variableText);
    setCopiedVariable(variableCode);
    setTimeout(() => setCopiedVariable(null), 2000);
    toast.success(`Copied ${variableText}`);
  };

  return (
    <div className="flex h-full flex-col bg-muted/20 overflow-hidden">
      {/* Header */}
      <div className="border-b p-3 shrink-0">
        <h3 className="font-semibold text-sm mb-2">{t("template_variables")}</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tCommon("search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Variables List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {Object.entries(filteredCategories).map(([key, category]) => {
            if (category.variables.length === 0) return null;

            return (
              <div key={key} className="rounded-md overflow-hidden">
                <button
                  onClick={() => toggleCategory(key)}
                  className="w-full flex items-center justify-between p-2 text-left hover:bg-muted/50 transition-colors text-xs"
                >
                  <span className="font-medium">{category.name}</span>
                  {category.expanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>

                <AnimatePresence>
                  {category.expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-0.5 pb-1">
                        {category.variables.map((variable) => {
                          const isInTemplate = shortCodes.includes(variable.code);
                          return (
                            <div
                              key={variable.code}
                              className={cn(
                                "group flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors",
                                isInTemplate
                                  ? "bg-primary/10 hover:bg-primary/15"
                                  : "hover:bg-muted/50"
                              )}
                              onClick={() => onInsertVariable(variable.code)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <code className="text-[10px] font-mono font-semibold text-primary truncate">
                                    %{variable.code}%
                                  </code>
                                  {isInTemplate && (
                                    <span className="shrink-0 text-[8px] bg-primary/20 text-primary px-1 py-0.5 rounded">
                                      Used
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {variable.description}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => handleCopyVariable(variable.code, e)}
                                >
                                  {copiedVariable === variable.code ? (
                                    <Check className="h-2.5 w-2.5 text-green-500" />
                                  ) : (
                                    <Copy className="h-2.5 w-2.5" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onInsertVariable(variable.code);
                                  }}
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {Object.values(filteredCategories).every(
            (c) => c.variables.length === 0
          ) && (
            <div className="p-4 text-center text-muted-foreground text-xs">
              {searchQuery ? "No variables found" : "No variables for this template"}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Tips */}
      <div className="border-t p-3 shrink-0">
        <p className="text-[10px] text-muted-foreground">
          {t("click_a_variable_to_insert_it_at_cursor")}
        </p>
      </div>
    </div>
  );
}
