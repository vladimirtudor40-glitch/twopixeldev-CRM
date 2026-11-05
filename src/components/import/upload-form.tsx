"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { uploadImportFile } from "@/server/actions/import";
import { Button } from "@/components/ui/button";

export function UploadForm() {
  const [state, action, pending] = useActionState(uploadImportFile, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="file" className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-navy-600 bg-navy px-4 py-8 text-center hover:border-teal">
        <Upload size={22} className="text-gold" aria-hidden />
        <span className="font-semibold">Alege fișierul exportat de script</span>
        <span className="text-xs text-ink-muted">leaduri_litoral.xlsx (foaia „Leaduri”) sau .csv · maxim 8 MB</span>
        <input id="file" name="file" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required className="mt-2 max-w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-navy-700 file:px-3 file:py-1.5 file:text-ink" />
      </label>
      {state && !state.ok && <p role="alert" className="text-sm text-[#F2A49D]">{state.error}</p>}
      <Button type="submit" variant="primary" disabled={pending} className="self-start">{pending ? "Se citește fișierul…" : "Încarcă și previzualizează"}</Button>
      <p className="text-xs text-ink-muted">Nimic nu se scrie în baza de date până nu apeși „Importă” pe pagina următoare.</p>
    </form>
  );
}
