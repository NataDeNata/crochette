"use server";

import { revalidatePath } from "next/cache";
/* Defense-in-depth: proxy.ts already gates /account/:path* by role, but these
 * are Server Actions, reachable directly rather than only via that route, so
 * they re-check. `currentCustomerId` returns null instead of throwing, so each
 * one fails soft with a normal FormActionState rather than a 500. */
import { currentCustomerId } from "@/lib/auth-guard";
import { createAddress, updateAddress, deleteAddress, setDefaultAddress } from "@/lib/db/accounts";
import { addressSchema } from "@/lib/validation/account";
import { invalidFields, type FormActionState } from "@/lib/actions/types";

const NOT_SIGNED_IN: FormActionState = { status: "error", message: "Please sign in again." };

function parseAddressForm(formData: FormData) {
  return addressSchema.safeParse({
    label: formData.get("label") || undefined,
    line1: formData.get("line1"),
    line2: formData.get("line2") || undefined,
    city: formData.get("city"),
    province: formData.get("province"),
    postalCode: formData.get("postalCode"),
    isDefault: formData.get("isDefault") === "on",
  });
}

/** Handles both create and edit — a hidden addressId field (present only
 * when editing) distinguishes the two, mirroring the single-form-two-modes
 * pattern already used by ProductForm/DiscountForm in /admin. */
export async function saveAddress(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const customerId = await currentCustomerId();
  if (!customerId) return NOT_SIGNED_IN;
  const parsed = parseAddressForm(formData);
  if (!parsed.success) return invalidFields(parsed.error);

  const addressId = formData.get("addressId");
  const data = {
    customerId,
    label: parsed.data.label || null,
    line1: parsed.data.line1,
    line2: parsed.data.line2 || null,
    city: parsed.data.city,
    province: parsed.data.province,
    postalCode: parsed.data.postalCode,
    isDefault: Boolean(parsed.data.isDefault),
  };

  if (typeof addressId === "string" && addressId) {
    await updateAddress(customerId, addressId, data);
  } else {
    await createAddress(data);
  }

  revalidatePath("/account/addresses");
  revalidatePath("/account");
  return { status: "success", message: "Address saved." };
}

export async function deleteAddressAction(
  id: string,
  _prevState: FormActionState,
  _formData: FormData
): Promise<FormActionState> {
  const customerId = await currentCustomerId();
  if (!customerId) return NOT_SIGNED_IN;
  await deleteAddress(customerId, id);
  revalidatePath("/account/addresses");
  revalidatePath("/account");
  return { status: "success", message: "Address deleted." };
}

export async function setDefaultAddressAction(
  id: string,
  _prevState: FormActionState,
  _formData: FormData
): Promise<FormActionState> {
  const customerId = await currentCustomerId();
  if (!customerId) return NOT_SIGNED_IN;
  await setDefaultAddress(customerId, id);
  revalidatePath("/account/addresses");
  revalidatePath("/account");
  return { status: "success", message: "Default address updated." };
}
