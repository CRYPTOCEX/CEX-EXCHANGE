"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserStore } from "@/store/user";
import { Icon } from "@iconify/react";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

const ProfileInfo = () => {
  const t = useTranslations("components/partials/header/profile-info");
  const { user, logout } = useUserStore();
  const router = useRouter();

  const handleSignOut = async () => {
    const success = await logout();
    if (success) {
      router.push("/");
    }
  };

  const menuItems = [
    { name: "Profile", icon: "ph:user-circle-duotone", href: "/user/profile" },
    { name: "Assets", icon: "ph:wallet", href: "/finance/wallet" },
    { name: "API Management", icon: "carbon:api", href: "/user/profile?tab=api" },
  ];

  // Use ShadCN defaults for text colors and spacing
  const linkItemClasses =
    "flex items-center gap-2 text-sm font-medium text-muted-foreground capitalize px-3 py-1.5 hover:bg-muted cursor-pointer transition-colors duration-200";

  // Helper function to get user initials
  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="cursor-pointer">
        <div className="flex items-center">
          <Avatar className="h-9 w-9 border-2 border-white shadow-sm hover:shadow-md transition-shadow duration-200">
            <AvatarImage
              src={user?.avatar || "/img/avatars/placeholder.webp"}
              alt={`Avatar of ${user ? user.firstName + " " + user.lastName : "Guest User"}`}
            />
            <AvatarFallback className="bg-primary text-primary-foreground font-medium text-sm">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-0 px-1" align="end">
        <DropdownMenuLabel className="mb-1 flex items-center gap-2 px-2 pt-3">
          <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
            <AvatarImage
              src={user?.avatar || "/img/avatars/placeholder.webp"}
              alt={`Avatar of ${user ? user.firstName + " " + user.lastName : "Guest User"}`}
            />
            <AvatarFallback className="bg-primary text-primary-foreground font-medium text-sm">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium capitalize text-foreground">
              {user ? `${user.firstName} ${user.lastName}` : "Guest User"}
            </div>
            <span className="text-xs text-muted-foreground hover:text-primary">
              {user?.email
                ? user?.email.length > 20
                  ? user?.email.slice(0, 20) + "..."
                  : user?.email
                : ""}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mb-1 dark:bg-muted" />

        <DropdownMenuGroup>
          {menuItems.map((item, index) => (
            <DropdownMenuItem asChild key={`info-menu-${index}`}>
              <Link href={item.href} className={linkItemClasses}>
                <Icon icon={item.icon} className="h-4 w-4" />
                {item.name}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="mb-0 dark:bg-muted" />

        <DropdownMenuItem
          onSelect={handleSignOut}
          className={`${linkItemClasses} my-1`}
        >
          <Icon icon="ph:lock-duotone" className="h-4 w-4" />
          {t("Logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileInfo;
