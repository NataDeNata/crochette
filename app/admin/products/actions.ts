"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { products, orderItems, productImages } from "@/lib/db/schema";
import { productSchema } from "@/lib/validation/product";
import { MAX_PRODUCT_IMAGES } from "@/lib/validation/product-images";
import { uploadProductImageFiles } from "@/lib/db/product-images";
import { invalidFields, type FormActionState } from "@/lib/actions/types";
import { isUniqueViolation } from "@/lib/db/errors";
import { logError } from "@/lib/observability/log";

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    priceDollars: formData.get("priceDollars"),
    category: formData.get("category"),
    status: formData.get("status"),
    stockQty: formData.get("stockQty"),
    lowStockThreshold: formData.get("lowStockThreshold"),
    dimensions: formData.get("dimensions") || undefined,
    materials: formData.get("materials") || undefined,
    careInstructions: formData.get("careInstructions") || undefined,
  });
}

/** The form's shape mapped onto the column shape. Shared so create and update
 * cannot drift apart when a field is added. */
function toRow(data: ReturnType<typeof productSchema.parse>) {
  return {
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    priceCents: Math.round(data.priceDollars * 100),
    category: data.category,
    status: data.status,
    stockQty: data.stockQty,
    lowStockThreshold: data.lowStockThreshold,
    dimensions: data.dimensions || null,
    materials: data.materials || null,
    careInstructions: data.careInstructions || null,
  };
}

function revalidateStorefront(slug: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/shop/${slug}`);
}

export async function createProduct(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const parsed = parseProductForm(formData);
  if (!parsed.success) return invalidFields(parsed.error);

  // Photos attached on the create form itself — see ProductForm's
  // PhotoAttach section. Optional: a product can still be created with none
  // and photographed later from its own Photos page.
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PRODUCT_IMAGES) {
    return { status: "error", message: `A product can have up to ${MAX_PRODUCT_IMAGES} photos.` };
  }

  let productId: string;
  try {
    const [row] = await db.insert(products).values(toRow(parsed.data)).returning({ id: products.id });
    productId = row.id;
  } catch (err) {
    logError("admin.product.create_failed", err, { slug: parsed.data.slug });
    const message = isUniqueViolation(err) ? "That slug is already in use." : "Couldn't create the product. Please try again.";
    return { status: "error", message };
  }

  revalidateStorefront(parsed.data.slug);

  if (files.length) {
    const result = await uploadProductImageFiles(productId, files);
    if (result.error) {
      // The product itself was created successfully — only the photos
      // failed. Land on its Photos page to retry rather than silently
      // dropping them or leaving the admin on a form that looks unsaved.
      redirect(`/admin/products/${productId}/images`);
    }
  }

  redirect("/admin/products");
}

export async function updateProduct(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = parseProductForm(formData);
  if (!parsed.success) return invalidFields(parsed.error);

  try {
    await db.update(products).set(toRow(parsed.data)).where(eq(products.id, id));
  } catch (err) {
    logError("admin.product.update_failed", err, { productId: id, slug: parsed.data.slug });
    const message = isUniqueViolation(err) ? "That slug is already in use." : "Couldn't save the product. Please try again.";
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
