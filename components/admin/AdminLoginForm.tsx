"use client";

import { useActionState } from "react";
import { adminLogin, adminLoginTotp } from "@/app/admin/login/actions";
import { IDLE_LOGIN_STATE } from "@/lib/actions/admin-login-types";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { Input } from "@/components/ui/input";

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(adminLogin, IDLE_LOGIN_STATE);

  // The password step is replaced rather than added to. Nothing from it needs
  // to survive: the server put the verified identity in an httpOnly challenge
  // cookie, so the second step posts only the code — the password is never
  // re-sent and never sits in a hidden field.
  if (state.status === "totp") return <AdminTotpForm />;

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      {/* These two inputs used to carry a wholesale override of shadcn's Input
          — its own height, radius, border colour and background, all as raw
          oklch literals — and were the only place in /admin that restyled the
          primitive instead of using it. Removed 2026-07-30: the theme tokens
          give the default Input the right look, so the login fields now match
          every other admin field rather than being a one-off.

          `defaultValue={state.email}` stays load-bearing: Next re-renders this
          page's Server Component after every action call, which resets an
          uncontrolled input's DOM value, so a failed login used to silently
          blank the email field. */}
      <Input
        name="email"
        type="email"
        placeholder="Email address"
        autoComplete="username"
        defaultValue={state.email}
      />
      <Input name="password" type="password" placeholder="Password" autoComplete="current-password" />
      <FieldError error={state.status === "error" ? state.message : undefined} />
      <SubmitButton isPending={isPending} label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}

function AdminTotpForm() {
  const [state, formAction, isPending] = useActionState(adminLoginTotp, { status: "totp" as const });

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <p className="m-0 text-[13px] text-muted-foreground">
        Enter the 6-digit code from your authenticator app.
      </p>
      <Input
        name="code"
        // `text` rather than `number`: a code can start with 0, and number
        // inputs strip leading zeros and add spinners nobody wants here.
        type="text"
        inputMode="numeric"
        // The one-time-code hint is what lets iOS and Android offer the code
        // from the keyboard rather than making the owner switch apps.
        autoComplete="one-time-code"
        placeholder="123456"
        aria-label="Authentication code"
        autoFocus
      />
      <FieldError error={state.message} />
      <SubmitButton isPending={isPending} label="Verify" pendingLabel="Verifying…" />
      <p className="m-0 text-center text-[12px] text-muted-foreground">
        Lost your phone? Enter one of your backup codes instead.{" "}
        {/* A real navigation, not a state reset: the challenge cookie is the
            thing that has to be re-obtained, and only the password step can
            issue a new one. This is also the way out when the cookie expires
            mid-code — that failure arrives on this form, which cannot send
            itself back to the password step on its own. */}
        <a href="/admin/login" className="underline">
          Start over
        </a>
        .
      </p>
    </form>
  );
}
