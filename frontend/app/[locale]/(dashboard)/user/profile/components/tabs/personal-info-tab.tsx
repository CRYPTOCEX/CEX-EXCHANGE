"use client";

import type React from "react";

import { useState, useRef } from "react";
import {
  Edit,
  Calendar,
  MapPin,
  User,
  Mail,
  Phone,
  Save,
  Camera,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user";
import { imageUploader } from "@/utils/upload";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function PersonalInfoTab() {
  const t = useTranslations("dashboard");
  // Update the imports to include the updateUser function
  const { user, updateUser, updateAvatar } = useUserStore();
  const { toast } = useToast();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("basic");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editedProfile, setEditedProfile] = useState(() => {
    // Try to parse the profile if it's a string
    let parsedProfile = {
      bio: "",
      location: {
        address: "",
        city: "",
        country: "",
        zip: "",
      },
      social: {
        twitter: "",
        dribbble: "",
        instagram: "",
        github: "",
        gitlab: "",
        telegram: "",
      },
    };

    try {
      if (typeof user?.profile === "string" && user.profile) {
        const parsed = JSON.parse(user.profile);
        parsedProfile = {
          bio: parsed.bio || "",
          location: {
            address: parsed.location?.address || "",
            city: parsed.location?.city || "",
            country: parsed.location?.country || "",
            zip: parsed.location?.zip || "",
          },
          social: {
            twitter: parsed.social?.twitter || "",
            dribbble: parsed.social?.dribbble || "",
            instagram: parsed.social?.instagram || "",
            github: parsed.social?.github || "",
            gitlab: parsed.social?.gitlab || "",
            telegram: parsed.social?.telegram || "",
          },
        };
      } else if (typeof user?.profile === "object" && user?.profile) {
        parsedProfile = {
          bio: user.profile.bio || "",
          location: {
            address: user.profile.location?.address || "",
            city: user.profile.location?.city || "",
            country: user.profile.location?.country || "",
            zip: user.profile.location?.zip || "",
          },
          social: {
            twitter: user.profile.social?.twitter || "",
            dribbble: user.profile.social?.dribbble || "",
            instagram: user.profile.social?.instagram || "",
            github: user.profile.social?.github || "",
            gitlab: user.profile.social?.gitlab || "",
            telegram: user.profile.social?.telegram || "",
          },
        };
      }
    } catch (e) {
      console.error("Error parsing profile:", e);
    }

    return {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      twoFactor: user?.twoFactor?.enabled || false,
      avatar: null, // Set avatar to null by default
      profile: parsedProfile,
    };
  });

  const getInitials = (firstName?: string, lastName?: string) => {
    return (
      `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() ||
      "U"
    );
  };

  const formatDate = (dateString?: Date) => {
    if (!dateString) return "N/A";

    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (e) {
      return "Invalid date";
    }
  };

  const updateProfileField = (field: string, value: any) => {
    setEditedProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateNestedField = (parent: string, field: string, value: any) => {
    setEditedProfile((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [parent]: {
          ...prev.profile[parent],
          [field]: value,
        },
      },
    }));
  };

  // Handle avatar upload
  const handleAvatarUpload = async (file: File) => {
    if (!file) return;

    setIsUploadingAvatar(true);

    const result = await imageUploader({
      file,
      dir: "avatars",
      size: { maxWidth: 400, maxHeight: 400 },
      oldPath: user?.avatar || "",
    });

    if (result.success && result.url) {
      await updateAvatar(result.url);
    }

    setIsUploadingAvatar(false);
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAvatarUpload(file);
    }
  };

  // Replace the handleUpdateProfile function with this implementation
  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      // Format the data for the API according to the expected schema
      const apiData: Partial<User> = {
        firstName: editedProfile.firstName,
        lastName: editedProfile.lastName,
        phone: editedProfile.phone,
        profile: {
          bio: editedProfile.profile.bio,
          location: {
            address: editedProfile.profile.location.address,
            city: editedProfile.profile.location.city,
            country: editedProfile.profile.location.country,
            zip: editedProfile.profile.location.zip,
          },
          social: {
            twitter: editedProfile.profile.social.twitter,
            dribbble: editedProfile.profile.social.dribbble,
            instagram: editedProfile.profile.social.instagram,
            github: editedProfile.profile.social.github,
            gitlab: editedProfile.profile.social.gitlab,
            telegram: editedProfile.profile.social.telegram,
          },
        },
      };

      const success = await updateUser(apiData);

      if (success) {
        toast({
          title: "Profile Updated",
          description:
            "Your profile information has been updated successfully.",
        });
        setIsEditing(false);
      } else {
        toast({
          title: "Update Failed",
          description: "Failed to update profile. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Get KYC level from the user's kyc data
  const kycLevel = user?.kycLevel || 0;

  // Update the country extraction logic
  let country = "";
  try {
    if (typeof user?.profile === "string" && user?.profile) {
      const profileData = JSON.parse(user.profile);
      country = profileData.location?.country || "";
    } else if (typeof user?.profile === "object" && user?.profile) {
      country = user.profile.location?.country || "";
    }
  } catch (e) {
    // If profile is not valid JSON, use it as is or empty string
    country = typeof user?.profile === "string" ? user.profile : "";
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold dark:text-zinc-100">
            {t("personal_information")}
          </h2>
          <p className="text-muted-foreground dark:text-zinc-400">
            {t("manage_your_personal_account_preferences")}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="opacity-0 pointer-events-none"
        >
          <span className="sr-only">Help</span>
        </Button>
      </div>

      <Card className="bg-white dark:bg-zinc-900 border-0 dark:border-zinc-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-blue-50/50 dark:bg-zinc-800/50 border-b dark:border-zinc-700">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="dark:text-zinc-100">
                {t("profile_details")}
              </CardTitle>
              <CardDescription className="dark:text-zinc-400">
                {t("update_your_personal_contact_information")}
              </CardDescription>
            </div>
            <Button
              variant={isEditing ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={isUpdatingProfile}
            >
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? "Editing" : "Edit Profile"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <div className="w-full lg:w-1/3 flex flex-col items-center">
              <div className="relative group">
                {/* Hidden file input for avatar upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />

                {/* Avatar with hover effect */}
                <div
                  className="relative cursor-pointer"
                  onClick={triggerFileInput}
                >
                  <Avatar className="h-32 w-32 lg:h-40 lg:w-40 border-4 border-white shadow-md mb-4">
                    <AvatarImage
                      src={user?.avatar || "/img/avatars/placeholder.webp"}
                      alt={`${user?.firstName} ${user?.lastName}`}
                    />
                    <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
                      {getInitials(user?.firstName, user?.lastName)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Overlay for avatar upload */}
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    {isUploadingAvatar ? (
                      <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-white">
                        <Camera className="h-8 w-8 mb-1" />
                        <span className="text-xs font-medium">
                          {t("change_photo")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-center space-y-1 mb-4">
                <h3 className="text-xl font-semibold dark:text-zinc-100">{`${user?.firstName || ""} ${user?.lastName || ""}`}</h3>
                <p className="text-muted-foreground dark:text-zinc-400">
                  {user?.email}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                <Badge
                  variant="outline"
                  className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                >
                  <svg
                    className="h-3 w-3 mr-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 16V12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 8H12.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t("Level")}
                  {kycLevel}
                </Badge>
                {user?.emailVerified && (
                  <Badge
                    variant="outline"
                    className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                  >
                    <svg
                      className="h-3 w-3 mr-1"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20 6L9 17L4 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {t("email_verified")}
                  </Badge>
                )}
                {user?.phoneVerified && (
                  <Badge
                    variant="outline"
                    className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                  >
                    <svg
                      className="h-3 w-3 mr-1"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20 6L9 17L4 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {t("phone_verified")}
                  </Badge>
                )}
              </div>
              <div className="w-full space-y-3 px-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground dark:text-zinc-400">
                    {t("member_since")}
                  </span>
                  <span className="font-medium dark:text-zinc-200">
                    {formatDate(user?.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground dark:text-zinc-400">
                    {t("location")}
                  </span>
                  <span className="font-medium dark:text-zinc-200">
                    {country || "Not specified"}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-2/3 space-y-6">
              <Tabs
                defaultValue="basic"
                className="w-full"
                value={activeSubTab}
                onValueChange={setActiveSubTab}
              >
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="basic">{t("basic_info")}</TabsTrigger>
                  <TabsTrigger value="location">{t("Location")}</TabsTrigger>
                  <TabsTrigger value="social">{t("social_media")}</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="firstName"
                        className="flex items-center gap-2 dark:text-zinc-200"
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        {t("first_name")}
                      </Label>
                      <Input
                        id="firstName"
                        value={editedProfile.firstName}
                        onChange={(e) =>
                          updateProfileField("firstName", e.target.value)
                        }
                        disabled={!isEditing}
                        className={
                          !isEditing ? "bg-muted/50 dark:bg-zinc-800" : ""
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="lastName"
                        className="flex items-center gap-2 dark:text-zinc-200"
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        {t("last_name")}
                      </Label>
                      <Input
                        id="lastName"
                        value={editedProfile.lastName}
                        onChange={(e) =>
                          updateProfileField("lastName", e.target.value)
                        }
                        disabled={!isEditing}
                        className={
                          !isEditing ? "bg-muted/50 dark:bg-zinc-800" : ""
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="flex items-center gap-2 dark:text-zinc-200"
                      >
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {t("email_address")}
                      </Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          value={editedProfile.email}
                          disabled={true}
                          className="bg-muted/50 dark:bg-zinc-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="phone"
                        className="flex items-center gap-2 dark:text-zinc-200"
                      >
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {t("phone_number")}
                      </Label>
                      <div className="relative">
                        <Input
                          id="phone"
                          value={editedProfile.phone}
                          onChange={(e) =>
                            updateProfileField("phone", e.target.value)
                          }
                          disabled={!isEditing}
                          className={
                            !isEditing ? "bg-muted/50 dark:bg-zinc-800" : ""
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <Label
                        htmlFor="bio"
                        className="flex items-center gap-2 dark:text-zinc-200"
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        {t("Bio")}
                      </Label>
                      <Textarea
                        id="bio"
                        placeholder={
                          isEditing
                            ? "Tell us a little about yourself"
                            : "No bio provided yet"
                        }
                        className={`min-h-[120px] ${!isEditing ? "bg-muted/50 dark:bg-zinc-800" : ""}`}
                        value={editedProfile.profile.bio}
                        onChange={(e) =>
                          updateNestedField("bio", "", e.target.value)
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="location" className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <Label
                        htmlFor="address"
                        className="flex items-center gap-2 dark:text-zinc-200"
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {t("street_address")}
                      </Label>
                      <Input
                        id="address"
                        placeholder={
                          isEditing ? "123 Main St" : "No address provided"
                        }
                        value={editedProfile.profile.location.address}
                        onChange={(e) =>
                          updateNestedField(
                            "location",
                            "address",
                            e.target.value
                          )
                        }
                        disabled={!isEditing}
                        className={
                          !isEditing ? "bg-muted/50 dark:bg-zinc-800" : ""
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="city"
                        className="flex items-center gap-2 dark:text-zinc-200"
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {t("City")}
                      </Label>
                      <Input
                        id="city"
                        placeholder={
                          isEditing ? "New York" : "No city provided"
                        }
                        value={editedProfile.profile.location.city}
                        onChange={(e) =>
                          updateNestedField("location", "city", e.target.value)
                        }
                        disabled={!isEditing}
                        className={
                          !isEditing ? "bg-muted/50 dark:bg-zinc-800" : ""
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="zip"
                        className="flex items-center gap-2 dark:text-zinc-200"
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {t("zip_postal_code")}
                      </Label>
                      <Input
                        id="zip"
                        placeholder={
                          isEditing ? "10001" : "No zip code provided"
                        }
                        value={editedProfile.profile.location.zip}
                        onChange={(e) =>
                          updateNestedField("location", "zip", e.target.value)
                        }
                        disabled={!isEditing}
                        className={
                          !isEditing ? "bg-muted/50 dark:bg-zinc-800" : ""
                        }
                      />
                    </div>

                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <Label
                        htmlFor="country"
                        className="flex items-center gap-2 dark:text-zinc-200"
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {t("Country")}
                      </Label>
                      {isEditing ? (
                        <Select
                          value={editedProfile.profile.location.country}
                          onValueChange={(value) =>
                            updateNestedField("location", "country", value)
                          }
                          disabled={!isEditing}
                        >
                          <SelectTrigger id="country">
                            <SelectValue placeholder="Select a country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="United States">
                              {t("united_states")}
                            </SelectItem>
                            <SelectItem value="United Kingdom">
                              {t("united_kingdom")}
                            </SelectItem>
                            <SelectItem value="Canada">
                              {t("Canada")}
                            </SelectItem>
                            <SelectItem value="Australia">
                              {t("Australia")}
                            </SelectItem>
                            <SelectItem value="Germany">
                              {t("Germany")}
                            </SelectItem>
                            <SelectItem value="France">
                              {t("France")}
                            </SelectItem>
                            <SelectItem value="Japan">{t("Japan")}</SelectItem>
                            <SelectItem value="Singapore">
                              {t("Singapore")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={country}
                          disabled
                          className="bg-muted/50 dark:bg-zinc-800"
                        />
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="social" className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Social media fields - simplified for brevity */}
                    <div className="space-y-2">
                      <Label htmlFor="twitter" className="dark:text-zinc-200">
                        Twitter
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-zinc-400">
                          @
                        </span>
                        <Input
                          id="twitter"
                          className={`pl-8 ${!isEditing ? "bg-muted/50 dark:bg-zinc-800" : ""}`}
                          placeholder={
                            isEditing ? "username" : "No username provided"
                          }
                          value={editedProfile.profile.social.twitter}
                          onChange={(e) =>
                            updateNestedField(
                              "social",
                              "twitter",
                              e.target.value
                            )
                          }
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="github" className="dark:text-zinc-200">
                        {t("GitHub")}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-zinc-400">
                          @
                        </span>
                        <Input
                          id="github"
                          className={`pl-8 ${!isEditing ? "bg-muted/50 dark:bg-zinc-800" : ""}`}
                          placeholder={
                            isEditing ? "username" : "No username provided"
                          }
                          value={editedProfile.profile.social.github}
                          onChange={(e) =>
                            updateNestedField(
                              "social",
                              "github",
                              e.target.value
                            )
                          }
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instagram" className="dark:text-zinc-200">
                        Instagram
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-zinc-400">
                          @
                        </span>
                        <Input
                          id="instagram"
                          className={`pl-8 ${!isEditing ? "bg-muted/50 dark:bg-zinc-800" : ""}`}
                          placeholder={
                            isEditing ? "username" : "No username provided"
                          }
                          value={editedProfile.profile.social.instagram}
                          onChange={(e) =>
                            updateNestedField(
                              "social",
                              "instagram",
                              e.target.value
                            )
                          }
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dribbble" className="dark:text-zinc-200">
                        {t("Dribbble")}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-zinc-400">
                          @
                        </span>
                        <Input
                          id="dribbble"
                          className={`pl-8 ${!isEditing ? "bg-muted/50 dark:bg-zinc-800" : ""}`}
                          placeholder={
                            isEditing ? "username" : "No username provided"
                          }
                          value={editedProfile.profile.social.dribbble}
                          onChange={(e) =>
                            updateNestedField(
                              "social",
                              "dribbble",
                              e.target.value
                            )
                          }
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
        {isEditing && (
          <CardFooter className="flex justify-end gap-4 pt-4 pb-4 px-6 bg-blue-50/50 dark:bg-zinc-800/50 border-t dark:border-zinc-700">
            <Button
              variant="outline"
              onClick={() => {
                setEditedProfile({
                  firstName: user?.firstName || "",
                  lastName: user?.lastName || "",
                  email: user?.email || "",
                  phone: user?.phone || "",
                  twoFactor: user?.twoFactor?.enabled || false,
                  avatar: null, // Set avatar to null by default
                  profile: {
                    bio: "",
                    location: {
                      address: "",
                      city: "",
                      country: "",
                      zip: "",
                    },
                    social: {
                      twitter: "",
                      dribbble: "",
                      instagram: "",
                      github: "",
                      gitlab: "",
                      telegram: "",
                    },
                  },
                });
                setIsEditing(false);
              }}
              disabled={isUpdatingProfile}
            >
              {t("Cancel")}
            </Button>
            <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
              {isUpdatingProfile ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t("Saving")}.
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("save_changes")}
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>

      <Card className="bg-white dark:bg-zinc-900 border-0 dark:border-zinc-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-blue-50/50 dark:bg-zinc-800/50 border-b dark:border-zinc-700">
          <CardTitle className="dark:text-zinc-100">
            {t("account_information")}
          </CardTitle>
          <CardDescription className="dark:text-zinc-400">
            {t("view_your_account_details_and_status")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 p-4 rounded-lg bg-gray-50/50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700">
              <p className="text-sm font-medium text-muted-foreground dark:text-zinc-400">
                {t("account_id")}
              </p>
              <div className="flex items-center">
                <p className="font-medium font-mono text-sm bg-gray-100 dark:bg-zinc-700 dark:text-zinc-200 py-1 px-2 rounded">
                  {user?.id}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 ml-2"
                  onClick={() => {
                    navigator.clipboard.writeText(user?.id || "");
                    toast({
                      title: "Copied",
                      description: "Account ID copied to clipboard",
                    });
                  }}
                >
                  <svg
                    className="h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </Button>
              </div>
            </div>

            <div className="space-y-2 p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-800">
              <p className="text-sm font-medium text-muted-foreground dark:text-zinc-400">
                {t("verification_level")}
              </p>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                >
                  <svg
                    className="h-3 w-3 mr-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 16V12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 8H12.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t("Level")}
                  {kycLevel}
                </Badge>
                <Link href="/user/kyc">
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-blue-600"
                  >
                    {t("Upgrade")}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="space-y-2 p-4 rounded-lg bg-green-50/50 dark:bg-green-950/50 border border-green-100 dark:border-green-800">
              <p className="text-sm font-medium text-muted-foreground dark:text-zinc-400">
                {t("member_since")}
              </p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <p className="font-medium dark:text-zinc-200">
                  {formatDate(user?.createdAt)}
                </p>
              </div>
            </div>

            <div className="space-y-2 p-4 rounded-lg bg-purple-50/50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800">
              <p className="text-sm font-medium text-muted-foreground dark:text-zinc-400">
                {t("last_login")}
              </p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <p className="font-medium dark:text-zinc-200">
                  {formatDate(user?.lastLogin)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
