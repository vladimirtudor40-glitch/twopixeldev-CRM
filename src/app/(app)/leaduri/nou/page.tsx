import type { Metadata } from "next";
import { LeadForm } from "@/components/leads/lead-form";
import { PageHeader } from "@/components/ui/page-header";
import { listActiveUsers } from "@/server/queries/leads";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Lead nou" };

export default async function NewLeadPage() {
  const user = await requireUser();
  const users = await listActiveUsers();
  return (
    <>
      <PageHeader title="Lead nou" eyebrow="Lead-uri" />
      <LeadForm
        users={users}
        canChangeOwner={user.role === "ADMIN"}
        defaults={{
          name: "", type: "PENSIUNE_VILA", zone: "MAMAIA", websiteStatus: "NECUNOSCUT", source: "MANUAL", priority: "B",
          ownerId: user.id, tags: "",
        }}
      />
    </>
  );
}
