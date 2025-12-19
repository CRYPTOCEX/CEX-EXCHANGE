"use client";
import React from "react";
import { useTranslations } from "next-intl";
import {
  User,
  Mail,
  CalendarIcon,
  ToggleLeft,
  Shield,
  Clock,
  CheckSquare,
  Phone,
  BadgeIcon,
  Smartphone,
  MapPin,
  Globe,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

export function useColumns() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  return [
    {
      key: "user",
      disablePrefixSort: true,
      title: t("user_details"),
      expandedTitle: (row) => `User Profile: ${row.firstName || ''} ${row.lastName || ''}`,
      type: "compound",
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 1,
      icon: User,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("users_profile_picture"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tCommon("users_first_name"), tCommon("users_last_name")],
            sortable: true,
            sortKey: "firstName",
            icon: User,
            validation: (value) => {
              if (!value) return "Name is required";
              if (value.length < 2)
                return "Name must be at least 2 characters long";
              return null;
            },
          },
          secondary: {
            key: "email",
            icon: Mail,
            type: "email",
            title: tCommon("email_address"),
            description: t("users_email_address"),
            sortable: true,
            validation: (value) => {
              if (!value) return "Email is required";
              if (!/\S+@\S+\.\S+/.test(value)) return "Invalid email format";
              return null;
            },
          },
          metadata: [
            {
              key: "lastLogin",
              icon: Clock,
              type: "date",
              title: tCommon("last_login"),
              description: t("users_last_login_date"),
              sortable: true,
              render: (value) => value ? format(new Date(value), "MMM d, yyyy HH:mm") : "Never",
            },
            {
              key: "role",
              idKey: "id",
              labelKey: "name",
              baseKey: "roleId",
              icon: Shield,
              type: "select",
              title: tCommon("role"),
              description: t("users_role_in_the_system"),
              sortable: true,
              sortKey: "role.name",
              apiEndpoint: {
                url: "/api/admin/crm/role/options",
                method: "GET",
              },
              render: (value) => value?.name || "No Role",
            },
          ],
        },
      },
    },

    // Basic info fields (form only - displayed in compound column in table)
    {
      key: "avatar",
      title: tCommon("avatar"),
      type: "image",
      icon: User,
      sortable: false,
      filterable: false,
      description: tCommon("users_profile_picture"),
      expandedOnly: true,
    },
    {
      key: "firstName",
      title: tCommon("first_name"),
      type: "text",
      icon: User,
      sortable: true,
      filterable: false,
      description: tCommon("users_first_name"),
      expandedOnly: true,
    },
    {
      key: "lastName",
      title: tCommon("last_name"),
      type: "text",
      icon: User,
      sortable: true,
      filterable: false,
      description: tCommon("users_last_name"),
      expandedOnly: true,
    },
    {
      key: "email",
      title: tCommon("email_address"),
      type: "email",
      icon: Mail,
      sortable: true,
      filterable: false,
      description: t("users_email_address"),
      expandedOnly: true,
    },
    {
      key: "roleId",
      title: tCommon("role"),
      type: "select",
      icon: Shield,
      sortable: false,
      filterable: false,
      description: t("users_role_in_the_system"),
      apiEndpoint: {
        url: "/api/admin/crm/role/options",
        method: "GET",
      },
      expandedOnly: true,
    },

    // Contact Information
    {
      key: "phone",
      title: tCommon("phone_number"),
      type: "text",
      icon: Phone,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 2,
      description: t("users_phone_number"),
      render: {
        type: "custom",
        render: (value: string) => {
          return value || "Not Provided";
        },
      },
    },
    {
      key: "phoneVerified",
      title: tCommon("phone_verified"),
      type: "boolean",
      icon: Smartphone,
      sortable: true,
      filterable: true,
      priority: 3,
      description: t("whether_the_users_phone_has_been_verified"),
    },

    // Account Status & Security
    {
      key: "status",
      title: tDashboard("account_status"),
      type: "select",
      icon: ToggleLeft,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 1,
      description: t("users_account_status"),
      render: {
        type: "custom",
        render: (value: any, row: any) => {
          const isBlocked = row.blocks?.some((block: any) => block.isActive === true) || false;
          const variant = (() => {
            switch (value?.toUpperCase()) {
              case "ACTIVE":
                return "success";
              case "INACTIVE":
                return "muted";
              case "SUSPENDED":
                return "warning";
              case "BANNED":
                return "danger";
              default:
                return "default";
            }
          })();

          return (
            <div className="flex items-center space-x-2">
              <Badge
                variant={variant as any}
                className="capitalize"
              >
                {value?.toLowerCase()}
              </Badge>
              {isBlocked && (
                <Shield className="h-4 w-4 text-red-500" />
              )}
            </div>
          );
        },
      },
      options: [
        { value: "ACTIVE", label: tCommon("active") },
        { value: "INACTIVE", label: tCommon("inactive") },
        { value: "SUSPENDED", label: tCommon("suspended") },
        { value: "BANNED", label: tCommon("banned") },
      ],
    },
    {
      key: "emailVerified",
      title: tCommon("email_verified"),
      type: "boolean",
      icon: CheckSquare,
      sortable: true,
      filterable: true,
      priority: 2,
      description: t("whether_the_users_email_has_been_verified"),
    },

    // KYC Status - Simplified
    {
      key: "kyc.status",
      title: t("kyc_status"),
      type: "text",
      icon: BadgeIcon,
      sortable: true,
      filterable: true,
      priority: 2,
      description: t("kyc_verification_status"),
      render: {
        type: "custom",
        render: (value: string, row: any) => {
          if (!row.kyc) {
            return (
              <Badge variant="secondary" className="text-xs">
                {tCommon("not_submitted")}
              </Badge>
            );
          }

          const statusValue = value?.toUpperCase();
          let displayText = value || "Not Submitted";
          let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";

          switch (statusValue) {
            case "APPROVED":
              variant = "default";
              break;
            case "PENDING":
              variant = "outline";
              break;
            case "REJECTED":
              variant = "destructive";
              break;
            case "ADDITIONAL_INFO_REQUIRED":
              variant = "secondary";
              displayText = "Additional Info Required";
              break;
          }

          return (
            <Badge variant={variant} className="text-xs">
              {displayText}
            </Badge>
          );
        },
      },
    },

    // Two-Factor Authentication Status - Simplified
    {
      key: "twoFactor.enabled",
      title: `2FA ${tCommon('status')}`,
      type: "boolean",
      icon: Shield,
      sortable: false,
      filterable: false,
      priority: 3,
      description: t("two_factor_authentication_status"),
      render: {
        type: "custom",
        render: (value: boolean, row: any) => {
          const isEnabled = row.twoFactor?.enabled || false;
          return (
            <Badge variant={isEnabled ? "default" : "destructive"} className="text-xs">
              {isEnabled ? "Enabled" : "Disabled"}
            </Badge>
          );
        },
      },
    },

    // Timestamps
    {
      key: "createdAt",
      title: t("registration_date"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("date_when_the_user_registered"),
      render: {
        type: "date",
        format: "PPP",
      },
      priority: 2,
    },

    // Profile fields (form only)
    {
      key: "profile.bio",
      title: tCommon("bio"),
      type: "textarea",
      icon: FileText,
      sortable: false,
      filterable: false,
      description: "User biography or description",
      expandedOnly: true,
    },
    {
      key: "profile.location.address",
      title: tCommon("address"),
      type: "text",
      icon: MapPin,
      sortable: false,
      filterable: false,
      description: "User's street address",
      expandedOnly: true,
    },
    {
      key: "profile.location.city",
      title: tCommon("city"),
      type: "text",
      icon: MapPin,
      sortable: false,
      filterable: false,
      description: "User's city",
      expandedOnly: true,
    },
    {
      key: "profile.location.country",
      title: tCommon("country"),
      type: "text",
      icon: MapPin,
      sortable: false,
      filterable: false,
      description: "User's country",
      expandedOnly: true,
    },
    {
      key: "profile.location.zip",
      title: tCommon("zip_code"),
      type: "text",
      icon: MapPin,
      sortable: false,
      filterable: false,
      description: "User's zip/postal code",
      expandedOnly: true,
    },
    {
      key: "profile.social.facebook",
      title: "Facebook",
      type: "url",
      icon: Globe,
      sortable: false,
      filterable: false,
      description: "Facebook profile URL",
      expandedOnly: true,
    },
    {
      key: "profile.social.twitter",
      title: "Twitter",
      type: "url",
      icon: Globe,
      sortable: false,
      filterable: false,
      description: "Twitter profile URL",
      expandedOnly: true,
    },
    {
      key: "profile.social.instagram",
      title: "Instagram",
      type: "url",
      icon: Globe,
      sortable: false,
      filterable: false,
      description: "Instagram profile URL",
      expandedOnly: true,
    },
    {
      key: "profile.social.github",
      title: "GitHub",
      type: "url",
      icon: Globe,
      sortable: false,
      filterable: false,
      description: "GitHub profile URL",
      expandedOnly: true,
    },
    {
      key: "profile.social.gitlab",
      title: "GitLab",
      type: "url",
      icon: Globe,
      sortable: false,
      filterable: false,
      description: "GitLab profile URL",
      expandedOnly: true,
    },
    {
      key: "profile.social.dribbble",
      title: "Dribbble",
      type: "url",
      icon: Globe,
      sortable: false,
      filterable: false,
      description: "Dribbble profile URL",
      expandedOnly: true,
    },

    // Two-factor field (edit form only)
    {
      key: "twoFactor",
      title: "Disable 2FA",
      type: "boolean",
      icon: Shield,
      sortable: false,
      filterable: false,
      description: "Check to disable two-factor authentication for this user",
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  return {
    create: {
      title: t("create_new_user"),
      description: t("register_a_new_user_account_with"),
      groups: [
        {
          id: "basic-info",
          title: t("basic_information"),
          icon: User,
          priority: 1,
          fields: [
            "avatar",
            {
              key: "firstName",
              required: true,
              validation: (value) => {
                if (!value) return "First name is required";
                if (!/^[\p{L} \-'.]+$/u.test(value))
                  return "First name can only contain letters, spaces, hyphens, apostrophes, and periods";
                return null;
              },
            },
            {
              key: "lastName",
              required: true,
              validation: (value) => {
                if (!value) return "Last name is required";
                if (!/^[\p{L} \-'.]+$/u.test(value))
                  return "Last name can only contain letters, spaces, hyphens, apostrophes, and periods";
                return null;
              },
            },
            {
              key: "email",
              required: true,
              validation: (value) => {
                if (!value) return "Email is required";
                if (!/\S+@\S+\.\S+/.test(value)) return "Invalid email format";
                return null;
              },
            },
          ],
        },
        {
          id: "contact",
          title: tCommon("contact_information"),
          icon: Phone,
          priority: 2,
          fields: [
            {
              key: "phone",
              required: false,
              validation: (value) => {
                if (value && !/^[+0-9]+$/.test(value))
                  return "Phone number must contain only digits and can start with a plus sign";
                return null;
              },
            },
            { key: "phoneVerified" },
          ],
        },
        {
          id: "role",
          title: t("role_permissions"),
          icon: Shield,
          priority: 3,
          fields: [
            {
              key: "roleId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/crm/role/options",
                method: "GET",
              },
            },
          ],
        },
        {
          id: "status",
          title: tDashboard("account_status"),
          icon: ToggleLeft,
          priority: 4,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "INACTIVE", label: tCommon("inactive") },
                { value: "SUSPENDED", label: tCommon("suspended") },
                { value: "BANNED", label: tCommon("banned") },
              ],
            },
            { key: "emailVerified" },
          ],
        },
        {
          id: "profile",
          title: tCommon("profile"),
          icon: FileText,
          priority: 5,
          fields: [
            {
              key: "profile.bio",
              type: "textarea",
              title: tCommon("bio"),
              description: "User biography or description",
              required: false,
            },
          ],
        },
        {
          id: "location",
          title: tCommon("location"),
          icon: MapPin,
          priority: 6,
          fields: [
            {
              key: "profile.location.address",
              type: "text",
              title: tCommon("address"),
              required: false,
            },
            {
              key: "profile.location.city",
              type: "text",
              title: tCommon("city"),
              required: false,
            },
            {
              key: "profile.location.country",
              type: "text",
              title: tCommon("country"),
              required: false,
            },
            {
              key: "profile.location.zip",
              type: "text",
              title: tCommon("zip_code"),
              required: false,
              validation: (value) => {
                if (value && (value.length < 5 || value.length > 10))
                  return "Zip code must be between 5 and 10 characters";
                return null;
              },
            },
          ],
        },
        {
          id: "social",
          title: tCommon("social_links"),
          icon: Globe,
          priority: 7,
          fields: [
            {
              key: "profile.social.facebook",
              type: "url",
              title: "Facebook",
              required: false,
            },
            {
              key: "profile.social.twitter",
              type: "url",
              title: "Twitter",
              required: false,
            },
            {
              key: "profile.social.instagram",
              type: "url",
              title: "Instagram",
              required: false,
            },
            {
              key: "profile.social.github",
              type: "url",
              title: "GitHub",
              required: false,
            },
            {
              key: "profile.social.gitlab",
              type: "url",
              title: "GitLab",
              required: false,
            },
            {
              key: "profile.social.dribbble",
              type: "url",
              title: "Dribbble",
              required: false,
            },
          ],
        },
      ],
    },
    edit: {
      title: t("edit_user"),
      description: t("update_user_account_details_and_settings"),
      groups: [
        {
          id: "basic-info",
          title: t("basic_information"),
          icon: User,
          priority: 1,
          fields: [
            "avatar",
            {
              key: "firstName",
              required: true,
              validation: (value) => {
                if (!value) return "First name is required";
                if (!/^[\p{L} \-'.]+$/u.test(value))
                  return "First name can only contain letters, spaces, hyphens, apostrophes, and periods";
                return null;
              },
            },
            {
              key: "lastName",
              required: true,
              validation: (value) => {
                if (!value) return "Last name is required";
                if (!/^[\p{L} \-'.]+$/u.test(value))
                  return "Last name can only contain letters, spaces, hyphens, apostrophes, and periods";
                return null;
              },
            },
            {
              key: "email",
              required: true,
              validation: (value) => {
                if (!value) return "Email is required";
                if (!/\S+@\S+\.\S+/.test(value)) return "Invalid email format";
                return null;
              },
            },
          ],
        },
        {
          id: "contact",
          title: tCommon("contact_information"),
          icon: Phone,
          priority: 2,
          fields: [
            {
              key: "phone",
              required: false,
              validation: (value) => {
                if (value && !/^[+0-9]+$/.test(value))
                  return "Phone number must contain only digits and can start with a plus sign";
                return null;
              },
            },
            { key: "phoneVerified" },
          ],
        },
        {
          id: "role",
          title: t("role_permissions"),
          icon: Shield,
          priority: 3,
          fields: [
            {
              key: "roleId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/crm/role/options",
                method: "GET",
              },
            },
          ],
        },
        {
          id: "status",
          title: tDashboard("account_status"),
          icon: ToggleLeft,
          priority: 4,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "INACTIVE", label: tCommon("inactive") },
                { value: "SUSPENDED", label: tCommon("suspended") },
                { value: "BANNED", label: tCommon("banned") },
              ],
            },
            { key: "emailVerified" },
            {
              key: "twoFactor",
              type: "boolean",
              title: "Disable 2FA",
              description: "Check to disable two-factor authentication",
              required: false,
            },
          ],
        },
        {
          id: "profile",
          title: tCommon("profile"),
          icon: FileText,
          priority: 5,
          fields: [
            {
              key: "profile.bio",
              type: "textarea",
              title: tCommon("bio"),
              description: "User biography or description",
              required: false,
            },
          ],
        },
        {
          id: "location",
          title: tCommon("location"),
          icon: MapPin,
          priority: 6,
          fields: [
            {
              key: "profile.location.address",
              type: "text",
              title: tCommon("address"),
              required: false,
            },
            {
              key: "profile.location.city",
              type: "text",
              title: tCommon("city"),
              required: false,
            },
            {
              key: "profile.location.country",
              type: "text",
              title: tCommon("country"),
              required: false,
            },
            {
              key: "profile.location.zip",
              type: "text",
              title: tCommon("zip_code"),
              required: false,
              validation: (value) => {
                if (value && (value.length < 5 || value.length > 10))
                  return "Zip code must be between 5 and 10 characters";
                return null;
              },
            },
          ],
        },
        {
          id: "social",
          title: tCommon("social_links"),
          icon: Globe,
          priority: 7,
          fields: [
            {
              key: "profile.social.facebook",
              type: "url",
              title: "Facebook",
              required: false,
            },
            {
              key: "profile.social.twitter",
              type: "url",
              title: "Twitter",
              required: false,
            },
            {
              key: "profile.social.instagram",
              type: "url",
              title: "Instagram",
              required: false,
            },
            {
              key: "profile.social.github",
              type: "url",
              title: "GitHub",
              required: false,
            },
            {
              key: "profile.social.gitlab",
              type: "url",
              title: "GitLab",
              required: false,
            },
            {
              key: "profile.social.dribbble",
              type: "url",
              title: "Dribbble",
              required: false,
            },
          ],
        },
      ],
    },
  };
}
