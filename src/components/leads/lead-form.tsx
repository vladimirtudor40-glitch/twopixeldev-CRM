"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CATEGORIES, CATEGORY_LABEL, PRIORITIES, PRIORITY_LABEL, SOURCES, SOURCE_LABEL, TYPES, TYPE_LABEL, WEBSITE_LABEL, WEBSITE_STATUSES, ZONES, ZONE_LABEL,
} from "@/lib/labels";
import { leadFormSchema, type LeadFormInput } from "@/lib/validators/lead";
import { createLead, updateLead } from "@/server/actions/leads";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Panel } from "@/components/ui/page-header";

type Props = {
  leadId?: string;
  defaults: LeadFormInput;
  users: { id: string; name: string | null; email: string }[];
  canChangeOwner: boolean;
};

export function LeadForm({ leadId, defaults, users, canChangeOwner }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm<LeadFormInput>({
    resolver: zodResolver(leadFormSchema, undefined, { raw: true }) as never,
    defaultValues: defaults,
  });

  const submit = async (values: LeadFormInput, ignoreDuplicate = false) => {
    setServerError(null);
    const res = leadId ? await updateLead(leadId, values) : await createLead({ ...values, ignoreDuplicate });
    if (res.ok) {
      router.push(`/leaduri/${res.data!.id}`);
      router.refresh();
      return;
    }
    const dupId = res.fieldErrors?.name?.[0]?.startsWith("duplicat:") ? res.fieldErrors.name[0].slice(9) : null;
    setDuplicate(dupId);
    setServerError(res.error);
    for (const [k, v] of Object.entries(res.fieldErrors ?? {})) {
      if (v?.[0] && !v[0].startsWith("duplicat:")) setError(k as keyof LeadFormInput, { message: v[0] });
    }
  };

  // Câmpurile specifice cazării (tip, stele, camere, locuri) apar doar la categoria „Hoteluri”.
  const isLodging = watch("category") === "HOTELURI";

  const err = (k: keyof LeadFormInput) => errors[k]?.message as string | undefined;
  const reg = (k: keyof LeadFormInput) => ({ id: `f-${k}`, "aria-invalid": !!errors[k], ...register(k) });

  return (
    <form onSubmit={handleSubmit((v) => submit(v))} className="flex flex-col gap-4" noValidate>
      <Panel>
        <h2 className="mb-3 font-display text-base font-bold">Lead-ul</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nume *" htmlFor="f-name" error={err("name")} className="sm:col-span-2 lg:col-span-1"><Input {...reg("name")} autoFocus={!leadId} /></Field>
          <Field label="Categorie" htmlFor="f-category"><Select {...reg("category")}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select></Field>
          {isLodging
            ? <Field label="Tip unitate" htmlFor="f-type"><Select {...reg("type")}>{TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</Select></Field>
            : <Field label="Tip" htmlFor="f-businessType" error={err("businessType")}><Input {...reg("businessType")} placeholder="ex. Cafenea, Beach club" /></Field>}
          <Field label="Zonă" htmlFor="f-zone"><Select {...reg("zone")}>{ZONES.map((z) => <option key={z} value={z}>{ZONE_LABEL[z]}</option>)}</Select></Field>
          <Field label="Adresă" htmlFor="f-address" error={err("address")} className="sm:col-span-2"><Input {...reg("address")} /></Field>
          {isLodging && (
            <>
              <Field label="Categorie (stele / flori)" htmlFor="f-categoryMinistry" error={err("categoryMinistry")}><Input {...reg("categoryMinistry")} placeholder="ex. 3 flori" /></Field>
              <Field label="Stele (OSM)" htmlFor="f-starsOsm" error={err("starsOsm")}><Input {...reg("starsOsm")} inputMode="numeric" /></Field>
              <Field label="Camere" htmlFor="f-roomsCount" error={err("roomsCount")}><Input {...reg("roomsCount")} inputMode="numeric" /></Field>
              <Field label="Locuri" htmlFor="f-placesCount" error={err("placesCount")}><Input {...reg("placesCount")} inputMode="numeric" /></Field>
            </>
          )}
          <Field label="Latitudine" htmlFor="f-latitude" error={err("latitude")}><Input {...reg("latitude")} inputMode="decimal" placeholder="44.2169" /></Field>
          <Field label="Longitudine" htmlFor="f-longitude" error={err("longitude")}><Input {...reg("longitude")} inputMode="decimal" placeholder="28.6254" /></Field>
        </div>
      </Panel>

      <Panel>
        <h2 className="mb-3 font-display text-base font-bold">Contact și prezență online</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Telefon" htmlFor="f-phone" error={err("phone")}><Input {...reg("phone")} type="tel" placeholder="07xx xxx xxx" /></Field>
          <Field label="Email" htmlFor="f-email" error={err("email")}><Input {...reg("email")} type="email" /></Field>
          <Field label="Status site" htmlFor="f-websiteStatus"><Select {...reg("websiteStatus")}>{WEBSITE_STATUSES.map((w) => <option key={w} value={w}>{WEBSITE_LABEL[w]}</option>)}</Select></Field>
          <Field label="Site propriu" htmlFor="f-websiteUrl" error={err("websiteUrl")}><Input {...reg("websiteUrl")} placeholder="https://" /></Field>
          <Field label="Booking" htmlFor="f-bookingUrl" error={err("bookingUrl")}><Input {...reg("bookingUrl")} placeholder="https://www.booking.com/hotel/ro/…" /></Field>
          <Field label="Facebook" htmlFor="f-facebookUrl" error={err("facebookUrl")}><Input {...reg("facebookUrl")} /></Field>
          <Field label="Instagram" htmlFor="f-instagramUrl" error={err("instagramUrl")}><Input {...reg("instagramUrl")} /></Field>
          <Field label="Google Maps" htmlFor="f-googleMapsUrl" error={err("googleMapsUrl")}><Input {...reg("googleMapsUrl")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rating Google (1–5)" htmlFor="f-ratingGoogle" error={err("ratingGoogle")}><Input {...reg("ratingGoogle")} inputMode="decimal" /></Field>
            <Field label="Rating Booking (1–10)" htmlFor="f-ratingBooking" error={err("ratingBooking")}><Input {...reg("ratingBooking")} inputMode="decimal" /></Field>
          </div>
          <Field label="Operator (firmă)" htmlFor="f-operatorName" error={err("operatorName")}><Input {...reg("operatorName")} placeholder="SC … SRL" /></Field>
          <Field label="CUI operator" htmlFor="f-operatorCui" error={err("operatorCui")}><Input {...reg("operatorCui")} /></Field>
        </div>
      </Panel>

      <Panel>
        <h2 className="mb-3 font-display text-base font-bold">Vânzări</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Prioritate" htmlFor="f-priority"><Select {...reg("priority")}>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</Select></Field>
          <Field label="Sursă" htmlFor="f-source"><Select {...reg("source")}>{SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}</Select></Field>
          <Field label="Responsabil" htmlFor="f-ownerId" hint={canChangeOwner ? undefined : "Doar un administrator poate schimba responsabilul."}>
            <Select {...reg("ownerId")} disabled={!canChangeOwner}>
              <option value="">Fără responsabil</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </Select>
          </Field>
          <Field label="Etichete" htmlFor="f-tags" hint="Separate prin virgulă, ex. vizitat pe teren, are piscină" className="sm:col-span-2 lg:col-span-3"><Input {...reg("tags")} /></Field>
          <Field label="Notițe" htmlFor="f-notes" error={err("notes")} className="sm:col-span-2 lg:col-span-3"><Textarea {...reg("notes")} rows={4} /></Field>
        </div>
      </Panel>

      {serverError && (
        <div role="alert" className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-[#F2A49D]">
          {serverError}{" "}
          {duplicate && (
            <>
              <Link href={`/leaduri/${duplicate}`} className="underline">Deschide lead-ul existent</Link>
              {" sau "}
              <button type="button" className="underline" onClick={handleSubmit((v) => submit(v, true))}>salvează oricum ca lead separat</button>.
            </>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? "Se salvează…" : leadId ? "Salvează modificările" : "Adaugă lead-ul"}</Button>
        <Button variant="ghost" onClick={() => router.back()}>Renunță</Button>
      </div>
    </form>
  );
}
