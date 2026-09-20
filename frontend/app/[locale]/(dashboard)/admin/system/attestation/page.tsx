import type { Metadata } from "next";
import OperatorAttestationClient from "./client";

export const metadata: Metadata = {
  title: "Licence Attestations | Admin Dashboard",
  description: "Countries this platform is licensed to serve, per module",
};

export default function OperatorAttestationPage() {
  return <OperatorAttestationClient />;
}
