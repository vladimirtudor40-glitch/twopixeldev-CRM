import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ImportRowAction } from "@prisma/client";
import { MappingForm } from "@/components/import/mapping-form";
import { ExcludeToggle, RunControls } from "@/components/import/run-controls";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { IMPORT_ACTION_LABEL, IMPORT_STATUS_LABEL, LEAD_FIELD_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import { TARGET_FIELDS } from "@/server/import/fields";
import { planBatch, readMapping } from "@/server/import/run";
import { listActiveUsers } from "@/server/queries/leads";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Import" };

const ACTION_STYLE: Record<ImportRowAction, string> = {
  CREAT: "bg-gold/20 text-gold-hi",
  ACTUALIZAT: "bg-teal/20 text-teal-soft",
  NESCHIMBAT: "bg-navy-700 text-ink-muted",
  IGNORAT: "bg-navy-700 text-ink-muted line-through",
  EROARE: "bg-danger/15 text-danger-hi",
};
const FILTERS: { key: string; label: string; actions: ImportRowAction[] }[] = [
  { key: "toate", label: "Toate", actions: ["CREAT", "ACTUALIZAT", "NESCHIMBAT", "IGNORAT", "EROARE"] },
  { key: "noi", label: "Noi", actions: ["CREAT"] },
  { key: "completate", label: "Completate", actions: ["ACTUALIZAT"] },
  { key: "neschimbate", label: "Neschimbate", actions: ["NESCHIMBAT"] },
  { key: "probleme", label: "Erori și excluse", actions: ["EROARE", "IGNORAT"] },
];
const PREVIEW_LIMIT = 300;

export default async function ImportBatchPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ arata?: string }>;
}) {
  const { id } = await params;
  const { arata = "toate" } = await searchParams;
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  const batch = await prisma.importBatch.findUnique({ where: { id }, include: { createdBy: { select: { name: true, email: true } } } });
  if (!batch) notFound();
  const mapping = readMapping(batch.columnMap);
  const filter = FILTERS.find((f) => f.key === arata) ?? FILTERS[0]!;
  const preview = batch.status === "PREVIZUALIZARE";

  let summary: { total: number; create: number; update: number; unchanged: number; skipped: number; error: number };
  let rows: { rowNumber: number; action: ImportRowAction; name: string | null; leadId: string | null; matchedBy: string | null; updatedFields: string[]; error: string | null; merged: number | null }[];

  if (preview) {
    const { plan } = await planBatch(prisma, id);
    summary = plan.summary;
    rows = plan.rows.map((r) => ({
      rowNumber: r.rowNumber, action: r.action, name: r.name, leadId: plan.creates.has(r.leadId ?? "") ? null : r.leadId,
      matchedBy: r.matchedBy, updatedFields: r.updatedFields, error: r.error, merged: r.mergedIntoRow,
    }));
  } else {
    const stored = await prisma.importRow.findMany({ where: { batchId: id }, orderBy: { rowNumber: "asc" }, include: { lead: { select: { name: true } } } });
    summary = { total: batch.totalRows, create: batch.createdRows, update: batch.updatedRows, unchanged: batch.unchangedRows, skipped: batch.skippedRows, error: batch.errorRows };
    rows = stored.map((r) => ({
      rowNumber: r.rowNumber, action: r.action ?? "IGNORAT", name: r.lead?.name ?? ((r.raw as Record<string, string>)?.[Object.entries(mapping.map).find(([, k]) => k === "name")?.[0] ?? ""] ?? null),
      leadId: r.leadId, matchedBy: r.matchedBy, updatedFields: r.updatedFields, error: r.error, merged: null,
    }));
  }
  const shown = rows.filter((r) => filter.actions.includes(r.action));
  const firstRows = preview ? await prisma.importRow.findMany({ where: { batchId: id }, orderBy: { rowNumber: "asc" }, take: 5, select: { raw: true } }) : [];
  const samples: Record<string, string> = {};
  for (const h of mapping.headers) samples[h] = firstRows.map((r) => (r.raw as Record<string, string>)[h]).find((v) => v) ?? "";
  const owners = preview ? await listActiveUsers() : [];

  const tiles = [
    { label: "Lead-uri noi", value: summary.create, cls: "text-gold-hi" },
    { label: "Completează câmpuri goale", value: summary.update, cls: "text-teal-soft" },
    { label: "Deja în CRM, nimic nou", value: summary.unchanged, cls: "" },
    { label: "Erori / excluse", value: summary.error + summary.skipped, cls: summary.error ? "text-danger-hi" : "" },
  ];

  return (
    <>
      <PageHeader title={batch.fileName} eyebrow={`Import · ${IMPORT_STATUS_LABEL[batch.status]}`}>
        <p className="mt-1 text-sm text-ink-muted">
          {formatNumber(summary.total)} rânduri{batch.sheetName ? ` din foaia „${batch.sheetName}”` : ""} · încărcat {formatDateTime(batch.createdAt)} de {batch.createdBy?.name || batch.createdBy?.email}
          {batch.finishedAt && batch.status === "FINALIZAT" ? ` · importat ${formatDateTime(batch.finishedAt)}` : ""}
        </p>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-navy-600 bg-navy-800 px-4 py-3">
            <div className="text-[15px] font-semibold uppercase tracking-[0.06em] text-ink-muted">{t.label}</div>
            <div className={cn("mt-1 font-display text-2xl font-extrabold tabular", t.cls)}>{formatNumber(t.value)}</div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="mb-4 flex flex-col gap-4">
          <Panel>
            <h2 className="mb-1 font-display text-base font-bold">Rulează importul</h2>
            <p className="mb-3 text-sm text-ink-muted">Verifică cifrele de mai sus și rândurile de mai jos. La lead-urile existente se completează doar câmpurile goale.</p>
            <RunControls batchId={batch.id} summary={summary} owners={owners} defaultOwnerId={batch.defaultOwnerId} />
          </Panel>
          <details className="rounded-xl border border-navy-600 bg-navy-800 p-4" open={!Object.values(mapping.map).includes("name")}>
            <summary className="cursor-pointer font-display text-base font-bold">Maparea coloanelor ({Object.values(mapping.map).filter(Boolean).length} din {mapping.headers.length} recunoscute)</summary>
            <div className="mt-3">
              <MappingForm batchId={batch.id} headers={mapping.headers} map={mapping.map} samples={samples} targets={TARGET_FIELDS.map((t) => ({ key: t.key, label: t.label }))} />
            </div>
          </details>
        </div>
      )}

      {batch.status === "FINALIZAT" && (
        <p className="mb-4 text-sm"><Link href="/leaduri?sort=adaugat&dir=desc" className="text-teal-hi hover:underline">Vezi lead-urile în listă →</Link></p>
      )}

      <Panel>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <h2 className="mr-2 font-display text-base font-bold">Rânduri</h2>
          {FILTERS.map((f) => (
            <Link key={f.key} href={`/import/${batch.id}?arata=${f.key}`} scroll={false} aria-current={f.key === filter.key ? "true" : undefined}
              className={cn("rounded-full border border-navy-600 px-2.5 py-1 text-xs text-ink-muted", f.key === filter.key && "border-teal bg-teal/15 text-ink")}>
              {f.label} <span className="tabular">{rows.filter((r) => f.actions.includes(r.action)).length}</span>
            </Link>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead><tr className="text-left text-[15px] uppercase tracking-[0.06em] text-ink-muted">
              <th className="py-1.5 pr-3 font-semibold">Rând</th><th className="py-1.5 pr-3 font-semibold">Ce se întâmplă</th>
              <th className="py-1.5 pr-3 font-semibold">Unitate</th><th className="py-1.5 pr-3 font-semibold">Detalii</th>
              {preview && <th className="py-1.5 font-semibold"><span className="sr-only">Exclude</span></th>}
            </tr></thead>
            <tbody>
              {shown.slice(0, PREVIEW_LIMIT).map((r) => (
                <tr key={r.rowNumber} className="border-t border-navy-600 align-top">
                  <td className="py-1.5 pr-3 tabular text-ink-muted">{r.rowNumber}</td>
                  <td className="py-1.5 pr-3"><span className={cn("whitespace-nowrap rounded px-1.5 py-0.5 text-[15px] font-semibold", ACTION_STYLE[r.action])}>{IMPORT_ACTION_LABEL[r.action]}</span></td>
                  <td className="py-1.5 pr-3">{r.leadId && !preview ? <Link href={`/leaduri/${r.leadId}`} className="hover:text-gold-hi">{r.name}</Link> : r.leadId ? <Link href={`/leaduri/${r.leadId}`} className="hover:text-gold-hi">{r.name}</Link> : (r.name ?? "—")}</td>
                  <td className="py-1.5 pr-3 text-xs text-ink-muted">
                    {r.error ?? (
                      <>
                        {r.matchedBy && <>potrivit după {r.matchedBy}{r.merged ? ` cu rândul ${r.merged} din fișier` : ""}</>}
                        {r.updatedFields.length > 0 && <> · completează {r.updatedFields.map((f) => LEAD_FIELD_LABEL[f] ?? f).join(", ")}</>}
                      </>
                    )}
                  </td>
                  {preview && <td className="py-1.5">{(r.action === "CREAT" || r.action === "ACTUALIZAT" || r.action === "IGNORAT") && <ExcludeToggle batchId={batch.id} rowNumber={r.rowNumber} excluded={r.action === "IGNORAT"} />}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length > PREVIEW_LIMIT && <p className="mt-2 text-xs text-ink-muted">Se arată primele {PREVIEW_LIMIT} din {formatNumber(shown.length)} rânduri. Folosește filtrele de mai sus.</p>}
          {shown.length === 0 && <p className="py-4 text-sm text-ink-muted">Niciun rând în această categorie.</p>}
        </div>
      </Panel>
    </>
  );
}
