"use client";

import { useActionState } from "react";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.email ?? ""} key={state?.email ?? ""} />
      </Field>
      <Field label="Parolă" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state?.error && <p className="text-sm text-[#F2A49D]" role="alert">{state.error}</p>}
      <Button type="submit" variant="primary" disabled={pending} className="mt-1">
        {pending ? "Se verifică…" : "Intră"}
      </Button>
    </form>
  );
}
