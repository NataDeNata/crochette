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
      <div style={{ padding: 20, borderRadius: 16, border: "1.5px solid oklch(0.9 0.02 60)" }}>
        <AddressForm address={address} onSaved={() => setEditing(false)} />
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} className="mt-2">
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 16,
        border: "1.5px solid oklch(0.9 0.02 60)",
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div>
        {(address.label || address.isDefault) && (
          <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 4 }}>
            {address.label}
            {address.label && address.isDefault ? " · Default" : !address.label && address.isDefault ? "Default" : ""}
          </div>
        )}
        <p style={{ fontSize: 13.5, color: "oklch(0.5 0.02 60)", margin: 0, lineHeight: 1.6 }}>
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.province} {address.postalCode}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {addresses.map((a) => (
        <AddressCard key={a.id} address={a} />
      ))}

      {adding ? (
        <div style={{ padding: 20, borderRadius: 16, border: "1.5px solid oklch(0.9 0.02 60)" }}>
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
