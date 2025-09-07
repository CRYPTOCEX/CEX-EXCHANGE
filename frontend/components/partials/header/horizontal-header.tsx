import React from "react";
import NavbarLogo from "@/components/elements/navbar-logo";

interface HorizontalHeaderProps {
  isInAdmin?: boolean;
}

const horizontalHeader = ({ isInAdmin = false }: HorizontalHeaderProps) => {
  return (
    <NavbarLogo isInAdmin={isInAdmin} />
  );
};

export default horizontalHeader;
