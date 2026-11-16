"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <form action={action} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.email ?? ""} key={state?.email ?? ""} />
      </Field>
      <Field label="Parolă" htmlFor="password">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
            aria-pressed={showPassword}
            aria-controls="password"
            title={showPassword ? "Ascunde parola" : "Arată parola"}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-ink-muted transition-colors hover:text-teal-hi focus-visible:text-teal-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal"
          >
            {showPassword ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
          </button>
        </div>
      </Field>
      <label htmlFor="remember" className="flex w-fit cursor-pointer select-none items-center gap-2 text-sm text-ink-muted hover:text-ink">
        <input
          id="remember"
          name="remember"
          type="checkbox"
          defaultChecked={state?.remember ?? true}
          key={String(state?.remember ?? true)}
          className="h-4 w-4 cursor-pointer accent-teal"
        />
        Ține-mă minte
      </label>
      {state?.error && <p className="text-sm text-[#F2A49D]" role="alert">{state.error}</p>}
      <Button type="submit" variant="primary" disabled={pending} className="mt-1">
        {pending ? "Se verifică…" : "Intră"}
      </Button>
    </form>
  );
}
