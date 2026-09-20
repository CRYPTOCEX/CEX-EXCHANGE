"use client";

import { memo, useState } from "react";
import { m } from "framer-motion";
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
  Send,
  Link as LinkIcon,
  Copy,
} from "lucide-react";
import { Twitter, Github, Instagram } from "@/components/ui/brand-icons";
import { cn } from "@/lib/utils";
import { normalizePhoneE164 } from "@/lib/phone";
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
import { UsernameField } from "../username-field";
import { useTranslations } from "next-intl";
import { AvatarPickerDialog } from "@/components/user/avatar-picker-dialog";

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
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-2xl bg-surface-2/50 border border-border/50 overflow-hidden"
    >
      <div className="px-6 py-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-warning/10">
            <Icon className="h-5 w-5 text-warning" />
          </div>
          <div>
            {/* The ground is the neutral `bg-surface-2/50` card, not a warning fill —
                only the icon tile is warning-tinted. As --warning-foreground
                (white in light mode) every section heading in this form was
                invisible on a light theme. */}
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-sm text-subtle-foreground">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </m.div>
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
      <Label className="text-sm text-muted-foreground flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          @
        </span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pl-8 bg-muted/50 border-border-strong text-foreground placeholder:text-muted-foreground",
            "focus:border-warning/50 focus:ring-warning/20",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      </div>
    </div>
  );
});

export const PersonalInfoTab = memo(function PersonalInfoTab() {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
  const { user, updateUser } = useUserStore();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  /* Same picker as the hero. Both surfaces used to carry their own copy of
     this upload — same directory, same 400px cap, same toast — and a second
     copy is a second place for either to drift. */
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

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
    username: (user as any)?.username || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    profile: parseProfile(),
  }));

  /* Save is blocked while the handle is known-bad. The server refuses it
     anyway — this only stops the person paying a round trip to find out. */
  const [usernameValid, setUsernameValid] = useState(true);

  if (!user) return null;

  const getUserInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return user.firstName?.charAt(0).toUpperCase() || "U";
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const success = await updateUser({
        /* Sent as an empty string when cleared, NOT omitted. `undefined` means
           "leave it alone" to the endpoint, so omitting it would make clearing
           a handle impossible — and a handle has to be removable, or setting
           one is a one-way door. */
        username: formData.username.trim(),
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        profile: formData.profile,
      });

      if (success) {
        toast({
          title: t("profile_updated"),
          description: t("your_changes_have_been_saved_successfully"),
        });
        setIsEditing(false);
      } else {
        throw new Error("Update failed");
      }
    } catch {
      toast({
        title: t("update_failed"),
        description: t("could_not_save_your_changes_please_try_again"),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: (user as any).username || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      phone: user.phone || "",
      profile: parseProfile(),
    });
    setUsernameValid(true);
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
    "bg-muted/50 border-border-strong text-foreground",
    "[&>span]:text-foreground",
    "hover:bg-muted hover:border-border-strong"
  );

  const disabledSelectClassName = cn(
    "bg-muted/50 border-border-strong text-muted-foreground",
    "opacity-60 cursor-not-allowed",
    "[&>span]:text-muted-foreground"
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          {/* `<h2>`, NOT `<h1>`. `ProfileHero` renders above this tab (it is
              one of the three views that show it) and owns the page's `<h1>`;
              this names the section. Same classes. */}
          <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            {tCommon("personal_info")}
          </h2>
          <p className="text-subtle-foreground mt-1">
            {t("manage_your_personal_details_and_preferences")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isUpdating}
                className="bg-muted border-border-strong text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                /* Also blocked on a handle the field already knows the server
                   will refuse. The endpoint checks regardless; this only saves
                   the round trip and the "why did that fail" moment. */
                disabled={isUpdating || !usernameValid}
                className="bg-warning hover:bg-warning/90 text-warning-foreground"
              >
                {/* Spinner ink follows the button's own ground: it sits on the
                    `bg-warning` fill, so it is --warning-foreground, not white. */}
                {isUpdating ? (
                  <div className="h-4 w-4 border-2 border-warning-foreground border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {tCommon("save_changes")}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {tCommon("edit_profile")}
            </Button>
          )}
        </div>
      </m.div>

      {/* Avatar Section */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-surface-2/50 border border-border/50 p-6"
      >
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative group">
            <m.div
              whileHover={{ scale: 1.02 }}
              className="relative cursor-pointer"
              onClick={() => setAvatarPickerOpen(true)}
            >
              <Avatar className="h-28 w-28 ring-4 ring-border">
                <AvatarImage
                  src={user.avatar || "/img/avatars/placeholder.webp"}
                  alt={`${user.firstName} ${user.lastName}`}
                />
                <AvatarFallback className="bg-warning text-warning-foreground text-2xl font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-overlay/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {/* On the `bg-overlay/60` scrim — scrim ink, not white. The
                    spinner branch moved into the picker, which shows progress
                    on the tile that was actually clicked. */}
                <Camera className="h-6 w-6 text-overlay-foreground" />
              </div>
            </m.div>
          </div>

          {/* Info */}
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-foreground">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-subtle-foreground">{user.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
              {user.emailVerified && (
                <Badge className="bg-success/10 border-success/20 text-success-ink text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  {tCommon("email_verified")}
                </Badge>
              )}
              {user.phoneVerified && (
                <Badge className="bg-success/10 border-success/20 text-success-ink text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  {tCommon("phone_verified")}
                </Badge>
              )}
              <Badge className="bg-warning/10 border-warning/20 text-warning-ink text-xs">
                Level {user.kycLevel || 0}
              </Badge>
            </div>
          </div>

          {/* Account Info */}
          <div className="flex-1 grid grid-cols-2 gap-4 sm:ml-auto">
            <div className="text-center p-4 rounded-xl bg-muted/50">
              <p className="text-2xl font-bold text-foreground">
                {Math.floor(
                  (Date.now() - new Date(user.createdAt || Date.now()).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}
              </p>
              <p className="text-xs text-subtle-foreground">{tCommon("days_active")}</p>
            </div>
            <div
              className="text-center p-4 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted/50 transition-colors group"
              onClick={() => {
                navigator.clipboard.writeText(user.id);
                toast({
                  title: t("uuid_copied"),
                  description:
                    t("your_account_uuid_has_been_copied"),
                });
              }}
            >
              <p className="font-bold text-foreground font-mono text-xs break-all leading-relaxed">
                {user.id}
              </p>
              <p className="text-xs text-subtle-foreground flex items-center justify-center gap-1 mt-1">
                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                {t("click_to_copy_uuid")}
              </p>
            </div>
          </div>
        </div>
      </m.div>

      {/* Basic Info */}
      <FormSection
        title={tCommon("basic_information")}
        description={tCommon("profile_caption")}
        icon={User}
        delay={0.2}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FIRST IN THE SECTION, and full width. It is the only name in here
              that other people ever see — everything below it is the account's
              private record — so burying it under the legal name would read as
              an optional extra rather than as the thing the platform actually
              publishes. */}
          <UsernameField
            value={formData.username}
            original={(user as any).username || ""}
            editing={isEditing}
            onChange={(username) => setFormData({ ...formData, username })}
            onValidityChange={setUsernameValid}
          />
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">{tCommon("first_name")}</Label>
            <Input
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              disabled={!isEditing}
              className={cn(
                "bg-muted/50 border-border-strong text-foreground",
                "focus:border-warning/50 focus:ring-warning/20",
                !isEditing && "opacity-60 cursor-not-allowed"
              )}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">{tCommon("last_name")}</Label>
            <Input
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              disabled={!isEditing}
              className={cn(
                "bg-muted/50 border-border-strong text-foreground",
                "focus:border-warning/50 focus:ring-warning/20",
                !isEditing && "opacity-60 cursor-not-allowed"
              )}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {tCommon("email_address")}
            </Label>
            <Input
              value={user.email}
              disabled
              className="bg-muted/50 border-border-strong text-muted-foreground cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {tCommon("phone_number")}
            </Label>
            <Input
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: normalizePhoneE164(e.target.value) })
              }
              disabled={!isEditing}
              maxLength={16}
              placeholder="+254711972926"
              className={cn(
                "bg-muted/50 border-border-strong text-foreground placeholder:text-muted-foreground",
                "focus:border-warning/50 focus:ring-warning/20",
                !isEditing && "opacity-60 cursor-not-allowed"
              )}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm text-muted-foreground">Bio</Label>
            <Textarea
              value={formData.profile.bio}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  profile: { ...formData.profile, bio: e.target.value },
                })
              }
              disabled={!isEditing}
              placeholder={`${t("tell_us_about_yourself")}…`}
              rows={4}
              className={cn(
                "bg-muted/50 border-border-strong text-foreground placeholder:text-muted-foreground resize-none",
                "focus:border-warning/50 focus:ring-warning/20",
                !isEditing && "opacity-60 cursor-not-allowed"
              )}
            />
          </div>
        </div>
      </FormSection>

      {/* Location */}
      <FormSection
        title="Location"
        description={t("your_address_and_location_details")}
        icon={MapPin}
        delay={0.3}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Country */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Country</Label>
            {isEditing ? (
              <CountrySelect
                value={formData.profile.location.countryCode}
                onValueChange={(countryCode) => handleCountryChange(countryCode)}
                placeholder={`${tCommon("select_country")}…`}
                disabled={!isEditing}
                className={selectClassName}
              />
            ) : (
              <Input
                value={formData.profile.location.country || "Not specified"}
                disabled
                className="bg-muted/50 border-border-strong text-muted-foreground cursor-not-allowed"
              />
            )}
          </div>

          {/* State/Province */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">{tCommon("state_province")}</Label>
            {isEditing ? (
              <StateSelect
                value={formData.profile.location.state}
                onValueChange={handleStateChange}
                countryCode={formData.profile.location.countryCode}
                placeholder={`${tCommon("select_state")}…`}
                disabled={!isEditing}
                className={formData.profile.location.countryCode ? selectClassName : disabledSelectClassName}
              />
            ) : (
              <Input
                value={formData.profile.location.state || "Not specified"}
                disabled
                className="bg-muted/50 border-border-strong text-muted-foreground cursor-not-allowed"
              />
            )}
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">City</Label>
            {isEditing ? (
              <CitySelect
                value={formData.profile.location.city}
                onValueChange={handleCityChange}
                countryCode={formData.profile.location.countryCode}
                stateName={formData.profile.location.state}
                placeholder={`${tCommon("select_city")}…`}
                disabled={!isEditing}
                className={formData.profile.location.state ? selectClassName : disabledSelectClassName}
              />
            ) : (
              <Input
                value={formData.profile.location.city || "Not specified"}
                disabled
                className="bg-muted/50 border-border-strong text-muted-foreground cursor-not-allowed"
              />
            )}
          </div>

          {/* ZIP / Postal Code */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">{t("zip_postal_code")}</Label>
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
                "bg-muted/50 border-border-strong text-foreground placeholder:text-muted-foreground",
                !isEditing && "opacity-60 cursor-not-allowed"
              )}
            />
          </div>

          {/* Street Address */}
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm text-muted-foreground">{tCommon("street_address")}</Label>
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
              placeholder={`123 ${tCommon('main_street_apt_4b')}`}
              className={cn(
                "bg-muted/50 border-border-strong text-foreground placeholder:text-muted-foreground",
                !isEditing && "opacity-60 cursor-not-allowed"
              )}
            />
          </div>
        </div>
      </FormSection>

      {/* Social Links */}
      <FormSection
        title={tCommon("social_links")}
        description={t("connect_your_social_media_profiles")}
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

      <AvatarPickerDialog open={avatarPickerOpen} onOpenChange={setAvatarPickerOpen} />
    </div>
  );
});

export default PersonalInfoTab;
