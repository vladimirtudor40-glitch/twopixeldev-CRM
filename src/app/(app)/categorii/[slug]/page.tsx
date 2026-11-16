import { notFound, redirect } from "next/navigation";
import { categoryHref, LEAD_CATEGORIES } from "@/lib/categories";

// Adresele vechi /categorii/<slug> duc acum la lista unică de lead-uri, filtrată pe categorie.
export default async function CategoryRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = LEAD_CATEGORIES.find((x) => x.slug === slug);
  if (!c) notFound();
  redirect(categoryHref(c.value));
}
