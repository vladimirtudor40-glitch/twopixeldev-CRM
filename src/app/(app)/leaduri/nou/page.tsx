import type { Metadata } from "next";
import type { LeadCategory } from "@prisma/client";
import { LeadForm } from "@/components/leads/lead-form";
import { CATEGORIES } from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { listActiveUsers } from "@/server/queries/leads";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Lead nou" };

export default async function NewLeadPage({ searchParams }: { searchParams: Promise<{ categorie?: string }> }) {
  const [user, users, sp] = await Promise.all([requireUser(), listActiveUsers(), searchParams]);
  // „Adaugă primul lead” dintr-o categorie goală vine cu ?categorie=…, ca formularul să pornească pe ea.
  const category: LeadCategory = CATEGORIES.find((c) => c === sp.categorie) ?? "HOTELURI";
  return (
    <>
      <PageHeader title="Lead nou" eyebrow="Lead-uri" />
      <LeadForm
        users={users}
        canChangeOwner={user.role === "ADMIN"}
        defaults={{
          name: "", category, type: category === "HOTELURI" ? "PENSIUNE_VILA" : "ALTUL", zone: "MAMAIA", websiteStatus: "NECUNOSCUT", source: "MANUAL", priority: "B",
          ownerId: user.id, tags: "",
        }}
      />
    </>
  );
}
