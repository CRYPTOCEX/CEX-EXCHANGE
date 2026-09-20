"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SkeletonText } from "@/components/ui/skeleton";
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
import { useTranslations } from "next-intl";
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
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
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

  /**
   * ONE PENDING SERVICE CARD, BUILT OUT OF THE REAL ONE.
   * ==========================================================================
   *
   * The version this replaces was a parallel card: seven hardcoded boxes
   * (`h-7 w-40`, `h-4 w-24`, `h-6 w-20 rounded-full`, ...) inside a copy of the
   * card's border. Two things were wrong with it and only one of them is about
   * pixels.
   *
   *  - The boxes were guesses about text they sat NEXT to rather than inside:
   *    `h-7` for a `text-xl font-bold` name, `h-4` for a `text-sm` type. Neither
   *    can follow a typography change, and one of them was already out — the
   *    footer row is `text-sm` in the real card and got `h-4` (16px) against a
   *    20px line box, three times over, so every pending card was 12px short of
   *    the one about to replace it.
   *
   *  - Everything that is NOT text was dropped. The three footer icons, the
   *    divider rule above them, the `mb-4` rhythm between blocks: all present in
   *    the real card, all absent from its skeleton, so the two disagreed about
   *    structure and not merely about height.
   *
   * This is the same markup as the card below with `SkeletonText` where the
   * strings go. The icons, the border, the divider and the spacing are chrome
   * and render identically in both states, and each placeholder is measured by
   * the element that carries its type scale.
   */
  const ServiceCardPlaceholder = () => (
    <div className="border border-border rounded-lg overflow-hidden" aria-busy="true">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold">
              <SkeletonText placeholder={t("service_name")} />
            </h3>
            <p className="text-sm text-muted-foreground">
              <SkeletonText placeholder="TYPE" chars={7} />
            </p>
          </div>
        </div>

        <p className="mb-4">
          <SkeletonText placeholder={t("a_one_line_description_of_what")} />
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {[0, 1, 2].map((i) => (
            <Badge key={i} variant="outline" className="capitalize">
              <SkeletonText placeholder="feature" />
            </Badge>
          ))}
        </div>

        <div className="flex justify-between items-center text-sm text-muted-foreground mt-4 pt-4 border-t">
          <div className="flex items-center">
            <Globe className="h-4 w-4 mr-2" />
            <SkeletonText placeholder={`200+ ${tCommon('countries')}`} />
          </div>
          <div className="flex items-center">
            <Layers className="h-4 w-4 mr-2" />
            <SkeletonText placeholder="2 templates" />
          </div>
          <div className="flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            <SkeletonText placeholder={t("requires_api_key")} />
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * THE TWO EARLY RETURNS THAT USED TO BE HERE ARE GONE.
   * ==========================================================================
   *
   *   if (isLoading) return <div className="w-full h-full overflow-auto"> ...
   *   if (error)     return <div className="w-full h-full overflow-auto p-6"> ...
   *
   * Look at what the loading one was standing in for. `<Skeleton h-10 w-64/>`
   * was the `<h1>` — "KYC Verification Services", a translated constant.
   * `<Skeleton h-7 w-80/>` and `<Skeleton h-5 w-96/>` were the section heading
   * and its blurb: two more constants. `<Skeleton h-10 w-full/>` was the tab
   * strip, whose three labels are literals in this file. Four of the seven
   * blocks on that screen were grey rectangles pretending not to know strings
   * the component was already holding — and each was a different width from the
   * text it replaced, so all four moved when the fetch landed.
   *
   * The only genuinely unknown thing on this view is the LIST of services, and a
   * list has no knowable length: the grid renders a fixed two pending cards and
   * the count settles, which is what SKELETONS.md prescribes.
   *
   * The error return went the same way for a different reason — it was a second,
   * abridged copy of the page frame (same wrapper, same `max-w-5xl`, same `<h1>`
   * retyped) and it dropped the Disconnect button, so a level that HAD a service
   * attached lost the only control that could detach it at exactly the moment
   * something had gone wrong. It is a banner inside the real frame now.
   */
  return (
    <div className="w-full h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("kyc_verification_services")}</h1>
          {currentLevel?.serviceId && (
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              className="ml-auto"
            >
              {t("disconnect_service")}
            </Button>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold flex items-center mb-2">
            <ShieldCheck className="h-5 w-5 mr-2 text-primary" />
            {t("kyc_verification_service_integration")}
          </h2>
          <p className="text-muted-foreground">
            {t("select_a_verification_kyc_verification")}
          </p>
        </div>

        {/* The load failure, as a banner inside the frame rather than as a
            replacement for it — the heading, the Disconnect button and the tab
            strip all stay reachable. Retry keeps the same `fetchServices`
            handler it had in the old full-page error screen. */}
        {error && (
          <div className="mb-6">
            <Alert className="mb-4 bg-destructive/10 dark:bg-destructive/30 border-destructive">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertTitle className="text-destructive">
                {t("error_loading_verification_services")}
              </AlertTitle>
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
            <Button onClick={fetchServices}>Retry</Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="api-connection" disabled={!selectedServiceId}>
              {t("api_connection")}
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              disabled={!selectedServiceId || connectionStatus !== "success"}
            >
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-6">
            {/* The GRID is chrome and is emitted once, for both states — its
                columns, its gap and the two Back/Next buttons below it never
                depended on the fetch. Only its children differ, and both arms
                are `.map()` calls over the same container rather than two
                different trees. */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isLoading
                ? [0, 1].map((i) => <ServiceCardPlaceholder key={i} />)
                : servicesArray.map((service) => {
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
                              {tCommon("all_countries")}
                            </div>
                            <div className="flex items-center">
                              <Languages className="h-4 w-4 mr-2" />
                              {t("all_languages")}
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
                              {`200+ ${tCommon('countries')}`}
                            </div>
                            <div className="flex items-center">
                              <Layers className="h-4 w-4 mr-2" />
                              {service.templates?.length || 0} templates
                            </div>
                            <div className="flex items-center">
                              <Shield className="h-4 w-4 mr-2" />
                              {t("requires_api_key")}
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
                    {selectedService.name} {t("api_connection")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("this_service_requires_api_credentials_configured")}
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {connectionStatus === "error" && !missingEnvVars?.length && (
                    <Alert className="bg-destructive/10 dark:bg-destructive/30 border-destructive">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <AlertTitle className="text-destructive">{tCommon("connection_failed")}</AlertTitle>
                      <AlertDescription className="text-destructive">{connectionError}</AlertDescription>
                    </Alert>
                  )}

                  {connectionStatus === "success" && (
                    <Alert className="bg-success/10 dark:bg-success/20 border-success/30">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <AlertTitle className="text-success-ink">{t("connection_successful")}</AlertTitle>
                      <AlertDescription className="text-success-ink">
                        {t("api_credentials_verified_successfully")}
                      </AlertDescription>
                    </Alert>
                  )}

                  {missingEnvVars && missingEnvVars.length > 0 && (
                    <div className="space-y-4">
                      <Alert className="bg-warning/10 border-warning/30">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <AlertTitle className="text-foreground">{t("missing_environment_variables")}</AlertTitle>
                        <AlertDescription className="text-warning">
                          {t("the_following_environment_variables_are_required")}:
                        </AlertDescription>
                      </Alert>

                      <div className="bg-warning/10 dark:bg-warning/20 p-4 rounded-lg border border-warning/30">
                        <h4 className="font-semibold text-foreground mb-3">
                          {t("required_variables_1")}:
                        </h4>
                        <ul className="space-y-2">
                          {missingEnvVars.map((envVar) => (
                            <li key={envVar} className="flex items-center gap-2">
                              <span className="text-warning-ink">•</span>
                              <code className="bg-warning/15 text-foreground px-2 py-1 rounded font-mono text-sm">
                                {envVar}
                              </code>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-primary/10 dark:bg-primary/30 p-4 rounded-lg border border-primary/30">
                        <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                          <Info className="h-4 w-4 text-primary" />
                          {t("how_to_configure_1")}:
                        </h4>
                        <ol className="space-y-2 list-decimal pl-5 text-sm text-primary">
                          <li>
                            {tCommon("edit_your")}{" "}
                            <code className="bg-primary/15 dark:bg-primary/40 text-primary-ink px-2 py-0.5 rounded font-mono">
                              .env
                            </code>{" "}
                            file
                          </li>
                          <li>{t("add_the_variables_with_their_values")}</li>
                          <li>{t("restart_your_server")}</li>
                        </ol>
                        <div className="mt-3 bg-primary/15 p-3 rounded-md">
                          <p className="text-xs font-medium mb-1">{tCommon("example")}:</p>
                          <pre className="text-xs overflow-x-auto p-2 bg-surface-3 text-foreground border border-border rounded">
                            {selectedService.type === "SUMSUB" ||
                            selectedService.id.startsWith("sumsub")
                              ? t("sumsub_api_key_your_sumsub_key")
                              : t("gemini_api_key_your_gemini_key")}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {isGeminiService && (
                    <Alert className="bg-primary/10 dark:bg-primary/20 border-primary/30">
                      <BrainCircuit className="h-4 w-4 text-primary" />
                      <AlertTitle className="text-primary-ink">{t("gemini_ai_verification")}</AlertTitle>
                      <AlertDescription className="text-primary-ink">
                        {t("gemini_requires_an_api_key_to")} {t("ensure_your_kyc_form_includes_document")}
                      </AlertDescription>
                    </Alert>
                  )}

                  {isDeepSeekService && (
                    <Alert className="bg-primary/10 dark:bg-primary/20 border-primary/30">
                      <BrainCircuit className="h-4 w-4 text-primary" />
                      <AlertTitle className="text-primary-ink">{t("deepseek_ai_verification")}</AlertTitle>
                      <AlertDescription className="text-primary-ink">
                        {t("deepseek_provides_advanced_ai_powered_document")}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Alert className="bg-muted dark:bg-muted/50 border-border">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <AlertTitle className="text-foreground">{t("where_to_get_credentials")}</AlertTitle>
                    <AlertDescription className="text-muted-foreground">
                      <p className="mb-3">
                        {t("obtain_your_api_credentials_from_your")}{" "}
                        <span className="font-semibold">{selectedService.name}</span> {tCommon("dashboard")}
                      </p>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
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
                        {tCommon("view_docs")} <ExternalLink className="ml-1 h-3 w-3" />
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
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Checking
                      </>
                    ) : connectionStatus === "success" ? (
                      <>
                        <Check className="mr-1 h-4 w-4" /> Connected
                      </>
                    ) : (
                      t("check_connection")
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
                    <Alert className="mt-4 bg-warning/10 border-warning/30">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <AlertTitle className="text-foreground">{t("document_requirement")}</AlertTitle>
                      <AlertDescription className="text-warning">
                        {t("gemini_requires_document_images_for_ai")} {t("ensure_your_form_includes_them_1")}
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
                          {t("dynamic_ai_verification")}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {t("gemini_adapts_to_your_form_structure_1")} {t("include_document_images_for_verification_1")}
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
                      t("continue_with_dynamic_verification")
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
                    {t("template_fields")}
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
                                  <span className="ml-2 text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
                                    Required
                                  </span>
                                )}
                                {field.type === "FILE" && (
                                  <span className="ml-2 text-xs bg-primary/15 text-primary-ink px-2 py-0.5 rounded-full">
                                    Document
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {tCommon("type")}: {field.type}
                              </div>
                            </div>
                            <Badge
                              variant={field.required ? "default" : "outline"}
                              className="ml-2 shrink-0"
                            >
                              {field.required ? tCommon("required") : tCommon("optional")}
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
                        {t("required_documents")}
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
                  <Alert className="mt-6 bg-primary/10 dark:bg-primary/20 border-primary/30">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary-ink">{t("ai_powered_verification")}</AlertTitle>
                    <AlertDescription className="text-primary-ink">
                      {t("gemini_ai_will_verify_document_images")}
                    </AlertDescription>
                  </Alert>
                )}

                <Alert className="mt-6 bg-warning/10 border-warning/30">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertTitle className="text-foreground">Important</AlertTitle>
                  <AlertDescription className="text-warning">
                    {t("confirming_will_add_mapped_to")} {selectedService?.name}.
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
                    {t("dynamic_ai_verification")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("gemini_adapts_to_your_custom_form")}
                  </p>
                </div>

                <div className="border rounded-lg p-6">
                  <div className="flex items-start mb-6">
                    <BrainCircuit className="h-6 w-6 mr-3 text-primary mt-1" />
                    <div>
                      <h4 className="text-lg font-medium mb-2">
                        {t("how_gemini_works")}
                      </h4>
                      <p className="text-muted-foreground mb-4">
                        {t("gemini_uses_ai_to_verify_documents")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-start">
                      <div className="bg-primary/10 rounded-full p-2 mr-3">
                        <FileImage className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h5 className="font-medium">{t("document_analysis")}</h5>
                        <p className="text-sm text-muted-foreground">
                          {t("extracts_and_verifies_data_from_ids_and_passports_1")}
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
                          {t("supports_documents_in_any_language_1")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-primary/10 rounded-full p-2 mr-3">
                        <AlertTriangle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h5 className="font-medium">{t("fraud_detection")}</h5>
                        <p className="text-sm text-muted-foreground">
                          {t("identifies_tampered_or_fake_documents_1")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Alert className="mb-6 bg-warning/10 border-warning/30">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertTitle className="text-foreground">{t("document_requirement")}</AlertTitle>
                    <AlertDescription className="text-warning">
                      {t("include_at_least_one_document_image")}
                    </AlertDescription>
                  </Alert>

                  <div className="bg-primary/10 dark:bg-primary/30 p-4 rounded-md border border-primary">
                    <h4 className="font-medium text-primary mb-2">
                      {t("recommended_fields_1")}:
                    </h4>
                    <ul className="space-y-2 list-disc pl-5 text-sm text-primary">
                      <li>
                        <strong>{t("id_front")}</strong> {`(${tCommon("required")})`}
                      </li>
                      <li>
                        <strong>{t("id_back")}</strong> {`(${tCommon("recommended")})`}
                      </li>
                      <li>
                        <strong>Selfie</strong> {`(${tCommon("recommended")})`}
                      </li>
                      <li>
                        <strong>{tCommon("personal_info")}</strong> {`(${t("e_g_name_dob")})`}
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
                    {t("continue_with_dynamic_verification")}{" "}
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
