"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { products, orderItems, productImages } from "@/lib/db/schema";
import { productSchema } from "@/lib/validation/product";
import type { FormActionState } from "@/lib/actions/types";
import { logError } from "@/lib/observability/log";

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
    lowStockThreshold: formData.get("lowStockThreshold"),
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
      lowStockThreshold: parsed.data.lowStockThreshold,
    });
  } catch (err) {
    logError("admin.product.create_failed", err, { slug: parsed.data.slug });
    const message = err instanceof Error && err.message.includes("unique") ? "That slug is already in use." : "Couldn't create the product. Please try again.";
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
        lowStockThreshold: parsed.data.lowStockThreshold,
      })
      .where(eq(products.id, id));
  } catch (err) {
    logError("admin.product.update_failed", err, { productId: id, slug: parsed.data.slug });
    const message = err instanceof Error && err.message.includes("unique") ? "That slug is already in use." : "Couldn't save the product. Please try again.";
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
      message: 'This product has order history and can’t be deleted. Set it to "Draft" or "Sold out" instead to hide it from the storefront.',
    };
  }

  const imagesToClean = await db
    .select({ url: productImages.url })
    .from(productImages)
    .where(eq(productImages.productId, id));

  try {
    await db.delete(products).where(eq(products.id, id));
  } catch (err) {
    logError("admin.product.delete_failed", err, { productId: id, slug });
    return { status: "error", message: "Couldn't delete the product. Please try again." };
  }

  // product_images rows are gone via ON DELETE CASCADE — the Blob files
  // themselves are external and need explicit cleanup, best-effort only.
  if (imagesToClean.length) {
    try {
      await del(imagesToClean.map((i) => i.url));
    } catch (err) {
      logError("admin.product.blob_cleanup_failed", err, { productId: id, blobCount: imagesToClean.length });
    }
  }

  revalidateStorefront(slug);
  redirect("/admin/products");
}
