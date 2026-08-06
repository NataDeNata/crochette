import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth-guard";
import { getAdminSecurityState, getPendingTotpEnrolment } from "@/lib/db/admin-account";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPasswordForm } from "@/components/admin/AdminPasswordForm";
import { AdminTwoFactorSection } from "@/components/admin/AdminTwoFactorSection";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  const admin = await requireAdminPage();

  const security = await getAdminSecurityState(admin.id);
  // The session says this admin exists; the row says otherwise. That only
  // happens if the account was deleted while signed in, and there is nothing
  // sensible to render for it.
  if (!security) notFound();

  // Re-derived from the stored pending secret rather than regenerated, so
  // reloading mid-setup shows the same QR the authenticator already scanned.
  const enrolment = security.totpPending ? await getPendingTotpEnrolment(admin.id, security.email) : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <AdminPageHeader title="Settings" subtitle="Your sign-in and account security" />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="m-0 font-serif text-lg font-medium">Two-factor authentication</h2>
            <p className="m-0 mt-0.5 text-[13px] text-muted-foreground">
              An app-generated code on top of your password. Nothing signs in to /admin without it once it&apos;s on.
            </p>
          </div>
          <AdminTwoFactorSection
            confirmedAt={security.totpConfirmedAt?.toISOString() ?? null}
            backupCodesRemaining={security.backupCodesRemaining}
            enrolment={enrolment}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="m-0 font-serif text-lg font-medium">Change password</h2>
            <p className="m-0 mt-0.5 text-[13px] text-muted-foreground">
              Changing this signs you out everywhere, including here, and you&apos;ll sign back in with the new one.
            </p>
          </div>
          <AdminPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
