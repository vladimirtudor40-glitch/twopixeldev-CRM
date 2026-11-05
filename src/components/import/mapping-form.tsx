"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveColumnMap } from "@/server/actions/import";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

export function MappingForm({ batchId, headers, map, targets, samples }: {
  batchId: string;
  headers: string[];
  map: Record<string, string>;
  targets: { key: string; label: string }[];
  samples: Record<string, string>;
}) {
  const router = useRouter();
  const [value, setValue] = useState(map);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(value) !== JSON.stringify(map);
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.06em] text-ink-muted">
              <th className="py-1.5 pr-3 font-semibold">Coloana din fișier</th>
              <th className="py-1.5 pr-3 font-semibold">Exemplu</th>
              <th className="py-1.5 font-semibold">Câmp în CRM</th>
            </tr>
          </thead>
          <tbody>
            {headers.map((h, i) => (
              <tr key={h} className="border-t border-navy-600">
                <td className="py-1.5 pr-3 font-medium">{h}</td>
                <td className="max-w-[260px] truncate py-1.5 pr-3 text-xs text-ink-muted" title={samples[h]}>{samples[h] || "—"}</td>
                <td className="py-1.5">
                  <Select id={`map-${i}`} aria-label={`Câmp pentru ${h}`} value={value[h] ?? ""} onChange={(e) => setValue({ ...value, [h]: e.target.value })} className={value[h] ? "" : "text-ink-muted"}>
                    <option value="">Ignoră coloana</option>
                    {targets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={dirty ? "primary" : "secondary"} disabled={!dirty || pending} onClick={() => start(async () => {
          const r = await saveColumnMap(batchId, value);
          setMsg(r.ok ? { ok: true, text: r.message ?? "Salvat." } : { ok: false, text: r.error });
          if (r.ok) router.refresh();
        })}>{pending ? "Se recalculează…" : "Salvează maparea"}</Button>
        {dirty && <Button size="sm" variant="ghost" onClick={() => setValue(map)}>Renunță la modificări</Button>}
        {msg && <span role="status" className={msg.ok ? "text-xs text-ink-muted" : "text-xs text-[#F2A49D]"}>{msg.text}</span>}
      </div>
    </div>
  );
}
