import type { Metadata } from "next";
import Link from "next/link";
import { UploadForm } from "@/components/import/upload-form";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { IMPORT_STATUS_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return (<><PageHeader title="Import" /><p className="text-sm text-ink-muted">Importul e disponibil doar pentru administratori.</p></>);
  }
  const batches = await prisma.importBatch.findMany({
    orderBy: { createdAt: "desc" }, take: 30, include: { createdBy: { select: { name: true, email: true } } },
  });
  return (
    <>
      <PageHeader title="Import Excel / CSV">
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Coloanele exportului din scriptul <code>gaseste_leaduri.py</code> sunt recunoscute automat. Unitățile care există deja sunt
          recunoscute după ID-ul OpenStreetMap, nume + zonă + telefon sau telefon. La re-import se completează doar câmpurile goale:
          ce ai scris de mână, etapa, responsabilul și notițele rămân neschimbate.
        </p>
      </PageHeader>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Panel><UploadForm /></Panel>
        <Panel>
          <h2 className="mb-3 font-display text-base font-bold">Importuri anterioare</h2>
          {batches.length === 0 ? <p className="text-sm text-ink-muted">Niciun import încă.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                  <th className="py-1.5 pr-3 font-semibold">Fișier</th><th className="py-1.5 pr-3 font-semibold">Status</th>
                  <th className="py-1.5 pr-3 font-semibold">Noi</th><th className="py-1.5 pr-3 font-semibold">Completate</th><th className="py-1.5 font-semibold">Când</th>
                </tr></thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-t border-navy-600">
                      <td className="py-2 pr-3"><Link href={`/import/${b.id}`} className="font-medium text-teal-hi hover:underline">{b.fileName}</Link><div className="text-xs text-ink-muted">{b.totalRows} rânduri</div></td>
                      <td className="py-2 pr-3">{IMPORT_STATUS_LABEL[b.status]}</td>
                      <td className="py-2 pr-3 tabular">{b.status === "FINALIZAT" ? b.createdRows : "—"}</td>
                      <td className="py-2 pr-3 tabular">{b.status === "FINALIZAT" ? b.updatedRows : "—"}</td>
                      <td className="py-2 text-xs text-ink-muted">{formatDateTime(b.createdAt)}<br />{b.createdBy?.name || b.createdBy?.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
