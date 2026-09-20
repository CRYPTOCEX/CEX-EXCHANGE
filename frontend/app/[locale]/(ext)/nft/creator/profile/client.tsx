"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { 
  User, 
  Camera, 
  Save,
  Crown,
  Star,
  Award,
  Verified,
  Shield,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { $fetch } from "@/lib/api";
import { imageUploader } from "@/utils/upload";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Loadable } from "@/components/ui/skeleton";
import { AuthModal } from "@/components/auth/auth-modal";

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters").optional(),
  bio: z.string().max(1000, "Bio must be less than 1000 characters").optional(),
  profilePublic: z.boolean().default(true),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function CreatorProfileClient() {
  const tCommon = useTranslations("common");
  const t = useTranslations("ext");
  const router = useRouter();
  const { user } = useUserStore();
  
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [bannerImageUploading, setBannerImageUploading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const form = useForm<z.input<typeof profileSchema>, any, z.output<typeof profileSchema>>({
    // @ts-ignore - Complex Zod type inference causing build issues
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      profilePublic: true,
    },
  });

  const fetchCreatorProfile = useCallback(async () => {
    setLoading(true);

    const { data, error } = await $fetch({
      url: "/api/nft/creator/profile",
      method: "GET",
      silent: true,
    });

    if (!error && data) {
      setCreator(data);
      setBannerImageUrl(data.banner || "");

      form.reset({
        displayName: data.displayName || "",
        bio: data.bio || "",
        profilePublic: data.profilePublic ?? true,
      });
    } else if (error && error.includes("404")) {
      // Profile doesn't exist yet, that's okay - user can create it by filling the form
      setCreator(null);
      form.reset({
        displayName: "",
        bio: "",
        profilePublic: true,
      });
    }

    setLoading(false);
  }, [form]);

  useEffect(() => {
    if (user) {
      fetchCreatorProfile();
    } else {
      setLoading(false);
    }
  }, [user, fetchCreatorProfile]);

  const handleBannerImageUpload = async (file: File) => {
    setBannerImageUploading(true);
    
    const result = await imageUploader({
      file,
      dir: "creators/banners",
      size: { maxWidth: 1200, maxHeight: 400 },
      oldPath: bannerImageUrl,
    });

    if (result.success) {
      setBannerImageUrl(result.url);
    }
    
    setBannerImageUploading(false);
  };

  const onSubmit = async (data: ProfileForm) => {
    setSaving(true);

    const isCreating = !creator;

    const { data: updatedCreator, error } = await $fetch({
      url: "/api/nft/creator/profile",
      method: "PUT",
      body: {
        ...data,
        banner: bannerImageUrl,
      },
      successMessage: isCreating ? t("creator_profile_created_successfully") : t("profile_updated_successfully"),
    });

    if (!error) {
      setCreator(updatedCreator);
    }

    setSaving(false);
  };

  const getVerificationBadge = (tier: string) => {
    switch (tier) {
      case "GOLD":
        return (
          <Badge className="bg-warning text-warning-foreground">
            <Crown className="h-3 w-3 mr-1" />
            {t("gold_creator")}
          </Badge>
        );
      case "SILVER":
        return (
          <Badge className="bg-muted text-foreground">
            <Star className="h-3 w-3 mr-1" />
            {t("silver_creator")}
          </Badge>
        );
      case "BRONZE":
        return (
          <Badge className="bg-warning text-warning-foreground">
            <Award className="h-3 w-3 mr-1" />
            {t("bronze_creator")}
          </Badge>
        );
      case "PLATINUM":
        return (
          <Badge className={`bg-primary text-primary-foreground`}>
            <Verified className="h-3 w-3 mr-1" />
            {t("platinum_creator")}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Shield className="h-3 w-3 mr-1" />
            Unverified
          </Badge>
        );
    }
  };

  /*
    THE SPINNER THAT USED TO BE HERE
    ================================
    `if (loading) return <div className="min-h-screen"><LoadingSpinner/></div>`
    replaced this whole settings page — a 260px hero, a stats card, three form
    cards and a button row, well over 1500px — with a 40px spinner while ONE
    GET resolved. Not one pixel of that is data-dependent: the headings, the
    field labels, the descriptions, the banner dropzone and the buttons are all
    literals in this file, and the form's inputs are fixed-height regardless of
    what `form.reset()` puts in them. The page renders; the figures wait.

    `!loading && !user` for the same reason as the creator dashboard: `user` is
    filled in by an effect in the root provider, so it is null on the first
    client render even when signed in, and the spinner was what hid that gap.
  */
  /** Auth RESOLVED and nobody is signed in — a login problem, not a wait. */
  const mustSignIn = !loading && !user;

  if (mustSignIn) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto pt-32 pb-12 px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">{t("creator_profile_settings")}</h1>
          <p className="text-muted-foreground mb-6">
            {t("please_sign_in_to_access_creator_profile_settings")}
          </p>
          <Button onClick={() => setIsAuthModalOpen(true)}>
            {tCommon("sign_in")}
          </Button>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            initialView="login"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header Section */}
      <section className={`relative pt-20 pb-12 overflow-hidden bg-linear-to-b from-primary/5 via-primary/5 to-background border-b`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className={`text-3xl lg:text-4xl font-bold mb-2 bg-linear-to-r from-foreground via-primary to-primary bg-clip-text text-transparent`}>
                {t("creator_profile_settings")}
              </h1>
              <p className="text-muted-foreground">
                {t("customize_your_creator_profile_and_showcase")}
              </p>
            </div>
            <Link href="/nft/creator">
              <Button variant="outline" className="border-2">
                <ExternalLink className="h-4 w-4 mr-2" />
                {tCommon("view_dashboard")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-4xl">

        {/*
          Creator Stats Display.

          `{creator && …}` alone meant this 136px card was absent for the whole
          pending window and then pushed the entire form — every card below it,
          about 1200px of it — down by 136px + the 32px margin the moment the
          profile landed. `creator` is null while loading for the same reason it
          is null for a first-time creator, and those are not the same fact.

          It renders while loading with its figures pending, and only collapses
          if the profile genuinely does not exist yet. That is the right way
          round: anyone who arrives here from "Edit Profile" has one.
        */}
        {(loading || creator) && (
          <Card className="mb-8">
            <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.avatar || undefined} />
                  <AvatarFallback className="text-lg">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">
                    {/* `creator?.` now that this card also renders in the
                        pending state. The fallback is the signed-in user's own
                        name, which the store already holds, so there is real
                        text here in both states. */}
                    {creator?.displayName || `${user?.firstName} ${user?.lastName}`}
                  </h2>
                  <p className="text-muted-foreground">{t("creator_profile")}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {creator?.isVerified && getVerificationBadge(creator.verificationTier)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="grid grid-cols-3 gap-4 text-center">
                  {/* The three labels are static and the figures are not, so
                      only the figures get a placeholder — inside the same
                      `text-2xl leading-tight font-mono tabular-nums` element,
                      which is what makes the box exactly 30px in both states
                      rather than the 32px a hand-written `h-8` would give. */}
                  <div>
                    <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                      <Loadable loading={loading} placeholder="12">{creator?.totalCollections || 0}</Loadable>
                    </p>
                    <p className="mt-1 text-[11px] text-subtle-foreground">Collections</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                      <Loadable loading={loading} placeholder="12">{creator?.totalItems || 0}</Loadable>
                    </p>
                    <p className="mt-1 text-[11px] text-subtle-foreground">NFTs</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                      <Loadable loading={loading} placeholder="12">{creator?.totalSales || 0}</Loadable>
                    </p>
                    <p className="mt-1 text-[11px] text-subtle-foreground">Sales</p>
                  </div>
                </div>
              </div>
            </div>
            </CardContent>
          </Card>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Banner Image */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <Camera className="h-3.5 w-3.5" />
                  </span>
                  {t("banner_image")}
                </CardTitle>
              </CardHeader>
            <CardContent>
              <div className="relative w-full h-40 bg-muted rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25">
                {bannerImageUrl ? (
                  <Image
                    src={bannerImageUrl}
                    alt="Banner"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">{t("upload_banner_image")}</p>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleBannerImageUpload(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={bannerImageUploading}
                />
                {bannerImageUploading && (
                  <div className="absolute inset-0 bg-overlay/50 flex items-center justify-center">
                    <LoadingSpinner />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t("recommended_size_1200x400px_max_file_size_5mb")}
              </p>
            </CardContent>
          </Card>

            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  {t("profile_information")}
                </CardTitle>
              </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("display_name")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={`${user?.firstName} ${user?.lastName}`}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("this_is_how_your_name_will_appear_to_other_users")}
                    </FormDescription>
                    <FormMessage className="text-destructive" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`${t("tell_people_about_yourself_and_your_art")}…`}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("brief_description_about_you_and_your_work")}
                    </FormDescription>
                    <FormMessage className="text-destructive" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="profilePublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t("public_profile")}</FormLabel>
                      <FormDescription>
                        {t("make_your_creator_profile_visible_to_other_users")}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

            {/* Submit Button */}
            <div className="flex gap-4 justify-end">
              <Link href="/nft/creator">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              {/* `|| loading` is a CORRECTNESS fix, not a cosmetic one, and it
                  is a direct consequence of removing the page-level spinner
                  above. `form.reset(...)` only runs once the GET resolves, so
                  until then every field holds its empty default — and the page
                  is now interactive during that window. Submitting there would
                  PUT `{displayName:"", bio:"", profilePublic:true}` over a real
                  profile, and `isCreating = !creator` would additionally report
                  it as a creation. The form is visible while it loads; it is
                  just not submittable. */}
              <Button type="submit" disabled={saving || loading} className={`min-w-32 bg-primary hover:bg-primary text-primary-foreground`}>
                {saving ? (
                  <>
                    <LoadingSpinner />
                    {tCommon("saving")}…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t("save_profile")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialView="login"
        />
      </div>
    </div>
  );
} 