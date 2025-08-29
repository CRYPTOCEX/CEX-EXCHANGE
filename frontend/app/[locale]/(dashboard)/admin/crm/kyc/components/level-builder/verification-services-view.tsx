"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Globe,
  Info,
  Layers,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  FileImage,
  BrainCircuit,
  Languages,
} from "lucide-react";
import { useVerificationServiceStore } from "@/store/verification-service-store";
interface VerificationServicesViewProps {
  currentLevel: KycLevel | null;
  onUpdateLevel: (updatedLevel: KycLevel) => void;
  onBack: () => void;
}

// Template definitions
const SUMSUB_TEMPLATES = [
  {
    id: "basic",
    name: "Basic Identity Verification",
    description: "Standard identity verification with ID and selfie",
    fields: [
      {
        id: "full_name",
        type: "TEXT",
        label: "Full Name",
        required: true,
      },
      {
        id: "dob",
        type: "DATE",
        label: "Date of Birth",
        required: true,
      },
      {
        id: "id_front",
        type: "FILE",
        label: "ID Front",
        required: true,
      },
      {
        id: "selfie",
        type: "FILE",
        label: "Selfie",
        required: true,
      },
    ],
    requiredDocuments: ["ID_DOCUMENT"],
  },
  {
    id: "advanced",
    name: "Advanced Verification",
    description: "Comprehensive verification with additional checks",
    fields: [
      {
        id: "full_name",
        type: "TEXT",
        label: "Full Name",
        required: true,
      },
      {
        id: "dob",
        type: "DATE",
        label: "Date of Birth",
        required: true,
      },
      {
        id: "id_front",
        type: "FILE",
        label: "ID Front",
        required: true,
      },
      {
        id: "id_back",
        type: "FILE",
        label: "ID Back",
        required: true,
      },
      {
        id: "selfie",
        type: "FILE",
        label: "Selfie",
        required: true,
      },
      {
        id: "address",
        type: "TEXT",
        label: "Address",
        required: true,
      },
    ],
    requiredDocuments: ["ID_DOCUMENT", "PROOF_OF_ADDRESS"],
  },
];

const DEEPSEEK_TEMPLATES = [
  {
    id: "document_verification",
    name: "Document Verification",
    description: "AI-powered document analysis and verification",
    fields: [
      {
        id: "full_name",
        type: "TEXT",
        label: "Full Name",
        required: true,
      },
      {
        id: "dob",
        type: "DATE",
        label: "Date of Birth",
        required: true,
      },
      {
        id: "id_document",
        type: "FILE",
        label: "Identity Document",
        required: true,
      },
      {
        id: "document_type",
        type: "SELECT",
        label: "Document Type",
        required: true,
        options: [
          { value: "passport", label: "Passport" },
          { value: "drivers_license", label: "Driver's License" },
          { value: "national_id", label: "National ID" },
        ],
      },
    ],
    requiredDocuments: ["ID_DOCUMENT"],
  },
  {
    id: "enhanced_verification",
    name: "Enhanced AI Verification",
    description: "Comprehensive AI analysis with fraud detection",
    fields: [
      {
        id: "full_name",
        type: "TEXT",
        label: "Full Name",
        required: true,
      },
      {
        id: "dob",
        type: "DATE",
        label: "Date of Birth",
        required: true,
      },
      {
        id: "id_front",
        type: "FILE",
        label: "ID Front",
        required: true,
      },
      {
        id: "id_back",
        type: "FILE",
        label: "ID Back",
        required: false,
      },
      {
        id: "selfie",
        type: "FILE",
        label: "Selfie with Document",
        required: true,
      },
      {
        id: "proof_of_address",
        type: "FILE",
        label: "Proof of Address",
        required: false,
      },
      {
        id: "address",
        type: "TEXT",
        label: "Current Address",
        required: true,
      },
    ],
    requiredDocuments: ["ID_DOCUMENT", "SELFIE"],
  },
];

export function VerificationServicesView({
  currentLevel,
  onUpdateLevel,
  onBack,
}: VerificationServicesViewProps) {
  const {
    services = [],
    fetchServices,
    checkEnv,
    checkConnection,
    isLoading,
    error,
  } = useVerificationServiceStore();
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("services");
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "checking" | "success" | "error"
  >("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [missingEnvVars, setMissingEnvVars] = useState<string[]>([]);
  useEffect(() => {
    fetchServices();
    if (currentLevel?.serviceId) {
      setSelectedServiceId(currentLevel.serviceId);
      setActiveTab("templates");
    }
  }, [fetchServices, currentLevel]);

  // Map services and add templates
  const servicesArray: VerificationService[] = Array.isArray(services)
    ? services.map((service) => {
        // Add templates based on service type
        let templates: VerificationTemplate[] = [];
        if (service.id === "sumsub-1" || service.type === "SUMSUB") {
          templates = SUMSUB_TEMPLATES;
        } else if (service.id === "gemini-1.5-pro" || service.type === "GEMINI") {
          templates = [];
        } else if (service.id === "deepseek-1" || service.type === "DEEPSEEK") {
          templates = DEEPSEEK_TEMPLATES;
        }
        return {
          ...service,
          templates,
        };
      })
    : [];
  const selectedService = servicesArray.find(
    (service) => service.id === selectedServiceId
  );
  const selectedTemplate = selectedService?.templates?.find(
    (template) => template.id === selectedTemplateId
  );
  const isGeminiService =
    selectedServiceId.startsWith("gemini") ||
    selectedService?.type === "GEMINI";
  const isDeepSeekService =
    selectedServiceId.startsWith("deepseek") ||
    selectedService?.type === "DEEPSEEK";
  const handleSelectService = async (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setSelectedTemplateId("");
    setConnectionStatus("idle");
    setConnectionError(null);
    setMissingEnvVars([]);
    setActiveTab("api-connection");
    const service = servicesArray.find((s) => s.id === serviceId);
    try {
      setIsCheckingConnection(true);
      const result = await checkEnv(serviceId);
      if (result && result.success !== undefined) {
        const { success, missingEnvVars = [] } = result;
        if (!success && missingEnvVars && missingEnvVars.length > 0) {
          setConnectionStatus("error");
          const envVarsList = missingEnvVars.join(", ");
          setConnectionError(`Missing required environment variables: ${envVarsList}`);
          setMissingEnvVars(missingEnvVars || []);
        } else if (!success) {
          setConnectionStatus("error");
          setConnectionError("Environment configuration check failed");
          setMissingEnvVars([]);
        } else {
          setMissingEnvVars([]);
          await handleCheckApiConnection();
        }
      } else {
        setConnectionStatus("error");
        setConnectionError("Failed to check environment variables");
        setMissingEnvVars([]);
      }
    } catch (error) {
      setConnectionStatus("error");
      setConnectionError("Failed to check environment variables");
      setMissingEnvVars([]);
    } finally {
      setIsCheckingConnection(false);
    }
  };
  const handleCheckApiConnection = async () => {
    if (!selectedServiceId) return;
    setIsCheckingConnection(true);
    setConnectionStatus("checking");
    try {
      const result = await checkConnection(selectedServiceId);
      if (result.connected) {
        setConnectionStatus("success");
        setConnectionError(null);
        setTimeout(() => setActiveTab("templates"), 1500);
      } else {
        setConnectionStatus("error");
        setConnectionError(result.message || "Failed to connect to the API");
      }
    } catch (error) {
      setConnectionStatus("error");
      setConnectionError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsCheckingConnection(false);
    }
  };
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setActiveTab("preview");
  };
  const handleConfirm = () => {
    if (!currentLevel || !selectedService) return;
    const updatedLevel = {
      ...currentLevel,
    };
    // Just set the serviceId directly
    updatedLevel.serviceId = selectedService.id;
    if (
      selectedTemplate &&
      (!currentLevel.serviceId || currentLevel.serviceId !== selectedService.id)
    ) {
      const templateFields: KycField[] = selectedTemplate.fields.map(
        (field, index) => ({
          id: `${field.id}-${Date.now()}`,
          type: field.type,
          label: field.label,
          placeholder: field.placeholder || "",
          required: field.required,
          description: field.description || "",
          order: index,
          options: field.options,
          verificationField: {
            serviceFieldId: field.id,
            mappingType: "DIRECT",
          },
        })
      );
      updatedLevel.fields = templateFields;
    }
    onUpdateLevel(updatedLevel);
    onBack();
  };
  const handleDisconnect = () => {
    if (!currentLevel) return;
    const updatedLevel = {
      ...currentLevel,
    };
    // Remove the serviceId directly
    delete updatedLevel.serviceId;
    onUpdateLevel(updatedLevel);
    setSelectedServiceId("");
    setSelectedTemplateId("");
    setActiveTab("services");
    setConnectionStatus("idle");
    setConnectionError(null);
    setMissingEnvVars([]);
  };

  // Skeleton loaders for services
  const ServiceCardSkeleton = () => (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <Skeleton className="h-7 w-40 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-4" />
        <div className="flex flex-wrap gap-2 mb-4">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    </div>
  );

  // Render loading skeletons
  if (isLoading) {
    return (
      <div className="w-full h-full overflow-auto">
        <div className="max-w-5xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-10 w-64" />
          </div>

          <div className="mb-6">
            <Skeleton className="h-7 w-80 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>

          <div className="mb-6">
            <Skeleton className="h-10 w-full mb-6" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ServiceCardSkeleton />
            <ServiceCardSkeleton />
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="w-full h-full overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">KYC Verification Services</h1>
          <Alert className="mb-6 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-red-900 dark:text-red-100">Error Loading Verification Services</AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300">{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchServices}>Retry</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">KYC Verification Services</h1>
          {currentLevel?.serviceId && (
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              className="ml-auto"
            >
              Disconnect Service
            </Button>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold flex items-center mb-2">
            <ShieldCheck className="h-5 w-5 mr-2 text-primary" />
            KYC Verification Service Integration
          </h2>
          <p className="text-muted-foreground">
            Select a verification service and template to automate KYC
            verification
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="api-connection" disabled={!selectedServiceId}>
              API Connection
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              disabled={!selectedServiceId || connectionStatus !== "success"}
            >
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {servicesArray.map((service) => {
                const integrationDetails =
                  typeof service.integrationDetails === "string"
                    ? JSON.parse(service.integrationDetails)
                    : service.integrationDetails;
                return (
                  <div
                    key={service.id}
                    className={`border rounded-lg overflow-hidden transition-all hover:shadow-md cursor-pointer ${selectedServiceId === service.id ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
                    onClick={() => handleSelectService(service.id)}
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {service.type}
                          </p>
                        </div>
                      </div>

                      <p className="mb-4">{service.description}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {integrationDetails.features
                          .slice(0, 3)
                          .map((feature: string, index: number) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="capitalize"
                            >
                              {feature.replace(/_/g, " ").toLowerCase()}
                            </Badge>
                          ))}
                        {integrationDetails.features.length > 3 && (
                          <Badge variant="outline">
                            +{integrationDetails.features.length - 3} more
                          </Badge>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-sm text-muted-foreground mt-4 pt-4 border-t">
                        {service.type === "GEMINI" ||
                        service.id.startsWith("gemini") ? (
                          <>
                            <div className="flex items-center">
                              <Globe className="h-4 w-4 mr-2" />
                              All countries
                            </div>
                            <div className="flex items-center">
                              <Languages className="h-4 w-4 mr-2" />
                              All languages
                            </div>
                            <div className="flex items-center">
                              <BrainCircuit className="h-4 w-4 mr-2" />
                              AI-powered
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center">
                              <Globe className="h-4 w-4 mr-2" />
                              200+ countries
                            </div>
                            <div className="flex items-center">
                              <Layers className="h-4 w-4 mr-2" />
                              {service.templates?.length || 0} templates
                            </div>
                            <div className="flex items-center">
                              <Shield className="h-4 w-4 mr-2" />
                              Requires API Key
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
              <Button
                onClick={() => setActiveTab("api-connection")}
                disabled={!selectedServiceId}
                className="flex items-center"
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="api-connection" className="space-y-6">
            {selectedService && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-6">
                  <h3 className="text-xl font-bold mb-2">
                    {selectedService.name} API Connection
                  </h3>
                  <p className="text-muted-foreground">
                    This service requires API credentials configured in your
                    .env file.
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {connectionStatus === "error" && !missingEnvVars?.length && (
                    <Alert className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <AlertTitle className="text-red-900 dark:text-red-100">Connection Failed</AlertTitle>
                      <AlertDescription className="text-red-700 dark:text-red-300">{connectionError}</AlertDescription>
                    </Alert>
                  )}

                  {connectionStatus === "success" && (
                    <Alert className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertTitle className="text-green-900 dark:text-green-100">Connection Successful</AlertTitle>
                      <AlertDescription className="text-green-700 dark:text-green-300">
                        API credentials verified successfully.
                      </AlertDescription>
                    </Alert>
                  )}

                  {missingEnvVars && missingEnvVars.length > 0 && (
                    <div className="space-y-4">
                      <Alert className="bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <AlertTitle className="text-amber-900 dark:text-amber-100">Missing Environment Variables</AlertTitle>
                        <AlertDescription className="text-amber-700 dark:text-amber-300">
                          The following environment variables are required but not configured:
                        </AlertDescription>
                      </Alert>

                      <div className="bg-amber-50/50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                        <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-3">
                          Required Variables:
                        </h4>
                        <ul className="space-y-2">
                          {missingEnvVars.map((envVar) => (
                            <li key={envVar} className="flex items-center gap-2">
                              <span className="text-amber-600 dark:text-amber-400">•</span>
                              <code className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 px-2 py-1 rounded font-mono text-sm">
                                {envVar}
                              </code>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          How to Configure:
                        </h4>
                        <ol className="space-y-2 list-decimal pl-5 text-sm text-blue-800 dark:text-blue-200">
                          <li>
                            Edit your{" "}
                            <code className="bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 px-2 py-0.5 rounded font-mono">
                              .env
                            </code>{" "}
                            file
                          </li>
                          <li>Add the variables with their values</li>
                          <li>Restart your server</li>
                        </ol>
                        <div className="mt-3 bg-blue-100 p-3 rounded-md">
                          <p className="text-xs font-medium mb-1">Example:</p>
                          <pre className="text-xs overflow-x-auto p-2 bg-blue-200 rounded">
                            {selectedService.type === "SUMSUB" ||
                            selectedService.id.startsWith("sumsub")
                              ? "SUMSUB_API_KEY=your_sumsub_key\nSUMSUB_API_SECRET=your_sumsub_secret"
                              : "GEMINI_API_KEY=your_gemini_key"}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {isGeminiService && (
                    <Alert className="bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800">
                      <BrainCircuit className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <AlertTitle className="text-indigo-900 dark:text-indigo-100">Gemini AI Verification</AlertTitle>
                      <AlertDescription className="text-indigo-700 dark:text-indigo-300">
                        Gemini requires an API key to access its AI-powered
                        document verification capabilities. Ensure your KYC form
                        includes document uploads for analysis.
                      </AlertDescription>
                    </Alert>
                  )}

                  {isDeepSeekService && (
                    <Alert className="bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800">
                      <BrainCircuit className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <AlertTitle className="text-purple-900 dark:text-purple-100">DeepSeek AI Verification</AlertTitle>
                      <AlertDescription className="text-purple-700 dark:text-purple-300">
                        DeepSeek provides advanced AI-powered document analysis
                        with fraud detection capabilities. Select a template to configure
                        your verification workflow.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Alert className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                    <Info className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <AlertTitle className="text-slate-900 dark:text-slate-100">Where to Get Credentials</AlertTitle>
                    <AlertDescription className="text-slate-700 dark:text-slate-300">
                      <p className="mb-3">
                        Obtain your API credentials from your{" "}
                        <span className="font-semibold">{selectedService.name}</span> dashboard.
                      </p>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                        onClick={() =>
                          window.open(
                            selectedService.type === "SUMSUB" ||
                              selectedService.id.startsWith("sumsub")
                              ? "https://sumsub.com/docs/"
                              : "https://gemini.com/docs/",
                            "_blank"
                          )
                        }
                      >
                        View Docs <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="bg-muted p-6 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("services")}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCheckApiConnection}
                    disabled={(missingEnvVars && missingEnvVars.length > 0) || isCheckingConnection}
                    className="flex items-center"
                  >
                    {isCheckingConnection ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Checking
                      </>
                    ) : connectionStatus === "success" ? (
                      <>
                        <Check className="mr-1 h-4 w-4" /> Connected
                      </>
                    ) : (
                      "Check Connection"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            {selectedService && (
              <>
                <div className="bg-muted/50 p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-bold mb-2">
                    {selectedService.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedService.description}
                  </p>
                  {isGeminiService && (
                    <Alert className="mt-4 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <AlertTitle className="text-amber-900 dark:text-amber-100">Document Requirement</AlertTitle>
                      <AlertDescription className="text-amber-700 dark:text-amber-300">
                        Gemini requires document images for AI verification.
                        Ensure your form includes them.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {selectedService.templates?.map((template) => {
                    return (
                      <div
                        key={template.id}
                        className={`border rounded-lg overflow-hidden transition-all hover:shadow-md cursor-pointer ${selectedTemplateId === template.id ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
                        onClick={() => handleSelectTemplate(template.id)}
                      >
                        <div className="p-6">
                          <h3 className="text-xl font-bold mb-2">
                            {template.name}
                          </h3>
                          <p className="text-muted-foreground mb-4">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-center">
                              <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>{template.fields?.length || 0} fields</span>
                            </div>
                            {template.requiredDocuments && (
                              <div className="flex items-center">
                                <FileImage className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>
                                  {template.requiredDocuments.length} documents
                                </span>
                              </div>
                            )}
                          </div>
                          {template.requiredDocuments && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {template.requiredDocuments.map((doc, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="capitalize"
                                >
                                  {doc.replace(/_/g, " ").toLowerCase()}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isGeminiService &&
                    (!selectedService.templates ||
                      selectedService.templates.length === 0) && (
                      <div className="text-center p-8 border rounded-lg">
                        <BrainCircuit className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                        <h3 className="text-xl font-bold mb-2">
                          Dynamic AI Verification
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Gemini adapts to your form structure. Include document
                          images for verification.
                        </p>
                      </div>
                    )}
                </div>

                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("api-connection")}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedTemplateId) setActiveTab("preview");
                      else if (isGeminiService) handleConfirm();
                    }}
                    disabled={!selectedTemplateId && !isGeminiService}
                    className="flex items-center"
                  >
                    {selectedTemplateId ? (
                      <>
                        Preview <ChevronRight className="ml-1 h-4 w-4" />
                      </>
                    ) : (
                      "Continue with Dynamic Verification"
                    )}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            {selectedTemplate && (
              <>
                <div className="bg-muted/50 p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-bold mb-2">
                    {selectedTemplate.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted p-4 font-medium">
                    Template Fields
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div className="divide-y">
                      {selectedTemplate.fields?.map((field) => {
                        return (
                          <div
                            key={field.id}
                            className="p-4 flex items-start justify-between"
                          >
                            <div>
                              <div className="font-medium flex items-center">
                                {field.label}
                                {field.required && (
                                  <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                                    Required
                                  </span>
                                )}
                                {field.type === "FILE" && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                                    Document
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                Type: {field.type}
                              </div>
                            </div>
                            <Badge
                              variant={field.required ? "default" : "outline"}
                              className="ml-2 shrink-0"
                            >
                              {field.required ? "Required" : "Optional"}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {selectedTemplate.requiredDocuments &&
                  selectedTemplate.requiredDocuments.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted p-4 font-medium">
                        Required Documents
                      </div>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedTemplate.requiredDocuments.map(
                          (doc, index) => (
                            <div
                              key={index}
                              className="flex items-center p-3 bg-muted/30 rounded-md"
                            >
                              <Shield className="h-5 w-5 mr-3 text-primary" />
                              <span className="capitalize">
                                {doc.replace(/_/g, " ").toLowerCase()}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {isGeminiService && (
                  <Alert className="mt-6 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800">
                    <BrainCircuit className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <AlertTitle className="text-indigo-900 dark:text-indigo-100">AI-Powered Verification</AlertTitle>
                    <AlertDescription className="text-indigo-700 dark:text-indigo-300">
                      Gemini AI will verify document images against provided
                      data, supporting all languages and countries.
                    </AlertDescription>
                  </Alert>
                )}

                <Alert className="mt-6 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="text-amber-900 dark:text-amber-100">Important</AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    Confirming will add these fields to your KYC level, mapped
                    to {selectedService?.name}.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("templates")}
                  >
                    Back
                  </Button>
                  <Button onClick={handleConfirm} className="flex items-center">
                    Confirm <Check className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {isGeminiService && !selectedTemplate && (
              <>
                <div className="bg-muted/50 p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-bold mb-2">
                    Dynamic AI Verification
                  </h3>
                  <p className="text-muted-foreground">
                    Gemini adapts to your custom form, verifying data against
                    uploaded documents.
                  </p>
                </div>

                <div className="border rounded-lg p-6">
                  <div className="flex items-start mb-6">
                    <BrainCircuit className="h-6 w-6 mr-3 text-primary mt-1" />
                    <div>
                      <h4 className="text-lg font-medium mb-2">
                        How Gemini Works
                      </h4>
                      <p className="text-muted-foreground mb-4">
                        Gemini uses AI to verify documents globally, detecting
                        fraud and extracting data.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-start">
                      <div className="bg-primary/10 rounded-full p-2 mr-3">
                        <FileImage className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h5 className="font-medium">Document Analysis</h5>
                        <p className="text-sm text-muted-foreground">
                          Extracts and verifies data from IDs and passports.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-primary/10 rounded-full p-2 mr-3">
                        <Languages className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h5 className="font-medium">Multi-Language</h5>
                        <p className="text-sm text-muted-foreground">
                          Supports documents in any language.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-primary/10 rounded-full p-2 mr-3">
                        <AlertTriangle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h5 className="font-medium">Fraud Detection</h5>
                        <p className="text-sm text-muted-foreground">
                          Identifies tampered or fake documents.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Alert className="mb-6 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="text-amber-900 dark:text-amber-100">Document Requirement</AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                      Include at least one document image field (e.g., ID,
                      passport) in your form.
                    </AlertDescription>
                  </Alert>

                  <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md border border-blue-100 dark:border-blue-700">
                    <h4 className="font-medium text-blue-800 dark:text-blue-100 mb-2">
                      Recommended Fields:
                    </h4>
                    <ul className="space-y-2 list-disc pl-5 text-sm text-blue-700 dark:text-blue-300">
                      <li>
                        <strong>ID Front</strong> (required)
                      </li>
                      <li>
                        <strong>ID Back</strong> (recommended)
                      </li>
                      <li>
                        <strong>Selfie</strong> (recommended)
                      </li>
                      <li>
                        <strong>Personal Info</strong> (e.g., Name, DOB)
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("templates")}
                  >
                    Back
                  </Button>
                  <Button onClick={handleConfirm} className="flex items-center">
                    Continue with Dynamic Verification{" "}
                    <Check className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
