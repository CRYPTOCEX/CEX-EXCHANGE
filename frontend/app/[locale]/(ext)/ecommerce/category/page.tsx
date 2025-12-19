import CategoriesClient from "./client";
import { useTranslations } from "next-intl";

export const metadata = {
  title: "Categories | E-commerce",
  description: "Browse our product categories",
};

export default function Page() {
  const t = useTranslations("ext");
  return (
<CategoriesClient />
  );
}
