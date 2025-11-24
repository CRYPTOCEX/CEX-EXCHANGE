"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Clipboard,
  Copy,
  Facebook,
  LinkIcon,
  Linkedin,
  Mail,
  QrCode,
  Twitter,
  PhoneIcon as WhatsApp,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function ReferralGeneratorClient() {
  const t = useTranslations("ext");
  const [baseLink, setBaseLink] = useState(
    "https://yourplatform.com/ref/user123"
  );
  const [customParam, setCustomParam] = useState("");
  const [campaign, setCampaign] = useState("");
  const [source, setSource] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");

  // QR code states
  const [qrSize, setQrSize] = useState("200");
  const [qrColor, setQrColor] = useState("#000000");
  const [qrLogo, setQrLogo] = useState(true);

  const generateLink = () => {
    let link = baseLink;

    if (campaign) {
      link += `${link.includes("?") ? "&" : "?"}campaign=${encodeURIComponent(campaign)}`;
    }

    if (source) {
      link += `${link.includes("?") ? "&" : "?"}source=${encodeURIComponent(source)}`;
    }

    if (customParam) {
      link += `${link.includes("?") ? "&" : "?"}custom=${encodeURIComponent(customParam)}`;
    }

    setGeneratedLink(link);
    toast.success("Referral link generated successfully!");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink || baseLink);
    toast.success("Link copied to clipboard!");
  };

  // Generate QR code URL (in real app, this would be a real QR code generator)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(generatedLink || baseLink)}&color=${qrColor.substring(1)}`;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">
        {t("referral_link_generator")}
      </h1>

      <Tabs defaultValue="generator" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="generator">{t("Generator")}</TabsTrigger>
          <TabsTrigger value="qrcode">{t("qr_code")}</TabsTrigger>
          <TabsTrigger value="share">{t("Share")}</TabsTrigger>
        </TabsList>

        <TabsContent value="generator">
          <Card>
            <CardHeader>
              <CardTitle>{t("generate_custom_referral_link")}</CardTitle>
              <CardDescription>
                {t("create_a_tailored_your_conversions")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baseLink">{t("your_base_referral_link")}</Label>
                <Input
                  id="baseLink"
                  value={baseLink}
                  readOnly
                  className="bg-muted/50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign">
                    {t("campaign_name_(optional)")}
                  </Label>
                  <Input
                    id="campaign"
                    placeholder="summer_promo"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("add_a_campaign_promotional_efforts")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source">
                    {t("traffic_source_(optional)")}
                  </Label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger id="source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("None")}</SelectItem>
                      <SelectItem value="social">
                        {t("social_media")}
                      </SelectItem>
                      <SelectItem value="email">{t("Email")}</SelectItem>
                      <SelectItem value="blog">{t("Blog")}</SelectItem>
                      <SelectItem value="ad">{t("Advertisement")}</SelectItem>
                      <SelectItem value="direct">{t("Direct")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("identify_where_your_traffic_is_coming_from")}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customParam">
                  {t("custom_parameter_(optional)")}
                </Label>
                <Input
                  id="customParam"
                  placeholder="Any custom tracking value"
                  value={customParam}
                  onChange={(e) => setCustomParam(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("add_any_custom_this_link")}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setCustomParam("");
                  setCampaign("");
                  setSource("");
                  setGeneratedLink("");
                }}
              >
                {t("Reset")}
              </Button>
              <Button type="button" onClick={generateLink}>
                {t("generate_link")}
              </Button>
            </CardFooter>
          </Card>

          {generatedLink && (
            <Card className="mt-4 bg-muted/30">
              <CardHeader>
                <CardTitle>{t("your_generated_link")}</CardTitle>
                <CardDescription>
                  {t("use_this_link_for_your_marketing_campaigns")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-background border rounded-lg p-3 flex items-center justify-between">
                  <code className="text-sm font-mono break-all">
                    {generatedLink}
                  </code>
                  <Button variant="ghost" size="icon" onClick={copyLink}>
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy link</span>
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <div className="text-sm text-muted-foreground">
                  {t("your_referral_id_this_link")}.
                </div>
              </CardFooter>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="qrcode">
          <Card>
            <CardHeader>
              <CardTitle>{t("qr_code_generator")}</CardTitle>
              <CardDescription>
                {t("create_a_qr_code_for_your_referral_link")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="qrSize">{t("qr_code_size")}</Label>
                    <Select value={qrSize} onValueChange={setQrSize}>
                      <SelectTrigger id="qrSize">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">
                          {t("small_(100x100)")}
                        </SelectItem>
                        <SelectItem value="200">
                          {t("medium_(200x200)")}
                        </SelectItem>
                        <SelectItem value="300">
                          {t("large_(300x300)")}
                        </SelectItem>
                        <SelectItem value="400">
                          {t("extra_large_(400x400)")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qrColor">{t("qr_code_color")}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="qrColor"
                        value={qrColor}
                        onChange={(e) => setQrColor(e.target.value)}
                        className="w-12 h-8 p-1"
                      />
                      <Input
                        type="text"
                        value={qrColor}
                        onChange={(e) => setQrColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="qrLogo"
                      checked={qrLogo}
                      onCheckedChange={setQrLogo}
                    />
                    <Label htmlFor="qrLogo">{t("include_company_logo")}</Label>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => toast.success("QR code downloaded!")}
                  >
                    {t("download_qr_code")}
                  </Button>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="border rounded-lg p-4 bg-white">
                    <img
                      src={qrCodeUrl || "/placeholder.svg"}
                      alt="QR Code for your referral link"
                      className="mx-auto"
                    />
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    {t("scan_to_open_your_referral_link")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share">
          <Card>
            <CardHeader>
              <CardTitle>{t("share_your_referral_link")}</CardTitle>
              <CardDescription>
                {t("share_your_link_across_various_platforms")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-background border rounded-lg p-3 flex items-center justify-between">
                  <code className="text-sm font-mono break-all">
                    {generatedLink || baseLink}
                  </code>
                  <Button variant="ghost" size="icon" onClick={copyLink}>
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy link</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4"
                  >
                    <Twitter className="h-6 w-6 mb-2 text-[#1DA1F2]" />
                    <span>Twitter</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4"
                  >
                    <Facebook className="h-6 w-6 mb-2 text-[#1877F2]" />
                    <span>{t("Facebook")}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4"
                  >
                    <WhatsApp className="h-6 w-6 mb-2 text-[#25D366]" />
                    <span>{t("WhatsApp")}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4"
                  >
                    <Linkedin className="h-6 w-6 mb-2 text-[#0077B5]" />
                    <span>{t("LinkedIn")}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4"
                  >
                    <Mail className="h-6 w-6 mb-2 text-primary" />
                    <span>{t("Email")}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4"
                  >
                    <LinkIcon className="h-6 w-6 mb-2 text-primary" />
                    <span>{t("copy_link")}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4"
                  >
                    <QrCode className="h-6 w-6 mb-2 text-primary" />
                    <span>{t("qr_code")}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4"
                  >
                    <Clipboard className="h-6 w-6 mb-2 text-primary" />
                    <span>{t("copy_html")}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-sm text-muted-foreground">
                {t("pro_tip_for_your_link")}.
              </div>
            </CardFooter>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t("suggested_messages")}</CardTitle>
              <CardDescription>
                {t("copy_these_templates_link_effectively")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">{t("social_media_post")}</h3>
                <div className="bg-muted p-3 rounded-md text-sm">
                  {t("ive_been_using_get_rewards")}
                  {generatedLink || baseLink}
                  {t("#affiliate_#rewards")}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `I've been using this amazing platform and thought you might be interested too! Sign up using my referral link and we both get rewards: ${generatedLink || baseLink} #affiliate #rewards`
                    );
                    toast.success("Social media message copied!");
                  }}
                >
                  {t("copy_message")}
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">{t("email_template")}</h3>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p>{t("hi_there")}</p>
                  <p className="my-2">
                    {t("i_wanted_to_been_using")}.{" "}
                    {t("they_offer_great_them_too")}.
                  </p>
                  <p className="my-2">{t("if_you_sign_reward_too")}</p>
                  <p className="my-2">{generatedLink || baseLink}</p>
                  <p>{t("let_me_know_if_you_have_any_questions")}</p>
                  <p className="mt-2">{t("best_regards")}</p>
                  <p>{t("your_name")}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Hi there,\n\nI wanted to introduce you to this platform I've been using. They offer great services and I thought you might benefit from them too.\n\nIf you sign up using my referral link below, you'll get special benefits and I'll receive a small reward too:\n\n${generatedLink || baseLink}\n\nLet me know if you have any questions!\n\nBest regards,\n[Your Name]`
                    );
                    toast.success("Email template copied!");
                  }}
                >
                  {t("copy_email")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
