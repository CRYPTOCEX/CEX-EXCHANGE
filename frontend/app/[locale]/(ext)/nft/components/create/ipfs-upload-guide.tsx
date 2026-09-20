"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Globe,
  CheckCircle2,
  ExternalLink,
  Upload,
  FileText,
  Copy,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Shield,
  Zap,
  UserPlus,
  CreditCard,
  FolderUp,
  Link2
} from "lucide-react";
import { useTranslations } from "next-intl";

interface IPFSUploadGuideProps {
  onComplete?: () => void;
}

export function IPFSUploadGuide({ onComplete }: IPFSUploadGuideProps) {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const [activeProvider, setActiveProvider] = useState<'pinata' | 'nft-storage' | 'web3-storage'>('pinata');
  const [currentStep, setCurrentStep] = useState(1);

  const providers = [
    {
      id: 'pinata' as const,
      name: 'Pinata',
      url: 'https://pinata.cloud',
      free: '1GB Free',
      difficulty: 'Easiest',
      recommended: true,
      color: 'purple'
    },
    {
      id: 'nft-storage' as const,
      name: 'NFT.Storage',
      url: 'https://nft.storage',
      free: 'Unlimited',
      difficulty: 'Easy',
      recommended: false,
      color: 'blue'
    },
    {
      id: 'web3-storage' as const,
      name: 'Web3.Storage',
      url: 'https://web3.storage',
      free: 'Unlimited',
      difficulty: 'Easy',
      recommended: false,
      color: 'green'
    }
  ];

  const pinataSteps = [
    {
      step: 1,
      title: t("create_pinata_account"),
      icon: UserPlus,
      description: t("sign_up_for_a_free_pinata_account"),
      details: [
        "Go to Pinata signup page",
        "Sign up with email or GitHub",
        "Verify your email address",
        "You'll be redirected to your dashboard"
      ],
      url: "https://app.pinata.cloud/auth/signup"
    },
    {
      step: 2,
      title: t("choose_free_plan"),
      icon: CreditCard,
      description: t("select_the_free_tier_1gb_storage"),
      details: [
        "On the dashboard, you're automatically on the free plan",
        "Free plan includes: 1GB storage, 100K requests/month",
        "No credit card required",
        "Perfect for individual NFT creators"
      ]
    },
    {
      step: 3,
      title: t("upload_your_image"),
      icon: FolderUp,
      description: t("upload_your_nft_artwork_to_ipfs"),
      details: [
        "Go to Files page: https://app.pinata.cloud/ipfs/files",
        "Click the 'Add' button (or '+ Add Files')",
        "Select 'File' to upload from your computer",
        "Choose your image file (PNG, JPG, GIF, MP4, etc.)",
        "Wait for upload to complete",
        "You'll see your file appear in the files table"
      ],
      url: "https://app.pinata.cloud/ipfs/files"
    },
    {
      step: 4,
      title: t("copy_the_url"),
      icon: Link2,
      description: t("get_your_images_ipfs_gateway_url"),
      details: [
        "After uploading, find your file in the Files table",
        "Click on your file name to view it",
        "Copy the full URL from your browser address bar",
        "It looks like: https://[your-gateway].mypinata.cloud/ipfs/bafybei...",
        "That's it! You'll paste this URL in the next step"
      ],
      example: {
        gatewayUrl: "https://turquoise-above-baboon-616.mypinata.cloud/ipfs/bafybeihr3d2iy36os2fk6e5d4av5yqcu2tkbiqlua6afsxrtdzlbbxxxqq"
      }
    },
    {
      step: 5,
      title: t("done_ready_to_continue"),
      icon: CheckCircle2,
      description: t("your_image_is_uploaded_to_ipfs_successfully"),
      details: [
        "Great! You've successfully uploaded your image to IPFS",
        "Your image URL looks like: https://[your-gateway].mypinata.cloud/ipfs/bafybei...",
        "Click 'I've Uploaded to IPFS' button below to continue",
        "In the next step, you'll paste your IPFS URL",
        "We'll validate it and show you a preview",
        "Then you can optionally use our Metadata Generator tool"
      ]
    }
  ];

  const nftStorageSteps = [
    {
      step: 1,
      title: t("create_nft_storage_account"),
      icon: UserPlus,
      description: t("sign_up_for_free_unlimited_storage"),
      details: [
        "Go to nft.storage and click 'Sign Up'",
        "Sign up with email or GitHub",
        "Verify your email",
        "Get your API key from dashboard"
      ],
      url: "https://nft.storage"
    },
    {
      step: 2,
      title: t("upload_via_dashboard"),
      icon: Upload,
      description: t("use_the_web_interface_to_upload"),
      details: [
        "Click 'Files' in the navigation",
        "Click 'Upload' button",
        "Select your NFT image",
        "NFT.Storage automatically pins to IPFS",
        "Copy the CID from the file list"
      ]
    },
    {
      step: 3,
      title: t("get_ipfs_url"),
      icon: Link2,
      description: t("copy_your_ipfs_link"),
      details: [
        "Find your file in the Files list",
        "Copy the CID (Content Identifier)",
        "Use format: ipfs://YOUR_CID",
        "Or use: https://nftstorage.link/ipfs/YOUR_CID"
      ]
    }
  ];

  const currentSteps = activeProvider === 'pinata' ? pinataSteps : nftStorageSteps;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
          <Globe className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-semibold text-primary">{t("decentralized_storage_required")}</span>
        </div>
        <h2 className="text-3xl font-bold">{t("upload_your_nft_to_ipfs")}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t("for_true_blockchain_nfts_your_artwork")}
        </p>
      </div>

      {/* Why IPFS? */}
      <Alert className="border-primary/50 bg-primary/5">
        <Sparkles className="h-4 w-4 text-primary" />
        <AlertDescription>
          <strong className="text-primary">{t("why_ipfs")}</strong> {t("your_nft_needs_permanent_decentralized_storage")}
        </AlertDescription>
      </Alert>

      {/* Provider Selection */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>{t("step_1_choose_your_ipfs_provider")}</CardTitle>
          <CardDescription>
            {t("all_providers_are_free_to_start")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeProvider} onValueChange={(v) => setActiveProvider(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {providers.map((provider) => (
                <TabsTrigger key={provider.id} value={provider.id} className="relative">
                  {provider.name}
                  {provider.recommended && (
                    <Badge className="absolute -top-2 -right-2 text-xs" variant="default">
                      Best
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {providers.map((provider) => (
              <TabsContent key={provider.id} value={provider.id} className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <Shield className="h-8 w-8 text-success" />
                    <div>
                      <p className="font-semibold">{provider.free}</p>
                      <p className="text-xs text-muted-foreground">{t("free_tier")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <Zap className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-semibold">{provider.difficulty}</p>
                      <p className="text-xs text-muted-foreground">Difficulty</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <CheckCircle2 className={`h-8 w-8 text-primary`} />
                    <div>
                      <p className="font-semibold">Trusted</p>
                      <p className="text-xs text-muted-foreground">{t("industry_standard")}</p>
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => window.open(provider.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open {provider.name}
                </Button>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Step-by-Step Guide */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>{t("step_2_follow_the_guide")}</CardTitle>
          <CardDescription>
            Complete these steps on {activeProvider === 'pinata' ? t("pinata") : activeProvider === 'nft-storage' ? t("nft_storage") : t("web3_storage")} to upload your NFT
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {currentSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.step;
              const isCompleted = currentStep > step.step;

              return (
                <div
                  key={step.step}
                  className={`relative pl-8 pb-8 ${index < currentSteps.length - 1 ? 'border-l-2' : ''} ${
                    isActive ? 'border-primary' : 'border-muted'
                  }`}
                >
                  {/* Step indicator */}
                  <div
                    className={`absolute left-0 -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-success text-success-foreground'
                        : isActive
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                  </div>

                  {/* Content */}
                  <div className={`ml-6 ${isActive ? 'scale-105' : ''} transition-all`}>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold">
                        {step.step}. {step.title}
                      </h3>
                      {isCompleted && (
                        <Badge variant="default" className="bg-success">
                          Done
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{step.description}</p>

                    {isActive && (
                      <div className="space-y-3">
                        <ul className="space-y-2">
                          {step.details.map((detail, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <ChevronRight className={`h-4 w-4 text-primary mt-0.5 flex-shrink-0`} />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>

                        {step.url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(step.url, '_blank')}
                            className="mt-3"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open {activeProvider === 'pinata' ? t("pinata") : tCommon("provider")}
                          </Button>
                        )}

                        {(step as any).example && (
                          <div className="mt-4 p-4 bg-muted rounded-lg">
                            <p className="text-xs font-semibold mb-2 flex items-center gap-2">
                              <Sparkles className="h-3 w-3" />
                              {t("example_url")}:
                            </p>
                            {(step as any).example.gatewayUrl && (
                              <div className={`flex items-center justify-between gap-2 p-3 bg-background rounded border-2 border-primary/20 dark:border-primary/20`}>
                                <span className="text-xs font-mono truncate">{(step as any).example.gatewayUrl}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 flex-shrink-0"
                                  onClick={() => navigator.clipboard.writeText((step as any).example.gatewayUrl!)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {(step as any).example.json && (
                              <pre className="text-xs overflow-x-auto p-3 bg-background rounded mt-2">
                                <code>{(step as any).example.json}</code>
                              </pre>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 mt-4">
                          {currentStep > 1 && (
                            <Button
                              variant="outline"
                              onClick={() => setCurrentStep(currentStep - 1)}
                            >
                              Previous
                            </Button>
                          )}
                          <Button
                            onClick={() => {
                              if (currentStep < currentSteps.length) {
                                setCurrentStep(currentStep + 1);
                              } else {
                                onComplete?.();
                              }
                            }}
                            className="flex-1"
                          >
                            {currentStep < currentSteps.length ? tCommon("next_step") : t("ive_uploaded_to_ipfs")}
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
