"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { products, orderItems } from "@/lib/db/schema";
import { productSchema } from "@/lib/validation/product";
import type { FormActionState } from "@/lib/actions/types";

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    priceDollars: formData.get("priceDollars"),
    category: formData.get("category"),
    tag: formData.get("tag") || undefined,
    status: formData.get("status"),
    stockQty: formData.get("stockQty"),
  });
}

function revalidateStorefront(slug: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/shop/${slug}`);
}

export async function createProduct(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { status: "error", message: "Please check the fields below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await db.insert(products).values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      priceCents: Math.round(parsed.data.priceDollars * 100),
      category: parsed.data.category,
      tag: parsed.data.tag || null,
      status: parsed.data.status,
      stockQty: parsed.data.stockQty,
    });
  } catch (err) {
    console.error("createProduct failed:", err);
    const message = err instanceof Error && err.message.includes("unique") ? "That slug is already in use." : "Couldn't create the product — please try again.";
    return { status: "error", message };
  }

  revalidateStorefront(parsed.data.slug);
  redirect("/admin/products");
}

export async function updateProduct(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { status: "error", message: "Please check the fields below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await db
      .update(products)
      .set({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        priceCents: Math.round(parsed.data.priceDollars * 100),
        category: parsed.data.category,
        tag: parsed.data.tag || null,
        status: parsed.data.status,
        stockQty: parsed.data.stockQty,
      })
      .where(eq(products.id, id));
  } catch (err) {
    console.error("updateProduct failed:", err);
    const message = err instanceof Error && err.message.includes("unique") ? "That slug is already in use." : "Couldn't save the product — please try again.";
    return { status: "error", message };
  }

  revalidateStorefront(parsed.data.slug);
  redirect("/admin/products");
}

export async function deleteProduct(
  id: string,
  slug: string,
  _prevState: FormActionState,
  _formData: FormData
): Promise<FormActionState> {
  // order_items.product_id is a NOT NULL foreign key with no cascade, so a
  // product that's ever been ordered can't be hard-deleted — Postgres would
  // reject it. Check up front instead of letting that surface as a crash.
  const [existingOrderItem] = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .where(eq(orderItems.productId, id))
    .limit(1);

  if (existingOrderItem) {
    return {
      status: "error",
      message: 'This product has order history and can’t be deleted — set it to "Draft" or "Sold out" instead to hide it from the storefront.',
    };
  }

  try {
    await db.delete(products).where(eq(products.id, id));
  } catch (err) {
    console.error("deleteProduct failed:", err);
    return { status: "error", message: "Couldn't delete the product — please try again." };
  }

  revalidateStorefront(slug);
  redirect("/admin/products");
}
