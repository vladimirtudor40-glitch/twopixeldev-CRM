"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUserAction, updateUserAction } from "@/server/actions/users";
import type { ActionResult } from "@/server/actions/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ROLE_LABEL } from "@/lib/labels";

export type EditableUser = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: "ADMIN" | "AGENT_VANZARI";
  active: boolean;
};

const fieldError = (state: ActionResult | null, key: string) =>
  state && !state.ok ? state.fieldErrors?.[key]?.[0] : undefined;

function Feedback({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  if (state.ok) return <p role="status" className="text-sm text-ok">{state.message}</p>;
  return <p role="alert" className="text-sm text-danger-hi">{state.error}</p>;
}

function RoleSelect({ id, defaultValue, disabled }: { id: string; defaultValue: string; disabled?: boolean }) {
  return (
    <Select id={id} name="role" defaultValue={defaultValue} disabled={disabled}>
      <option value="ADMIN">{ROLE_LABEL.ADMIN}</option>
      <option value="AGENT_VANZARI">{ROLE_LABEL.AGENT_VANZARI}</option>
    </Select>
  );
}

export function UserCreateForm() {
  const [state, action, pending] = useActionState(createUserAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Nume" htmlFor="new-name" error={fieldError(state, "name")}>
        <Input id="new-name" name="name" autoComplete="off" required />
      </Field>
      <Field label="Email (cu el se autentifică)" htmlFor="new-email" error={fieldError(state, "email")}>
        <Input id="new-email" name="email" type="email" autoComplete="off" required />
      </Field>
      <Field label="Telefon (opțional)" htmlFor="new-phone" error={fieldError(state, "phone")}>
        <Input id="new-phone" name="phone" autoComplete="off" />
      </Field>
      <Field label="Rol" htmlFor="new-role" error={fieldError(state, "role")} hint="Admin: tot, inclusiv importul și conturile.">
        <RoleSelect id="new-role" defaultValue="AGENT_VANZARI" />
      </Field>
      <Field
        label="Parolă (minim 10 caractere)"
        htmlFor="new-password"
        error={fieldError(state, "password")}
        hint="I-o comunici persoanei; o poate schimba un admin oricând."
        className="sm:col-span-2"
      >
        <Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" variant="primary" disabled={pending}>{pending ? "Se creează…" : "Adaugă utilizatorul"}</Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function UserEditForm({ user, isSelf }: { user: EditableUser; isSelf: boolean }) {
  const [state, action, pending] = useActionState(updateUserAction, null);
  const p = `u-${user.id}`;
  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={user.id} />
      <Field label="Nume" htmlFor={`${p}-name`} error={fieldError(state, "name")}>
        <Input id={`${p}-name`} name="name" defaultValue={user.name ?? ""} required />
      </Field>
      <Field label="Email" htmlFor={`${p}-email`} error={fieldError(state, "email")}>
        <Input id={`${p}-email`} name="email" type="email" defaultValue={user.email} required />
      </Field>
      <Field label="Telefon (opțional)" htmlFor={`${p}-phone`} error={fieldError(state, "phone")}>
        <Input id={`${p}-phone`} name="phone" defaultValue={user.phone ?? ""} />
      </Field>
      <Field label="Rol" htmlFor={`${p}-role`} error={fieldError(state, "role")}>
        <RoleSelect id={`${p}-role`} defaultValue={user.role} />
      </Field>
      <Field
        label="Parolă nouă (lasă gol ca să rămână cea veche)"
        htmlFor={`${p}-password`}
        error={fieldError(state, "password")}
      >
        <Input id={`${p}-password`} name="password" type="password" autoComplete="new-password" />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={user.active} disabled={isSelf} className="h-4 w-4 accent-teal" />
        Cont activ {isSelf && <span className="text-xs text-ink-muted">(nu îți poți dezactiva propriul cont)</span>}
        {isSelf && <input type="hidden" name="active" value="on" />}
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>{pending ? "Se salvează…" : "Salvează"}</Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
