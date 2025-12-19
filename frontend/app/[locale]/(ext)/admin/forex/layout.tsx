import type { ReactNode } from "react";
import SiteHeader from "@/components/partials/header/site-header";
import { LayoutWrapper } from "@/components/partials/dashboard/layout-wrapper";
import Footer from "@/components/partials/footer";
import { menu, colorSchema } from "./menu";

export default function AdminForexLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        userPath="/forex"
      />
      <div className="content-wrapper transition-all duration-150">
        <div className="page-min-height-horizontal">
          <LayoutWrapper>{children}</LayoutWrapper>
        </div>
      </div>
      <Footer />
    </>
  );
}
