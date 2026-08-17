"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteAddressAction, setDefaultAddressAction } from "@/app/account/addresses/actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { AddressForm } from "@/components/account/AddressForm";
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
import type { AddressRow } from "@/lib/db/schema";

function AddressCard({ address }: { address: AddressRow }) {
  const [editing, setEditing] = useState(false);
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteAddressAction.bind(null, address.id), IDLE_STATE);
  const [defaultState, defaultAction, isSettingDefault] = useActionState(
    setDefaultAddressAction.bind(null, address.id),
    IDLE_STATE
  );

  useEffect(() => {
    if (deleteState.status === "error" && deleteState.message) toast.error(deleteState.message);
  }, [deleteState]);
  useEffect(() => {
    if (defaultState.status === "error" && defaultState.message) toast.error(defaultState.message);
  }, [defaultState]);

  if (editing) {
    return (
      <div className="p-5 rounded-[16px] border-[1.5px] border-keyline/15">
        <AddressForm address={address} onSaved={() => setEditing(false)} />
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} className="mt-2">
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-[16px] border-[1.5px] border-keyline/15 flex justify-between gap-4 flex-wrap">
      <div>
        {(address.label || address.isDefault) && (
          <div className="font-medium text-[13.5px] mb-1">
            {address.label}
            {address.label && address.isDefault ? " · Default" : !address.label && address.isDefault ? "Default" : ""}
          </div>
        )}
        <p className="text-[13.5px] text-muted-foreground m-0 leading-[1.6]">
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.province} {address.postalCode}
        </p>
      </div>
      <div className="flex gap-2 items-start">
        {!address.isDefault && (
          <form action={defaultAction}>
            <Button type="submit" variant="outline" size="sm" disabled={isSettingDefault}>
              {isSettingDefault ? "Setting…" : "Set default"}
            </Button>
          </form>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this address?</AlertDialogTitle>
              <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={deleteAction}>
                <AlertDialogAction type="submit" variant="destructive" disabled={isDeleting}>
                  {isDeleting ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function AddressManager({ addresses }: { addresses: AddressRow[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {addresses.map((a) => (
        <AddressCard key={a.id} address={a} />
      ))}

      {adding ? (
        <div className="p-5 rounded-[16px] border-[1.5px] border-keyline/15">
          <AddressForm onSaved={() => setAdding(false)} />
          <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)} className="mt-2">
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setAdding(true)} className="self-start">
          + Add address
        </Button>
      )}
    </div>
  );
}
