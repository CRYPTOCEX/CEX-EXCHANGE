import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { models } from "@b/db";
import { unlink } from "fs/promises";

export const metadata: OperationObject = {
  summary: "Updates the profile of the current user",
  description: "Updates the profile of the currently authenticated user",
  operationId: "updateProfile",
  tags: ["Auth"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            firstName: {
              type: "string",
              description: "First name of the user",
            },
            lastName: {
              type: "string",
              description: "Last name of the user",
            },
            metadata: {
              type: "object",
              description: "Metadata of the user",
            },
            avatar: {
              type: "string",
              description: "Avatar of the user",
              nullable: true,
            },
            phone: {
              type: "string",
              description: "Phone number of the user",
            },
            twoFactor: {
              type: "boolean",
              description: "Two-factor authentication status",
            },
            profile: {
              type: "object",
              nullable: true,
              properties: {
                bio: {
                  type: "string",
                  description: "User bio",
                  nullable: true,
                },
                location: {
                  type: "object",
                  nullable: true,
                  properties: {
                    address: {
                      type: "string",
                      description: "User address",
                      nullable: true,
                    },
                    city: {
                      type: "string",
                      description: "User city",
                      nullable: true,
                    },
                    country: {
                      type: "string",
                      description: "User country",
                      nullable: true,
                    },
                    zip: {
                      type: "string",
                      description: "User zip code",
                      nullable: true,
                    },
                  },
                },
                social: {
                  type: "object",
                  nullable: true,
                  properties: {
                    twitter: {
                      type: "string",
                      description: "Twitter profile",
                      nullable: true,
                    },
                    dribbble: {
                      type: "string",
                      description: "Dribbble profile",
                      nullable: true,
                    },
                    instagram: {
                      type: "string",
                      description: "Instagram profile",
                      nullable: true,
                    },
                    github: {
                      type: "string",
                      description: "GitHub profile",
                      nullable: true,
                    },
                    gitlab: {
                      type: "string",
                      description: "GitLab profile",
                      nullable: true,
                    },
                    telegram: {
                      type: "string",
                      description: "Telegram username",
                      nullable: true,
                    },
                  },
                },
              },
            },
            settings: {
              type: "object",
              description: "Notification settings for the user",
              properties: {
                email: {
                  type: "boolean",
                  description: "Email notifications enabled or disabled",
                },
                sms: {
                  type: "boolean",
                  description: "SMS notifications enabled or disabled",
                },
                push: {
                  type: "boolean",
                  description: "Push notifications enabled or disabled",
                },
              },
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "User profile updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("User"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user) {
    throw new Error("Authentication required to update profile");
  }

  const {
    firstName,
    lastName,
    metadata,
    avatar,
    phone,
    twoFactor,
    profile,
    settings,
  } = body;

  return await updateUserQuery(
    user.id,
    firstName,
    lastName,
    metadata,
    avatar,
    phone,
    twoFactor,
    profile,
    settings,
    user.avatar ?? undefined // Passing the original avatar path to check for unlinking
  );
};

export const updateUserQuery = async (
  id: string,
  firstName?: string,
  lastName?: string,
  metadata?: any,
  avatar?: string | null,
  phone?: string,
  twoFactor?: boolean,
  profile?: any,
  settings?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  },
  originalAvatar?: string // Original avatar path
) => {
  // Prepare updateData with only the allowed fields
  const updateData: {
    firstName?: string;
    lastName?: string;
    metadata?: any;
    avatar?: string | null;
    phone?: string;
    twoFactor?: boolean;
    profile?: any;
    settings?: { email?: boolean; sms?: boolean; push?: boolean };
  } = {};

  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (metadata !== undefined) updateData.metadata = metadata;
  if (avatar !== undefined) updateData.avatar = avatar;
  if (phone !== undefined) updateData.phone = phone;
  if (twoFactor !== undefined) updateData.twoFactor = twoFactor;
  if (profile !== undefined) updateData.profile = profile;
  if (settings !== undefined) {
    updateData.settings =
      typeof settings === "string" ? JSON.parse(settings) : settings;
  }

  // Handle avatar removal if necessary
  if (avatar === null && originalAvatar) {
    try {
      await unlink(originalAvatar);
    } catch (error) {
      console.error(`Failed to unlink avatar: ${error}`);
      throw new Error("Failed to unlink avatar from server");
    }
  }

  // Perform the update
  await models.user.update(updateData, {
    where: { id },
  });

  return { message: "Profile updated successfully" };
};
