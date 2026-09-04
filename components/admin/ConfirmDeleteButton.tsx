"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { IDLE_STATE, type FormActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { AdminBusyOverlay } from "@/components/admin/AdminBusyOverlay";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * "Delete", behind a confirm dialog, for one named admin row.
 *
 * Was two components — one per table — alike in everything but the action they
 * bound and the noun in the title. Both refusal paths matter and are easy to
 * get subtly different across copies: `deleteProduct` and `deleteDiscount` both
 * return an ordinary error state when the row has history and cannot be
 * deleted, so the toast below is the only place that refusal is ever shown.
 *
 * `action` arrives already bound to its row id by the caller, which keeps the
 * differing argument lists (product needs its slug to revalidate, discount does
 * not) out of this component entirely.
 */
export function ConfirmDeleteButton({
  action,
  name,
  successMessage,
}: {
  action: (prevState: FormActionState, formData: FormData) => Promise<FormActionState>;
  name: string;
  /** Omitted where the action redirects on success and the toast would never
   * be seen — deleting a product navigates away, deleting a discount does not. */
  successMessage?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, IDLE_STATE);

  useEffect(() => {
    if (state.status === "error" && state.message) toast.error(state.message);
    if (state.status === "success" && successMessage) toast.success(successMessage);
  }, [state, successMessage]);

  return (
    <AlertDialog>
      {isPending && <AdminBusyOverlay label="Deleting…" />}
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={formAction}>
            <AlertDialogAction type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
