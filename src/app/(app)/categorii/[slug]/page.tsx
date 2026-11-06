import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { LEAD_CATEGORIES } from "@/lib/categories";
import { requireUser } from "@/server/session";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = LEAD_CATEGORIES.find((x) => x.slug === slug);
  return { title: c?.label ?? "Lead-uri" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser();
  const { slug } = await params;
  const c = LEAD_CATEGORIES.find((x) => x.slug === slug);
  if (!c) notFound();
  return (
    <>
      <PageHeader title={c.label} eyebrow="Lead-uri" />
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-navy-600 p-10 text-center">
        <c.icon size={28} className="text-gold" aria-hidden />
        <p className="font-semibold">Încă nu sunt lead-uri în categoria „{c.label}”.</p>
        <p className="max-w-md text-sm text-ink-muted">
          Deocamdată CRM-ul ține evidența unităților de cazare. Le găsești în{" "}
          <Link href="/leaduri" className="text-teal-hi underline">lista de lead-uri</Link>.
        </p>
      </div>
    </>
  );
}
