"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, MessageCircle, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import type { Contact } from "@prisma/client";
import { CHANNELS, CHANNEL_LABEL, CONTACT_ROLES, CONTACT_ROLE_LABEL } from "@/lib/labels";
import { telLink, whatsappLink } from "@/lib/links";
import { contactFormSchema, type ContactFormInput } from "@/lib/validators/contact";
import { deleteContact, saveContact } from "@/server/actions/contacts";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

type C = Pick<Contact, "id" | "name" | "role" | "phone" | "whatsapp" | "email" | "preferredChannel" | "isPrimary" | "notes">;

function ContactForm({ leadId, contact, onDone }: { leadId: string; contact?: C; onDone: () => void }) {
  const router = useRouter();
  const [error, setErr] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ContactFormInput>({
    resolver: zodResolver(contactFormSchema, undefined, { raw: true }) as never,
    defaultValues: contact
      ? { name: contact.name, role: contact.role, phone: contact.phone ?? "", whatsapp: contact.whatsapp ?? "", email: contact.email ?? "", preferredChannel: contact.preferredChannel, isPrimary: contact.isPrimary, notes: contact.notes ?? "" }
      : { name: "", role: "PROPRIETAR", preferredChannel: "TELEFON", isPrimary: false },
  });
  const id = contact?.id ?? "nou";
  const reg = (k: keyof ContactFormInput) => ({ id: `c-${id}-${k}`, "aria-invalid": !!errors[k], ...register(k) });
  return (
    <form
      noValidate
      className="flex flex-col gap-3 rounded-lg border border-navy-600 bg-navy p-3"
      onSubmit={handleSubmit(async (v) => {
        const r = await saveContact(leadId, contact?.id ?? null, v);
        if (r.ok) { onDone(); router.refresh(); return; }
        setErr(r.error);
        for (const [k, m] of Object.entries(r.fieldErrors ?? {})) if (m?.[0]) setError(k as keyof ContactFormInput, { message: m[0] });
      })}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nume *" htmlFor={`c-${id}-name`} error={errors.name?.message}><Input {...reg("name")} autoFocus /></Field>
        <Field label="Rol" htmlFor={`c-${id}-role`}><Select {...reg("role")}>{CONTACT_ROLES.map((r) => <option key={r} value={r}>{CONTACT_ROLE_LABEL[r]}</option>)}</Select></Field>
        <Field label="Telefon" htmlFor={`c-${id}-phone`} error={errors.phone?.message}><Input {...reg("phone")} type="tel" /></Field>
        <Field label="WhatsApp (dacă diferă)" htmlFor={`c-${id}-whatsapp`}><Input {...reg("whatsapp")} type="tel" /></Field>
        <Field label="Email" htmlFor={`c-${id}-email`} error={errors.email?.message}><Input {...reg("email")} type="email" /></Field>
        <Field label="Preferă" htmlFor={`c-${id}-preferredChannel`}><Select {...reg("preferredChannel")}>{CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}</Select></Field>
        <Field label="Notițe" htmlFor={`c-${id}-notes`} className="sm:col-span-2"><Textarea {...reg("notes")} rows={2} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("isPrimary")} className="h-4 w-4 accent-teal" />Contact principal</label>
      {error && <p role="alert" className="text-sm text-[#F2A49D]">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={isSubmitting}>{isSubmitting ? "Se salvează…" : "Salvează"}</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Renunță</Button>
      </div>
    </form>
  );
}

export function ContactsSection({ leadId, contacts, canEdit, blocked }: { leadId: string; contacts: C[]; canEdit: boolean; blocked: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {contacts.length === 0 && editing !== "nou" && (
        <p className="text-sm text-ink-muted">Încă nu avem persoane de contact. După primul apel, adaugă proprietarul sau administratorul.</p>
      )}
      {contacts.map((c) =>
        editing === c.id ? (
          <ContactForm key={c.id} leadId={leadId} contact={c} onDone={() => setEditing(null)} />
        ) : (
          <div key={c.id} className="flex flex-col gap-2 rounded-lg border border-navy-600 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <b>{c.name}</b>
              <span className="rounded-full border border-navy-600 px-2 py-0.5 text-[11px] text-ink-muted">{CONTACT_ROLE_LABEL[c.role]}</span>
              {c.isPrimary && <span className="text-[11px] text-gold">principal</span>}
              {canEdit && (
                <span className="ml-auto flex gap-1">
                  <button type="button" aria-label={`Editează ${c.name}`} className="rounded p-1 text-ink-muted hover:text-ink" onClick={() => setEditing(c.id)}><Pencil size={14} /></button>
                  {confirmDelete === c.id ? (
                    <>
                      <Button size="sm" variant="danger" onClick={async () => { await deleteContact(leadId, c.id); setConfirmDelete(null); router.refresh(); }}>Șterge</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Nu</Button>
                    </>
                  ) : (
                    <button type="button" aria-label={`Șterge ${c.name}`} className="rounded p-1 text-ink-muted hover:text-[#F2A49D]" onClick={() => setConfirmDelete(c.id)}><Trash2 size={14} /></button>
                  )}
                </span>
              )}
            </div>
            <div className="text-sm text-ink-muted">
              {[c.phone, c.email].filter(Boolean).join(" · ")} · preferă {CHANNEL_LABEL[c.preferredChannel].toLowerCase()}
            </div>
            {c.notes && <p className="text-sm">{c.notes}</p>}
            {!blocked && (
              <div className="flex flex-wrap gap-2">
                {telLink(c.phone) && <a href={telLink(c.phone)!} className={buttonClass("secondary", "sm")}><Phone size={13} />Sună</a>}
                {whatsappLink(c.whatsapp || c.phone) && <a href={whatsappLink(c.whatsapp || c.phone)!} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}><MessageCircle size={13} />WhatsApp</a>}
                {c.email && <a href={`mailto:${c.email}`} className={buttonClass("secondary", "sm")}><Mail size={13} />Email</a>}
              </div>
            )}
          </div>
        ),
      )}
      {canEdit && (editing === "nou" ? (
        <ContactForm leadId={leadId} onDone={() => setEditing(null)} />
      ) : (
        <Button size="sm" className="self-start" onClick={() => setEditing("nou")}><Plus size={14} />Adaugă persoană</Button>
      ))}
    </div>
  );
}
