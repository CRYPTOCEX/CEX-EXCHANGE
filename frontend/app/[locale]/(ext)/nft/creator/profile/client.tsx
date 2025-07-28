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
import { AuthModal } from "@/components/auth/auth-modal";

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters").optional(),
  bio: z.string().max(1000, "Bio must be less than 1000 characters").optional(),
  profilePublic: z.boolean().default(true),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function CreatorProfileClient() {
  const t = useTranslations("nft/creator/profile/edit");
  const router = useRouter();
  const { user } = useUserStore();
  
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [bannerImageUploading, setBannerImageUploading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const form = useForm<ProfileForm>({
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
    });

    if (!error && data) {
      setCreator(data);
      setBannerImageUrl(data.banner || "");
      
      form.reset({
        displayName: data.displayName || "",
        bio: data.bio || "",
        profilePublic: data.profilePublic ?? true,
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
    
    const { data: updatedCreator, error } = await $fetch({
      url: "/api/nft/creator/profile",
      method: "PUT",
      body: {
        ...data,
        banner: bannerImageUrl,
      },
      successMessage: "Profile updated successfully!",
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
          <Badge className="bg-yellow-500 text-white">
            <Crown className="h-3 w-3 mr-1" />
            Gold Creator
          </Badge>
        );
      case "SILVER":
        return (
          <Badge className="bg-gray-400 text-white">
            <Star className="h-3 w-3 mr-1" />
            Silver Creator
          </Badge>
        );
      case "BRONZE":
        return (
          <Badge className="bg-orange-600 text-white">
            <Award className="h-3 w-3 mr-1" />
            Bronze Creator
          </Badge>
        );
      case "PLATINUM":
        return (
          <Badge className="bg-purple-500 text-white">
            <Verified className="h-3 w-3 mr-1" />
            Platinum Creator
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

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Creator Profile Settings</h1>
        <p className="text-muted-foreground mb-6">
          Please sign in to access creator profile settings
        </p>
        <Button onClick={() => setIsAuthModalOpen(true)}>
          Sign In
        </Button>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialView="login"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Creator Profile Settings</h1>
            <p className="text-muted-foreground">
              Customize your creator profile and showcase your work
            </p>
          </div>
          <Link href={`/nft/creator/${user?.id}`}>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Creator Stats Display */}
      {creator && (
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
                    {creator.displayName || `${user?.firstName} ${user?.lastName}`}
                  </h2>
                  <p className="text-muted-foreground">Creator Profile</p>
                  <div className="flex items-center gap-2 mt-1">
                    {creator.isVerified && getVerificationBadge(creator.verificationTier)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{creator.totalCollections || 0}</p>
                    <p className="text-xs text-muted-foreground">Collections</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{creator.totalItems || 0}</p>
                    <p className="text-xs text-muted-foreground">NFTs</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{creator.totalSales || 0}</p>
                    <p className="text-xs text-muted-foreground">Sales</p>
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
                <Camera className="h-5 w-5" />
                Banner Image
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
                      <p className="text-sm text-muted-foreground">Upload banner image</p>
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
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <LoadingSpinner />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Recommended size: 1200x400px, Max file size: 5MB
              </p>
            </CardContent>
          </Card>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={`${user?.firstName} ${user?.lastName}`}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This is how your name will appear to other users
                    </FormDescription>
                    <FormMessage />
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
                        placeholder="Tell people about yourself and your art..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Brief description about you and your work
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="profilePublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Public Profile</FormLabel>
                      <FormDescription>
                        Make your creator profile visible to other users
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
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="min-w-32">
              {saving ? (
                <>
                  <LoadingSpinner />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
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
  );
} 