import React from "react";
import Logo from "@/components/elements/logo";
import { Link } from "@/i18n/routing";
import { siteName } from "@/lib/siteInfo";

interface HorizontalHeaderProps {
  isInAdmin?: boolean;
}

const horizontalHeader = ({ isInAdmin = false }: HorizontalHeaderProps) => {
  const logoHref = isInAdmin ? "/admin" : "/";

  return (
    <div className="flex items-center gap-3">
      <div>
        <Link href={logoHref} className="text-primary flex items-center gap-2">
                        <Logo className="h-7 w-7" />
          <span className="text-xl font-semibold lg:inline-block hidden">
            {siteName}
          </span>
        </Link>
      </div>
    </div>
  );
};

export default horizontalHeader;
