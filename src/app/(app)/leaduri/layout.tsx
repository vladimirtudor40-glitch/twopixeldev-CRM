import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { LeadWorkspace } from "@/components/leads/lead-tabs";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/server/session";

// Header-ul „Lead-uri” și bara de tab-uri stau în layout, ca să rămână pe loc
// când treci de la listă la o unitate și înapoi.
export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <PageHeader
        title="Lead-uri"
        actions={
          <>
            {user.role === "ADMIN" && <Link href="/import" className={buttonClass("secondary")}><Upload size={15} />Import</Link>}
            <Link href="/leaduri/nou" className={buttonClass("primary")}><Plus size={15} />Lead nou</Link>
          </>
        }
      />
      <LeadWorkspace>{children}</LeadWorkspace>
    </>
  );
}
