"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { WysiwygEditor } from "@/components/ui/wysiwyg/wysiwyg-editor";
import type { WysiwygEditorRef } from "@/components/ui/wysiwyg/types";
import {
  ArrowLeft,
  Save,
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";

interface FullScreenEditorProps {
  templateId: string;
  initialSubject: string;
  initialEmailBody: string;
  initialSmsBody: string;
  initialPushBody: string;
  initialEmail: boolean;
  initialSms: boolean;
  initialPush: boolean;
  initialShortCodes: string[];
  onClose: () => void;
  onSave: (
    subject: string,
    emailBody: string,
    smsBody: string,
    pushBody: string,
    email: boolean,
    sms: boolean,
    push: boolean
  ) => Promise<void>;
}

interface VariableCategory {
  name: string;
  variables: VariableInfo[];
  expanded: boolean;
}

interface VariableInfo {
  code: string;
  example: string;
  description: string;
}

// Comprehensive variable definitions with examples
const allVariables: Record<string, VariableCategory> = {
  user: {
    name: "User Information",
    expanded: true,
    variables: [
      { code: "FIRSTNAME", example: "John", description: "User's first name" },
      { code: "LASTNAME", example: "Smith", description: "User's last name" },
      {
        code: "EMAIL",
        example: "john.smith@example.com",
        description: "User's email address",
      },
      {
        code: "DISPLAY_NAME",
        example: "JohnS",
        description: "User's display name",
      },
      {
        code: "RECEIVER_NAME",
        example: "John Smith",
        description: "Receiver's full name",
      },
      {
        code: "SENDER_NAME",
        example: "Jane Doe",
        description: "Sender's full name",
      },
      {
        code: "CUSTOMER_NAME",
        example: "John Smith",
        description: "Customer's name",
      },
      {
        code: "PARTICIPANT_NAME",
        example: "John Smith",
        description: "Participant's name",
      },
      {
        code: "SELLER_NAME",
        example: "Jane Doe",
        description: "Seller's name",
      },
      {
        code: "BUYER_NAME",
        example: "John Smith",
        description: "Buyer's name",
      },
      {
        code: "INVESTOR_NAME",
        example: "John Smith",
        description: "Investor's name",
      },
      {
        code: "PROJECT_OWNER_NAME",
        example: "Jane Doe",
        description: "Project owner's name",
      },
      {
        code: "FOLLOWER_NAME",
        example: "John Smith",
        description: "Follower's name",
      },
      {
        code: "LEADER_NAME",
        example: "CryptoMaster",
        description: "Trading leader's name",
      },
    ],
  },
  authentication: {
    name: "Authentication",
    expanded: false,
    variables: [
      {
        code: "TOKEN",
        example: "ABC123XYZ789",
        description: "Verification or reset token",
      },
      {
        code: "URL",
        example: "https://example.com",
        description: "Application URL",
      },
      {
        code: "LAST_LOGIN",
        example: "2024-01-15 14:30:00",
        description: "Last login timestamp",
      },
    ],
  },
  dates: {
    name: "Date & Time",
    expanded: false,
    variables: [
      {
        code: "CREATED_AT",
        example: "2024-01-15 10:30:00",
        description: "Creation timestamp",
      },
      {
        code: "UPDATED_AT",
        example: "2024-01-15 14:45:00",
        description: "Update timestamp",
      },
      { code: "TIME", example: "14:30:00", description: "Time value" },
      { code: "ORDER_DATE", example: "2024-01-15", description: "Order date" },
      {
        code: "STARTED_AT",
        example: "2024-01-15 09:00:00",
        description: "Start timestamp",
      },
      {
        code: "STOPPED_AT",
        example: "2024-01-15 17:00:00",
        description: "Stop timestamp",
      },
      {
        code: "APPROVED_AT",
        example: "2024-01-15",
        description: "Approval date",
      },
    ],
  },
  financial: {
    name: "Financial",
    expanded: false,
    variables: [
      { code: "AMOUNT", example: "99.99", description: "Transaction amount" },
      { code: "CURRENCY", example: "USDT", description: "Currency code" },
      {
        code: "NEW_BALANCE",
        example: "1,250.50",
        description: "New account balance",
      },
      { code: "FEE", example: "2.50", description: "Transaction fee" },
      { code: "PROFIT", example: "150.00", description: "Profit amount" },
      { code: "LOSS", example: "25.00", description: "Loss amount" },
      {
        code: "ORDER_TOTAL",
        example: "499.99",
        description: "Order total amount",
      },
      {
        code: "CURRENT_AMOUNT",
        example: "1,000.00",
        description: "Current amount",
      },
      {
        code: "TOTAL_PROFIT",
        example: "2,450.00",
        description: "Total profit",
      },
      {
        code: "YOUR_PROFIT",
        example: "120.50",
        description: "Your profit amount",
      },
      {
        code: "NET_PROFIT",
        example: "108.45",
        description: "Net profit after fees",
      },
      {
        code: "REQUIRED_AMOUNT",
        example: "500.00",
        description: "Required amount",
      },
      {
        code: "AVAILABLE_BALANCE",
        example: "450.00",
        description: "Available balance",
      },
      {
        code: "DAILY_LOSS_LIMIT",
        example: "100.00",
        description: "Daily loss limit",
      },
      {
        code: "CURRENT_LOSS",
        example: "85.00",
        description: "Current loss amount",
      },
      {
        code: "FOLLOWER_PROFIT",
        example: "75.00",
        description: "Follower's profit",
      },
      {
        code: "PROFIT_SHARE_PERCENT",
        example: "10",
        description: "Profit share percentage",
      },
      {
        code: "PROFIT_SHARE_AMOUNT",
        example: "7.50",
        description: "Profit share amount",
      },
      {
        code: "LEADER_PROFIT_SHARE",
        example: "12.00",
        description: "Leader's profit share",
      },
    ],
  },
  trading: {
    name: "Trading",
    expanded: false,
    variables: [
      {
        code: "SYMBOL",
        example: "BTC/USDT",
        description: "Trading pair symbol",
      },
      { code: "SIDE", example: "BUY", description: "Trade side (BUY/SELL)" },
      { code: "ENTRY_PRICE", example: "42,500.00", description: "Entry price" },
      { code: "EXIT_PRICE", example: "43,200.00", description: "Exit price" },
      {
        code: "TOTAL_TRADES",
        example: "150",
        description: "Total number of trades",
      },
      { code: "WIN_RATE", example: "68.5", description: "Win rate percentage" },
      { code: "ROI", example: "24.5", description: "Return on investment" },
      { code: "RISK_LEVEL", example: "Medium", description: "Risk level" },
      {
        code: "TRADING_STYLE",
        example: "Day Trading",
        description: "Trading style",
      },
      {
        code: "COPY_MODE",
        example: "Proportional",
        description: "Copy trading mode",
      },
      {
        code: "MAX_DAILY_LOSS",
        example: "5",
        description: "Max daily loss percentage",
      },
      {
        code: "MAX_POSITION_SIZE",
        example: "1000",
        description: "Maximum position size",
      },
    ],
  },
  kyc: {
    name: "KYC",
    expanded: false,
    variables: [
      { code: "LEVEL", example: "2", description: "KYC verification level" },
      { code: "STATUS", example: "Approved", description: "KYC status" },
    ],
  },
  investment: {
    name: "Investment",
    expanded: false,
    variables: [
      {
        code: "PLAN_NAME",
        example: "Premium Plan",
        description: "Investment plan name",
      },
      { code: "DURATION", example: "90", description: "Investment duration" },
      { code: "TIMEFRAME", example: "days", description: "Duration timeframe" },
      {
        code: "OFFERING_NAME",
        example: "Tech Startup Fund",
        description: "Offering name",
      },
      {
        code: "PROJECT_NAME",
        example: "Green Energy Initiative",
        description: "Project name",
      },
    ],
  },
  staking: {
    name: "Staking",
    expanded: false,
    variables: [
      {
        code: "POOL_NAME",
        example: "ETH Staking Pool",
        description: "Staking pool name",
      },
      { code: "REWARD", example: "12.50", description: "Staking reward" },
    ],
  },
  transaction: {
    name: "Transactions",
    expanded: false,
    variables: [
      {
        code: "TRANSACTION_ID",
        example: "TXN-ABC123XYZ789",
        description: "Transaction ID",
      },
      {
        code: "HASH",
        example: "0x1234...abcd",
        description: "Blockchain hash",
      },
      {
        code: "TO_ADDRESS",
        example: "0xABCD...1234",
        description: "Recipient address",
      },
      { code: "ACTION", example: "Deposit", description: "Transaction action" },
    ],
  },
  support: {
    name: "Support & Messaging",
    expanded: false,
    variables: [
      {
        code: "TICKET_ID",
        example: "TICKET-12345",
        description: "Support ticket ID",
      },
      {
        code: "MESSAGE",
        example: "Your request has been processed.",
        description: "Message content",
      },
      {
        code: "RESOLUTION_MESSAGE",
        example: "Issue resolved successfully.",
        description: "Resolution message",
      },
      {
        code: "NOTE",
        example: "Additional information here.",
        description: "Additional note",
      },
    ],
  },
  p2p: {
    name: "P2P Trading",
    expanded: false,
    variables: [
      { code: "TRADE_ID", example: "P2P-78901", description: "P2P trade ID" },
      { code: "OFFER_ID", example: "OFFER-45678", description: "P2P offer ID" },
    ],
  },
  application: {
    name: "Applications",
    expanded: false,
    variables: [
      {
        code: "APPLICATION_ID",
        example: "APP-56789",
        description: "Application ID",
      },
      {
        code: "AUTHOR_STATUS",
        example: "Approved",
        description: "Author application status",
      },
      {
        code: "REJECTION_REASON",
        example: "Incomplete documentation",
        description: "Rejection reason",
      },
      {
        code: "SUSPENSION_REASON",
        example: "Policy violation",
        description: "Suspension reason",
      },
      {
        code: "FLAG_REASON",
        example: "Suspicious activity",
        description: "Flag reason",
      },
      {
        code: "PAUSE_REASON",
        example: "User request",
        description: "Pause reason",
      },
      {
        code: "REASON",
        example: "Manual review required",
        description: "General reason",
      },
    ],
  },
  order: {
    name: "Orders",
    expanded: false,
    variables: [
      {
        code: "ORDER_NUMBER",
        example: "ORD-123456",
        description: "Order number",
      },
      {
        code: "SUBSCRIPTION_ID",
        example: "SUB-78901",
        description: "Subscription ID",
      },
    ],
  },
  statistics: {
    name: "Statistics",
    expanded: false,
    variables: [
      { code: "DAYS_FOLLOWED", example: "45", description: "Days followed" },
      {
        code: "ESTIMATED_REVIEW_TIME",
        example: "3-5 business days",
        description: "Estimated review time",
      },
    ],
  },
};

export function FullScreenEditor({
  templateId,
  initialSubject,
  initialEmailBody,
  initialSmsBody,
  initialPushBody,
  initialEmail,
  initialSms,
  initialPush,
  initialShortCodes,
  onClose,
  onSave,
}: FullScreenEditorProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [emailBody, setEmailBody] = useState(initialEmailBody);
  const [smsBody, setSmsBody] = useState(initialSmsBody);
  const [pushBody, setPushBody] = useState(initialPushBody);
  const [email, setEmail] = useState(initialEmail);
  const [sms, setSms] = useState(initialSms);
  const [push, setPush] = useState(initialPush);
  const [emailWrapperTemplate, setEmailWrapperTemplate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState(allVariables);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<WysiwygEditorRef>(null);

  // Fetch email wrapper template
  useEffect(() => {
    const fetchEmailWrapper = async () => {
      const { data, error } = await $fetch({
        url: "/api/admin/system/notification/template/wrapper",
        silent: true,
      });
      if (!error && data?.html) {
        setEmailWrapperTemplate(data.html);
      }
    };
    fetchEmailWrapper();
  }, []);

  // Filter variables based on search query and template shortCodes
  const filteredCategories = Object.entries(categories).reduce(
    (acc, [key, category]) => {
      const filteredVariables = category.variables.filter((variable) => {
        const matchesSearch =
          searchQuery === "" ||
          variable.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          variable.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          variable.example.toLowerCase().includes(searchQuery.toLowerCase());

        // Highlight template-specific variables
        const isInTemplate = initialShortCodes.includes(variable.code);

        return matchesSearch && (isInTemplate || searchQuery !== "");
      });

      if (filteredVariables.length > 0) {
        acc[key] = {
          ...category,
          variables: filteredVariables,
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

  const handleInsertVariable = (variableCode: string) => {
    const variableText = `%${variableCode}%`;
    editorRef.current?.insertContent(variableText);
    editorRef.current?.focus();
  };

  const handleCopyVariable = (variableCode: string) => {
    const variableText = `%${variableCode}%`;
    navigator.clipboard.writeText(variableText);
    setCopiedVariable(variableCode);
    setTimeout(() => setCopiedVariable(null), 2000);
    toast.success(`Copied ${variableText}`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(subject, emailBody, smsBody, pushBody, email, sms, push);
      toast.success("Template saved successfully");
    } catch (error) {
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background"
    >
      {/* Top navbar */}
      <div className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center gap-4">
          <Button onClick={onClose} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Edit Email Template</h1>
          <span className="text-sm text-muted-foreground">#{templateId}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left sidebar - Variables panel */}
        <div className="w-80 border-r flex flex-col bg-muted/30">
          <div className="p-4 border-b bg-background">
            <h2 className="font-semibold mb-3">Template Variables</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search variables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {Object.entries(filteredCategories).map(([key, category]) => (
              <div key={key} className="rounded-lg border bg-background">
                <button
                  onClick={() => toggleCategory(key)}
                  className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium text-sm">{category.name}</span>
                  {category.expanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                <AnimatePresence>
                  {category.expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1 px-3 pb-3">
                        {category.variables.map((variable) => {
                          const isInTemplate = initialShortCodes.includes(
                            variable.code
                          );
                          return (
                            <div
                              key={variable.code}
                              className={cn(
                                "group rounded-md p-2 hover:bg-muted transition-colors cursor-pointer",
                                isInTemplate &&
                                  "bg-primary/5 border border-primary/20"
                              )}
                              onClick={() =>
                                handleInsertVariable(variable.code)
                              }
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs font-mono font-semibold text-primary">
                                      %{variable.code}%
                                    </code>
                                    {isInTemplate && (
                                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                        In Template
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {variable.description}
                                  </p>
                                  <p className="text-xs text-muted-foreground/70 mt-0.5 italic">
                                    e.g., {variable.example}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyVariable(variable.code);
                                  }}
                                >
                                  {copiedVariable === variable.code ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
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
            ))}

            {Object.keys(filteredCategories).length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No variables found
              </div>
            )}
          </div>
        </div>

        {/* Right content area - Editor */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-8 space-y-6">
            {/* Subject field */}
            <div>
              <Label htmlFor="subject" className="text-base font-semibold mb-2">
                Email Subject
              </Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="text-base mt-2"
              />
            </div>

            {/* Email body editor */}
            <div>
              <Label className="text-base font-semibold mb-2">Email Body</Label>
              <div className="mt-2">
                <WysiwygEditor
                  ref={editorRef}
                  value={emailBody}
                  onChange={setEmailBody}
                  placeholder="Enter email body..."
                  uploadDir="notifications"
                  minHeight={600}
                  emailPreview={{
                    enabled: true,
                    wrapperHtml: emailWrapperTemplate,
                    subject: subject,
                  }}
                />
              </div>
            </div>

            {/* SMS Body */}
            <div>
              <Label htmlFor="smsBody" className="text-base font-semibold mb-2">
                SMS Body
              </Label>
              <Textarea
                id="smsBody"
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                placeholder="Enter SMS body..."
                className="mt-2 min-h-[120px]"
              />
            </div>

            {/* Push Notification Body */}
            <div>
              <Label htmlFor="pushBody" className="text-base font-semibold mb-2">
                Push Notification Body
              </Label>
              <Textarea
                id="pushBody"
                value={pushBody}
                onChange={(e) => setPushBody(e.target.value)}
                placeholder="Enter push notification body..."
                className="mt-2 min-h-[120px]"
              />
            </div>

            {/* Notification Channels */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold text-base mb-4">
                Notification Channels
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      htmlFor="email-switch"
                    >
                      Email
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send emails notifications
                    </p>
                  </div>
                  <Switch
                    id="email-switch"
                    checked={email}
                    onCheckedChange={setEmail}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      htmlFor="sms-switch"
                    >
                      SMS (coming soon)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send sms notifications
                    </p>
                  </div>
                  <Switch
                    id="sms-switch"
                    checked={sms}
                    onCheckedChange={setSms}
                    disabled={true}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      htmlFor="push-switch"
                    >
                      Push (coming soon)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send push notifications
                    </p>
                  </div>
                  <Switch
                    id="push-switch"
                    checked={push}
                    onCheckedChange={setPush}
                    disabled={true}
                  />
                </div>
              </div>
            </div>

            {/* Helper text */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <h3 className="font-medium text-sm mb-2">Tips:</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>
                  Click on any variable in the left panel to insert it at cursor
                  position
                </li>
                <li>
                  Variables marked "In Template" are used in this notification
                  template
                </li>
                <li>
                  Use the preview mode to see how the email will look with
                  sample data
                </li>
                <li>
                  Variables are automatically replaced with real data when
                  emails are sent
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
