"use client";

import { memo, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  X,
  Check,
  Edit3,
  Twitter,
  Github,
  Instagram,
  Send,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CountrySelect } from "@/components/ui/country-select";
import { StateSelect } from "@/components/ui/state-select";
import { CitySelect } from "@/components/ui/city-select";
import { useToast } from "@/hooks/use-toast";
import { imageUploader } from "@/utils/upload";

const FormSection = memo(function FormSection({
  title,
  description,
  icon: Icon,
  children,
  delay = 0,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden"
    >
      <div className="px-6 py-5 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10">
            <Icon className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {description && (
              <p className="text-sm text-zinc-500">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  );
});

const SocialInput = memo(function SocialInput({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-zinc-400 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">
          @
        </span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pl-8 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600",
            "focus:border-amber-500/50 focus:ring-amber-500/20",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      </div>
    </div>
  );
});

export const PersonalInfoTab = memo(function PersonalInfoTab() {
  const { user, updateUser, updateAvatar } = useUserStore();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse profile data
  const parseProfile = () => {
    let parsedProfile = {
      bio: "",
      location: {
        address: "",
        city: "",
        state: "",
        country: "",
        countryCode: "",
        zip: "",
      },
      social: {
        twitter: "",
        instagram: "",
        github: "",
        telegram: "",
        dribbble: "",
        gitlab: "",
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
            state: parsed.location?.state || "",
            country: parsed.location?.country || "",
            countryCode: parsed.location?.countryCode || "",
            zip: parsed.location?.zip || "",
          },
          social: {
            twitter: parsed.social?.twitter || "",
            instagram: parsed.social?.instagram || "",
            github: parsed.social?.github || "",
            telegram: parsed.social?.telegram || "",
            dribbble: parsed.social?.dribbble || "",
            gitlab: parsed.social?.gitlab || "",
          },
        };
      } else if (typeof user?.profile === "object" && user?.profile) {
        parsedProfile = {
          bio: user.profile.bio || "",
          location: {
            address: user.profile.location?.address || "",
            city: user.profile.location?.city || "",
            state: user.profile.location?.state || "",
            country: user.profile.location?.country || "",
            countryCode: user.profile.location?.countryCode || "",
            zip: user.profile.location?.zip || "",
          },
          social: user.profile.social || parsedProfile.social,
        };
      }
    } catch (e) {
      console.error("Error parsing profile:", e);
    }

    return parsedProfile;
  };

  const [formData, setFormData] = useState(() => ({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    profile: parseProfile(),
  }));

  if (!user) return null;

  const getUserInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return user.firstName?.charAt(0).toUpperCase() || "U";
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const result = await imageUploader({
      file,
      dir: "avatars",
      size: { maxWidth: 400, maxHeight: 400 },
      oldPath: user.avatar || "",
    });

    if (result.success && result.url) {
      await updateAvatar(result.url);
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been changed.",
      });
    }
    setIsUploadingAvatar(false);
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const success = await updateUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        profile: formData.profile,
      });

      if (success) {
        toast({
          title: "Profile Updated",
          description: "Your changes have been saved successfully.",
        });
        setIsEditing(false);
      } else {
        throw new Error("Update failed");
      }
    } catch {
      toast({
        title: "Update Failed",
        description: "Could not save your changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      phone: user.phone || "",
      profile: parseProfile(),
    });
    setIsEditing(false);
  };

  const handleCountryChange = (countryCode: string) => {
    setFormData({
      ...formData,
      profile: {
        ...formData.profile,
        location: {
          ...formData.profile.location,
          countryCode: countryCode,
          country: countryCode,
          state: "", // Reset state when country changes
          city: "", // Reset city when country changes
        },
      },
    });
  };

  const handleStateChange = (stateName: string) => {
    setFormData({
      ...formData,
      profile: {
        ...formData.profile,
        location: {
          ...formData.profile.location,
          state: stateName,
          city: "", // Reset city when state changes
        },
      },
    });
  };

  const handleCityChange = (cityName: string) => {
    setFormData({
      ...formData,
      profile: {
        ...formData.profile,
        location: {
          ...formData.profile.location,
          city: cityName,
        },
      },
    });
  };

  // Custom styles for the select components to match dark theme
  const selectClassName = cn(
    "bg-zinc-800/50 border-zinc-700 text-white",
    "[&>span]:text-white",
    "hover:bg-zinc-800 hover:border-zinc-600"
  );

  const disabledSelectClassName = cn(
    "bg-zinc-800/50 border-zinc-700 text-zinc-400",
    "opacity-60 cursor-not-allowed",
    "[&>span]:text-zinc-400"
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Personal Information
          </h1>
          <p className="text-zinc-500 mt-1">
            Manage your personal details and preferences.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isUpdating}
                className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isUpdating}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white"
              >
                {isUpdating ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </motion.div>

      {/* Avatar Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-6"
      >
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative group">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleAvatarUpload}
            />
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar className="h-28 w-28 ring-4 ring-zinc-800">
                <AvatarImage
                  src={user.avatar || "/img/avatars/placeholder.webp"}
                  alt={`${user.firstName} ${user.lastName}`}
                />
                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-2xl font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploadingAvatar ? (
                  <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </motion.div>
          </div>

          {/* Info */}
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-white">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-zinc-500">{user.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
              {user.emailVerified && (
                <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Email Verified
                </Badge>
              )}
              {user.phoneVerified && (
                <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Phone Verified
                </Badge>
              )}
              <Badge className="bg-amber-500/10 border-amber-500/20 text-amber-400 text-xs">
                Level {user.kycLevel || 0}
              </Badge>
            </div>
          </div>

          {/* Account Info */}
          <div className="flex-1 grid grid-cols-2 gap-4 sm:ml-auto">
            <div className="text-center p-4 rounded-xl bg-zinc-800/50">
              <p className="text-2xl font-bold text-white">
                {Math.floor(
                  (Date.now() - new Date(user.createdAt || Date.now()).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}
              </p>
              <p className="text-xs text-zinc-500">Days Active</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-zinc-800/50">
              <p className="text-2xl font-bold text-white font-mono text-sm truncate">
                {user.id.slice(0, 8)}...
              </p>
              <p className="text-xs text-zinc-500">Account ID</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Basic Info */}
      <FormSection
        title="Basic Information"
        description="Your name and contact details"
        icon={User}
        delay={0.2}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400">First Name</Label>
            <Input
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              disabled={!isEditing}
              className={cn(
                "bg-zinc-800/50 border-zinc-700 text-white",
                "focus:border-amber-500/50 focus:ring-amber-500/20",
                !isEditing && "opacity-60 cursor-not-allowed"
              )}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400">Last Name</Label>
            <Input
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              disabled={!isEditing}
              className={cn(
                "bg-zinc-800/50 border-zinc-700 text-white",
                "focus:border-amber-500/50 focus:ring-amber-500/20",
                !isEditing && "opacity-60 cursor-not-allowed"
              )}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              value={user.email}
              disabled
              className="bg-zinc-800/50 border-zinc-700 text-zinc-400 cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              disabled={!isEditing}
              placeholder="+1 (555) 000-0000"
              className={cn(
                "bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600",
                "focus:border-amber-500/50 focus:ring-amber-500/20",
                !isEditing && "opacity-60 cursor-not-allowed"
              )}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm text-zinc-400">Bio</Label>
            <Textarea
              value={formData.profile.bio}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  profile: { ...formData.profile, bio: e.target.value },
                })
              }
              disabled={!isEditing}
              placeholder="Tell us about yourself..."
              rows={4}
              className={cn(
                "bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600 resize-none",
                "focus:border-amber-500/50 focus:ring-amber-500/20",
                !isEditing && "opacity-60 cursor-not-allowed"
              )}
            />
          </div>
        </div>
      </FormSection>

      {/* Location */}
      <FormSection
        title="Location"
        description="Your address and location details"
        icon={MapPin}
        delay={0.3}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Country */}
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400">Country</Label>
            {isEditing ? (
              <CountrySelect
                value={formData.profile.location.countryCode}
                onValueChange={(countryCode) => handleCountryChange(countryCode)}
                placeholder="Select country..."
                disabled={!isEditing}
                className={selectClassName}
              />
            ) : (
              <Input
                value={formData.profile.location.country || "Not specified"}
                disabled
                className="bg-zinc-800/50 border-zinc-700 text-zinc-400 cursor-not-allowed"
              />
            )}
          </div>

          {/* State/Province */}
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400">State / Province</Label>
            {isEditing ? (
              <StateSelect
                value={formData.profile.location.state}
                onValueChange={handleStateChange}
                countryCode={formData.profile.location.countryCode}
                placeholder="Select state..."
                disabled={!isEditing}
                className={formData.profile.location.countryCode ? selectClassName : disabledSelectClassName}
              />
            ) : (
              <Input
                value={formData.profile.location.state || "Not specified"}
                disabled
                className="bg-zinc-800/50 border-zinc-700 text-zinc-400 cursor-not-allowed"
              />
            )}
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400">City</Label>
            {isEditing ? (
              <CitySelect
                value={formData.profile.location.city}
                onValueChange={handleCityChange}
                countryCode={formData.profile.location.countryCode}
                stateName={formData.profile.location.state}
                placeholder="Select city..."
                disabled={!isEditing}
                className={formData.profile.location.state ? selectClassName : disabledSelectClassName}
              />
            ) : (
              <Input
                value={formData.profile.location.city || "Not specified"}
                disabled
                className="bg-zinc-800/50 border-zinc-700 text-zinc-400 cursor-not-allowed"
              />
            )}
          </div>

          {/* ZIP / Postal Code */}
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400">ZIP / Postal Code</Label>
            <Input
              value={formData.profile.location.zip}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  profile: {
                    ...formData.profile,
                    location: { ...formData.profile.location, zip: e.target.value },
                  },
                })
              }
              disabled={!isEditing}
              placeholder="10001"
              className={cn(
                "bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600",
                !isEditing && "opacity-60 cursor-not-allowed"
              )}
            />
          </div>

          {/* Street Address */}
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm text-zinc-400">Street Address</Label>
            <Input
              value={formData.profile.location.address}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  profile: {
                    ...formData.profile,
                    location: { ...formData.profile.location, address: e.target.value },
                  },
                })
              }
              disabled={!isEditing}
              placeholder="123 Main Street, Apt 4B"
              className={cn(
                "bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600",
                !isEditing && "opacity-60 cursor-not-allowed"
              )}
            />
          </div>
        </div>
      </FormSection>

      {/* Social Links */}
      <FormSection
        title="Social Links"
        description="Connect your social media profiles"
        icon={LinkIcon}
        delay={0.4}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SocialInput
            icon={Twitter}
            label="Twitter"
            value={formData.profile.social.twitter}
            onChange={(value) =>
              setFormData({
                ...formData,
                profile: {
                  ...formData.profile,
                  social: { ...formData.profile.social, twitter: value },
                },
              })
            }
            placeholder="username"
            disabled={!isEditing}
          />
          <SocialInput
            icon={Github}
            label="GitHub"
            value={formData.profile.social.github}
            onChange={(value) =>
              setFormData({
                ...formData,
                profile: {
                  ...formData.profile,
                  social: { ...formData.profile.social, github: value },
                },
              })
            }
            placeholder="username"
            disabled={!isEditing}
          />
          <SocialInput
            icon={Instagram}
            label="Instagram"
            value={formData.profile.social.instagram}
            onChange={(value) =>
              setFormData({
                ...formData,
                profile: {
                  ...formData.profile,
                  social: { ...formData.profile.social, instagram: value },
                },
              })
            }
            placeholder="username"
            disabled={!isEditing}
          />
          <SocialInput
            icon={Send}
            label="Telegram"
            value={formData.profile.social.telegram}
            onChange={(value) =>
              setFormData({
                ...formData,
                profile: {
                  ...formData.profile,
                  social: { ...formData.profile.social, telegram: value },
                },
              })
            }
            placeholder="username"
            disabled={!isEditing}
          />
        </div>
      </FormSection>
    </div>
  );
});

export default PersonalInfoTab;
