import type { Metadata } from "next";
import { LeadSearch } from "@/components/lead-search/lead-search";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { isAvailable, resultsDir } from "@/server/lead-search/runner";
import { canImport } from "@/server/permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Caută lead-uri" };
export const dynamic = "force-dynamic";

export default async function LeadSearchPage() {
  const user = await requireUser();
  if (!isAvailable()) {
    return (
      <>
        <PageHeader title="Caută lead-uri" eyebrow="Google Maps" />
        <Panel className="max-w-2xl">
          <p className="text-sm text-ink-muted">
            Căutarea de firme pe Google Maps merge doar în programul de Windows <b className="text-ink">twopixeldev CRM</b>, care
            pornește căutarea pe laptop. Deschide programul și apasă „Caută lead-uri” din meniul din stânga.
          </p>
        </Panel>
      </>
    );
  }
  return <LeadSearch canImport={canImport(user)} outDir={resultsDir()} />;
}
