import ProductsClient from "./client";
import { useTranslations } from "next-intl";

export const metadata = {
  title: "Products | E-commerce",
  description: "Browse our products",
};

export default function Page() {
  const t = useTranslations("ext");
  return (
<ProductsClient />
  );
}
