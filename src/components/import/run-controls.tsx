"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelImport, runImport, setDefaultOwner, toggleRowExcluded } from "@/server/actions/import";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

export function RunControls({ batchId, summary, owners, defaultOwnerId }: {
  batchId: string;
  summary: { create: number; update: number; unchanged: number; skipped: number; error: number };
  owners: { id: string; name: string | null; email: string }[];
  defaultOwnerId: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const nothing = summary.create + summary.update === 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="import-owner" className="text-xs text-ink-muted">Responsabil pentru lead-urile noi</label>
          <Select id="import-owner" className="w-64" defaultValue={defaultOwnerId ?? ""} onChange={(e) => start(async () => { await setDefaultOwner(batchId, e.target.value); router.refresh(); })}>
            <option value="">Fără responsabil</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name || o.email}</option>)}
          </Select>
        </div>
        <Button variant="gold" disabled={pending || nothing} onClick={() => start(async () => {
          const r = await runImport(batchId);
          setResult(r.ok ? { ok: true, text: r.message ?? "Import finalizat." } : { ok: false, text: r.error });
          router.refresh();
        })}>
          {pending ? "Se importă…" : nothing ? "Nimic nou de importat" : `Importă: ${summary.create} noi, ${summary.update} completate`}
        </Button>
        {confirmCancel ? (
          <span className="flex items-center gap-2">
            <Button variant="danger" size="sm" onClick={() => start(async () => { await cancelImport(batchId); })}>Anulează importul</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>Nu</Button>
          </span>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(true)}>Anulează</Button>
        )}
      </div>
      {result && <p role="status" className={result.ok ? "text-sm text-ok-hi" : "text-sm text-danger-hi"}>{result.text}</p>}
    </div>
  );
}

export function ExcludeToggle({ batchId, rowNumber, excluded }: { batchId: string; rowNumber: number; excluded: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
      onClick={() => start(async () => { await toggleRowExcluded(batchId, rowNumber, !excluded); router.refresh(); })}
    >
      {excluded ? "Include" : "Exclude"}
    </button>
  );
}
