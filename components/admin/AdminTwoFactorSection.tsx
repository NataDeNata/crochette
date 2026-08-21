"use client";

import { useActionState, useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import {
  cancelTotpEnrolment,
  confirmTotp,
  reissueBackupCodes,
  startTotpEnrolment,
  turnOffTotp,
  type TotpActionState,
} from "@/app/admin/settings/actions";
import { IDLE_STATE } from "@/lib/actions/types";
/* Safe in a client bundle by design — lib/data/analytics.ts is the pure half of
 * the analytics split, with no `db` import. Using it here is also the point: a
 * bare `toLocaleDateString()` in a client component formats once on the server
 * and again in the browser, in two different locales, which is a hydration
 * mismatch. A pinned locale and timezone makes both passes agree. */
import { formatDate } from "@/lib/data/analytics";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Enrolment = { secret: string; uri: string; qrSvg: string };

const IDLE: TotpActionState = IDLE_STATE;

export function AdminTwoFactorSection({
  confirmedAt,
  backupCodesRemaining,
  enrolment,
}: {
  confirmedAt: string | null;
  backupCodesRemaining: number;
  enrolment: Enrolment | null;
}) {
  // Owned here, not in `EnrolmentStep`, because that subtree does not survive
  // its own success. `confirmTotp` sets `totp_confirmed_at` and revalidates
  // this page, which flips `enrolment` to null and `confirmedAt` to a date —
  // so React unmounts `EnrolmentStep` in the same commit that delivers the
  // codes, and state living inside it goes with it. Held one level up, the
  // codes outlive the branch change.
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmTotp, IDLE);
  // The codes can't be un-rendered by the action state — `useActionState` has no
  // reset — and nothing else clears them, so without this the enrolment view is
  // a dead end for the life of the mount: no way back to `ActiveState`, and so
  // no way to reissue codes or turn 2FA off short of reloading the page.
  //
  // Holds the dismissed array rather than a boolean so that a *later* set of
  // codes is never suppressed by an earlier dismissal — each action run returns
  // a fresh array, so identity is the right key here.
  const [dismissed, setDismissed] = useState<string[] | null>(null);

  // Checked before the prop-driven branches for the same reason: by the time
  // the codes exist, the props already describe an active second factor.
  if (confirmState.backupCodes && confirmState.backupCodes !== dismissed) {
    return (
      <BackupCodes
        codes={confirmState.backupCodes}
        message={confirmState.message}
        onDismiss={() => setDismissed(confirmState.backupCodes ?? null)}
      />
    );
  }

  if (enrolment) {
    return (
      <EnrolmentStep
        enrolment={enrolment}
        state={confirmState}
        formAction={confirmAction}
        isPending={confirmPending}
      />
    );
  }
  if (confirmedAt) return <ActiveState confirmedAt={confirmedAt} backupCodesRemaining={backupCodesRemaining} />;
  return <OffState />;
}

function OffState() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <ShieldAlert className="size-4" aria-hidden />
        Not enabled
      </span>
      <form action={startTotpEnrolment} className="ml-auto">
        <Button type="submit" size="sm">
          Set up
        </Button>
      </form>
    </div>
  );
}

function EnrolmentStep({
  enrolment,
  state,
  formAction,
  isPending,
}: {
  enrolment: Enrolment;
  state: TotpActionState;
  formAction: (formData: FormData) => void;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-[13px] text-muted-foreground">
        <li>Open your authenticator app (Google Authenticator, 1Password, Aegis…).</li>
        <li>Scan this code, or type the key below it in by hand.</li>
        <li>Enter the 6-digit code it shows to finish.</li>
      </ol>

      <div className="flex flex-wrap items-start gap-4">
        {/* Generated server-side by `qrcode` from our own otpauth:// URI — no
            third-party QR service, which would mean handing the TOTP seed to
            someone else's server. */}
        <div
          className="size-[168px] flex-none rounded-lg bg-white p-2 [&>svg]:size-full"
          // Safe to inject: this string is produced by `qrcode` from an
          // otpauth:// URI we built ourselves out of a locally generated
          // secret and the admin's own email. No attacker-controlled text
          // reaches it, and the alternative (a PNG data URI) is heavier and
          // blurs when scaled.
          dangerouslySetInnerHTML={{ __html: enrolment.qrSvg }}
          role="img"
          aria-label="QR code for setting up two-factor authentication"
        />

        <div className="min-w-[200px] flex-1">
          <div className="mb-1.5 text-[13px] text-muted-foreground">Or enter this key manually</div>
          <code className="block rounded-md bg-muted px-2.5 py-2 font-mono text-[13px] break-all">
            {enrolment.secret}
          </code>
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] text-muted-foreground" htmlFor="totp-confirm">
            6-digit code
          </label>
          <Input
            id="totp-confirm"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="max-w-[160px]"
          />
          <FieldError error={state.status === "error" ? state.message : undefined} />
        </div>
        <div className="flex items-center gap-2">
          <SubmitButton isPending={isPending} label="Turn on" pendingLabel="Checking…" />
        </div>
      </form>

      <form action={cancelTotpEnrolment}>
        <Button type="submit" variant="ghost" size="sm">
          Cancel setup
        </Button>
      </form>
    </div>
  );
}

function ActiveState({
  confirmedAt,
  backupCodesRemaining,
}: {
  confirmedAt: string;
  backupCodesRemaining: number;
}) {
  const [showDisable, setShowDisable] = useState(false);
  const [reissueState, reissueAction, reissuePending] = useActionState(reissueBackupCodes, IDLE);
  const [disableState, disableAction, disablePending] = useActionState(turnOffTotp, IDLE);
  // Same dead end as after enrolling: reissuing replaces this whole view with
  // the codes, and nothing clears them again.
  const [dismissed, setDismissed] = useState<string[] | null>(null);

  if (reissueState.backupCodes && reissueState.backupCodes !== dismissed) {
    return (
      <BackupCodes
        codes={reissueState.backupCodes}
        message={reissueState.message}
        onDismiss={() => setDismissed(reissueState.backupCodes ?? null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="flex items-center gap-2 font-medium text-sage-foreground">
          <ShieldCheck className="size-4" aria-hidden />
          On since {formatDate(confirmedAt)}
        </span>
      </div>

      <div className="rounded-lg border border-border p-3">
        <div className="text-[13px]">
          <strong className="font-medium">Backup codes:</strong>{" "}
          {backupCodesRemaining > 0 ? (
            <>
              {backupCodesRemaining} unused
              {/* Worth flagging before it becomes a lockout rather than after. */}
              {backupCodesRemaining <= 2 ? ", running low, reissue them" : ""}
            </>
          ) : (
            <span className="text-destructive">
              none left. Reissue now, or losing your phone means losing access
            </span>
          )}
        </div>

        <form action={reissueAction} className="mt-2.5 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1.5 block text-[13px] text-muted-foreground" htmlFor="reissue-password">
              Confirm password
            </label>
            <Input
              id="reissue-password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="max-w-[220px]"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" disabled={reissuePending}>
            {reissuePending ? "Working…" : "Reissue codes"}
          </Button>
        </form>
        <FieldError error={reissueState.status === "error" ? reissueState.message : undefined} />
      </div>

      {showDisable ? (
        <form action={disableAction} className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-3">
          <p className="m-0 text-[13px] text-muted-foreground">
            Turning this off needs both your password and a current code, the same two things an attacker
            would have to hold to turn it off for you.
          </p>
          <div className="flex flex-wrap gap-2">
            <div>
              <label className="mb-1.5 block text-[13px] text-muted-foreground" htmlFor="disable-password">
                Password
              </label>
              <Input
                id="disable-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="max-w-[220px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] text-muted-foreground" htmlFor="disable-code">
                Code
              </label>
              <Input
                id="disable-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="max-w-[160px]"
              />
            </div>
          </div>
          <FieldError error={disableState.status === "error" ? disableState.message : undefined} />
          <div className="flex items-center gap-2">
            <Button type="submit" variant="destructive" size="sm" disabled={disablePending}>
              {disablePending ? "Turning off…" : "Turn off two-factor"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowDisable(false)}>
              Keep it on
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setShowDisable(true)}>
          Turn off two-factor
        </Button>
      )}
    </div>
  );
}

function BackupCodes({
  codes,
  message,
  onDismiss,
}: {
  codes: string[];
  message?: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[13px] font-medium">{message}</p>
      <ul className="m-0 grid grid-cols-2 gap-1.5 rounded-lg bg-muted p-3 sm:grid-cols-3">
        {codes.map((code) => (
          <li key={code} className="list-none font-mono text-[13px] tracking-wide">
            {code}
          </li>
        ))}
      </ul>
      <p className="m-0 text-[12px] text-muted-foreground">
        Each one works once, in place of a code from your app. Print them or put them in a password manager.
        this page will not show them again.
      </p>
      {onDismiss ? (
        // Deliberately the only way out, and deliberately worded as a claim the
        // admin has to make: dismissing is irreversible, because the server kept
        // only SHA-256 hashes.
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={onDismiss}>
          I&apos;ve saved these
        </Button>
      ) : null}
    </div>
  );
}
