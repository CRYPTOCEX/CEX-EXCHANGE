import type { Metadata } from "next";
import Client from "./client";

export const metadata: Metadata = {
  title: "E-commerce | Shop with Cryptocurrency",
  description:
    "Welcome to our e-commerce platform where you can shop with cryptocurrency and traditional payment methods",
};

export default function Page() {
  return <Client />;
}
