"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Ban, UserCheck } from "lucide-react";
import { archiveLead, claimLead, setDoNotContact } from "@/server/actions/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function OptOutControl({ leadId, active, canEdit }: { leadId: string; active: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  if (!canEdit) return null;
  const run = (value: boolean) => start(async () => {
    const r = await setDoNotContact(leadId, value, reason);
    setMsg(r.ok ? null : r.error);
    if (r.ok) { setOpen(false); setReason(""); router.refresh(); }
  });
  if (active) return <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(false)}>Anulează „Nu mai contacta”</Button>;
  return open ? (
    <div className="flex flex-wrap items-center gap-2">
      <Input id="optout-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motiv (opțional), ex. a cerut la telefon" className="h-8 w-72 max-w-full" />
      <Button size="sm" variant="danger" disabled={pending} onClick={() => run(true)}>Confirmă</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Renunță</Button>
      {msg && <span role="alert" className="text-xs text-[#F2A49D]">{msg}</span>}
    </div>
  ) : (
    <Button size="sm" variant="danger" onClick={() => setOpen(true)}><Ban size={13} />Nu mai contacta</Button>
  );
}

export function ClaimButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="primary" disabled={pending} onClick={() => start(async () => { await claimLead(leadId); router.refresh(); })}>
      <UserCheck size={13} />Preia lead-ul
    </Button>
  );
}

export function ArchiveButton({ leadId, archived }: { leadId: string; archived: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  if (archived) {
    return <Button size="sm" disabled={pending} onClick={() => start(async () => { await archiveLead(leadId, false); router.refresh(); })}><ArchiveRestore size={13} />Restaurează</Button>;
  }
  return confirm ? (
    <span className="flex items-center gap-2">
      <span className="text-xs text-ink-muted">Lead-ul dispare din liste, dar rămâne în bază.</span>
      <Button size="sm" variant="danger" disabled={pending} onClick={() => start(async () => { await archiveLead(leadId, true); })}>Arhivează</Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Nu</Button>
    </span>
  ) : (
    <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}><Archive size={13} />Arhivează</Button>
  );
}
