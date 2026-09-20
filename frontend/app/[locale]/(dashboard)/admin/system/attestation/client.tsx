"use client";

import { ShieldCheck } from "lucide-react";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { AttestationCountryLists } from "./country-lists";

/**
 * Operator licence attestations.
 *
 * DEFAULT DENY. An empty table serves no regulated module to anybody — not
 * futures, not staking, not P2P. That is deliberate and it is the expensive
 * direction: a fresh install shows customers fewer modules until this is filled
 * in. The alternative — serve everything until somebody objects — is how a
 * fleet of near-identical operator apps ends up in front of a reviewer with no
 * licence behind any of them.
 *
 * `canCreate` and `canDelete` are BOTH on, unlike the report queues elsewhere
 * in the admin: this is the operator's own record of their own licences, so
 * writing one and withdrawing one are the whole job.
 *
 * Permissions are the GEO-RESTRICTION family. A new `*.attestation` key would
 * have to be registered in four places and only the seeder writes the
 * permission table, so it would be ungrantable and would 403 every
 * non-Super-Admin, silently and forever. `access.system.settings` was the first
 * guess and is not seeded either — the seeder creates `access.settings`.
 * Geo-restriction fits on the merits: same desk, same question, and all five
 * CRUD verbs are already granted.
 */
export default function OperatorAttestationClient() {
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/system/attestation"
      model="operatorAttestation"
      permissions={{
        access: "access.geo.restriction",
        view: "view.geo.restriction",
        create: "create.geo.restriction",
        edit: "edit.geo.restriction",
        delete: "delete.geo.restriction",
      }}
      pageSize={20}
      canCreate={true}
      canEdit={true}
      canDelete={true}
      canView={true}
      title="Licence attestations"
      description="The countries this platform is licensed to serve, per module. A regulated module reaches only residents of a country listed here whose licence has not expired — an empty table reaches nobody."
      itemTitle="Attestation"
      columns={columns}
      formConfig={formConfig}
      isParanoid={true}
      /*
        Rendered by the table so it sits BELOW the heading and inside the same
        container as the rows, rather than floating above the hero at its own
        width. The lists are derived from those rows, so they belong beside
        them — and until this panel existed the endpoint that computes them had
        no caller at all.
      */
      alertContent={<AttestationCountryLists />}
      design={{ icon: ShieldCheck }}
    />
  );
}
